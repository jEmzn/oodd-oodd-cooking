# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-light browser cooking game with optional LAN phone controllers:

- `index.html` contains the start, local co-op setup, game, and results screens, plus the inline SVG kitchen scene.
- `styles.css` contains the warm visual theme, responsive layout, HUD, controls, screen visibility, and mobile landscape rules.
- `game.js` contains the browser-authoritative Solo/local co-op engine, per-player input and inventory, shared stations/orders/score, timers, and sprite animation.
- `recipes.js` contains shared ingredients, transformations, six menus, assembly rules, and food asset paths.
- `controller.html`, `controller.css`, and `controller.js` implement the phone-as-controller UI.
- `server/server.js` serves the frontend and relays controller input through Socket.IO inside the local network; it does not own gameplay state.
- `server/package.json` defines the relay scripts and Express, Socket.IO, and QR-code dependencies.
- `pork_nae_animation/` contains the active directional sprite frames; `animation_walk/` retains the earlier set.
- `test/` contains recipe, headless-browser, local co-op, and multi-client relay checks.
- `DOC.md` is the maintained project summary and task history reference.

Keep the current layout unless the project grows enough to justify grouping files. Keep the kitchen SVG inline in `index.html` and keep Solo/two-keyboard play usable without the server.

## Build, Test, and Development Commands

The client has no build step. Open `index.html` directly for Solo or two-keyboard local co-op. Phone controllers require the local relay:

```sh
cd server
npm install
npm start
```

Open the printed local URL on the computer and use the in-game QR for phones on the same Wi-Fi/hotspot. Use `npm run dev` for Node's watch mode. Validation commands are:

```sh
cd server
npm run check
npm test
npm run test:relay
npm run test:browser:solo
npm run test:browser:local
```

Browser checks require Chromium remote debugging at port `9223`; relay/browser checks expect the local server at port `3210`.

## Coding Style & Naming Conventions

Use two-space indentation and semicolons in JavaScript. Use descriptive camelCase JavaScript names, kebab-case HTML/CSS IDs and classes, and lowercase file names. Preserve the existing warm, responsive visual style. Avoid external client dependencies; server dependencies belong in `server/package.json`.

When changing player sprites, preserve the shared bottom-center foot anchor and update directional frame dimensions in `game.js` if needed. Gameplay coordinates exist only in the browser; the relay must remain unaware of game state.

## Testing Guidelines

Manually verify:

- Start screen, Solo start, results screen, Play Again, and Return to Start.
- Solo WASD/arrow/touch movement, Player 1 `WASD` + `E`, and Player 2 arrows + `Enter`.
- Ingredient collection, two-second cooking, READY pickup, serving, score updates, order queue growth, 60-second order expiry, and the two-minute timeout.
- Desktop layout, narrow layout, landscape touch controls, portrait rotate-device warning, fullscreen, music, and sprite direction changes.
- Local co-op with 0–2 keyboard slots and phone controllers up to five total players, independent inventories, shared orders/stations/score, results, and replay.
- LAN QR joining, controller movement/interactions/rice choices, capacity, 30-second reconnect, disconnect input cleanup, and host session closure.

Real-device phone validation requires all devices on the same LAN and may require accepting the operating system firewall prompt.

## Documentation Maintenance

After every completed task, update `DOC.md` with the change, relevant behavior, and validation status. Keep the summary accurate as files, controls, structure, gameplay, and technical constraints change.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects such as `Add local phone controllers`. Keep unrelated changes separate. Pull requests should describe behavior changes, list validation steps, and include screenshots or sample output for visible changes.

## Security & Configuration

Do not commit secrets, credentials, local environment files, or generated dependency directories. Controller sessions and reconnect tokens are intentionally in-memory and should not be treated as persistent storage. The relay is designed for a trusted local network, not public deployment. Review future third-party scripts and dependencies before adding them.
