#!/usr/bin/env bash
# =============================================================================
# ci-local.sh — Replica el pipeline de CI en local antes de hacer push.
#
# Pasos (mismo orden que .github/workflows/ci.yml):
#   1. Producer : tsc --noEmit → eslint → build → test:cov
#   2. Consumer : tsc --noEmit → eslint → build → test:cov
#   3. Frontend : tsc --noEmit → eslint → build → test:cov
#
# Uso directo:
#   ./scripts/ci-local.sh
#
# El script se instala como git pre-push hook con:
#   ./scripts/install-hooks.sh
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step()  { echo -e "\n${BLUE}▶ $*${NC}"; }
ok()    { echo -e "${GREEN}✔ $*${NC}"; }
fail()  { echo -e "${RED}✘ $*${NC}"; exit 1; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         CI LOCAL CHECK               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

# ── PRODUCER ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━ Producer ━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd "$REPO_ROOT/backend/producer"

step "Producer: TypeScript check"
npx tsc --noEmit || fail "Producer: tsc falló"
ok "Producer: tsc OK"

step "Producer: ESLint (max-warnings=0)"
npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0 || fail "Producer: eslint falló"
ok "Producer: eslint OK"

step "Producer: Build"
npm run build || fail "Producer: build falló"
ok "Producer: build OK"

step "Producer: Tests + Coverage"
npm run test:cov -- --forceExit || fail "Producer: tests fallaron"
ok "Producer: tests OK"

# ── CONSUMER ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━ Consumer ━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd "$REPO_ROOT/backend/consumer"

step "Consumer: TypeScript check"
npx tsc --noEmit || fail "Consumer: tsc falló"
ok "Consumer: tsc OK"

step "Consumer: ESLint (max-warnings=0)"
npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0 || fail "Consumer: eslint falló"
ok "Consumer: eslint OK"

step "Consumer: Build"
npm run build || fail "Consumer: build falló"
ok "Consumer: build OK"

step "Consumer: Tests + Coverage"
npm run test:cov -- --forceExit || fail "Consumer: tests fallaron"
ok "Consumer: tests OK"

# ── FRONTEND ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}━━━ Frontend ━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd "$REPO_ROOT/frontend"

step "Frontend: TypeScript check"
npx tsc --noEmit || fail "Frontend: tsc falló"
ok "Frontend: tsc OK"

step "Frontend: ESLint (max-warnings=0)"
npx eslint --max-warnings=0 || fail "Frontend: eslint falló"
ok "Frontend: eslint OK"

step "Frontend: Build"
NEXT_TELEMETRY_DISABLED=1 npm run build || fail "Frontend: build falló"
ok "Frontend: build OK"

step "Frontend: Tests + Coverage"
npm run test:cov -- --forceExit || fail "Frontend: tests fallaron"
ok "Frontend: tests OK"

# ── RESULTADO ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ✔ CI LOCAL — TODOS LOS CHECKS     ║${NC}"
echo -e "${GREEN}║       PASARON CORRECTAMENTE          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
