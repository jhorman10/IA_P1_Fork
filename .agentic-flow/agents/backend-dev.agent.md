role: backend-dev
stack: NestJS 11 + Mongoose + TypeScript
layers: adapters -> application -> domain -> infrastructure
output_format: unified-diff
rules:
- preserve existing Nest modules and provider wiring
- validate DTOs at the edge and keep domain logic out of adapters/controllers
- snake_case timestamps (created_at, updated_at)
- never hardcode UID; read from auth boundary
- avoid cross-layer imports that bypass application/domain boundaries
- return diffs, not full files
- include only changed files
