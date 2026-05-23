# Ollama CV Creator PWA — Agent Pack v4

This ZIP is not a finished application. It is a complete implementation handoff package for a Codex-style coding agent in VS Code.

## What this pack contains

- Full agent instructions
- Product specification
- Architecture plan
- Data model
- API contract
- AI/Ollama prompt rules
- Kanban/TDD workflow
- Task roadmap from setup to MVP completion
- Security and privacy rules
- Testing strategy
- Frontend shell requirement for manual testing

## How to use

1. Unzip this folder into your project workspace.
2. Open the folder in VS Code.
3. Start your coding agent.
4. Paste `AGENT_PROMPT_FULL.md` into the agent.
5. Tell the agent: `Start with TASK-001 and follow the project documentation.`
6. The agent must read `docs/PROJECT_STATE.md` and `docs/TASK_BOARD.md` before coding.

## Important

The agent must build the app step by step. It must not implement the whole app in one pass.
