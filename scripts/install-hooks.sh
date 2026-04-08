#!/usr/bin/env bash
# =============================================================================
# install-hooks.sh — Instala los git hooks del proyecto en .git/hooks/.
#
# Uso:
#   ./scripts/install-hooks.sh
#
# Cada miembro del equipo debe ejecutarlo una sola vez después de clonar.
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$REPO_ROOT/scripts/hooks"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detecta el directorio real de hooks (soporta git worktree)
GIT_DIR="$(git -C "$REPO_ROOT" rev-parse --git-dir)"
# Si es un worktree, el commondir apunta al .git real
COMMON_DIR_FILE="$GIT_DIR/commondir"
if [[ -f "$COMMON_DIR_FILE" ]]; then
  COMMON_REL="$(cat "$COMMON_DIR_FILE")"
  COMMON_DIR="$(cd "$GIT_DIR/$COMMON_REL" && pwd)"
  HOOKS_DST="$COMMON_DIR/hooks"
else
  HOOKS_DST="$GIT_DIR/hooks"
fi

if [[ ! -d "$HOOKS_DST" ]]; then
  echo "Error: no se encontró el directorio de hooks en '$HOOKS_DST'."
  exit 1
fi

# Hacer ejecutables los scripts fuente
chmod +x "$REPO_ROOT/scripts/ci-local.sh"
chmod +x "$HOOKS_SRC/pre-push"

# Instalar cada hook como symlink (o copiar si symlink no está disponible)
install_hook() {
  local name="$1"
  local src="$HOOKS_SRC/$name"
  local dst="$HOOKS_DST/$name"

  if [[ -L "$dst" ]]; then
    echo -e "${YELLOW}⟳ $name: ya instalado (symlink existente)${NC}"
  elif [[ -f "$dst" ]]; then
    echo -e "${YELLOW}⚠ $name: ya existe un hook personalizado. Haciendo backup → $dst.bak${NC}"
    mv "$dst" "$dst.bak"
    ln -s "$src" "$dst"
    echo -e "${GREEN}✔ $name: instalado (backup en $dst.bak)${NC}"
  else
    ln -s "$src" "$dst"
    echo -e "${GREEN}✔ $name: instalado${NC}"
  fi
}

echo ""
echo "Instalando git hooks..."
install_hook "pre-push"

echo ""
echo -e "${GREEN}Listo. Los hooks quedarán activos automáticamente.${NC}"
echo ""
echo "  · Para correr el CI local manualmente:"
echo "      ./scripts/ci-local.sh"
echo ""
echo "  · Para saltarte el hook una sola vez (emergencia):"
echo "      git push --no-verify"
echo ""
