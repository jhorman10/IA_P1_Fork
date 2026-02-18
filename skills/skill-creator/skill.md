---
name: skill-creator
description: Creates new skills and workflows when no existing skill covers a task.
trigger: When a task requires a specific capability not covered by existing skills in /skills.
scope: skills/, .agent/workflows/
author: "IA_P1_Fork Team"
version: "1.0.0"
license: "MIT"
autoinvoke: true
---

# Skill: Skill Creator

## Purpose
This meta-skill is used to define new skills when the orchestrator encounters feedback that doesn't match any existing skill trigger.

## Tools Permitted
- **Read/Write:** Files within `skills/` directory only
- **Explore:** Use `grep`/`glob` to check for existing skills that might overlap
- **Terminal:** `bash scripts/sync.sh` to update Skill References after creation

## Workflow
1. Identify the gap: what type of task is not covered?
2. Verify no existing skill covers this (grep triggers in all `skill.md` files).
3. Define the new skill metadata (see Template below).
4. Create the skill directory: `skills/<skill-name>/`
5. Write `skill.md` with YAML frontmatter + rules + workflow.
6. Create `assets/templates/` with at least one one-shot example.
7. Create `assets/docs/` with relevant documentation.
8. Run `bash scripts/sync.sh` to register the new skill in `agent.md`.
9. Return Action Summary (see `skills/action-summary-template.md`).

## Template — Required Metadata

```yaml
---
name: "<skill-name>"
description: "<purpose>"
trigger: "<activation keywords>"
scope: "<directories/files in scope>"
author: "IA_P1_Fork Team"
version: "1.0.0"
license: "MIT"
autoinvoke: true
---
```

## Template — Required Sections

```markdown
# Skill: <Name>

## Context
<Brief project context relevant to this skill>

## Rules
1. <Rule 1>
2. <Rule 2>

## Tools Permitted
- **Read/Write:** <scope>
- **Explore:** <search tools>
- **Terminal:** <allowed commands>

## Workflow
1. <Step 1>
2. <Step 2>

## Assets
- `assets/templates/<example>` — <description>
- `assets/docs/<doc>` — <description>
```
