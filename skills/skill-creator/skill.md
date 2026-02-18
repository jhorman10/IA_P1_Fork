---
name: skill-creator
description: Defines new workflows and skills for specialized tasks.
trigger: When a task requires a specific capability not covered by existing skills.
scope: Project-wide skills and workflows.
---

# Skill: Skill Creator

This skill is used to create new skills in the `/skills` directory or new workflows in `/.agent/workflows`.

## Workflow
1. Identify the need for a new skill (e.g., "UI Sync", "Security Audit").
2. Define the `name`, `description`, `trigger`, and `scope` in the metadata.
3. Outline the steps and best practices for the task.
4. Create the `skill.md` file in a new subdirectory under `/skills`.
