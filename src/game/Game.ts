import { Car, type CarInput } from './Car';
import { ParkingLot } from './ParkingLot';
import { obbIntersect } from './Collision';
import { computeScore } from './Score';
import { Traffic } from './Traffic';

export type GameState = 'playing' | 'won' | 'crashed' | 'timeout';

export interface GameOptions {
  rows?: number;
  cols?: number;
  slotLength?: number;
  slotWidth?: number;
  maxTime?: number;
  rng?: () => number;
  /** Difficulty level (0 = easiest). Drives the number of empty slots and the
   * amount of crossing traffic. Pass the current session level here. */
  level?: number;
}

const MAX_EMPTY_SLOTS = 6;
const MIN_EMPTY_SLOTS = 1;

export class Game {
  readonly lot: ParkingLot;
  readonly car: Car;
  readonly traffic: Traffic;
  readonly maxTime: number;
  readonly level: number;
  state: GameState = 'playing';
  timeElapsed = 0;
  finalScore = 0;

  constructor(opts: GameOptions = {}) {
    const rng = opts.rng ?? Math.random;
    const level = Math.max(0, Math.floor(opts.level ?? 0));
    this.level = level;
    const empty = Math.max(MIN_EMPTY_SLOTS, MAX_EMPTY_SLOTS - level);
    this.lot = new ParkingLot({
      rows: opts.rows ?? 4,
      cols: opts.cols ?? 10,
      slotLength: opts.slotLength ?? 5,
      slotWidth: opts.slotWidth ?? 2.5,
      emptySlots: empty,
      rng,
    });
    this.car = new Car({
      x: this.lot.entrance.x,
      y: this.lot.entrance.y,
      heading: 0,
    });
    this.maxTime = opts.maxTime ?? 60;
    this.traffic = new Traffic({
      lotWidth: this.lot.width,
      lotHeight: this.lot.height,
      pedestrians: 1 + level,
      aiCars: 1 + level,
      driveways: this.lot.driveways,
      horizontalLanes: this.lot.horizontalLanes,
      verticalLanes: this.lot.verticalLanes,
      rng,
    });
  }

  update(dt: number, input: CarInput): void {
    if (this.state !== 'playing') return;
    this.timeElapsed += dt;
    this.car.update(dt, input);

    const carOBB = this.car.getOBB();
    for (const p of this.lot.parkedCars) {
      if (obbIntersect(carOBB, p.obb)) {
        this.state = 'crashed';
        this.finalScore = 0;
        return;
      }
    }
    for (const w of this.lot.walls) {
      if (obbIntersect(carOBB, w.obb)) {
        this.state = 'crashed';
        this.finalScore = 0;
        return;
      }
    }

    if (this.traffic.update(dt, carOBB)) {
      this.state = 'crashed';
      this.finalScore = 0;
      return;
    }

    if (this.lot.isParked(this.car)) {
      this.state = 'won';
      const dx = this.car.position.x - this.lot.entrance.x;
      const dy = this.car.position.y - this.lot.entrance.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(this.lot.width ** 2 + this.lot.height ** 2);
      this.finalScore = computeScore({
        timeElapsed: this.timeElapsed,
        distanceFromEntrance: dist,
        maxTime: this.maxTime,
        maxDistance: maxDist,
      });
      return;
    }

    if (this.timeElapsed >= this.maxTime) {
      this.state = 'timeout';
      this.finalScore = 0;
    }
  }
}
