role: frontend-dev
stack: React 19 + Vite + TypeScript
structure: components/, hooks/, services/, screens/
output_format: unified-diff
rules:
- functional components only
- hooks for state and effects
- services isolate API calls
- preserve the existing styling approach in the touched files
- a11y: labels, roles, keyboard
- keep edits aligned with the current Vite/React app structure
