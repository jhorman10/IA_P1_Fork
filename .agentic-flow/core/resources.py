"""System resource monitor: RAM, CPU, GPU, Ollama loaded models.
Used by router to make informed decisions and avoid blocking."""
from __future__ import annotations
import json
import os
import urllib.request
from dataclasses import dataclass
from pathlib import Path

OLLAMA = os.getenv("OLLAMA_HOST", "http://localhost:11434")


@dataclass
class SystemResources:
    ram_total_mb: int
    ram_available_mb: int
    ram_used_pct: float
    cpu_count: int
    cpu_load_1m: float
    gpu_vram_total_mb: int
    gpu_vram_free_mb: int
    ollama_loaded_models: list[str]
    ollama_running: bool

    @property
    def ram_pressure(self) -> bool:
        """True if RAM usage >85% — risky for model loading."""
        return self.ram_used_pct > 85.0

    @property
    def cpu_pressure(self) -> bool:
        """True if load average exceeds 2x CPU count."""
        return self.cpu_load_1m > self.cpu_count * 2

    @property
    def can_load_model(self) -> bool:
        """True if system has enough free RAM (>2GB) to load a new model."""
        return self.ram_available_mb > 2048 and not self.ram_pressure

    def model_is_loaded(self, model: str) -> bool:
        """Check if model is currently hot in Ollama (no cold-start penalty)."""
        short = model.split(":")[0]
        return any(short in m for m in self.ollama_loaded_models)

    def estimated_cold_start_s(self, model_size_bytes: int) -> int:
        """Estimate cold-start time based on model size and available RAM."""
        size_gb = model_size_bytes / (1024 ** 3)
        if self.gpu_vram_free_mb > size_gb * 1024:
            return int(size_gb * 5)  # GPU load: ~5s/GB
        return int(size_gb * 15)  # CPU/RAM load: ~15s/GB


def _read_meminfo() -> tuple[int, int]:
    """Read /proc/meminfo for total and available RAM in MB."""
    try:
        lines = Path("/proc/meminfo").read_text().splitlines()
        info = {}
        for line in lines:
            parts = line.split()
            if len(parts) >= 2:
                info[parts[0].rstrip(":")] = int(parts[1])
        total = info.get("MemTotal", 0) // 1024
        available = info.get("MemAvailable", info.get("MemFree", 0)) // 1024
        return total, available
    except Exception:
        return 0, 0


def _read_cpu() -> tuple[int, float]:
    """Read CPU count and 1-minute load average."""
    try:
        cpu_count = os.cpu_count() or 1
        load_1m = os.getloadavg()[0]
        return cpu_count, load_1m
    except Exception:
        return os.cpu_count() or 1, 0.0


def _read_gpu() -> tuple[int, int]:
    """Try nvidia-smi for VRAM info. Returns (total_mb, free_mb)."""
    try:
        import subprocess
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.total,memory.free",
             "--format=csv,noheader,nounits"],
            timeout=3, text=True
        )
        first = out.strip().splitlines()[0]
        total, free = [int(x.strip()) for x in first.split(",")]
        return total, free
    except Exception:
        return 0, 0


def _ollama_running_models() -> list[str]:
    """Query Ollama /api/ps for currently loaded models."""
    try:
        req = urllib.request.Request(f"{OLLAMA}/api/ps")
        with urllib.request.urlopen(req, timeout=2) as r:
            data = json.loads(r.read())
        return [m.get("name", "") for m in data.get("models", [])]
    except Exception:
        return []


def _ollama_is_running() -> bool:
    try:
        urllib.request.urlopen(f"{OLLAMA}/api/tags", timeout=2)
        return True
    except Exception:
        return False


def snapshot() -> SystemResources:
    """Take a point-in-time snapshot of system resources."""
    ram_total, ram_avail = _read_meminfo()
    cpu_count, cpu_load = _read_cpu()
    gpu_total, gpu_free = _read_gpu()
    ollama_up = _ollama_is_running()
    loaded = _ollama_running_models() if ollama_up else []
    ram_used_pct = ((ram_total - ram_avail) / ram_total * 100) if ram_total > 0 else 0.0

    return SystemResources(
        ram_total_mb=ram_total,
        ram_available_mb=ram_avail,
        ram_used_pct=round(ram_used_pct, 1),
        cpu_count=cpu_count,
        cpu_load_1m=round(cpu_load, 2),
        gpu_vram_total_mb=gpu_total,
        gpu_vram_free_mb=gpu_free,
        ollama_loaded_models=loaded,
        ollama_running=ollama_up,
    )


def generate_system_profile(res: SystemResources) -> dict:
    """Generate a system profile that maps hardware to optimal model usage conditions.
    Written to runtime/system-profile.json during `af init`."""
    # Determine execution mode based on hardware.
    if res.gpu_vram_total_mb >= 8192:
        mode = "gpu-full"
        max_concurrent_models = 2
        recommended_timeout_s = 120
        max_context_chars = 8000
    elif res.gpu_vram_total_mb >= 4096:
        mode = "gpu-light"
        max_concurrent_models = 1
        recommended_timeout_s = 180
        max_context_chars = 6000
    elif res.ram_total_mb >= 16384:
        mode = "cpu-high-ram"
        max_concurrent_models = 1
        recommended_timeout_s = 300
        max_context_chars = 4000
    elif res.ram_total_mb >= 8192:
        mode = "cpu-standard"
        max_concurrent_models = 1
        recommended_timeout_s = 300
        max_context_chars = 3000
    else:
        mode = "cpu-minimal"
        max_concurrent_models = 1
        recommended_timeout_s = 600
        max_context_chars = 2000

    # Model-specific conditions.
    model_conditions = {
        "starcoder2:3b": {
            "max_prompt_chars": max_context_chars * 2,
            "timeout_s": max(60, recommended_timeout_s // 2),
            "suitable": res.ram_total_mb >= 4096,
            "notes": "Lightweight, works on any hardware"
        },
        "qwen2.5-coder:7b": {
            "max_prompt_chars": max_context_chars,
            "timeout_s": recommended_timeout_s,
            "suitable": res.ram_total_mb >= 8192,
            "notes": "Needs 8GB+ RAM or 4GB+ VRAM"
        },
        "phi4-mini": {
            "max_prompt_chars": max_context_chars,
            "timeout_s": recommended_timeout_s,
            "suitable": res.ram_total_mb >= 8192,
            "notes": "Reasoning model, slower on CPU"
        },
        "llama3": {
            "max_prompt_chars": max_context_chars,
            "timeout_s": recommended_timeout_s,
            "suitable": res.ram_total_mb >= 8192,
            "notes": "General fallback"
        },
        "nomic-embed-text": {
            "max_prompt_chars": 8192,
            "timeout_s": 30,
            "suitable": True,
            "notes": "Embeddings only, minimal resources"
        }
    }

    import datetime as _dt
    return {
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "execution_mode": mode,
        "hardware": {
            "ram_total_mb": res.ram_total_mb,
            "cpu_count": res.cpu_count,
            "gpu_vram_mb": res.gpu_vram_total_mb,
        },
        "conditions": {
            "max_concurrent_models": max_concurrent_models,
            "recommended_timeout_s": recommended_timeout_s,
            "max_context_chars_local": max_context_chars,
            "ram_pressure_threshold_pct": 85,
            "cpu_pressure_multiplier": 2,
        },
        "model_conditions": model_conditions,
    }
