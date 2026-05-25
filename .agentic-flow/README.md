# Agentic-flow

> Hybrid local + cloud agentic pipeline. Spec-driven development with incremental memory, budget guard and minimum-token execution.

## Quick start

```bash
./.agentic-flow/af init        # detect local LLMs (Ollama/LM Studio) + seed memory
./.agentic-flow/af reindex     # incremental embedding index of the repo
./.agentic-flow/af run <agent> "<task>"
./.agentic-flow/af build <feature>
./.agentic-flow/af metrics     # tokens + USD cost report
./.agentic-flow/af resources   # system RAM/CPU/GPU + loaded models status
```

## Model tiers

| Tier | Tasks | Default models |
|---|---|---|
| `local` (coder-fast) | lint, format, docstrings | `starcoder2:3b` |
| `local` (coder) | tests, CRUD, refactors, patterns | `qwen2.5-coder:7b` |
| `local` (reason) | specs, code-review, gherkin, docs | `phi4-mini` |
| `cloud-mid` | overflow / quality-gate failures | `gemini-flash`, `gpt-4o-mini`, `haiku` |
| `cloud-high` | orchestration, architecture, risk analysis | `claude-opus`, `gpt-5`, `gemini-pro` |
| Embeddings | semantic memory | `nomic-embed-text` |

Edit: [.agentic-flow/config/routing.yaml](.agentic-flow/config/routing.yaml)

## Installing local models (Ollama)

### 1. Install Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Windows — download from https://ollama.com/download
```

### 2. Pull required models

```bash
# Code generation (fast, lightweight — lint, format, docstrings)
ollama pull starcoder2:3b

# Code generation (heavier — tests, CRUD, refactors)
ollama pull qwen2.5-coder:7b

# Reasoning (specs, code-review, gherkin, documentation)
ollama pull phi4-mini

# General purpose (fallback)
ollama pull llama3

# Embeddings (semantic memory index)
ollama pull nomic-embed-text
```

### 3. Initialize (profiles your hardware)

```bash
./.agentic-flow/af init
```

This command:
1. Detects all local models (Ollama + LM Studio)
2. **Reads system resources** (RAM, CPU, GPU via nvidia-smi)
3. **Generates `runtime/system-profile.json`** with optimal usage conditions per model
4. Maps execution mode: `gpu-full` | `gpu-light` | `cpu-high-ram` | `cpu-standard` | `cpu-minimal`
5. Sets per-model timeouts, context limits, and suitability flags
6. Seeds memory files and editor bridges

Example output:
```
detected=5 code=True embed=True
system: ram=15378MB cpu=8cores gpu=no profile=cpu-standard
init: ok
```

The generated profile at `runtime/system-profile.json` controls:
- **max_context_chars_local**: how much context is sent to local models (auto-scaled by hardware)
- **recommended_timeout_s**: base timeout per model (higher on CPU-only machines)
- **model suitability**: models marked `suitable: false` are automatically skipped
- **max_concurrent_models**: prevents loading multiple models that exceed RAM

> Re-run `af init` after hardware changes (e.g., adding GPU, upgrading RAM).

### Minimum hardware

| Resource | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB |
| VRAM (GPU) | — (CPU works) | 6 GB+ (NVIDIA/AMD) |
| Disk | 15 GB free | 25 GB free |

> Without GPU, models run on CPU. Expect 10-30s per response for phi4-mini, <5s for starcoder2:3b.

## Resource-aware execution

The pipeline monitors system resources in real-time to avoid blocking:

- **RAM pressure** (>85% used) + **CPU pressure** (load > 2×cores) → skips local tier, routes to cloud
- **Model already loaded** in Ollama → preferred to avoid cold-start swap (~60-120s)
- **Model not loaded** → timeout automatically extended +120s for cold-start
- **Context capping** → prompts trimmed to 4000 chars (2000 under pressure) for local models
- **keep_alive=10m** → models stay hot in memory between calls
- **Retry with minimal context** → if first attempt times out, retries without context

Check current state:

```bash
./.agentic-flow/af resources
# Output:
# ram: 4835/15378 MB free (68.6% used)
# cpu: 8 cores, load=9.84
# ollama: running
# loaded_models: phi4-mini:latest
# can_load_model: True
# pressure: ram=False cpu=False
```

## Connection error handling

All Ollama communication is hardened:

- `socket.timeout`, `urllib.error.URLError`, `OSError` → normalized to `TimeoutError` / `ConnectionError`
- SQLite memory index uses WAL mode + busy_timeout=5000ms (no `database is locked` crashes)
- If Ollama is down, local tier is skipped gracefully (routes to cloud fallback)
- Full timeout of 300s for local tier (configurable in `routing.yaml`)

## Token-saving features

- **Minimum context per agent**: every agent declares `context_needs` in [.agentic-flow/config/agents.yaml](.agentic-flow/config/agents.yaml); the orchestrator injects only those bytes.
- **Incremental memory**: only files whose SHA-256 changed get re-embedded ([.agentic-flow/core/memory.py](.agentic-flow/core/memory.py)).
- **Local embeddings**: `nomic-embed-text` + SQLite vector store (no external services).
- **Response cache**: `hash(prompt+model+seed)` → 24h TTL ([.agentic-flow/core/cache.py](.agentic-flow/core/cache.py)).
- **Anthropic prompt caching** on system blocks ([.agentic-flow/core/llm.py](.agentic-flow/core/llm.py)).
- **Batching**: tests and lint group N items per prompt.
- **Diffs over full files** in every code-emitting agent.
- **Deterministic** (`temperature=0`, `seed=42`) → high cache-hit rate.
- **Budget guard**: when daily USD limit is hit, forces local tier ([.agentic-flow/config/budget.yaml](.agentic-flow/config/budget.yaml)).
- **Silent execution**: agents emit artifacts + a one-line summary, no narration.

## Layout

```
.agentic-flow/
├── config/         routing.yaml · budget.yaml · agents.yaml
├── agents/         dense agent specs
├── skills/         consolidated skills
├── rules/          single source of truth per scope
├── memory/         project-context · domain · conventions · architecture · index.sqlite
├── core/           detect_local · router · resources · memory · cache · llm · orchestrator · cli
├── runtime/        local-models.json · system-profile.json · metrics.jsonl · cache/
├── specs/          <feature>.spec.md
└── tests/          unit tests for the core
```

## Environment

```bash
export OLLAMA_HOST=http://localhost:11434   # optional
export ANTHROPIC_API_KEY=...                # optional, enables Claude
export OPENAI_API_KEY=...                   # optional, enables GPT
export GEMINI_API_KEY=...                   # optional, enables Gemini
```

## Integration

- **Claude Code**: skill at [.claude/skills/agentic-flow/SKILL.md](.claude/skills/agentic-flow/SKILL.md). Invoke with `/agentic-flow`.
- **GitHub Copilot**: prompt at [.github/prompts/agentic-flow.prompt.md](.github/prompts/agentic-flow.prompt.md).

Both bridges delegate to the same Python CLI — no duplicated logic.

## Tests

```bash
cd .agentic-flow && python3 -m unittest tests.test_core -v
```
