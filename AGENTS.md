# Repository Guidelines

## Project Structure & Module Organization

This checkout currently contains no source files, tests, assets, or build configuration. As the project is added, keep production code under a clearly named source directory (for example, `src/`), tests under `tests/` or alongside modules using the project framework’s convention, and static files under `assets/` or `public/`. Keep reusable modules focused and avoid placing generated output in version control.

## Build, Test, and Development Commands

No build or development commands are defined yet. When introducing tooling, document the canonical commands in the project README and package configuration. Prefer stable, repeatable commands such as:

- `npm install` — install declared dependencies.
- `npm run build` — produce a production build.
- `npm test` — run the complete automated test suite.
- `npm run lint` — check formatting and static-analysis rules.

Use the equivalent commands for the chosen language or build system if this repository adopts something other than Node.js.

## Coding Style & Naming Conventions

Follow the formatter and linter selected by the project; configuration should live in the repository (for example, `.editorconfig`, `eslint.config.js`, or `pyproject.toml`). Use spaces rather than tabs unless the adopted toolchain requires otherwise. Name files and directories consistently, use descriptive names, and keep public APIs documented. Do not commit temporary files, local environment files, credentials, or build artifacts.

## Testing Guidelines

Add tests for new behavior and regression fixes. Name test files according to the selected framework (for example, `*.test.ts` or `test_*.py`) and keep tests deterministic. Run the full suite and lint checks before opening a pull request; add coverage requirements when a test framework is introduced.

## Commit & Pull Request Guidelines

No Git history is available in this checkout, so no existing commit convention can be inferred. Use short, imperative commit subjects (for example, `Add recipe parser`) and keep unrelated changes separate. Pull requests should explain the behavior change, link related issues, include validation commands and results, and attach screenshots or sample output when the change affects user-visible behavior.

## Security & Configuration

Store secrets only in local environment files excluded by `.gitignore` or in the project’s approved secret manager. Provide safe example configuration such as `.env.example`, validate external input, and review dependency changes before merging.
