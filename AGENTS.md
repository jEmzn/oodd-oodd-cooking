# Repository Guidelines

## Project Structure & Module Organization

This is a small dependency-free browser game with a flat project layout:

- `index.html` contains the start screen, game screen, HUD, and inline SVG kitchen scene.
- `styles.css` contains the visual theme, responsive layout, button states, HUD styling, and screen visibility rules.
- `game.js` contains movement, object proximity checks, `E` interactions, scoring, the countdown, and round reset/timeout behavior.
- `DOC.md` is the maintained project summary and task history reference.
- `AGENTS.md` contains these contributor instructions.

There are currently no separate source, test, asset, or build directories. Keep the flat layout unless the project grows enough to justify grouping files.

## Build, Test, and Development Commands

No build step or package manager is required. Open `index.html` directly in a modern browser to run the game. Use a local static server when browser security restrictions require one. Node.js is not currently installed in the development environment, so `node --check` is unavailable.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons in JavaScript, descriptive camelCase JavaScript names, kebab-case HTML/CSS IDs and classes, and lowercase file names. Keep the SVG inline in `index.html` and avoid external dependencies unless the project requirements change. Preserve the existing warm, responsive visual style.

## Testing Guidelines

Manually verify the start screen, Play Game transition, WASD/arrow movement, proximity prompt, `E` interactions, score updates, 30-second timeout, and return to the start screen. Check both desktop and narrow-screen layouts. Add automated tests if the project later adopts a test framework.

## Documentation Maintenance

After every completed task, update `DOC.md` with the change, relevant behavior, and validation status. Keep the summary accurate as files, controls, structure, or technical constraints change.

## Commit & Pull Request Guidelines

No Git history is available, so use short, imperative commit subjects such as `Fix game screen switching`. Keep unrelated changes separate. Pull requests should describe behavior changes, list validation steps, and include screenshots or sample output for visible changes.

## Security & Configuration

Do not commit secrets, credentials, or local environment files. Keep the app dependency-free where practical and review any future third-party scripts before adding them.
