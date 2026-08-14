# Oodd Oodd Cooking - Current Project Summary

Updated: 2026-08-14

## Overview

Oodd Oodd Cooking is a dependency-light browser cooking game. The browser owns all gameplay state and supports Solo play and local co-op on one computer. Local co-op supports two to five total players through up to two keyboard slots and optional phone controllers connected over the same LAN. The Node.js service is only a static-file host and Socket.IO input relay; it does not run the game simulation.

Solo and keyboard-only local co-op work without the server by opening `index.html`. Phone controllers require the server.

## Repository Layout

- `index.html` contains the start screen, local co-op setup, character selection, game/results screens, and the inline SVG kitchen.
- `styles.css` contains the warm visual theme, screen layouts, HUD, order cards, station status UI, timed math popup, touch controls, fullscreen styles, and responsive/mobile rules.
- `game.js` contains the browser-authoritative game loop, player input, movement, timed math-challenge lifecycle, character skills and recovery, inventory/plates, customers/orders, cooking stations, scoring, audio, fullscreen behavior, and replay/exit flows.
- `recipes.js` is shared recipe data and transformation logic. It works in the browser and as a CommonJS module for tests.
- `math-challenges.js` is the browser/CommonJS question and schedule generator, with injectable randomness for deterministic tests.
- `controller.html`, `controller.css`, and `controller.js` implement the phone join screen, d-pad, interaction, skill, rice selection, and math-challenge waiting state.
- `server/server.js` serves the repository root, exposes `/health`, creates LAN join QR data, and relays controller input/actions through Socket.IO.
- `server/package.json` defines the Node.js scripts and Express, Socket.IO, and QR-code dependencies.
- `image/kitchen/` contains kitchen furniture, station, ingredient, and cooked-station artwork.
- `image/food/` contains ingredient, plate, tool, and completed-menu artwork.
- `image/charecter/` contains five chef portraits and two customer portraits.
- `animation/animation_walk/` contains each chef's standing and directional walking frames.
- `animation/animation_cooldownskill/` contains the two-frame recovery artwork for each chef.
- `Sound/` contains lobby music, gameplay music, and walking sound.
- `test/` contains recipe and math unit tests, browser checks, local co-op browser checks, and Socket.IO relay checks.
- `AGENTS.md` contains repository contribution and validation instructions.
- `DOC.md` is this maintained project summary.

There is no client build step and no external client dependency.

## User Flow and Modes

The start screen offers `เล่นคนเดียว` and `เล่นหลายคนเครื่องเดียว`. Both modes open the five-character selection screen. Selecting a character opens a details modal with portrait, skill artwork, description, cooldown, active time, recovery time, and movement information. Confirmed characters cannot be duplicated within a local-co-op team.

Local co-op setup allows either keyboard slot to be disabled. Phone capacity is reduced automatically as keyboard slots are enabled, with a maximum of five total players. At least two connected players are required to start local co-op. `Play Again` starts a new Solo character selection or returns local co-op to its lobby. `Return to Start`/`ออกจากเกม` clears the current round and local phone session.

Every round lasts 420 seconds. When the timer reaches zero, gameplay stops, timers and audio are cleaned up, controllers receive the results phase, and the results screen appears after a short transition. Exiting during a round performs the same cleanup immediately and returns to the start screen.

## Timed Math Challenges

Each Solo or local co-op round generates two single-question math sets. The first appears at a random elapsed time from 1–180 seconds and the second from 181–360 seconds. Across the round, one question uses addition and the other uses subtraction, with their order shuffled. No new challenge is scheduled during the final minute (seconds 361–420).

- Operands and answers stay within 0–100. Addition never exceeds 100, and subtraction never produces a negative answer.
- The host submits an integer answer with the button or `Enter`. A wrong answer clears the field and repeats the same question without changing score or time.
- While the popup is active, movement, interaction, skills, staged-station discard, and rice actions are rejected for every keyboard, touch, and phone player. Held directions and open rice choices are cleared.
- The game loop is not paused: round time, customer movement, order expiry, cooking completion, skill cooldown, active periods, and recovery continue normally.
- If the later set becomes due while another set is open, it starts immediately after the current question is answered correctly. If the round ends first, all remaining challenge state is discarded and Results takes priority.
- The popup lives inside the game screen so it remains available in native/fallback fullscreen and responsive layouts. It has no close, skip, or Escape behavior.

Phone controllers receive `mathChallengeActive` in `local-controller:state`. They release held movement, hide gameplay/rice controls, and show that the host is answering; phones never receive the equation or submit answers. The relay remains a gameplay-unaware input/state forwarder and has no math-specific session protocol.

## Controls

### Solo

- Move: `WASD` or arrow keys.
- Interact: `E`.
- Skill: `Q`.
- On coarse-pointer devices, hold the on-screen directional buttons. The touch `โต้ตอบ` and `สกิล` buttons control the Solo player.

### Local keyboard co-op

- Keyboard 1: `WASD` to move, `E` to interact, `Q` to use the skill.
- Keyboard 2: arrow keys to move, `Enter` to interact, `\\` to use the skill.
- Clear staged station ingredients: `R` for Keyboard 1 and Solo; `-` for Keyboard 2.
- When choosing rice, the active keyboard player can switch between steamed and sticky rice with their left/right control and confirm with their interaction key.

### Phone controller

Open the QR/controller URL on a phone, enter the room code and a player name, then use the d-pad, `โต้ตอบ`, `สกิล`, and `ทิ้ง` controls. The phone also receives the rice choices, lobby/playing/results phase, math-lock state, skill cooldown/recovery status, messages, and the shared team score. The main-game touch controls expose the same discard action.

## Cooking Gameplay

The kitchen has two pots, two pans, one grill, raw meat/vegetable/egg/sauce stations, a rice station, a plate station, a trash station, and a serving station. Players can interact only within the browser's proximity range.

- Raw ingredients are carried one at a time without a plate.
- The rice station opens a choice between steamed rice and sticky rice. Without a plate, the choice becomes a carried raw ingredient; with an empty valid plate, it is appended to the plate.
- The plate station gives an empty plate. A plate collects cooked outputs and can be assembled in any order as long as its components remain a subset of a valid menu.
- A player carrying a raw ingredient stages it at a compatible pot, pan, or grill. Staging accepts one ingredient per interaction and displays the staged ingredient icons and recipe readiness.
- An empty-handed interaction starts an exact staged transformation. Normal cooking takes two seconds. A completed station shows a progress bar at `พร้อมใส่จาน`/READY until a player with an eligible plate collects it.
- Any local player may collect a ready output if they have an empty hand and a valid plate. Cooking stations are shared between local players.
- The trash station discards the carried raw ingredient first, or the plate if the hand is otherwise empty. It does not affect food staged or cooking at a station.
- The dedicated discard-station action clears all ingredients from the nearest cooking station only while it is in `staging`. It requires no plate, preserves the player's hand and plate, and cannot clear a station that is cooking or READY.
- A completed plate can be served only at the front customer's serving point and only when it matches that customer's menu.

The six menus and their transformations are defined in `recipes.js`:

| Menu | Required components | Preparation |
| --- | --- | --- |
| ข้าวมันไก่ | `boiledMeat` + `steamedRice` | Meat in a pot; steamed rice |
| ข้าวหมูแดง | `grilledMeat` + `boiledSauce` + `steamedRice` | Meat on the grill; sauce in a pot; steamed rice |
| ข้าวหมูตุ๋น | `boiledMeatSauce` + `boiledEgg` + `steamedRice` | Meat+sauce in a pot; egg in a pot; steamed rice |
| ข้าวเหนียวหมูปิ้ง | `grilledMeat` + `stickyRice` | Meat on the grill; sticky rice |
| ข้าวกะเพราหมูสับไข่ดาว | `friedMeatVegetable` + `friedEgg` + `steamedRice` | Meat+vegetable in a pan; egg in a pan; steamed rice |
| ข้าวผัดกุ้ง | `friedRice` | Steamed rice+meat+vegetable+egg in a pan |

Recipes use exact transformation inputs, while final plate components may be added in any order. A transformation is available only when its output is a component of a current menu and the same tool/input combination appears in that menu's cooking steps. This prevents orphan outputs such as pan-fried meat by itself from starting. Invalid plates must be discarded before they can be used again.

## Customers, Orders, and Score

A round starts with one customer entering from the bottom and one visible order. New customers are attempted every 12 seconds, with a 25% chance of spawning two in one attempt, up to four active customers. At most two orders are displayed at once; later customers reveal their order when they reach the queue and there is room. Customers queue at the serving station, and only the first waiting customer can be served.

Each revealed order lasts 60 seconds. A matching served order:

- adds 100 points to the shared team score;
- removes the front order and sends its customer out; and
- increments only the serving player's `ordersServed` statistic.

Each expired order removes 50 points, including each order in a multi-order expiry, and the score is clamped to zero. Expired customers leave without clearing players' held items or plates. The HUD and results screen show the shared score; results also show each player's served-order count.

## Characters, Skills, and Recovery

Each player has an independent skill cooldown and active period. When the active period ends, the player enters recovery: movement, interaction, and skill use are locked; the first recovery sprite is shown for one second and the second remains until recovery ends. Recovery then starts a new active period. Using a skill applies its effect immediately and does not play a separate activation animation.

| Character | Cooldown | Active period | Recovery | Skill |
| --- | ---: | ---: | ---: | --- |
| พี่หมูปิ้ง (`grilled-pork`) | 15s | 130s | 5s | For 10s, adds 10s to current orders and orders revealed during the effect. |
| นางฟ้าหมูจิ๋ว (`angel-pork`) | 15s | 80s | 4s | Makes two extra customer-arrival attempts immediately. |
| ลุงหมูป่า (`boar`) | 15s | 150s | 6s | Ends teammates' active recovery, excluding itself. Movement is 1.5× slower. |
| น้องเร้กหมูตุ๋น (`rek-pork`) | 14s | 120s | 4s | Halves the remaining skill cooldown of connected teammates, excluding itself. |
| ทารกหมูเด้ง (`baby-pork`) | 10s | 70s | 4s | Connected teammates cook at half duration for 10s. |

The selected chef uses standing, forward, left, and right assets from `animation/animation_walk/`. The sprite is anchored at the shared bottom-center foot position. Downward movement uses the available standing frame because no backward-walk frame is provided. Held-item, interaction, and recovery status overlays follow the sprite and remain inside the game world where possible.

## Local Phone Relay

Start the relay with:

```sh
cd server
npm install
npm start
```

The default port is `3000`; set `PORT=3210` when using the included relay/browser checks. The server listens on `0.0.0.0`, prints loopback and detected LAN URLs, serves the frontend, and exposes `GET /health` with `{ "status": "ok", "mode": "local-controller-relay" }`.

The host creates a five-character room code and QR join options for detected private IPv4 addresses. Sessions, controller names, connection state, and reconnect tokens are in memory only. Controller input is accepted only during the `playing` phase. A disconnect immediately sends zero movement input; the controller slot can reconnect with its token for 30 seconds, after which it is removed. Closing the host session notifies all connected phones. The relay is intended for a trusted local network, not public deployment, and it never receives gameplay state or recipes.

## Audio and Presentation

- Lobby music: `Sound/background-music-lobby.mp3`, looping at 35% volume on the start, local setup, and character screens.
- Gameplay music: `Sound/background-music-map2.mp3`, looping at 35% volume during gameplay.
- Walking sound: `Sound/walking-for-cartoon.mp3`, looping at 80% volume while any local player moves; it stops and resets when movement or gameplay stops. The Music toggle does not mute walking sound.
- Browser autoplay restrictions are handled by retrying music after the first pointer or keyboard interaction.
- The Music/Music Off controls share one page-session state and appear on both lobby and gameplay screens.
- Desktop gameplay places the order card beside the kitchen. Touch landscape layouts keep the kitchen, order queue, HUD, message, and controls within the dynamic viewport.
- Touch gameplay in portrait shows a rotate-device warning and hides the game content until landscape orientation is used.
- The Fullscreen button uses the Fullscreen API with WebKit support and a CSS expanded-view fallback. It updates when the browser exits fullscreen and attempts to lock landscape where supported.
- Copy, cut, and context-menu actions are blocked inside the game screen while other screens remain selectable.

## Development and Validation

The client can be opened directly for Solo or keyboard-only local co-op. Phone testing requires all devices to share the same Wi-Fi/hotspot and may require an operating-system firewall permission.

Available commands from `server/`:

```sh
npm run check
npm test
npm run test:relay
npm run test:browser:solo
npm run test:browser:local
```

The relay and browser checks expect a running server at port `3210`; browser checks also require Chromium remote debugging at port `9223`.

Validation status for this documentation update:

- `npm run check`: passed.
- `npm test`: passed (`test/recipes.test.js` and `test/math-challenges.test.js`).
- `npm run test:relay`: passed, including `discard-station` relay forwarding.
- `npm run test:browser:solo`: passed for math scheduling/answers/input lock/background timers/cleanup, all six menus, touch controls, fullscreen, and responsive layout.
- `npm run test:browser:local`: passed for keyboard/phone math lock and resume, both keyboard discard keys, and the phone-controller actions.

## Timed Math Challenge Update

Completed on 2026-08-13. The earlier ingredient-stock/refill proposal was replaced with two scheduled challenge sets per round, without adding ingredient inventory, rewards, penalties, or server-owned gameplay. `math-challenges.js` supplies the independently tested schedule and question generation. `game.js` owns the active/pending/completed challenge state and locks only player commands, while `controller.js` renders the host-answering state from the new boolean payload.

Validation passed: `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo`, and `npm run test:browser:local`. Real-device LAN/fullscreen visual checking remains recommended.

## Two Single-Question Math Challenges

Completed on 2026-08-14. Each round now schedules exactly two one-question challenges: one during elapsed seconds 1–180 and one during 181–360, leaving seconds 361–420 without a new challenge. The two questions use addition and subtraction exactly once in randomized order; multiplication and division are no longer exposed by `MathChallenges.operators` or accepted by `createQuestion()`. The existing browser-authoritative popup, player/phone input lock, continuously running round time, wrong-answer retry, and immediate opening of an overdue second set remain unchanged.

Validation passed: `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo`, and `npm run test:browser:local`. Real-device LAN and fullscreen visual checking remain recommended.

## Station Recipe Safety and Discard Update

Completed on 2026-08-13. Pan-fried meat by itself was removed because its output was not used by any current menu. Runtime cooking transformations are now limited to outputs and cooking steps referenced by the current menu data, so an orphan transformation cannot start cooking even if it is accidentally added to the raw transformation list later. Players can clear all unstarted ingredients from the nearest cooking station with `R`, `-`, or the touch/phone `ทิ้ง` button. The action affects only `staging`, preserves held items and plates, and refuses to clear cooking or READY stations.

For a complete manual pass, verify start/setup/character/results/replay/exit flows, both keyboard layouts, touch landscape and portrait behavior, all six recipes, station progress and READY pickup, score penalties and rewards, character skills/recovery, phone joining/reconnect/capacity, and host session closure.
Socket และ browser checks ต้องเปิด server ที่พอร์ต `3210` ก่อนด้วย `PORT=3210 npm start` ส่วน browser checks ต้องมี Chromium remote debugging ที่พอร์ต `9223` เช่น `chromium-browser --headless --remote-debugging-port=9223 --user-data-dir="$(mktemp -d)" about:blank` อายุออเดอร์ที่ assertions ใช้ทั้ง Solo และ Multiplayer คือ 60 วินาที

Validation ล่าสุดผ่านครบทั้ง `npm run check`, recipe tests, Chromium Solo/responsive check, browser local co-op และ relay checks. Regression checks ยืนยันว่า Solo และ local co-op เริ่มที่ 420 วินาที, ออเดอร์ยังหมดอายุที่ 60 วินาที, Solo exit ล้าง order-generation interval, delayed Results ไม่เปิดทับหน้าเริ่มต้น, local leave ส่ง event ครั้งเดียว และ local/remote animation state ถูกล้างแล้ว

## Local Co-op and Phone Controllers

Online multiplayer ถูกแทนที่ด้วย local co-op บนจอคอมเครื่องเดียว ผู้เล่นรวม 2–5 คน โดยเลือกผู้เล่นคีย์บอร์ดได้ 0–2 คน: Player 1 ใช้ `WASD` + `E` และ Player 2 ใช้ลูกศร + `Enter` ผู้เล่นที่เหลือใช้โทรศัพท์เป็นจอยผ่าน Wi-Fi/hotspot เดียวกัน ทุกคนมีตำแหน่ง มือ จาน สี และสถิติของตัวเอง แต่แชร์ออเดอร์ เวลา คะแนนทีม (เสิร์ฟ +100 แต้ม, หมดเวลา -50 แต้ม, ต่ำสุด 0) และสถานีทำอาหาร ผู้เล่นไม่ชนกันเพื่อป้องกันการขวางทางในครัว

Solo และ local co-op แบบสองคีย์บอร์ดเปิดจาก `index.html` ได้โดยตรง การใช้โทรศัพท์ให้รัน `npm start` ใน `server/`; local relay จะแสดง LAN URL และหน้าเกมสร้าง QR ที่มีรหัส session โทรศัพท์มี D-pad, ปุ่มโต้ตอบ และตัวเลือกข้าวเฉพาะตัว Server ทำหน้าที่ส่ง input เท่านั้น ไม่ประมวลผล gameplay และให้เวลาโทรศัพท์ reconnect 30 วินาทีก่อนถอนช่องผู้เล่น

เพิ่ม dependency `qrcode` ฝั่ง server สำหรับสร้าง QR ภายในเครื่อง และแทนชุดทดสอบออนไลน์เดิมด้วย relay/local co-op checks คำสั่งล่าสุดคือ `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo`, และ `npm run test:browser:local` Validation ผ่านทั้งหมด โดย browser checks ครอบคลุมสูตรทั้ง 6 เมนู, direct-file Solo, responsive touch, ผู้เล่นคีย์บอร์ดพร้อมกัน, roster 5 คน, โทรศัพท์จำลอง, การเลือกข้าว, relay capacity, reconnect และ session cleanup การสแกน QR บนโทรศัพท์จริงหลายรุ่นยังควรตรวจบนเครือข่ายเป้าหมายและยอมรับ firewall prompt ของระบบปฏิบัติการหากมี

## Rek Pork Cooldown Fix

แก้สกิลของ Rek Pork ให้ลดเวลาคูลดาวน์ที่เหลือของเพื่อนร่วมทีมลงครึ่งหนึ่งตามคำอธิบาย จากเดิมที่ตั้งค่าตัวคูณเป็น `3` ซึ่งทำให้เวลาคูลดาวน์เพิ่มขึ้นสามเท่า ตอนนี้ใช้ตัวคูณ `0.5` และยังไม่กระทบคูลดาวน์ของ Rek Pork เอง

Validation: `npm run check` และ `npm test` ผ่านแล้ว

## Gameplay Character Size and Shadow Update

ปรับขนาดตัวละครในฉากเล่นให้มีความสูงพื้นฐาน 92 world units ซึ่งเท่ากับความสูงของ sprite ลูกค้าอ้างอิง โดยคงสัดส่วนความกว้างต่อความสูงของ sprite เดิมไว้ ส่วน Boar ใช้ความสูง 100 world units เพื่อให้ใหญ่กว่าตัวละครอื่นเล็กน้อย และ Baby Pork ลดจาก 84 ลง 25% เหลือ 63 world units เพื่อให้ดูตัวเล็กลงชัดเจน ตัวละครและ recovery sprite จึงใหญ่ขึ้นโดยไม่ถูกยืดผิดรูป และยังยึดเท้าที่ `playerFootAnchorY` เดิม

เปลี่ยนเงาผู้เล่นจากวงกลมเป็นวงรีที่คำนวณ `rx` และ `ry` ตามความสูง sprite พร้อมวางกึ่งกลางใต้เท้า เพื่อให้สมส่วนกับตัวละครที่ขยายแล้ว สำรองสถานะก่อนปรับขนาดตัวละครทั้งหมดไว้ที่ `backups/oodd-oodd-cooking-before-character-size-customer-scale.tar.gz` สำรองสถานะก่อนเพิ่มขนาด Boar ไว้ที่ `backups/oodd-oodd-cooking-before-boar-size-adjustment.tar.gz` และสำรองสถานะล่าสุดก่อนลดขนาด Baby Pork ไว้ที่ `backups/oodd-oodd-cooking-before-babypork-size-adjustment.tar.gz`

เพิ่ม browser regression ให้ตรวจความสูงพื้นฐาน 92 หน่วย ความสูง Boar 100 หน่วย ความสูง Baby Pork 63 หน่วย ความกว้างที่ปรับตามสัดส่วน และเงาแบบ ellipse ที่ปรับตามตัวละคร

Validation: `npm run check` และ `npm test` ผ่านแล้ว; browser regression ยังต้องรันใน environment ที่มี Chromium remote debugging port `9223`

## Desktop Two-Column Gameplay Layout

หน้าจอเกมบน desktop ที่กว้างตั้งแต่ 851px ใช้ CSS Grid สองคอลัมน์ โดยคอลัมน์ซ้ายประมาณ 30% สำหรับคิวออเดอร์ และคอลัมน์ขวาประมาณ 70% สำหรับฉากครัว การ์ดออเดอร์ ชื่อเมนู countdown ไอคอนวัตถุดิบ/เครื่องมือ และ HUD ถูกขยายให้อ่านง่ายขึ้น ขณะที่ `viewBox` SVG พิกัดสถานี collision และขนาด gameplay ยังคงเดิม

Native fullscreen และ fallback fullscreen ใช้สัดส่วนสองคอลัมน์เดียวกับ desktop ปกติ ส่วน mobile และ landscape touch ยังคง stage แบบเดิม: การ์ดออเดอร์วางทับมุมซ้ายของฉาก และครัวใช้พื้นที่ที่เหลือภายใน viewport โดยไม่เปลี่ยนการควบคุมหรือ geometry ของเกม

เพิ่ม assertions ใน `test/run-browser-check.js` เพื่อตรวจคอลัมน์ ตำแหน่ง สัดส่วน ขนาด UI และ fallback fullscreen รวมถึงตรวจว่า 640×360 landscape ยังคงใช้ compact touch layout การตรวจ `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว การตรวจภาพบน desktop หลายอัตราส่วนและอุปกรณ์ touch จริงยังควรทำเพิ่มเติม

แก้พื้นหลัง native และ fallback fullscreen ให้ใช้สีครีม `#fbf8f3` เดียวกับหน้าเกม และกำหนด `::backdrop` สำหรับ Fullscreen API เพื่อไม่ให้พื้นที่รอบเกมแสดงเป็นสีดำ

## Fullscreen Interaction Reflow Fix

แก้ closing tag ของ `.game-shell` ใน `index.html` ให้ `#game-message` อยู่นอกกรอบฉากครัวตามโครงสร้างที่ตั้งใจไว้ เดิม desktop fullscreen เปลี่ยน `.game-shell` เป็น flex ทำให้ข้อความสถานะกลายเป็นคอลัมน์ข้างฉาก และเมื่อกดโต้ตอบแล้ว `setMessage()` เปลี่ยนข้อความจึงทำให้ layout reflow และ UI เลื่อน ปัจจุบัน fullscreen ไม่ใช้ flex กับ `.game-shell` และจองพื้นที่ข้อความไว้คงที่สองบรรทัด

เพิ่ม browser regression ที่ตรวจ parent DOM, การจัดวางสองคอลัมน์, ตำแหน่งฉาก/ออเดอร์ก่อนและหลังการกดโต้ตอบ และ scroll position การตรวจ `npm run check`, `npm test` และ Solo browser/responsive check ผ่านแล้ว

## Unordered Plate Recipe Assembly

ปรับ `recipes.js` ให้การประกอบจานเทียบ `menu.components` แบบ exact multiset โดยไม่ใช้ลำดับเป็นเงื่อนไข เมนูทั้งหกจึงใส่ข้าวและอาหารที่ปรุงเสร็จได้ทุก permutation รวมถึงใส่ข้าวก่อนอาหารปรุง ส่วนข้าวผัดกุ้งยังนำข้าว เนื้อ ผัก และไข่ลงกระทะรวมกันแบบไม่บังคับลำดับเดิม

สถานีข้าวเปิดตัวเลือกได้แม้ถือจานว่าง และ `chooseRice()` จะตรวจว่าองค์ประกอบใหม่ยังเป็น subset ของเมนูใดเมนูหนึ่งก่อนบันทึกลงจาน หากข้าวหรืออาหารปรุงผิดเมนู/เกินจำนวน จานเดิมและ output ที่สถานีจะยังอยู่ครบ พร้อมข้อความกลางว่าไม่สามารถรับส่วนผสมนี้ได้ ผู้เล่นที่ไม่มีจานยังเลือกข้าวดิบเพื่อใส่กระทะข้าวผัดได้เหมือนเดิม โดย `menu.components` ยังคงเป็น source of truth เดียว

เพิ่ม unit และ browser regression สำหรับทุก permutation ของ components ทั้งหกเมนู การใส่ข้าวก่อน cooked component แล้วประกอบต่อจนสำเร็จ การปฏิเสธส่วนผสมผิดเมนู/เกินจำนวนโดยรักษาจานเดิม และการทำงานเดิมของข้าวผัดกุ้ง พร้อมตรวจกรอบสีแยกตาม `order-step` และขนาดไอคอนใบออเดอร์บน desktop/640×360 landscape; validation ล่าสุดผ่านครบ `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local`

## Player Name Placement

ลบวงสี `.player-color-ring` ใต้ตัวละคร local ออก โดยคงเงาตัวละครไว้ และย้ายชื่อผู้เล่นจากเหนือ sprite มาเป็น baseline ใต้เท้าที่ `y=52` ภายในกลุ่มตัวละคร ชื่อยังใช้ `player.color` เพื่อแยกผู้เล่น โดยคงขนาด held item ข้อมูลสถานะ และ sprite foot anchor เดิมไว้; การวาง overlay ตามความสูงของ sprite อธิบายไว้ในหัวข้อถัดไป

เพิ่ม browser regression ให้ตรวจว่าไม่สร้างวงสี ชื่อยังแสดงด้วยสีของผู้เล่น และ baseline อยู่ต่ำกว่าขอบล่างของ sprite การตรวจ syntax ผ่านแล้ว; ควรรัน Solo/local browser checks และตรวจด้วยตาในโหมดคีย์บอร์ดกับโทรศัพท์จริงเพิ่มเติม

## Height-Aware Held Item Overlay

ปรับตำแหน่ง held item ของผู้เล่นให้คำนวณจาก `height` ของ sprite ที่กำลังแสดง แทนการใช้ตำแหน่งคงที่ จึงรองรับความสูงที่ต่างกันของตัวละครทั้งห้าตัว เฟรมเดิน และ recovery sprite โดยยังคง foot anchor ที่ `y=30-height`, ตำแหน่งผู้เล่น, collision, ระยะโต้ตอบ และขนาดภาพของถือ `26x26` กับ clip circle เดิมไว้

held bubble อยู่เหนือขอบบนของ sprite ด้วยระยะปกติ 6 world units ส่วน action badge และ status badge เรียงต่อขึ้นไปด้วยระยะเดียวกันและไม่ชนกันในพื้นที่ปกติ การเรียงลำดับ SVG วาง sprite ก่อน held item เพื่อให้รูปของถือแสดงทับฉากตัวละครอย่างชัดเจน ตำแหน่ง overlay ถูกอัปเดตเมื่อสร้างผู้เล่น เปลี่ยนเฟรม/ทิศทาง เปลี่ยน recovery sprite และเคลื่อนผู้เล่น เมื่อผู้เล่นอยู่ใกล้ขอบบนของ `viewBox` ระบบจะลดระยะห่างของ stack ลงเท่าที่จำเป็นเพื่อให้ overlay ยังอยู่ในฉาก โดยไม่ย้ายไปด้านข้างหรือซ่อนรูป

เพิ่ม browser regression สำหรับตัวละครทั้งห้าตัวในทิศทางหลักและ recovery frames ตรวจระยะห่างของ held/action/status, การแสดง held image, ลำดับ sprite กับ held, foot anchor, ตำแหน่ง gameplay และการ clamp ที่ขอบบนแล้ว ผล validation ล่าสุด: `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว การตรวจด้วยตาบนเครื่องจริง โดยเฉพาะ Grilled Pork, Boar, recovery state และโทรศัพท์จริงยังควรทำเพิ่มเติม

## Kitchen PNG Artwork and Layout

ฉากครัวใช้ asset จาก `image/kitchen/` ตามภาพอ้างอิง `การจัดวาง.png` แทน station SVG เดิม โดยแยกชั้นตกแต่งออกจากชั้น hitbox โปร่งใส: `เคาเตอร์.png` เป็นแนวเคาน์เตอร์, `เตา.png` เป็นฐานเตา 4 จุด, `เขียง.png` และ `กอก.png` อยู่กลางแถวบน, กล่องวัตถุดิบ 6 ชนิดอยู่แถวล่าง, `เตาย่าง.png` อยู่เหนือ `ขยะ.png` ทางขวา และ `แคชเชียร์.png` เป็นจุดเสิร์ฟด้านล่าง ภาพตกแต่งใช้ `pointer-events: none` ส่วน station เดิมยังคง ID `pan-1`, `pan-2`, `pot-1`, `pot-2`, `grill`, วัตถุดิบ, `trash` และ `serve` ผ่าน hitbox ที่มี `data-x`/`data-y` ใหม่ จึงไม่ผูก interaction กับขอบภาพโดยตรง

หม้อและกระทะแต่ละจุดเปลี่ยนจาก `หม้อ.png`/`กระทะ.png` เป็น `หม้อสุก.png`/`กระทะสุก.png` ทันทีที่เริ่ม cooking และคงภาพสุกระหว่าง `cooking` กับ `ready` ก่อนคืนภาพปกติเมื่อรับอาหารหรือ reset รอบ สถานีทั้งสี่ทำงานแยกกัน ส่วน grill ใช้ `เตาย่าง.png` ภาพเดียวและยังแสดง progress/READY ผ่าน status UI เดิม Label เดิมถูกซ่อนจากภาพ แต่เก็บ `aria-label` และ `<title>` สำหรับ accessibility

เพิ่ม browser regression สำหรับ asset ครบชุด, กล่องวัตถุดิบไม่ซ้ำ, hitbox แยก, ภาพ idle/cooked ของหม้อและกระทะ และ customer service coordinate ใหม่ Validation ล่าสุดผ่าน `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local`

## Counter Layout Regression

จัดฉาก SVG ให้มีภาพ `เคาเตอร์.png` เหลือ 8 ชิ้นตามภาพอ้างอิง: แนวตั้งด้านซ้าย 4 ชิ้นและแนวนอนด้านล่าง 4 ชิ้น โดยกรอบ `<image>` ทุกชิ้นอยู่ภายใน `viewBox="0 0 1000 620"` และเรียงต่อกันโดยไม่เกิดช่องว่างหรือการซ้อนผิดปกติ ภาพกล่องข้าวและกล่องจานย้ายไปมุมขวาบน พร้อมย้าย hitbox `rice` และ `plate` ไปที่พิกัดเดียวกันในพื้นที่เกม โดยคง station ID, กติกาการโต้ตอบ, สูตรอาหาร, cooking state, score, timer และ controller protocol เดิม

เพิ่ม browser regression ตรวจจำนวนและแนวการเรียงเคาน์เตอร์, ขอบเขตภาพ, ความครบถ้วนของ station hitbox, ความตรงกันระหว่าง `data-x`/`data-y` กับ transform และตำแหน่งภาพ rice/plate ส่วน regression การเก็บวัตถุดิบ ทำอาหาร รับอาหาร และเสิร์ฟยังใช้ hitbox จาก `data-x`/`data-y` ที่ย้ายแล้ว

Validation: `npm run check`, `npm test`, `npm run test:relay`, `npm run test:browser:solo` และ `npm run test:browser:local` ผ่านแล้ว โดย browser regression ตรวจ desktop, 640×360 landscape, portrait warning, Solo/local co-op และ phone controller flow; การตรวจภาพบนอุปกรณ์จริงยังควรทำเพิ่มเติม

## Baby Pork Cooking Skill Update

ปรับ `cookingMultiplier` ของ Baby Pork เป็น `0.5` เมื่อใช้สกิล เพื่อนร่วมทีมที่เริ่มทำอาหารภายในช่วงผลของสกิลจะใช้เวลาปรุง 1 วินาที แทนเวลาปกติ 2 วินาที โดยผลสกิลยังมีระยะเวลา 10 วินาทีเหมือนเดิม

Validation: `npm run check` และ `npm test` ผ่านแล้ว

## Order Tool Icon Size Update

ขยายไอคอนหม้อ กระทะ และเตาย่างบนขั้นตอนของใบออเดอร์ให้มองเห็นชัดขึ้น โดยขนาดพื้นฐานเพิ่มจาก 16 เป็น 24 พิกเซล, desktop เพิ่มจาก 21 เป็น 30 พิกเซล และหน้าจอสัมผัสแนวนอนเพิ่มจาก 14 เป็น 20 พิกเซล พร้อมเพิ่มพื้นที่ด้านบนของกรอบ `order-step` และความสูงขั้นต่ำของแถวสูตรบน mobile landscape เพื่อไม่ให้ไอคอนชนกับรูปวัตถุดิบหรือขอบ layout

Validation: `npm run check` และ `npm test` ผ่านแล้ว ตรวจค่า responsive CSS ยืนยันขนาด 30 พิกเซลบน desktop, 24 พิกเซลใน layout พื้นฐาน และ 20 พิกเซลบน mobile landscape พร้อมพื้นที่ด้านบนที่เพิ่มตามขนาดไอคอน; ยังควรตรวจภาพด้วยตาในเบราว์เซอร์จริงเพิ่มเติม

## Fried Rice Order Rice Image

ใบออเดอร์เมนูข้าวผัดกุ้งใช้ `image/food/ข้าวสวยเเก้.png` สำหรับไอคอนข้าวสวยโดยเฉพาะผ่าน `menu.ingredientImages` ขณะที่ ID วัตถุดิบและสูตรกระทะยังคงใช้ `steamedRice` จึงไม่กระทบการเลือกข้าว การใส่วัตถุดิบ และ transformation ของข้าวผัดกุ้ง เมนูอื่นยังใช้รูปข้าวสวยเดิม

Validation: `npm run check` และ `npm test` ผ่านแล้ว พร้อมยืนยันว่าไฟล์ PNG มีอยู่จริงและ `ingredientImages.steamedRice` ของเมนูข้าวผัดกุ้งชี้ไปยังไฟล์ดังกล่าว

## Rice Choice Images

เปลี่ยนสี่เหลี่ยมสีขาวและสีเทาในหน้าต่างเลือกข้าวของผู้เล่นฝั่งจอหลักเป็นภาพ `image/food/ข้าวสวยเเก้.png` และ `image/food/ข้าวเหนียวเเก้.png` ตามลำดับ ภาพใช้กรอบแสดงผลขนาด 58×46 พิกเซล, รักษาสัดส่วนด้วย `background-size: contain` และคงชื่อกับพฤติกรรมของปุ่มเลือกข้าวเดิมไว้

Validation: `npm run check`, `npm test` และ `git diff --check` ผ่านแล้ว พร้อมยืนยันว่าไฟล์รูปข้าวทั้งสอง path มีอยู่จริง
