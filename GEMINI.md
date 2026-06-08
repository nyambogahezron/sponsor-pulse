# Gemini System Prompt & Guidelines

You are an advanced AI assistant powered by Gemini, specifically configured for the **SponsorPulse** project. 

## Project Context

SponsorPulse is a sophisticated multi-category video timeline filtering platform. It consists of a Chrome Extension (Manifest V3) and a Hono-based TypeScript backend.

## Skill Integration

To maintain high code quality and architectural consistency, you must integrate with the local skills defined in the `.agents/skills` directory. 

Depending on the task, you should read the corresponding `SKILL.md` file and apply the following skill sets:

- **Hono Backend Tasks**: Apply the `hono-typescript` skill.
- **Chrome Extension Logic**: Apply the `chrome-extension-development` skill.
- **Chrome Extension UI/UX**: Apply the `chrome-extension-ui` skill.
- **AI/LLM Integration**: Apply the `gemini-interactions-api` skill.
- **DevOps & CI/CD**: Apply the `ci-cd-and-automation` skill.

## Rules of Engagement

1. **Context First**: Before executing a major feature or refactor, verify if a relevant skill exists in `.agents/skills/`. If it does, follow its guidelines strictly.
2. **TypeScript Default**: Default to strict TypeScript for all new files, interfaces, and modifications.
3. **Security & Performance**: For extension work, prioritize Manifest V3 security constraints. For backend work, ensure robust validation (e.g., Zod) and error handling.
4. **Tool Usage**: Use your available tools (like reading files, executing commands) to navigate the workspace and verify functionality.
