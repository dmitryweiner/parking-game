# Parking Game

A small browser parking game: find a highlighted empty slot, park cleanly without hitting anything, and do it fast. Built with TypeScript + Vite, rendered on plain HTML5 Canvas with hand-rolled 2D bicycle-model physics and OBB / SAT collisions.

## How to play

**Goal.** Drive your yellow car into any slot highlighted in green, stop, and roughly align with the slot. One collision = game over.

**Scoring.** Higher is better. Score rewards parking quickly *and* parking close to the green entrance marker (`IN`). Maximum 1000.

**Win condition.** All four corners of the car inside an empty slot's white lines, speed below 0.5 m/s, heading within ±20° of the slot's axis (either direction works).

**Crash condition.** Any contact with another car or a lot wall ends the run.

**Multiple empties.** Each round has 2–5 empty slots, all highlighted in green. Park in any of them — picking one closer to the entrance scores better.

### Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Throttle | `W` / `↑` | green **GAS** pedal |
| Brake / reverse | `S` / `↓` / `Space` (held while at rest = reverse) | red **BRAKE** pedal (held while at rest = reverse) |
| Steer | `A`/`D` or `←`/`→` | drag the steering wheel — it rotates with your input |
| Pan view | left-click + drag on the canvas | one-finger drag on empty canvas area |
| Zoom | mouse wheel | two-finger pinch |
| Restart | `R` / `Enter` / click the **Restart** button | tap the **Restart** button |

When the view is zoomed in, the camera softly follows the player car. Mobile controls (steering wheel + pedals) only appear on touch devices.

### HUD

The HUD has three equally-sized pills along the top: **Time** (seconds remaining), **Score**, and a combined **status / Restart** button. The button's label updates with game state — `Restart`, `Crashed — Restart`, `Time's up — Restart`, or `Parked! <score> — Restart` — so there's a single thing to click to start over.

On game over (crash or timeout) the player car is drawn grey with all lights off.

## Project structure

```
src/
  main.ts                bootstrap, game loop, pan / pinch / wheel handling
  game/
    Car.ts               kinematic bicycle-model car physics
    Collision.ts         OBB + SAT intersection
    ParkingLot.ts        multi-row lot generation, win detection
    Score.ts             time + distance score formula
    Game.ts              state machine orchestrating the above
  ui/
    Input.ts             keyboard + touch input (steering wheel + pedals)
    Renderer.ts          Canvas 2D drawing, zoom, pan
    Hud.ts               time / score / status-button overlay
  styles.css
tests/
  car.test.ts
  collision.test.ts
  parkingLot.test.ts
  score.test.ts
index.html
vite.config.ts
tsconfig.json
package.json
```

## Development

You need Node.js 18+ and a package manager. If you're on macOS:

```bash
brew install node
```

Then from the repo root:

```bash
npm install            # install dependencies
npm test               # run unit tests once (vitest)
npm run test:watch     # run tests in watch mode
npm run dev            # start the Vite dev server at http://localhost:5173
npm run build          # type-check + bundle to ./docs
npm run preview        # serve the production build locally
```

### Deploying to GitHub Pages

`npm run build` writes the production bundle to `./docs`. Enable GitHub Pages → "Deploy from a branch" → `main` / `/docs` and the game is live.

## Implementation notes

- **TDD.** `tests/` were written first, then the implementations under `src/game/`. They cover the four pure logic modules (`Car`, `Collision`, `ParkingLot`, `Score`); rendering and DOM input are exercised manually.
- **Physics.** A kinematic bicycle model — no inertia/mass, no tire forces. Forward acceleration, drag, brake force, max speed and steering angle are tuned constants in `Car.ts`. Steering only changes heading while moving (yaw rate ∝ speed).
- **Collisions.** Every car (player and parked) is an oriented bounding box (OBB). Lot walls are also OBBs. The Separating Axis Theorem test in `Collision.ts` checks four axes per pair.
- **Parking lot.** Configurable `rows` × `cols` of slots arranged as pairs of rows facing each other across driveways, with a left-side corridor connecting all driveways to the entrance. Adjacent row pairs sit back-to-back (zero gap between rear bumpers) so the layout reads as discrete drive lanes rather than a wide-open area. Lot width and height are computed from the layout. Between 2 and 5 slots are left empty per round — any of them is a valid park. RNG is injectable for deterministic tests.
- **Viewport-aware layout.** On startup (and on restart) the lot is generated portrait (8 rows × 4 cols) when the window is taller than wide, and landscape (4 rows × 10 cols) otherwise — so the default view fills mobile portrait screens without panning.
- **Win check.** All four player-car corners must lie inside some empty slot's local rectangle, speed below threshold, heading within ±20° of that slot's axis (mod 180°, so you can pull in either direction).
- **Camera.** Auto-fits the lot to the viewport at zoom 1, follows the player car softly when zoomed in. Pan (drag) and zoom (wheel / pinch) are independent — pan offset is clamped so the lot stays roughly on-screen, and is reset on restart.
- **HUD updates.** Time is repainted once per second (not every frame); the status / restart button only re-renders when the game state changes.

## License

See `LICENSE`.
