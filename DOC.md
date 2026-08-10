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

After 60 seconds, the game stops, clears its timers and animation loop, waits briefly for a transition, and returns to the start screen. Starting a new round resets the player position, timer, and total score.

## Gameplay

- Move with `WASD` or the arrow keys.
- Walk close to the ingredients, rice, pot, pan, grill, trash, or serve station.
- Press `E` to interact with the nearest object.
- Each successfully served order increases the shared team score.
- A "PRESS E TO INTERACT" prompt appears when an object is within range.
- The HUD displays remaining time and total score; the timer changes color during the final 10 seconds.

## Visual Design

The game world uses inline SVG for the patterned floor, room border, labels, four kitchen stations, player placement, shadows, and interaction prompt. The local player is rendered with transparent PNG sprites from `pork_nae_animation` inside the SVG. CSS adds a warm cream, brown, coral, blue, and gold palette, responsive sizing, rounded panels, hover states, and mobile-friendly HUD stacking.

## Technical Notes

Solo mode remains dependency-free in the browser. Multiplayer runs through the Node.js server, which serves the project root and exposes Socket.IO at the same origin. The server keeps active room data in memory, uses server-authoritative movement snapshots, and validates station interactions. Each player has personal inventory and statistics; orders, cooking stations, timers, and team score are shared. Run it with `cd server && npm install && npm start`, then open the printed server URL. Opening `index.html` directly still supports solo mode but cannot connect multiplayer.

## Validation

`node --check game.js` and `node --check server/server.js` pass. The package manifest parses successfully. Source review covered solo mode, room creation and joining, readiness gating, host start permissions, room capacity, server movement bounds, personal inventory, shared cooking and score, order expiry, disconnect cleanup, results rendering, and the explicit hidden-screen CSS rule. Full multiplayer browser validation requires installing the server dependencies and connecting multiple browser sessions.

## Documentation Update

This summary was updated alongside `AGENTS.md` to document the current flat project structure and the repository rule that every completed task must update `DOC.md` with the relevant change and validation status.

## Multiplayer Update

Multiplayer mode now supports temporary names, 5-character room codes, 2 to 5 players, a Ready lobby, host-controlled round start, shared 60-second rounds, 15-second orders, server-authoritative movement, personal inventories, shared stations and score, disconnect removal, and a results screen. Active room data is in-memory and resets when the server restarts.


## Gameplay Update

The game uses a cooking loop with a 60-second round timer and 15-second customer orders. Garden Soup requires vegetables and herbs at the pot, Sizzling Stir-Fry requires vegetables and sauce at the pan, and Grilled Pork Skewers require pork, bell pepper, and onion at the grill. The shared ingredient station visually includes vegetables and pork and supplies the ingredient bundle for the current order. Players collect ingredients, cook for 2 seconds, and serve the finished menu. Successful service increases the completed-order score and immediately generates a new order. An unserved order expires after 15 seconds, clears unfinished inventory, and immediately generates the next order. Source validation was completed; browser gameplay validation remains recommended for the full timed flow.


## Held Food Indicator

The player displays a small circular SVG food indicator above the avatar while holding ingredients, cooking food, soup, or stir-fry. The indicator follows the player and clears when food is served, an order expires, or a round resets. Source validation was completed; browser visual validation remains recommended.


## Cooking Progress Status

While cooking, a realtime loading bar appears above the active pot, pan, or grill and fills over the two-second cooking duration. It reaches 100% and changes to READY at the cooking station. The player must interact with that same station to pick up the menu; only then does the station status disappear. The status also resets when an order expires or the round ends.


## Cooking Status Reset

Cooking status is explicitly reset to an empty bar at the start of every cooking cycle, ensuring later menus show realtime progress and the READY state consistently.

## Cooking Status Race Fix

The solo cooking animation now stops updating when cooking completes and cancels its pending animation frame before setting the station to READY. This prevents a final animation frame from overwriting READY with COOKING. Source validation is complete; browser validation should confirm that READY remains visible until the food is picked up.

## Player Sprite Update

The local player's original circle-based SVG avatar was replaced with a transparent PNG sprite. The current sprite stays centered on the existing player position and preserves the original movement bounds, collision radius, held-food indicator, and interaction behavior.

## Directional Walk Animation

The local player uses a directional sprite set. Movement remembers the most recent facing direction, switches to the standing pose when movement stops, and cycles directional poses every 140 milliseconds while moving. A shared bottom-center anchor reduces visible jumping without modifying the original PNG files. Solo movement animates continuously; multiplayer snapshots select the corresponding local-player direction and walking frame.

All current Pork Nae poses use a consistent SVG frame size while retaining the same bottom-center foot anchor.

## Walking Sound

The local character now plays `Sound/walking-for-cartoon.mp3` at 50% volume while moving in Solo or Multiplayer mode. The sound loops during continuous movement, stops and resets as soon as the character becomes idle, and is also cleared when the round ends or the game screen closes. Source review confirmed the sound path and movement-state integration; browser audio validation remains recommended because autoplay handling can vary between browsers.

## Movement Speed Adjustment

Player movement speed was reduced from 4.5 to 3.5 movement units per update in both Solo and Multiplayer modes, giving the character a slower walking pace while keeping diagonal movement normalized. Source validation confirmed that the browser and authoritative server use the same value; browser feel testing remains recommended.

## Start Screen Poster

The start screen displays `image/POSTERgame.png` on desktop without cropping, using a matching brown background to fill any extra space. On screens up to 650px wide, it switches to the portrait `image/Posterlobby(mb).png` artwork and fills the mobile viewport. Both layouts include a subtle lower gradient for button contrast. The separate HTML eyebrow, game heading, and description were removed because the posters already include the game branding. Only the Solo Game and Multiplayer buttons remain near the bottom of the screen. Source and responsive CSS review are complete; browser validation on representative phones remains recommended.

The start-screen Solo Game and Multiplayer buttons were moved higher above the bottom edge using responsive viewport-based spacing on both desktop and mobile layouts. Source validation is complete; browser visual validation remains recommended.

## Lobby Background Music

The start-screen lobby now plays `Sound/background-music-lobby.mp3` at 35% volume and loops continuously when the track ends. The music stops and resets when leaving the start screen, then starts again when returning. Playback is retried on the first pointer or keyboard interaction to comply with browser autoplay restrictions. Source validation confirmed the audio path, looping state, screen transitions, and interaction fallback; browser audio validation remains recommended on desktop and mobile.

## Music Toggle

The start-screen lobby now includes a bottom-right Music/Music Off toggle with a mobile-sized touch target, visible focus treatment, and accessible pressed-state labeling. The control mutes or restores lobby and gameplay music for the current page session while leaving walking audio enabled. Source validation confirmed the shared music state and responsive positioning; browser interaction testing remains recommended.

The sound toggle is inset farther from the right edge on desktop and mobile so it sits slightly more toward the left while remaining in the lower-right area.

## Exit Game Control

The active game screen now includes an `Exit Game` button fixed at the upper-right corner with safe-area spacing and keyboard focus styling. Exiting immediately stops the round, movement animation, timers, cooking state, and walking audio before returning to the start screen. In Multiplayer mode it also leaves the current room and clears remote-player state. Source validation confirmed the cleanup path and event binding; browser testing remains recommended for both modes.

## Gameplay Background Music

The game screen now plays `Sound/background-music-map2.mp3` at 35% volume in both Solo and Multiplayer modes. The track loops continuously when it ends and stops and resets when gameplay ends or the player leaves the game screen. The existing Music/Music Off control also applies to gameplay music. Source validation confirmed the audio path, loop configuration, screen lifecycle integration, and shared mute state; browser audio testing remains recommended.

The game screen now displays its own lower-right Music/Music Off button because the original control belongs to the hidden start screen. Both controls share and immediately reflect the same music state, covering lobby and gameplay music without muting walking sound. Source validation confirmed both event bindings and synchronized labels.
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

## Timed Order Queue

Solo and multiplayer rounds now maintain a shared-style queue of up to five customer orders. One order appears when a round starts, and the game attempts to add another order every seven seconds while the queue has space. Each order has its own 15-second expiry timer; generation pauses at five queued orders. The game UI displays all waiting orders with individual countdowns.

Cooking is now free-form: players may collect ingredients and cook Garden Soup at the pot or Sizzling Stir-Fry at the pan without following a particular displayed order. Serving removes the oldest waiting order matching the held dish and increases the score. A cooked dish remains in the player inventory when no matching order is available. The multiplayer `room-state` payload now sends an `orders` array instead of a single `currentOrder` and shared `orderSecondsLeft` value. JavaScript syntax validation passes; browser validation of timed queue growth, expiry, serving, and mobile layout remains recommended.

## Repository Guidelines Update

`AGENTS.md` now documents the current client/server structure, sprite assets, multiplayer development commands, 40-second gameplay validation checklist, synchronization requirements, and server-specific security considerations. Syntax validation with `node --check game.js` and `node --check server/server.js` passes; browser validation remains recommended for the full solo and multiplayer flows.

## Mobile Home Screen Fit

The start screen now uses the dynamic viewport and safe-area padding, prevents home-screen scrolling, and reduces title, intro, and button spacing on small screens. Mobile landscape and wider portrait layouts keep Solo Game and Multiplayer side by side; very narrow portrait screens stack the buttons as a fallback. Source validation passed; browser validation at narrow portrait, wider portrait, and 640x360 landscape sizes remains recommended.

## Landscape Fullscreen Gameplay

Gameplay now includes a Fullscreen toggle in the HUD. Solo and multiplayer modes use the standard Fullscreen API when available, with Safari-prefixed support and an expanded dynamic-viewport fallback when native fullscreen is rejected. Fullscreen state synchronizes with browser exit controls, attempts landscape orientation locking where supported, and is cleared when leaving gameplay. Source validation passed; Chrome, Safari, Android landscape, and iOS/iPadOS landscape browser validation remains recommended.

## Mobile Fullscreen Layout Fix

Fullscreen mobile landscape mode now restores the cream game background and compact landscape HUD/order-card styling. The order queue remains bounded and scrollable, preventing multiple orders from covering the pot or player, while the complete kitchen and touch controls retain their landscape placement. Source validation passed; fullscreen screenshot validation on Chrome and Safari landscape devices remains recommended.
## Pork Nae Character Update

The local player now uses the four transparent PNG poses from `pork_nae_animation` instead of the previous `animation_walk` character. The standing, forward, left, and right poses are mapped to the existing directional movement system with a shared bottom-center anchor and consistent frame size. Source validation confirmed that the initial SVG sprite and all runtime sprite references use the new asset folder; browser visual validation remains recommended.

## Shared Multiplayer Cooking Stations

The multiplayer pot, pan, and grill are shared room resources. Once a player starts cooking, every other player sees the station's cooking or ready status and cannot use that station until its owner picks up the finished food or the order resets. The server checks station occupancy before inventory requirements and reports which player is using the station. JavaScript syntax validation passed; multi-client browser validation remains recommended.

## Shared Multiplayer Held Items

Remote players now display their held item above their character. Ingredients, completed soup, and completed stir-fry are derived from each player's server-synchronized inventory, so everyone in the room can see what the other players are carrying. The indicator disappears while the food is at a cooking station and after it is served or reset. JavaScript syntax and whitespace validation passed; multi-client visual validation remains recommended.

## Local Multiplayer Movement Rendering Fix

The local multiplayer client now copies each server movement snapshot into its authoritative position before reconciling the predicted position. Prediction is initialized from the server only when a round starts, preventing the animation loop from repeatedly pulling the local character back to the spawn point while other clients can still see it moving. JavaScript syntax and whitespace validation passed; multi-client browser validation remains recommended.

## Grill Cooking Station

The kitchen now includes a grill station in the lower-right area. It behaves as the same cooking-station type as the pot and pan in Solo and Multiplayer modes, including proximity interaction, two-second cooking progress, shared multiplayer locking, ready-food pickup, and order reset behavior. The Grilled Pork Skewers order uses pork, bell pepper, and onion from the ingredient station and has local and remote held-food indicators. Cooking-tool checks and multiplayer station initialization derive from a shared tool collection so additional cooking stations require fewer hardcoded branches. JavaScript syntax and whitespace validation passed; browser layout and multi-client gameplay validation remain recommended.

## Cooperative Finished-Food Pickup

Finished multiplayer food at the pot, pan, or grill can now be picked up by any player with empty hands, rather than only by the player who started cooking. When a teammate collects the dish, the original cook's ready inventory is cleared, ownership transfers to the teammate as the cooked dish, and the cooking station becomes available again. Players carrying ingredients or another dish must clear their hands before collecting finished food. Server syntax and whitespace validation passed; multi-client handoff testing remains recommended.

## Standalone Rice Selection Station

A standalone rice station now offers steamed rice and sticky rice without connecting either choice to recipes, cooking stations, or serving validation. Interacting with the station while empty-handed opens a choice popup. Steamed rice appears as a white square above the carrier, while sticky rice appears as a gray square; the synchronized inventory state makes these indicators visible to other multiplayer users as well. The server revalidates the player's distance and empty hands when a multiplayer choice is submitted. JavaScript syntax and whitespace validation passed; popup and multi-client visual testing remain recommended.

## Trash Station

A trash station now lets Solo and Multiplayer players discard an ingredient bundle, rice choice, or completed dish currently held by their character. Empty-handed interactions show a message, while food that is still cooking or waiting at a shared cooking station cannot be removed from the trash station. Multiplayer discard requests use the existing server-authoritative proximity check and synchronize the cleared inventory with every player. JavaScript syntax and whitespace validation passed; browser and multi-client discard testing remain recommended.

## Organized Kitchen Station Layout

Kitchen stations are now grouped by purpose. The top cooking row is ordered pan, pot, and grill; the left side contains rice above the general ingredient station; the serve point is centered at the bottom; and the trash station occupies the upper-left corner. Matching coordinates are used by the SVG client scene and the authoritative multiplayer server so proximity interactions remain aligned. JavaScript syntax and whitespace validation passed; desktop and landscape-mobile visual validation remain recommended.

The trash-station artwork is approximately half the size of its previous reduced version while retaining its upper-left center point and existing interaction coordinates. This gives the corner more visual space without changing Solo or Multiplayer proximity behavior.

The pan, pot, grill, rice, and ingredient station artwork was reduced to 50% of its previous size around each station's existing center point. Their client and server interaction coordinates remain unchanged, so only the visual scale is affected.

The top cooking row was tightened into a centered group with pan, pot, and grill spaced evenly at 120 world units. Client SVG positions and server interaction coordinates were updated together.

## Standalone Ingredient and Supply Stations

Five standalone pickup stations were added without connecting their items to recipes or serving validation. Meat, vegetable, and egg join rice and the general ingredient station in an evenly spaced left-side grid, while sauce and plate occupy a separate right-side column. Empty-handed players can carry one selected item, see its indicator above their character, share that state with other multiplayer clients, and discard it at the trash station. Matching client and server coordinates preserve authoritative proximity validation. JavaScript syntax and whitespace validation passed; desktop and landscape-mobile visual testing remain recommended.

The plate station is positioned at `850,160`, directly above the sauce station. Its vertical column aligns with sauce, while its horizontal row aligns with grill.
