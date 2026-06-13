# Parking Game

A small browser parking game: find a highlighted empty slot, park cleanly without hitting anything, and do it fast. Built with TypeScript + Vite, rendered on plain HTML5 Canvas with hand-rolled 2D bicycle-model physics and OBB / SAT collisions.

## How to play

**Goal.** Drive your yellow car into any slot highlighted in green, stop, and roughly align with the slot. One collision = game over.

**Scoring.** Higher is better. Each successful park rewards parking quickly *and* close to the green entrance marker (`IN`), up to **1000 per round**. The HUD shows your **session total** — round scores accumulate across restarts, so the score never resets to 0 just because you hit `R`.

**Win condition.** All four corners of the car inside an empty slot's white lines, speed below 0.5 m/s, heading within ±20° of the slot's axis (either direction works).

**Crash condition.** Any contact with another car or a lot wall ends the run.

**Multiple empties.** Each round has 2–5 empty slots, all highlighted in green. Park in any of them — picking one closer to the entrance scores better.

### Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Throttle | `W` / `↑` | green **GAS** pedal |
| Brake / reverse | `S` / `↓` / `Space` (held while at rest = reverse) | red **BRAKE** pedal (held while at rest = reverse) |
| Steer | `A`/`D` or `←`/`→` | drag the steering wheel left/right — steering is relative to where you first touched, with the rotation direction matched to the touch point (grabbing the bottom and pulling right turns the wheel left, like a real wheel), and snaps back to center on release |
| Zoom | mouse wheel | two-finger pinch |
| Restart | `R` / `Enter` / click the **Restart** button | tap the **Restart** button |

The camera is always centered on your car (clamped to lot bounds, so the view stops at the walls). Mobile controls (steering wheel + pedals) only appear on touch devices.

### HUD

The HUD has three equally-sized pills along the top: **Time** (seconds remaining), **Score** (running session total), and a combined **status / Restart** button. The button's label updates with game state — `Restart`, `Crashed`, `Timeout`, or `Parked` on a win — and the ↻ icon doubles as the affordance for "tap to start over". Labels are deliberately short so the row stays on one line on narrow phones; hover the button for the full sentence. The round score (the `+N` in the win label) is what gets banked into the session total when you restart.

On game over (crash or timeout) the player car is drawn grey with all lights off.

## Project structure

```
src/
  main.ts                bootstrap, game loop, pinch / wheel zoom, session-score accumulation
  game/
    Car.ts               kinematic bicycle-model car physics
    Collision.ts         OBB + SAT intersection
    ParkingLot.ts        multi-row lot generation, win detection
    Score.ts             time + distance score formula
    Game.ts              state machine orchestrating the above
  ui/
    Input.ts             keyboard + touch input (steering wheel + pedals)
    Renderer.ts          Canvas 2D drawing, zoom, car-follow camera
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
npm run lint           # run ESLint (typescript-eslint)
npm run dev            # start the Vite dev server at http://localhost:5173
npm run build          # type-check + bundle to ./docs
npm run preview        # serve the production build locally
```

### Deploying to GitHub Pages

`npm run build` writes the production bundle to `./docs`. Enable GitHub Pages → "Deploy from a branch" → `main` / `/docs` and the game is live.

## Linting

ESLint runs through `typescript-eslint` (flat config in `eslint.config.js`). The notable house rule is `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` — **`as` casts are banned**. Use type guards (`typeof`, `instanceof`, user-defined predicates) or correct typings instead. `as const` is still allowed because it is type-safe.

## Implementation notes

- **TDD.** `tests/` were written first, then the implementations under `src/game/`. They cover the four pure logic modules (`Car`, `Collision`, `ParkingLot`, `Score`); rendering and DOM input are exercised manually.
- **Physics.** A kinematic bicycle model — no inertia/mass, no tire forces. Forward acceleration, drag, brake force, max speed and steering angle are tuned constants in `Car.ts`. Only the front wheels steer: each tick the **rear axle** is rolled forward along the current heading and the heading is then advanced by `v · tan(δ) / L`, so the body sweeps around the external instant center (perpendicular to the rear axle, at radius `L / tan δ`). The body center is re-derived from the updated rear axle each step. Steering only changes heading while moving (yaw rate ∝ speed).
- **Collisions.** Every car (player and parked) is an oriented bounding box (OBB). Lot walls are also OBBs. The Separating Axis Theorem test in `Collision.ts` checks four axes per pair.
- **Parking lot.** Configurable `rows` × `cols` of slots arranged as pairs of rows facing each other across driveways, with a left-side corridor connecting all driveways to the entrance. Adjacent row pairs sit back-to-back (zero gap between rear bumpers) so the layout reads as discrete drive lanes rather than a wide-open area. Lot width and height are computed from the layout. Between 2 and 5 slots are left empty per round — any of them is a valid park. RNG is injectable for deterministic tests.
- **Single lot size.** The lot is always 4 rows × 10 cols regardless of viewport — the same puzzle on desktop and mobile. To keep mobile usable, the renderer starts at zoom 2 when `(hover: none) and (pointer: coarse)` matches (or when the device reports touch and a smaller viewport), so the car and nearby slots are large enough to maneuver around on a phone.
- **Mobile canvas sizing.** Real mobile Chrome behaves differently from devtools emulation in two ways the renderer compensates for: (1) the canvas is sized from `window.visualViewport` (with `window.innerWidth/Height` as a fallback) and re-sized on `visualViewport.resize`/`scroll` plus `orientationchange`, so the URL bar collapsing doesn't leave the canvas mismatched against the visible area; (2) `devicePixelRatio` is clamped to 2 so the internal canvas buffer doesn't blow past per-device canvas size limits and silently no-op on draw.
- **Win check.** All four player-car corners must lie inside some empty slot's local rectangle, speed below threshold, heading within ±20° of that slot's axis (mod 180°, so you can pull in either direction).
- **Camera.** Auto-fits the lot to the viewport at zoom 1; at higher zoom the camera follows the player car (clamped so the lot edges never reveal off-board). Zoom (wheel on desktop, two-finger pinch on mobile) is the only manual camera control — pan was removed because single-finger drag on the canvas conflicted with the touch listeners used by the steering wheel / pedals on real mobile browsers. The current zoom is preserved across restarts so hitting `R` mid-session doesn't snap the view back to a fit-the-whole-lot framing.
- **HUD updates.** Time is repainted once per second (not every frame); the score and status / restart button only re-render when their displayed value changes. The session score is held in `main.ts` and added to the current round's score for display, so winning a round shows the new total immediately and restarting banks it.

## License

See `LICENSE`.
