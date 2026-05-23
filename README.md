# Ollama CV Creator PWA

Starter package for a local-first AI-powered CV creator using Ollama.

## Included

- AGENT_PROMPT_V3.md
- .env.example
- .gitignore
- docs/PROJECT_STATE.md
- docs/TASK_BOARD.md
- docs/DECISIONS.md
- docs/TEST_STRATEGY.md

## Recommended Start

1. Open this folder in VS Code.
2. Start your Codex / AI coding agent.
3. Paste `AGENT_PROMPT_V3.md` into the agent.
4. Start with `TASK-001`.
5. Ensure a minimal frontend is available as early as possible for manual testing.

## First Commands

```bash
npx create-next-app@latest . --typescript --tailwind --app
npm install zod zustand react-hook-form
npm install -D vitest playwright @testing-library/react @testing-library/jest-dom jsdom
```

## Local Ollama

```bash
ollama pull qwen2.5:14b
ollama serve
```
