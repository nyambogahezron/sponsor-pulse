# AI Agent Instructions

Welcome to the SponsorPulse repository! When acting as an AI assistant, developer, or agent in this workspace, you must adhere to the project's specialized skills.

## Skill Integration

This repository defines structured capabilities in the `.agents/skills/` directory. You are expected to recognize the context of the user's prompt and automatically apply the relevant skill guidelines.

### Registered Skills:

*   **`chrome-extension-development`**: Guidelines for background scripts, content scripts, security, and Manifest V3.
*   **`chrome-extension-ui`**: Design and UX guidelines for the extension's user interface (popups, options, side panels).
*   **`ci-cd-and-automation`**: Best practices for Docker, GitHub Actions, and deployment pipelines.
*   **`gemini-interactions-api`**: Standards for implementing AI features and LLM pipelines using the Gemini API.
*   **`hono-typescript`**: Architecture and coding standards for the Hono backend server and APIs.

### Agent Workflow

1.  **Context Detection**: Analyze the user's request to determine the required tech stack and domain.
2.  **Skill Activation**: Always cross-reference your knowledge with the `SKILL.md` file in the corresponding `.agents/skills/<skill-name>/` directory. You can use your file reading tools to view these instructions.
3.  **Execution**: Generate code, architecture designs, or explanations that strictly conform to the activated skill's rules.
