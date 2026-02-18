#!/bin/bash
# ================================================================
# setup-ai.sh — Multi-AI Orchestration Setup
# ================================================================
# Creates symlinks so multiple AI tools can discover the
# orchestrator configuration (agent.md) and skills system.
#
# Supported tools:
#   - Cursor      → .cursorrules
#   - Gemini      → GEMINI.md
#   - Claude      → CLAUDE.md
#
# Usage: bash scripts/setup-ai.sh
# ================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="agent.md"

echo "🔧 AI Orchestration Setup"
echo "========================="
echo "Repository: $REPO_ROOT"
echo ""

cd "$REPO_ROOT"

# Verify source file exists
if [ ! -f "$SOURCE" ]; then
    echo "❌ Error: $SOURCE not found in repo root."
    exit 1
fi

# Define symlink targets
declare -A TARGETS=(
    [".cursorrules"]="Cursor"
    ["GEMINI.md"]="Gemini"
    ["CLAUDE.md"]="Claude"
)

for target in "${!TARGETS[@]}"; do
    tool="${TARGETS[$target]}"

    if [ -L "$target" ]; then
        echo "♻️  $target already exists (symlink) → refreshing"
        rm "$target"
    elif [ -f "$target" ]; then
        echo "⚠️  $target exists as a regular file → backing up to ${target}.bak"
        mv "$target" "${target}.bak"
    fi

    ln -s "$SOURCE" "$target"
    echo "✅ $target → $SOURCE ($tool)"
done

echo ""
echo "📂 Skills directory:"
if [ -d "skills" ]; then
    for skill_dir in skills/*/; do
        if [ -f "${skill_dir}skill.md" ]; then
            name=$(grep "^name:" "${skill_dir}skill.md" | head -1 | sed 's/name: *//')
            echo "   ✅ $skill_dir → $name"
        else
            echo "   ⚠️  $skill_dir → missing skill.md"
        fi
    done
else
    echo "   ❌ skills/ directory not found"
fi

echo ""

# Step 2: Sync Skill References in agent.md
SYNC_SCRIPT="$REPO_ROOT/scripts/sync.sh"
if [ -f "$SYNC_SCRIPT" ]; then
    echo "🔄 Running sync.sh to update Skill References..."
    bash "$SYNC_SCRIPT"
else
    echo "⚠️  sync.sh not found — skipping Skill References sync"
fi

echo ""
echo "🎉 Setup complete! All AI tools can now discover the orchestrator."
