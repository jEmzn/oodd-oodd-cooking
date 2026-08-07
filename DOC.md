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
