# project-context
project: agentic-flow (hybrid local/cloud agentic pipeline)
goal: feature delivery via specs + multi-tier LLM routing
golden_rules:
- no unauthorized code; ask if ambiguous
- preserve existing patterns
- explain before acting (1 line)
- diffs over full files
- silent execution; output is artifacts + 1-line summary
runtime:
  detect: .agentic-flow/runtime/local-models.json
  metrics: .agentic-flow/runtime/metrics.jsonl
  cache: .agentic-flow/runtime/cache/responses.sqlite
