# CLAUDE.md

## Project identity
CyberPet is a macOS companion app for Kibo.

## Product goal
Build a local-first macOS companion that uses camera-driven face geometry and visible non-sensitive cues to automatically generate and animate a robotic mascot.

## Source of truth
Use these files in this order:
1. docs/spec.md
2. docs/design/DESIGN.md
3. docs/references.md
4. docs/backlog/claude_code_build_guide_detailed.csv
5. MEMORY.md
6. docs/hindsight.md
7. docs/primer.md

If a PDF exists, treat it as reference only.

## Working rules
- Plan before coding.
- Implement only one approved backlog row at a time.
- Keep changes PR-sized.
- Review against acceptance criteria before merge.
- Wait for approval before starting the next task.
- Follow security checks before commit or push.

## Security gate
Claude may code without manual intervention, but every commit must pass:
- local secret scan
- security review for risky changes
- GitHub push protection when available

Do not commit:
- API keys
- tokens
- passwords
- private keys
- .env files
- certificates
- raw sensitive data

## What not to change without approval
Do not change:
- product direction
- security/privacy model
- permission model
- brand identity
- release workflow
- data model affecting user-facing behavior

## Backlog usage
For each task row, read:
- Epic
- Task ID
- Task Name
- Spec
- Acceptance Criteria
- API
- DB
- Frontend
- Priority
- Phase

Then plan, implement, review, and stop.

## Preferred workflow
- Plan with Opus
- Execute with Sonnet
- Review like a PR
- Merge only after approval

## Docs behavior
If a durable product or architecture decision changes:
- update MEMORY.md
- update docs/spec.md if needed
- add lessons to docs/hindsight.md
