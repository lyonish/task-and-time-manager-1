# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Task Schedule Management Platform using the **Speckit framework** - an AI-assisted specification and planning workflow. The project is in early stage with requirements defined but no implementation yet.

## Speckit Workflow

The project follows an 8-phase development process. Execute phases in order using VS Code's AI assistant prompts:

1. **Specify** (`/speckit.specify`) - Generate feature specs from natural language descriptions
2. **Clarify** (`/speckit.clarify`) - Resolve ambiguities in specifications (max 5 questions)
3. **Plan** (`/speckit.plan`) - Create technical design with data models and API contracts
4. **Tasks** (`/speckit.tasks`) - Break down plan into actionable, dependency-tracked tasks
5. **Analyze** (`/speckit.analyze`) - Read-only consistency check across all artifacts
6. **Checklist** (`/speckit.checklist`) - Generate requirements quality validation tests
7. **Implement** (`/speckit.implement`) - Execute tasks with TDD (Red-Green-Refactor)
8. **Constitution** (`/speckit.constitution`) - Manage project principles and governance

## Key Commands

```bash
# Check current feature context (outputs JSON)
.specify/scripts/bash/check-prerequisites.sh --json

# Create new feature branch with sequential numbering
.specify/scripts/bash/create-new-feature.sh "feature-name"

# Initialize planning phase
.specify/scripts/bash/setup-plan.sh
```

## Architecture

```
.specify/
├── memory/constitution.md      # Project principles (READ FIRST)
├── templates/                  # Spec, plan, tasks templates
└── scripts/bash/               # Workflow utilities

.github/agents/                 # Speckit agent definitions (8 agents)

specs/[###-feature-name]/       # Feature artifacts (created per feature)
├── spec.md                     # Requirements & user stories
├── plan.md                     # Technical design
├── tasks.md                    # Actionable task breakdown
├── research.md                 # Design decisions
├── data-model.md               # Entities & relationships
├── contracts/                  # API specifications
├── quickstart.md               # Integration examples
└── checklists/                 # Requirements quality tests
```

## Task Format

Tasks in `tasks.md` use this format:
```
- [ ] [T001] [P] [US1] Description with exact file path
```
- `[P]` = Parallelizable
- `[US1]` = User story label (P1/P2/P3 priority)
- Phases: Setup → Foundational → User Stories → Polish

## Development Principles

- **Constitution-Driven**: `.specify/memory/constitution.md` supersedes other practices
- **Specification-First**: Understand requirements before coding
- **User-Story-Centric**: Each story must be independently testable and deployable
- **TDD Mandatory**: Tests written and failing before implementation
- **Max 3 [NEEDS CLARIFICATION] markers** allowed in specs before planning

## Git Conventions

```bash
git st    # status
git co    # checkout
git cob   # checkout -b
git cm    # commit (signed)
git aa    # add -A
git save  # add -A && commit 'SAVEPOINT'
git wip   # add -u && commit 'WIP'
git undo  # reset HEAD~1 --mixed
```

Signed commits are enabled by default.
