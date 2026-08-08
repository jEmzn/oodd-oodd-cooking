# Oodd Oodd Cooking - Project Summary

## Overview

Oodd Oodd Cooking is a browser cooking game built with HTML, CSS, JavaScript, inline SVG, and an optional Node.js multiplayer server. It presents a top-down kitchen where players collect ingredients, cook customer menus, and serve them before order or game timers expire.

## Project Files

- `index.html` defines the start screen, game screen, HUD, and SVG kitchen scene.
- `styles.css` controls the warm visual theme, layout, responsive behavior, buttons, HUD, SVG labels, and screen switching.
- `game.js` contains movement, proximity detection, interaction scoring, timer management, and game lifecycle logic.
- `server/server.js` serves the frontend and manages authoritative multiplayer rooms and gameplay through Socket.IO.
- `server/package.json` defines the Node.js server dependencies and start commands.
- `AGENTS.md` contains contributor guidance for this repository.
- `DOC.md` is this project summary.

## User Flow

When the page opens, the start screen offers Solo Game and Multiplayer. Solo starts immediately. Multiplayer asks for a temporary display name and lets players create or join a short room code. The lobby supports 2 to 5 players; every player must be Ready before the host can start the shared round. The explicit `[hidden]` CSS rule ensures only the active screen is visible.

After 40 seconds, the game stops, clears its timers and animation loop, waits briefly for a transition, and returns to the start screen. Starting a new round resets the player position, timer, and total score.

## Gameplay

- Move with `WASD` or the arrow keys.
- Walk close to the ingredients, pot, pan, or serve station.
- Press `E` to interact with the nearest object.
- Each successfully served order increases the shared team score.
- A "PRESS E TO INTERACT" prompt appears when an object is within range.
- The HUD displays remaining time and total score; the timer changes color during the final 10 seconds.

## Visual Design

The game world uses inline SVG for the patterned floor, room border, labels, four kitchen stations, player placement, shadows, and interaction prompt. The local player is rendered with `animation_walk/Stand still.png` as a transparent PNG sprite inside the SVG. CSS adds a warm cream, brown, coral, blue, and gold palette, responsive sizing, rounded panels, hover states, and mobile-friendly HUD stacking.

## Technical Notes

Solo mode remains dependency-free in the browser. Multiplayer runs through the Node.js server, which serves the project root and exposes Socket.IO at the same origin. The server keeps active room data in memory, uses server-authoritative movement snapshots, and validates station interactions. Each player has personal inventory and statistics; orders, cooking stations, timers, and team score are shared. Run it with `cd server && npm install && npm start`, then open the printed server URL. Opening `index.html` directly still supports solo mode but cannot connect multiplayer.

## Validation

`node --check game.js` and `node --check server/server.js` pass. The package manifest parses successfully. Source review covered solo mode, room creation and joining, readiness gating, host start permissions, room capacity, server movement bounds, personal inventory, shared cooking and score, order expiry, disconnect cleanup, results rendering, and the explicit hidden-screen CSS rule. Full multiplayer browser validation requires installing the server dependencies and connecting multiple browser sessions.

## Documentation Update

This summary was updated alongside `AGENTS.md` to document the current flat project structure and the repository rule that every completed task must update `DOC.md` with the relevant change and validation status.

## Multiplayer Update

Multiplayer mode now supports temporary names, 5-character room codes, 2 to 5 players, a Ready lobby, host-controlled round start, shared 40-second rounds, 15-second orders, server-authoritative movement, personal inventories, shared stations and score, disconnect removal, and a results screen. Active room data is in-memory and resets when the server restarts.


## Gameplay Update

The game now uses a cooking loop with a 40-second round timer and 15-second customer orders. Garden Soup requires the pot and Sizzling Stir-Fry requires the pan. Players collect ingredients, cook for 2 seconds, and serve the finished menu. Successful service increases the completed-order score and immediately generates a new order. An unserved order expires after 15 seconds, clears unfinished inventory, and immediately generates the next order. Source validation was completed; browser gameplay validation remains recommended for the full timed flow.


## Held Food Indicator

The player displays a small circular SVG food indicator above the avatar while holding ingredients, cooking food, soup, or stir-fry. The indicator follows the player and clears when food is served, an order expires, or a round resets. Source validation was completed; browser visual validation remains recommended.


## Cooking Progress Status

While cooking, a realtime loading bar appears above the active pot or pan and fills over the two-second cooking duration. It reaches 100% and changes to READY at the cooking station. The player must interact with that same pot or pan to pick up the menu; only then does the station status disappear. The status also resets when an order expires or the round ends.


## Cooking Status Reset

Cooking status is explicitly reset to an empty bar at the start of every cooking cycle, ensuring later menus show realtime progress and the READY state consistently.

## Cooking Status Race Fix

The solo cooking animation now stops updating when cooking completes and cancels its pending animation frame before setting the station to READY. This prevents a final animation frame from overwriting READY with COOKING. Source validation is complete; browser validation should confirm that READY remains visible until the food is picked up.

## Player Sprite Update

The local player's original circle-based SVG avatar has been replaced with the transparent `animation_walk/Stand still.png` sprite. The sprite stays centered on the existing player position and preserves the original movement bounds, collision radius, held-food indicator, and interaction behavior. Source validation confirmed the asset reference and SVG layering; browser visual validation remains recommended because browser control was unavailable in the current environment.

## Directional Walk Animation

The local player now uses the images in `animation_walk` as a directional sprite set. Movement remembers the most recent facing direction, switches to a matching standing pose when movement stops, and cycles walking poses every 140 milliseconds while moving. Per-frame SVG dimensions and a shared bottom-center anchor compensate for the source images having different canvas sizes, reducing visible jumping without modifying the original PNG files. Solo movement animates continuously; multiplayer snapshots select the corresponding local-player direction and walking frame. Source review confirmed all sprite paths, directional selection, idle fallback, and reset behavior. Browser visual validation on desktop and a narrow screen remains recommended.

The left- and right-facing standing sprites are displayed about 10% smaller than their original animation sizing while retaining the same bottom-center foot anchor. This better matches their visual scale to the surrounding walking frames without changing the PNG assets.
## Hosted Deployment Preparation

The Node.js server now explicitly listens on `0.0.0.0` and exposes `GET /health` for hosted-service health checks. For Render, configure the repository as a Web Service with root directory `server`, build command `npm install`, and start command `npm start`. The service uses Render's `PORT` environment variable and serves the game and Socket.IO from the same origin. Multiplayer rooms remain in memory and are lost whenever the service restarts or sleeps.

## Multiplayer Movement Synchronization Fix

Multiplayer movement now uses client-side prediction for the local player and smooth interpolation for remote players. The local client moves immediately from current keyboard input, tracks the latest server-authoritative position, and smoothly corrects small drift while snapping only after a large correction. Remote player SVG elements follow server position targets on their own animation frame loop, avoiding visible snapshot jumps. The server movement loop now runs every 50 milliseconds and applies a time-based speed of 150 world units per second so the tick-rate change does not alter movement speed. JavaScript syntax and whitespace validation pass; browser testing with multiple connected sessions remains recommended to confirm perceived smoothness and correction behavior.

## Landscape Mobile Support

Touch devices can now play solo and multiplayer in landscape orientation using press-and-hold directional controls and a dedicated Interact button. Touch movement reuses the existing keyboard input state, supports simultaneous directions, releases safely on pointer cancellation or page blur, and preserves server validation for multiplayer interactions. During gameplay in portrait orientation, a rotate-device prompt is shown and the game content is temporarily hidden until the device is landscape. Responsive landscape rules account for short phone screens and safe-area insets. Source validation was completed; browser testing on physical landscape phones and tablets remains recommended.

## Mobile Viewport Fit

The mobile viewport metadata now includes safe-area support, and the page prevents horizontal overflow. Short landscape touch screens use the dynamic viewport height and fit the kitchen SVG inside the remaining space below the HUD, keeping the controls and game message within the visible browser viewport instead of extending the page vertically. Source validation was completed; testing across mobile browser address-bar states remains recommended.

## Landscape Breakpoint Compatibility

The compact landscape layout now applies to all coarse-pointer landscape devices instead of relying on a fixed viewport-height cutoff. This covers mobile browsers that report a taller layout viewport while browser chrome is visible, preventing the kitchen scene from collapsing below the visible screen.

## Mobile Kitchen Scale

The landscape game world uses the height remaining after the compact HUD and game message instead of a fixed dynamic-viewport percentage. The kitchen SVG, stations, player avatar, and remote players therefore scale into the available space while the order card and touch controls remain bounded inside the game stage.

## 640x360 Landscape Layout

The mobile layout is now designed around a 640x360 CSS viewport and remains responsive across landscape sizes. The kitchen, order card, and touch controls share a bounded game stage: the kitchen uses the remaining height after the compact HUD and message, the order card overlays the stage at top-left, and controls are anchored inside the stage at the bottom. The SVG keeps its full aspect ratio with `object-fit: contain`, so the complete kitchen remains visible without page scrolling. The ingredients station was moved to the lower-left of the kitchen, with matching client and server coordinates, leaving the top-left game area available for the order card. Source validation was completed; browser validation at 640x360 and physical mobile sizes remains recommended.

## Results Replay

Solo rounds now end on the results screen instead of returning directly to the start screen. The results screen includes a Play Again button that immediately starts a new solo round, while multiplayer Play Again returns the room to its lobby so the host can prepare another round. Return to Start remains available. Source validation was completed; browser validation of solo timeout and multiplayer replay remains recommended.

## Game Text Copy Protection

Text selection, copying, cutting, and context-menu actions are disabled within the game screen, including HUD text, order details, SVG labels, prompts, and status messages. Other screens remain selectable and copyable, and game controls continue to accept keyboard, pointer, and touch input. Source validation was completed; browser validation of desktop selection and mobile long-press behavior remains recommended.
