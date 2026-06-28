# Contributing

Thanks for wanting to contribute to Sponsor Pulse! We welcome bug reports, documentation improvements, tests, and small focused changes.

How to contribute
- Fork the repository and create a feature branch named `fix/...` or `feat/...`.
- Open an issue first for larger changes to discuss design.
- Keep PRs small and focused; include a clear description and the problem it solves.

Development setup
- We use a Turborepo monorepo powered by Bun. See the [Development Guide](docs/development.md) for complete details.
- Install dependencies at the repository root: `bun install`
- Run all dev servers simultaneously: `bun run dev`
- Run typechecking and linting: `bun run typecheck` and `bun run lint`

Code style and tests
- Follow existing TypeScript and formatting conventions.
- Add tests for bug fixes and new features when possible.

Commit messages
- Use clear, imperative messages (e.g., "Fix sponsor skip timing").

Pull requests
- Target the `main` branch by default.
- Include a brief changelog entry and link to the related issue.
- A maintainer will review and request changes if necessary.

Need help?
- Open an issue or ask in a PR comment — maintainers will help you get unstuck.
