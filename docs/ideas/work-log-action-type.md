# Work Log — Action Type (Type of Work)

**Status:** On hold  
**Date discussed:** 2026-05-02

## Feature idea

Add an **Action** (or "Type of Work") field to each work log entry, representing the kind of work performed (e.g. research, coding, education). It will eventually feed into statistics.

- Displayed as a selectable button/chip in the work log table
- Positioned between the **Task** column and the **Note** column
- Applies to both personal and team schedule views

## Design decision: where to define options

### Question
Options could be defined at the project level, group/team level, or workspace level. Which is the right scope?

### Decision: Workspace level

Define action types at the **workspace level** (not per project or group).

**Why:**
- Work logs are already cross-project — a person logs entries across multiple projects in a day, and some entries have no task at all
- If options were project-scoped, the available choices would shift depending on which task is selected, and would be undefined for task-free entries
- Workspace-level keeps options stable regardless of task selection
- Makes cross-project statistics coherent (e.g. "how much time did the team spend on Research this month?")

**Tradeoff:**
- Loses per-project nuance (e.g. a design project's "Wireframing" vs. an engineering project's "Code Review")
- In practice, a shared workspace list handles this fine — irrelevant types are simply not used

### Start with a fixed default list

Rather than building a full admin config UI upfront, ship with a sensible default set and let customization come later once real usage shapes the right options.

Proposed defaults:

| Action | Description |
|---|---|
| Planning | Specs, estimates, scoping |
| Research | Exploration, investigation |
| Design | UI/UX, architecture |
| Coding | Implementation |
| Review | Code review, QA, testing |
| Meeting | Syncs, standups, 1:1s |
| Documentation | Writing, specs |
| Education | Learning, reading, courses |
| Support | Customer / stakeholder communication |

## Implementation notes (when picked up)

- Add `actionType` column to `work_logs` table (nullable enum or varchar)
- Workspace-level config table (or hardcode defaults first) for available types
- UI: button/chip selector between Task and Note columns — single select, clearable
- Statistics: group logged hours by action type per user / per workspace / per date range
