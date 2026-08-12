# Oodd Oodd Cooking - Project Summary

## Overview

Oodd Oodd Cooking is a browser cooking game built with HTML, CSS, JavaScript, inline SVG, and an optional Node.js LAN controller relay. It supports Solo and local co-op on one computer, where players collect ingredients, cook customer menus, and serve them before order or game timers expire.

## Project Files

- `index.html` defines the start screen, local co-op setup, character selection, game screen, HUD, and SVG kitchen scene.
- `styles.css` controls the warm visual theme, layout, responsive behavior, buttons, character cards/modal, HUD, SVG labels, and screen switching.
- `game.js` contains the character selection flow, per-character movement sprites, Solo/local co-op engine, per-player movement and inventory, shared station staging, cooking, plate assembly, scoring, timers, and responsive controls.
- `recipes.js` contains the shared ingredients, cooking transformations, six menus, plate assembly rules, and food asset paths used by both client and server.
- `controller.html`, `controller.css`, and `controller.js` provide the phone-as-controller interface.
- `server/server.js` serves the frontend and relays phone input through Socket.IO on the local network without owning game state.
- `server/package.json` defines the Node.js server dependencies and start commands.
- `image/charecter/` contains the five character portraits and two customer portraits, `animation/animation_walk/` contains directional walking frames, `animation/animation_cooldownskill/` contains character detail and recovery artwork, and `image/food/` contains food/station artwork.
- `test/` contains shared-recipe, headless-browser, and multi-client Socket.IO integration checks.
- `AGENTS.md` contains contributor guidance for this repository.
- `DOC.md` is this project summary.

## User Flow

When the page opens, the start screen offers Solo and local co-op. Both modes open the character selection screen before gameplay. Each player selects one of the five characters, opens a skill-details popup, and can cancel or confirm the choice. In local co-op, characters are selected one player at a time and cannot be duplicated within the team. Local co-op supports zero to two keyboard slots and enough phone controllers to reach two to five total players. Keyboard-only co-op works without a server; phone controllers join by scanning a QR from the computer while all devices share one Wi-Fi network or hotspot.

After 120 seconds, the game stops, clears its timers and animation loop, waits briefly for a transition, and returns to the results screen. Starting a new round resets the player position, timer, and total score.

## Gameplay

- Move with `WASD` or the arrow keys.
- Walk close to a raw ingredient, rice, plate, cooking, trash, or serve station.
- Press `E` to interact with the nearest object.
- Press `Q` for the keyboard 1 character skill; keyboard 2 uses `\\` (the key above Enter). Touch and phone players use the on-screen `สกิล` button.
- Carry raw ingredients to a compatible station, deposit each ingredient, then press `E` empty-handed to cook.
- Use a plate only to collect cooked components, combine the completed menu, and serve it.
- Each successfully served order increases the shared team score.
- A "PRESS E TO INTERACT" prompt appears when an object is within range.
- The HUD displays remaining time and total score; the timer changes color during the final 10 seconds.

## Customer Queue and Serving

Customers use `image/charecter/customer1.png` and `image/charecter/customer2.png` as static portraits. A round starts with one customer entering from the lower edge of the kitchen. Additional arrivals are generated every twelve seconds, usually one customer with a 25% chance of two customers, up to four active customers. Customers walk to the serving station at `500,530`; later customers target positions behind the first customer to form a queue.

An order is linked to its customer. The order card stays hidden when no customer order is active and appears when a customer crosses into the shop. Only the first customer in the queue can be served, so a completed dish for a later menu waits until the front customer has been served. After a successful serve, the front customer walks down and out of the shop while the remaining queue advances. Expired orders also send their customers out and remove their menus.

## Character Selection and Animation

The character selection screen uses the five portraits in `image/charecter/`: หมูย่าง, หมูเทวดา, หมูป่า, หมูเร็ก, and หมูน้อย. Selecting a card opens a popup with the portrait, skill artwork, skill description, cooldown, active time, recovery time, and movement behavior. Cancel closes the popup without assigning the character; confirm assigns it and advances to the next local-co-op player.

After confirmation, the selected character is stored on the browser-side player object. The runtime uses that character's `Stand Still`, `Walk Forward`, `Walk towards the left side`, and `Walk towards the right side` frames from `animation/animation_walk/`, keeping the shared bottom-center foot anchor. Boar also uses the documented slower movement speed. The relay remains unaware of character identity and continues to forward only controller input.

While moving up, left, or right, the matching directional walking image stays active instead of alternating with `Stand Still`. When movement stops, the character returns to its standing pose; the downward direction keeps the available standing pose because no backward-walk asset is provided.

## Character Skills and Recovery

Each character has an independent skill cooldown and an active-play timer. Pressing a skill applies its gameplay effect immediately and does not play a skill animation. When the active-play timer ends, that player enters recovery, movement, interaction, and skill input are locked; the first recovery image from `animation/animation_cooldownskill/` appears for one second, then the second image remains visible until recovery ends. After recovery, the normal walking sprite returns and a new active-play period begins.

- Angel Pork: 15-second skill cooldown, 25-second active period, 9-second recovery; two extra customer-arrival attempts are triggered.
- Baby Pork: 10-second cooldown, 30-second active period, 7-second recovery; teammates receive the configured cooking-time reduction for 10 seconds.
- Rek Pork: 14-second cooldown, 30-second active period, 12-second recovery; reduces each teammate's remaining skill cooldown by half, excluding itself.
- Grilled Pork: 15-second cooldown, 40-second active period, 9-second recovery; adds 10 seconds to current orders and to orders revealed during the effect window.
- Boar: 15-second cooldown, 50-second active period, 15-second recovery; immediately ends teammates' recovery, excluding itself.

The computer host applies all skill effects locally, while the relay only forwards the phone's `skill` action and returns cooldown/recovery status to the phone UI. The initial effect durations and reduction values are kept in `characterDefinitions` so they can be tuned later.

## Visual Design

The game world uses inline SVG for the patterned floor, room border, station labels, player placement, shadows, and interaction prompt. Local players are rendered with the selected character's transparent directional PNG sprites from `animation/animation_walk/` inside the SVG. CSS adds a warm cream, brown, coral, blue, and gold palette, responsive sizing, rounded panels, hover states, and mobile-friendly HUD stacking.

## Technical Notes

Solo and two-keyboard local co-op remain dependency-free in the browser. Phone controllers require `cd server && npm install && npm start`; the computer opens the printed URL and phones scan the generated QR. The browser is authoritative for gameplay. The server stores only session routing and 30-second reconnect metadata, so no deployed backend or internet connection is needed during play.

## Validation

`npm run check`, recipe unit tests, and Socket.IO relay validation pass, including the newly allowed phone `skill` action. Chromium Solo/local browser validation was not run in this environment because Chromium remote debugging was unavailable at port `9223`; the new skill buttons, cooldown countdowns, recovery sprite switching, and mobile layout should still receive real browser and mobile verification.

## Documentation Update

This summary was updated alongside `AGENTS.md` to document the current flat project structure and the repository rule that every completed task must update `DOC.md` with the relevant change and validation status.

## Multiplayer Update

> Superseded: the online authoritative multiplayer implementation described in older history below has been replaced by the Local Co-op update at the end of this document.

Multiplayer mode supports temporary names, 5-character room codes, 2 to 5 players, a Ready lobby, host-controlled round start, shared 120-second rounds, 35-second orders, server-authoritative movement, per-player raw inventory and assembly plate state, shared cooking stations and score, disconnect removal, and a results screen. Active room data is in-memory and resets when the server restarts.


## Gameplay Update

The game uses a 120-second cooking round with customer orders that each last 60 seconds. Six Thai menus are assembled from rice and outputs produced by the pot, pan, or grill. Raw ingredients are collected individually without a plate, staged at a compatible station, and cooked for 2 seconds after an empty-handed interaction. A plate is required only to collect cooked outputs, combine them with rice in recipe order, and serve the completed dish. Successful service increases the team score; an expired order sends its customer away without clearing the players' held items or assembly plates.


## Held Food Indicator

The player displays a small circular image indicator above the avatar for the raw ingredient currently in hand, or for the assembly plate when the hand is empty. The indicator follows the player, synchronizes for remote multiplayer avatars, and clears when the corresponding item is deposited, discarded, served, or reset at round start.


## Cooking Progress Status

Each pot, pan, and grill has independent status UI. A staged station shows its ingredient count; after the player starts it, a realtime loading bar fills over two seconds and changes to READY. A player with an assembly plate must interact with that station to collect its cooked output. The station status resets after collection or at round reset.


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

Solo and multiplayer rounds maintain a shared-style queue of up to two customer orders. One order appears when a round starts, and the game attempts to add another order every seven seconds while the queue has space. Each order has its own 35-second expiry timer; generation pauses at two queued orders. The game UI displays all waiting orders with individual countdowns.

Cooking is free-form: players may prepare any of the six shared recipes without first selecting a displayed order. Serving removes the oldest waiting order matching the completed assembly plate and increases the score. A completed dish remains on the plate when no matching order is available. The multiplayer `room-state` payload sends an `orders` array with timestamps so every client renders the same queue and individual countdowns.

## Repository Guidelines Update

`AGENTS.md` now documents the current client/server structure, sprite assets, multiplayer development commands, two-minute gameplay validation checklist, synchronization requirements, and server-specific security considerations. Syntax validation with `node --check game.js` and `node --check server/server.js` passes; browser validation remains recommended for the full solo and multiplayer flows.

## Mobile Home Screen Fit

The start screen now uses the dynamic viewport and safe-area padding, prevents home-screen scrolling, and reduces title, intro, and button spacing on small screens. Mobile landscape and wider portrait layouts keep Solo Game and Multiplayer side by side; very narrow portrait screens stack the buttons as a fallback. Source validation passed; browser validation at narrow portrait, wider portrait, and 640x360 landscape sizes remains recommended.

## Landscape Fullscreen Gameplay

Gameplay now includes a Fullscreen toggle in the HUD. Solo and multiplayer modes use the standard Fullscreen API when available, with Safari-prefixed support and an expanded dynamic-viewport fallback when native fullscreen is rejected. Fullscreen state synchronizes with browser exit controls, attempts landscape orientation locking where supported, and is cleared when leaving gameplay. Source validation passed; Chrome, Safari, Android landscape, and iOS/iPadOS landscape browser validation remains recommended.

## Mobile Fullscreen Layout Fix

Fullscreen mobile landscape mode now restores the cream game background and compact landscape HUD/order-card styling. The order queue remains bounded and scrollable, preventing multiple orders from covering the pot or player, while the complete kitchen and touch controls retain their landscape placement. Source validation passed; fullscreen screenshot validation on Chrome and Safari landscape devices remains recommended.
## Pork Nae Character Update

The local player now uses the four transparent PNG poses from `pork_nae_animation` instead of the previous `animation_walk` character. The standing, forward, left, and right poses are mapped to the existing directional movement system with a shared bottom-center anchor and consistent frame size. Source validation confirmed that the initial SVG sprite and all runtime sprite references use the new asset folder; browser visual validation remains recommended.

## Shared Multiplayer Cooking Stations

The multiplayer pot, pan, and grill are shared room resources. Players can stage compatible raw ingredients one at a time, and an empty-handed interaction starts an exact recipe transformation. Every client sees staging, cooking, and ready state. While cooking the station is locked; when ready, any player with an eligible assembly plate can collect the output and free the station.

## Shared Multiplayer Held Items

Remote players display their current raw hand item, or their assembly plate when the hand is empty, above the character. Both `inventory` and `plate` are server-synchronized, and the indicator updates when an ingredient is staged, a cooked component is collected, a dish is served, or player state resets.

## Local Multiplayer Movement Rendering Fix

The local multiplayer client now copies each server movement snapshot into its authoritative position before reconciling the predicted position. Prediction is initialized from the server only when a round starts, preventing the animation loop from repeatedly pulling the local character back to the spawn point while other clients can still see it moving. JavaScript syntax and whitespace validation passed; multi-client browser validation remains recommended.

## Grill Cooking Station

The grill behaves as the same cooking-station type as the pot and pan in Solo and Multiplayer modes, including ingredient staging, two-second cooking progress, shared multiplayer locking, and plate pickup. It transforms meat into grilled meat for the rice-with-red-pork and sticky-rice-with-grilled-pork menus.

## Cooperative Finished-Food Pickup

Finished multiplayer food at the pot, pan, or grill can be picked up by any empty-handed player who has an eligible assembly plate, not only by the cook. The cooked output is appended to that player's plate and the shared station becomes available again. Players carrying a raw ingredient must deposit or discard it before collecting the output.

## Standalone Rice Selection Station

The rice station offers steamed rice and sticky rice through a choice popup. With no assembly plate, the selected rice becomes a raw hand item that can be carried to the pan; with a plate, the rice is appended to the plate as a menu component. The server revalidates distance, hand state, and plate eligibility when a multiplayer choice is submitted.

## Trash Station

The trash station lets Solo and Multiplayer players discard the raw ingredient in hand first, or discard the assembly plate when the hand is empty. Food staged, cooking, or ready at a shared station is not affected. Multiplayer discard requests use server-authoritative proximity checks and synchronize the cleared state with every player.

## Organized Kitchen Station Layout

Kitchen stations are grouped by purpose. The top row contains pan, pot, and grill; raw rice, meat, vegetable, and egg stations occupy the left side; sauce and plate occupy the right side; the serve point is centered at the bottom; and trash is in the upper-left. Matching client and server coordinates keep authoritative proximity interactions aligned.

The trash-station artwork is approximately half the size of its previous reduced version while retaining its upper-left center point and existing interaction coordinates. This gives the corner more visual space without changing Solo or Multiplayer proximity behavior.

The pan, pot, grill, rice, and ingredient station artwork was reduced to 50% of its previous size around each station's existing center point. Their client and server interaction coordinates remain unchanged, so only the visual scale is affected.

The top cooking row was tightened into a centered group with pan, pot, and grill spaced evenly at 120 world units. Client SVG positions and server interaction coordinates were updated together.

## Standalone Ingredient and Supply Stations

Five standalone ingredient stations are available for rice, meat, vegetable, egg, and sauce. The removed general ingredient station is no longer rendered. Empty-handed players can carry one raw ingredient without a plate, see its indicator above their character, share that state with other multiplayer clients, deposit it at a compatible cooking station, or discard it at the trash station. Matching client and server coordinates preserve authoritative proximity validation.

The plate station is positioned at `850,160`, directly above the sauce station. Its vertical column aligns with sauce, while its horizontal row aligns with grill.

## Mobile Gameplay Control Spacing

Exit Game now sits directly to the right of Fullscreen in the gameplay HUD, using the same responsive button layout instead of floating over the HUD. The gameplay Music toggle remains positioned above the touch Interact button on coarse-pointer landscape screens. The same behavior applies to native and fallback fullscreen layouts while the start-screen Music control remains unchanged. Source validation passed; browser validation at the supplied landscape viewport and 640x360 remains recommended.

## Two-Order Queue Limit

Solo and multiplayer customer queues hold at most two orders. Both the client order generator and authoritative server generation use the same cap and a 35-second lifetime for every order. Expired orders leave the queue without consuming a completed dish that no longer has a matching customer.

## Order Queue Reference Fix

Ingredient collection no longer references the removed single `currentOrder` state; it gives a generic instruction because cooking is free-form with the shared order queue. Finished food pickup uses the menu stored on the cooking station, so Solo and Multiplayer can correctly transfer the completed dish even when multiple orders are waiting. The Solo round duration uses the same 120-second value shown by the HUD and used by the server. `node --check game.js` and `node --check server/server.js` pass; browser validation of collection, cooking pickup, serving, and timeout remains recommended.

## Thai Game Text

ผู้เล่นจะเห็นข้อความภาษาไทยในหน้าเริ่มต้น การตั้งค่า Multiplayer Lobby ฉากครัว HUD ออเดอร์ สถานะทำอาหาร ข้อความโต้ตอบ ผลลัพธ์ และข้อความจากเซิร์ฟเวอร์ โดยคงชื่อเกม `Oodd Oodd Cooking` ไว้ตามเดิม เมนูและชื่อสถานีในเกมใช้ภาษาไทย และชื่อเมนูใน Client กับ Server ถูกปรับให้ตรงกันแล้ว ตรวจสอบ Syntax ผ่าน; ควรทดสอบการแสดงผลภาษาไทยบน Desktop และอุปกรณ์มือถือเพิ่มเติม

## Recipe Plate System

ระบบทำอาหารถูกปรับตาม `REF.md` โดยแยกของดิบในมือออกจากจานประกอบอาหาร ผู้เล่นหยิบข้าว เนื้อ ผัก ไข่ หรือซอสได้โดยไม่ต้องมีจาน แล้วนำวัตถุดิบไปใส่หม้อ กระทะ หรือเตาย่างทีละชิ้น สถานีสะสมวัตถุดิบสำหรับการปรุงหนึ่ง batch และไม่บังคับลำดับการใส่ เช่น ผักตามด้วยเนื้อหรือเนื้อตามด้วยผักให้ผลเป็นผัดเนื้อและผักเหมือนกัน เมื่อชุดปัจจุบันตรงสูตรให้กดโต้ตอบด้วยมือเปล่าเพื่อเริ่มปรุง 2 วินาที สถานีจะเก็บอาหารที่ปรุงเสร็จไว้จนกว่าผู้เล่นที่มีจานจะมารับ

ระหว่าง staging สถานีแสดงรูปวัตถุดิบทุกชิ้นที่ใส่ไว้ หากชุดปัจจุบันยังเป็นเพียงส่วนหนึ่งของสูตรจะแสดง `รอวัตถุดิบเพิ่ม`; เมื่อชุดตรงสูตรจะแสดง `พร้อมเริ่ม • กด E` แต่ยังสามารถเพิ่มวัตถุดิบเพื่อเลือกสูตรที่ยาวกว่าได้ วัตถุดิบที่ไม่สามารถใช้ร่วมกับของในสถานีจะถูกปฏิเสธและยังอยู่ในมือผู้เล่น ลำดับการประกอบอาหารบนจานยังคงเคร่งตามสูตรเมนูเดิม

จานใช้เฉพาะขั้นประกอบเมนู โดยเพิ่มข้าวและอาหารที่ปรุงเสร็จตามลำดับสูตร หากประกอบผิดลำดับ จานจะต้องถูกนำไปทิ้ง เมื่อส่วนผสมตรงหนึ่งในหกเมนู จานจะแสดงรูปอาหารสำเร็จและนำไปเสิร์ฟได้ ผู้เล่นสามารถมีจานประกอบอาหารและถือวัตถุดิบดิบหนึ่งชิ้นพร้อมกันได้ เพื่อไม่ให้จานขัดขวางการขนวัตถุดิบไปยังสถานี

ข้อมูลวัตถุดิบ transformation สูตรอาหาร และ asset path อยู่ใน `recipes.js` ซึ่งโหลดใน browser และ require จาก server เพื่อให้ Solo กับ Multiplayer ใช้กติกาเดียวกัน สถานีวัตถุดิบรวมถูกลบออกแล้ว สถานีปรุงอาหารแบบ Multiplayer เป็นทรัพยากรร่วม: ผู้เล่นคนหนึ่งใส่วัตถุดิบและเริ่มปรุง ส่วนผู้เล่นอีกคนที่มีจานสามารถรับอาหารที่พร้อมแล้วได้ ใบออเดอร์ใช้รูปวัตถุดิบแบบกลุ่มและไอคอนสถานี ส่วนของที่ถือเหนือหัวใช้รูปจริงแบบวงกลมและซ้อนเฉียง

Validation: `node --check game.js`, `node --check server/server.js`, `node --check recipes.js` และ `npm test --prefix server` ผ่านแล้ว พร้อมทดสอบ browser และหลาย client เพิ่มเติมตามหัวข้อถัดไป

## Comprehensive Gameplay Validation

เพิ่ม browser และ multiplayer integration checks ใน `test/` แล้ว Browser Solo check ทำอาหารและเสิร์ฟครบทั้ง 6 เมนู ตรวจลำดับผิดและถังขยะ รูปอาหาร ไอคอนออเดอร์ keyboard movement, touch movement, 640x360 landscape และ portrait warning ผ่านบน Chromium headless โดยไม่มี runtime exception

Multiplayer checks เชื่อม Socket.IO จริงด้วย client อิสระหลายตัว ครอบคลุมห้อง 5 คน การปฏิเสธคนที่ 6 readiness และ host gating, authoritative movement, การถือวัตถุดิบโดยไม่มีจาน, station staging, shared station lock, cooking handoff ไปยังผู้เล่นที่ถือจาน, อายุออเดอร์ 60 วินาที, score synchronization, queue limit, round results, replay, host transfer และ disconnect cleanup นอกจากนี้ browser สองแท็บยืนยัน lobby UI, remote-player rendering และ movement interpolation แล้ว ระหว่างทดสอบพบและแก้กรณีผู้เล่นที่เพิ่ง join เห็น avatar ของตัวเองซ้ำในกลุ่ม remote players โดย renderer จะลบ ID ที่ไม่อยู่ใน remote-player set ปัจจุบันทุก snapshot

Validation ล่าสุด: `node --check` ผ่านสำหรับ client, server, shared recipe data และ test scripts; `npm test --prefix server` ผ่าน โดย unit tests ครอบคลุม unordered station matching และ ordered plate assembly; Chromium Solo ทำและเสิร์ฟครบ 6 เมนูด้วยการกลับลำดับวัตถุดิบทุกสูตรหลายชิ้น พร้อมตรวจรูปและสถานะ staging, keyboard, touch, landscape และ portrait; browser multiplayer สองแท็บผ่าน; Socket.IO integration ผ่านด้วยผู้เล่นจริง 5 clients และปฏิเสธ client ที่ 6 โดยรอบล่าสุดได้เมนูข้าวหมูแดงและผ่าน shared station, handoff, score, results, replay และ host transfer

## Independent Duplicate Pans and Pots

แถวสถานีด้านบนมี `กระทะ 1`, `กระทะ 2`, `หม้อ 1`, `หม้อ 2`, `เตาย่าง` และ `จาน` ที่พิกัด x เท่ากับ 300, 410, 520, 630, 740 และ 850 ตามลำดับ โดยใช้ y เท่ากับ 160 ทั้งหมด กระทะและหม้อแต่ละใบมี station ID และสถานะ staging, cooking, ready แยกจากกัน จึงปรุงพร้อมกันได้ทั้ง Solo และ Multiplayer ขณะที่ recipe engine ยังคงรับ tool type แบบ `pan`, `pot`, `grill` และใช้สูตรเดิมร่วมกัน

Socket.IO event `interact` ยังคงส่ง `{ station }` แต่สถานีชนิดกระทะและหม้อใช้ค่า `pan-1`, `pan-2`, `pot-1`, `pot-2`; `room-state.stations` ส่งคีย์เดียวกันเพื่อให้ทุก client แสดงสถานะของแต่ละใบอย่างอิสระ Client และ authoritative server ใช้พิกัดชุดเดียวกันและข้อความโต้ตอบระบุหมายเลขสถานีชัดเจน

Validation: syntax checks ผ่านสำหรับ client, server และ test scripts; `npm test --prefix server` ผ่าน; Chromium Solo ผ่านครบ 6 เมนูพร้อมตรวจว่ากระทะสองใบและหม้อสองใบปรุงพร้อมกันและเปลี่ยนเป็น READY แยกกัน; browser multiplayer สองแท็บผ่าน; Socket.IO integration 5 clients ผ่านพร้อมตรวจสองผู้เล่นใช้กระทะคนละใบพร้อมกัน, shared state, replay, host transfer และ disconnect cleanup

## Two-Minute Rounds

ระยะเวลาเล่นต่อรอบเพิ่มจาก 40 เป็น 120 วินาทีทั้ง Solo และ Multiplayer ค่าเริ่มต้นใน HUD, client timer และ authoritative server ใช้ค่าเดียวกัน โดยช่วงเตือนสิบวินาทีสุดท้ายยังคงเดิม และอายุออเดอร์ปัจจุบันคือ 60 วินาที ชุดทดสอบ browser ตรวจว่า Solo และ Multiplayer เริ่มที่ `120`; Socket.IO integration ปล่อยให้ server นับถอยหลังครบสองนาทีและยืนยันการเปลี่ยนเป็น Results ที่วินาที 0 แล้ว Syntax checks, recipe unit tests, Solo browser, browser multiplayer และ multiplayer integration ผ่านทั้งหมด

## Client Cleanup and Test Commands

เส้นทางออกจากเกม ออกจากห้อง และกลับหน้าเริ่มต้นใช้ cleanup กลางร่วมกัน โดยหยุด timer ของรอบและออเดอร์, interval สร้างออเดอร์, cooking timeout, local/remote animation, walking sound และ input state พร้อมล้างข้อมูลผู้เล่นระยะไกล การออกจาก Multiplayer ส่ง `leave-room` เพียงครั้งเดียว ส่วน delayed Solo results จะถูกยกเลิกหากผู้เล่นออกก่อนหน้าผลลัพธ์แสดง จึงไม่มี background order generation หรือหน้า Results เปิดทับหน้าเริ่มต้นหลังออกเกม

`server/package.json` มีคำสั่งตรวจแยกตามระดับดังนี้:

```sh
cd server
npm run check
npm test
npm run test:recipes
npm run test:relay
npm run test:browser:solo
npm run test:browser:local
```

Socket และ browser checks ต้องเปิด server ที่พอร์ต `3210` ก่อนด้วย `PORT=3210 npm start` ส่วน browser checks ต้องมี Chromium remote debugging ที่พอร์ต `9223` เช่น `chromium-browser --headless --remote-debugging-port=9223 --user-data-dir="$(mktemp -d)" about:blank` อายุออเดอร์ที่ assertions ใช้ทั้ง Solo และ Multiplayer คือ 60 วินาที

Validation ล่าสุดผ่านครบทั้ง `npm run check`, recipe tests, Chromium Solo/responsive check, browser Multiplayer สองแท็บ และ Socket.IO integration เต็มรอบ 120 วินาที Regression checks ยืนยันว่า Solo exit ล้าง order-generation interval, delayed Results ไม่เปิดทับหน้าเริ่มต้น, Multiplayer leave ส่ง event ครั้งเดียว และ local/remote animation state ถูกล้างแล้ว

## Local Co-op and Phone Controllers

Online multiplayer ถูกแทนที่ด้วย local co-op บนจอคอมเครื่องเดียว ผู้เล่นรวม 2–5 คน โดยเลือกผู้เล่นคีย์บอร์ดได้ 0–2 คน: Player 1 ใช้ `WASD` + `E` และ Player 2 ใช้ลูกศร + `Enter` ผู้เล่นที่เหลือใช้โทรศัพท์เป็นจอยผ่าน Wi-Fi/hotspot เดียวกัน ทุกคนมีตำแหน่ง มือ จาน สี และสถิติของตัวเอง แต่แชร์ออเดอร์ เวลา คะแนน และสถานีทำอาหาร ผู้เล่นไม่ชนกันเพื่อป้องกันการขวางทางในครัว

Solo และ local co-op แบบสองคีย์บอร์ดเปิดจาก `index.html` ได้โดยตรง การใช้โทรศัพท์ให้รัน `npm start` ใน `server/`; local relay จะแสดง LAN URL และหน้าเกมสร้าง QR ที่มีรหัส session โทรศัพท์มี D-pad, ปุ่มโต้ตอบ และตัวเลือกข้าวเฉพาะตัว Server ทำหน้าที่ส่ง input เท่านั้น ไม่ประมวลผล gameplay และให้เวลาโทรศัพท์ reconnect 30 วินาทีก่อนถอนช่องผู้เล่น

เพิ่ม dependency `qrcode` ฝั่ง server สำหรับสร้าง QR ภายในเครื่อง และแทนชุดทดสอบออนไลน์เดิมด้วย relay/local co-op checks คำสั่งล่าสุดคือ `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo`, และ `npm run test:browser:local` Validation ผ่านทั้งหมด โดย browser checks ครอบคลุมสูตรทั้ง 6 เมนู, direct-file Solo, responsive touch, ผู้เล่นคีย์บอร์ดพร้อมกัน, roster 5 คน, โทรศัพท์จำลอง, การเลือกข้าว, relay capacity, reconnect และ session cleanup การสแกน QR บนโทรศัพท์จริงหลายรุ่นยังควรตรวจบนเครือข่ายเป้าหมายและยอมรับ firewall prompt ของระบบปฏิบัติการหากมี

## Desktop Two-Column Gameplay Layout

หน้าจอเกมบน desktop ที่กว้างตั้งแต่ 851px ใช้ CSS Grid สองคอลัมน์ โดยคอลัมน์ซ้ายประมาณ 30% สำหรับคิวออเดอร์ และคอลัมน์ขวาประมาณ 70% สำหรับฉากครัว การ์ดออเดอร์ ชื่อเมนู countdown ไอคอนวัตถุดิบ/เครื่องมือ และ HUD ถูกขยายให้อ่านง่ายขึ้น ขณะที่ `viewBox` SVG พิกัดสถานี collision และขนาด gameplay ยังคงเดิม

Native fullscreen และ fallback fullscreen ใช้สัดส่วนสองคอลัมน์เดียวกับ desktop ปกติ ส่วน mobile และ landscape touch ยังคง stage แบบเดิม: การ์ดออเดอร์วางทับมุมซ้ายของฉาก และครัวใช้พื้นที่ที่เหลือภายใน viewport โดยไม่เปลี่ยนการควบคุมหรือ geometry ของเกม

เพิ่ม assertions ใน `test/run-browser-check.js` เพื่อตรวจคอลัมน์ ตำแหน่ง สัดส่วน ขนาด UI และ fallback fullscreen รวมถึงตรวจว่า 640×360 landscape ยังคงใช้ compact touch layout การตรวจ `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว การตรวจภาพบน desktop หลายอัตราส่วนและอุปกรณ์ touch จริงยังควรทำเพิ่มเติม

แก้พื้นหลัง native และ fallback fullscreen ให้ใช้สีครีม `#fbf8f3` เดียวกับหน้าเกม และกำหนด `::backdrop` สำหรับ Fullscreen API เพื่อไม่ให้พื้นที่รอบเกมแสดงเป็นสีดำ

## Fullscreen Interaction Reflow Fix

แก้ closing tag ของ `.game-shell` ใน `index.html` ให้ `#game-message` อยู่นอกกรอบฉากครัวตามโครงสร้างที่ตั้งใจไว้ เดิม desktop fullscreen เปลี่ยน `.game-shell` เป็น flex ทำให้ข้อความสถานะกลายเป็นคอลัมน์ข้างฉาก และเมื่อกดโต้ตอบแล้ว `setMessage()` เปลี่ยนข้อความจึงทำให้ layout reflow และ UI เลื่อน ปัจจุบัน fullscreen ไม่ใช้ flex กับ `.game-shell` และจองพื้นที่ข้อความไว้คงที่สองบรรทัด

เพิ่ม browser regression ที่ตรวจ parent DOM, การจัดวางสองคอลัมน์, ตำแหน่งฉาก/ออเดอร์ก่อนและหลังการกดโต้ตอบ และ scroll position การตรวจ `npm run check`, `npm test` และ Solo browser/responsive check ผ่านแล้ว

## Plate Recipe Assembly Order

ปรับ `recipes.js` ให้สอดคล้องกับลำดับใหม่ใน `FOOD.md`: เมนูข้าวมันไก่ ข้าวหมูแดง ข้าวหมูตุ๋น ข้าวเหนียวหมูปิ้ง และข้าวกะเพราหมูสับไข่ดาว ต้องใส่อาหารที่ปรุงเสร็จก่อน แล้วจึงเติมข้าวเป็นส่วนผสมสุดท้าย ส่วนข้าวผัดกุ้งยังนำข้าว เนื้อ ผัก และไข่ลงกระทะรวมกันแบบไม่บังคับลำดับเดิม

สถานีข้าวจะไม่เปิดตัวเลือกเมื่อถือจานว่าง และ `chooseRice()` จะตรวจผลการประกอบก่อนบันทึกลงจาน หากลำดับข้าวไม่ตรงสูตร จานเดิมและวัตถุดิบในมือจะยังอยู่ครบ พร้อมข้อความแนะนำ ผู้เล่นที่ไม่มีจานยังเลือกข้าวดิบเพื่อใส่กระทะข้าวผัดได้เหมือนเดิม ลำดับ valid ของจานสร้างจาก prefix ของ `menu.components` เพื่อให้ข้อมูลสูตรเป็น source of truth เดียว

เพิ่ม unit และ browser regression สำหรับลำดับ components/steps ของทั้งหกเมนู การปฏิเสธข้าวก่อนอาหารปรุง การเติมข้าวหลัง cooked component การรักษาจานเมื่อเติมข้าวผิดสูตร และการทำงานเดิมของข้าวผัดกุ้ง; validation ล่าสุด `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว

## Player Name Placement

ลบวงสี `.player-color-ring` ใต้ตัวละคร local ออก โดยคงเงาตัวละครไว้ และย้ายชื่อผู้เล่นจากเหนือ sprite มาเป็น baseline ใต้เท้าที่ `y=52` ภายในกลุ่มตัวละคร ชื่อยังใช้ `player.color` เพื่อแยกผู้เล่น โดยคงขนาด held item ข้อมูลสถานะ และ sprite foot anchor เดิมไว้; การวาง overlay ตามความสูงของ sprite อธิบายไว้ในหัวข้อถัดไป

เพิ่ม browser regression ให้ตรวจว่าไม่สร้างวงสี ชื่อยังแสดงด้วยสีของผู้เล่น และ baseline อยู่ต่ำกว่าขอบล่างของ sprite การตรวจ syntax ผ่านแล้ว; ควรรัน Solo/local browser checks และตรวจด้วยตาในโหมดคีย์บอร์ดกับโทรศัพท์จริงเพิ่มเติม

## Height-Aware Held Item Overlay

ปรับตำแหน่ง held item ของผู้เล่นให้คำนวณจาก `height` ของ sprite ที่กำลังแสดง แทนการใช้ตำแหน่งคงที่ จึงรองรับความสูงที่ต่างกันของตัวละครทั้งห้าตัว เฟรมเดิน และ recovery sprite โดยยังคง foot anchor ที่ `y=30-height`, ตำแหน่งผู้เล่น, collision, ระยะโต้ตอบ และขนาดภาพของถือ `26x26` กับ clip circle เดิมไว้

held bubble อยู่เหนือขอบบนของ sprite ด้วยระยะปกติ 6 world units ส่วน action badge และ status badge เรียงต่อขึ้นไปด้วยระยะเดียวกันและไม่ชนกันในพื้นที่ปกติ การเรียงลำดับ SVG วาง sprite ก่อน held item เพื่อให้รูปของถือแสดงทับฉากตัวละครอย่างชัดเจน ตำแหน่ง overlay ถูกอัปเดตเมื่อสร้างผู้เล่น เปลี่ยนเฟรม/ทิศทาง เปลี่ยน recovery sprite และเคลื่อนผู้เล่น เมื่อผู้เล่นอยู่ใกล้ขอบบนของ `viewBox` ระบบจะลดระยะห่างของ stack ลงเท่าที่จำเป็นเพื่อให้ overlay ยังอยู่ในฉาก โดยไม่ย้ายไปด้านข้างหรือซ่อนรูป

เพิ่ม browser regression สำหรับตัวละครทั้งห้าตัวในทิศทางหลักและ recovery frames ตรวจระยะห่างของ held/action/status, การแสดง held image, ลำดับ sprite กับ held, foot anchor, ตำแหน่ง gameplay และการ clamp ที่ขอบบนแล้ว ผล validation ล่าสุด: `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว การตรวจด้วยตาบนเครื่องจริง โดยเฉพาะ Grilled Pork, Boar, recovery state และโทรศัพท์จริงยังควรทำเพิ่มเติม
