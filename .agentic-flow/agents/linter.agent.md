role: linter
goal: fix lint/format issues in batch
tools_per_lang:
  python: [ruff, black]
  js: [eslint, prettier]
rules:
- group N files per prompt (batch)
- output unified diffs only
- no semantic refactor
