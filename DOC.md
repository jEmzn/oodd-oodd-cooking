# Oodd Oodd Cooking - Project Summary

## Overview

Oodd Oodd Cooking is a small, dependency-free browser game built with HTML, CSS, JavaScript, and inline SVG. It presents a top-down kitchen where the player walks to objects and interacts with them before a 30-second timer expires.

## Project Files

- `index.html` defines the start screen, game screen, HUD, and SVG kitchen scene.
- `styles.css` controls the warm visual theme, layout, responsive behavior, buttons, HUD, SVG labels, and screen switching.
- `game.js` contains movement, proximity detection, interaction scoring, timer management, and game lifecycle logic.
- `AGENTS.md` contains contributor guidance for this repository.
- `DOC.md` is this project summary.

## User Flow

When the page opens, the start screen shows a blank light background, the title "Oodd Oodd Cooking," a short description, and a "Play Game" button. Clicking the button hides the start screen and reveals the game screen. The explicit `[hidden]` CSS rule ensures the two screens switch instead of appearing together.

After 30 seconds, the game stops, clears its timers and animation loop, waits briefly for a transition, and returns to the start screen. Starting a new round resets the player position, timer, total score, and each object's interaction count.

## Gameplay

- Move with `WASD` or the arrow keys.
- Walk close to the table, freezer, or chair.
- Press `E` to interact with the nearest object.
- Each interaction increases both the global score and that object's displayed count.
- A "PRESS E TO INTERACT" prompt appears when an object is within range.
- The HUD displays remaining time and total score; the timer changes color during the final 10 seconds.

## Visual Design

The game world is drawn entirely with SVG: patterned floor, room border, labels, three kitchen objects, player character, shadows, and interaction prompt. CSS adds a warm cream, brown, coral, blue, and gold palette, responsive sizing, rounded panels, hover states, and mobile-friendly HUD stacking.

## Technical Notes

The app has no external dependencies or build step. Open `index.html` directly in a modern browser. JavaScript uses DOM queries, SVG attributes, `requestAnimationFrame` for movement, and `setInterval` for the countdown. A browser-global naming collision was avoided by naming the prompt reference `interactionPrompt` rather than `prompt`.

## Validation

The generated files were inspected locally. Node.js was not installed in the shell environment, so `node --check` could not be run. Manual source review covered the button handler, screen switching, timer reset, movement bounds, proximity interaction, score updates, timeout return, and the explicit hidden-screen CSS rule.
