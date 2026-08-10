# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-light browser cooking game with an optional Node.js multiplayer server:

- `index.html` contains the start, multiplayer setup, lobby, game, and results screens, plus the inline SVG kitchen scene.
- `styles.css` contains the warm visual theme, responsive layout, HUD, controls, screen visibility, and mobile landscape rules.
- `game.js` contains solo gameplay, movement, proximity checks, `E` interactions, cooking, order queues, timers, sprite animation, and multiplayer client synchronization.
- `server/server.js` serves the frontend and implements Socket.IO rooms, lobby readiness, authoritative movement, cooking stations, orders, scoring, and round lifecycle.
- `server/package.json` defines the server scripts and Express/Socket.IO dependencies.
- `animation_walk/` contains the local player's directional PNG sprite frames.
- `DOC.md` is the maintained project summary and task history reference.
- `AGENTS.md` contains these contributor instructions.

Keep the current layout unless the project grows enough to justify grouping files. Keep the kitchen SVG inline in `index.html` and keep solo mode usable without the server.

## Build, Test, and Development Commands

The client has no build step. Open `index.html` directly for solo mode. Multiplayer requires the server:

```sh
cd server
npm install
npm start
```

Then open the printed local URL. The server serves the project root and Socket.IO from the same origin. Use `npm run dev` for Node's watch mode when appropriate. Available syntax checks are:

```sh
node --check game.js
node --check server/server.js
```

## Coding Style & Naming Conventions

Use two-space indentation and semicolons in JavaScript. Use descriptive camelCase JavaScript names, kebab-case HTML/CSS IDs and classes, and lowercase file names. Preserve the existing warm, responsive visual style. Avoid external client dependencies; server dependencies belong in `server/package.json`.

When changing player sprites, preserve the shared bottom-center foot anchor and update directional frame dimensions in `game.js` if needed. Keep client and server station coordinates and movement bounds synchronized.

## Testing Guidelines

Manually verify:

- Start screen, solo start, results screen, Play Again, and Return to Start.
- WASD/arrow movement, touch movement, interaction prompts, and `E`/touch interaction.
- Ingredient collection, two-second pot/pan cooking, READY pickup, serving, score updates, order queue growth, order expiry, and the 40-second timeout.
- Desktop layout, narrow layout, landscape touch controls, portrait rotate-device warning, and sprite direction changes.
- Multiplayer name entry, room creation/joining, 2–5 player capacity, readiness gating, host start permissions, movement synchronization, shared orders/stations/score, disconnect cleanup, results, and replay.

Add automated tests if the project later adopts a test framework. Full multiplayer validation requires the server dependencies and multiple browser sessions.

## Documentation Maintenance

After every completed task, update `DOC.md` with the change, relevant behavior, and validation status. Keep the summary accurate as files, controls, structure, gameplay, and technical constraints change.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects such as `Fix game screen switching`. Keep unrelated changes separate. Pull requests should describe behavior changes, list validation steps, and include screenshots or sample output for visible changes.

## Security & Configuration

Do not commit secrets, credentials, local environment files, or generated dependency directories. Multiplayer room data is intentionally in-memory and should not be treated as persistent storage. Review future third-party scripts and dependencies before adding them.
