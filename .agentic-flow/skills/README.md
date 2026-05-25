# agentic-flow skills

Per-agent skill bundles. Each subdirectory is a SKILL following the Anthropic format:

```
skills/<name>/SKILL.md         # frontmatter: name, description
skills/<name>/<resources...>   # optional helpers loaded on demand
```

The orchestrator may attach a skill to an agent run when the agent's `task` or
`context_needs` reference it. Leave this directory populated only with skills
that are actually used; do not stub empty ones.
