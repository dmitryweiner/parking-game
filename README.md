# Parking Game

A small browser parking game: find the highlighted empty slot, park cleanly without hitting anything, and do it fast. Built with TypeScript + Vite, rendered on plain HTML5 Canvas with a hand-rolled 2D bicycle-model physics and OBB / SAT collisions.

## How to play

**Goal.** Drive your yellow car into the slot highlighted in green, stop, and roughly align with the slot. One collision = game over.

**Scoring.** Higher is better. Score rewards parking quickly *and* parking close to the green entrance marker (`IN`). Maximum 1000.

**Win condition.** All four corners of the car inside the slot's white lines, speed below 0.5 m/s, heading within ±20° of the slot's axis (either direction works).

**Crash condition.** Any contact with another car or a lot wall ends the run.

### Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Throttle | `W` / `↑` | green **GAS** pedal |
| Brake / reverse | `S` / `↓` / `Space` (held while at rest = reverse) | red **BRAKE** pedal (held while at rest = reverse) |
| Steer | `A`/`D` or `←`/`→` | drag the steering wheel — it rotates with your input |
| Zoom | mouse wheel | two-finger pinch |
| Restart | `R` or `Enter` | restart by reloading (or press R on an attached keyboard) |

When the view is zoomed in, the camera follows the player car. Mobile controls (steering wheel + pedals) only appear on touch devices.

## Project structure

```
src/
  main.ts                bootstrap, game loop
  game/
    Car.ts               kinematic bicycle-model car physics
    Collision.ts         OBB + SAT intersection
    ParkingLot.ts        random lot generation, win detection
    Score.ts             time + distance score formula
    Game.ts              state machine orchestrating the above
  ui/
    Input.ts             keyboard + touch input
    Renderer.ts          Canvas 2D drawing
    Hud.ts               time / score / status overlay
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
- **Parking lot.** Two rows of slots facing each other across a horizontal driveway. One slot is randomly chosen as the empty target; the rest get parked cars. RNG is injectable for deterministic tests.
- **Win check.** All four player-car corners must lie inside the target slot's local rectangle, speed below threshold, heading within ±20° of slot axis (mod 180°, so you can pull in either direction).
- **Camera.** Fixed view, whole lot fits the screen. The canvas resizes to the window with `devicePixelRatio` accounted for.

## License

See `LICENSE`.
