import type { OBB } from './Collision';
import { obbIntersect } from './Collision';

export interface Pedestrian {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  heading: number;
  stuckTime: number;
}

export interface AICar {
  x: number;
  y: number;
  heading: number;
  speed: number;
  length: number;
  width: number;
  color: string;
  stuckTime: number;
}

export interface TrafficOptions {
  lotWidth: number;
  lotHeight: number;
  pedestrians: number;
  aiCars: number;
  driveways: number[];
  /** Y-coordinates of clear horizontal strips (used for E↔W pedestrian walks). */
  horizontalLanes: number[];
  /** X-coordinates of clear vertical lanes (used for N↔S pedestrian walks). */
  verticalLanes: number[];
  rng?: () => number;
}

const PED_RADIUS = 0.3;
const PED_SPEED_MIN = 0.7;
const PED_SPEED_MAX = 1.4;
const AI_CAR_LENGTH = 4;
const AI_CAR_WIDTH = 2;
const AI_CAR_SPEED_MIN = 2;
const AI_CAR_SPEED_MAX = 4;
const AI_CAR_COLORS = ['#5d6d7e', '#85929e', '#7fb3d5', '#d7bde2', '#a3e4d7'];
// How far ahead an agent looks when deciding whether to wait for another agent.
const PED_LOOKAHEAD = 0.6;
const CAR_LOOKAHEAD = 1.2;
// If an agent stays blocked for this long it gives way: reverses direction so
// it visibly turns around and heads back the way it came. Without this, two
// cars / a car + pedestrian heading down the same lane in opposite directions
// deadlock forever. Once they're moving the other way, the normal out-of-lot
// despawn picks them up at the edge.
const STUCK_TIMEOUT = 1.5;

export class Traffic {
  readonly pedestrians: Pedestrian[] = [];
  readonly cars: AICar[] = [];
  private readonly lotW: number;
  private readonly lotH: number;
  private readonly driveways: number[];
  private readonly horizontalLanes: number[];
  private readonly verticalLanes: number[];
  private readonly rng: () => number;

  constructor(opts: TrafficOptions) {
    this.lotW = opts.lotWidth;
    this.lotH = opts.lotHeight;
    this.driveways = opts.driveways.length > 0 ? opts.driveways : [opts.lotHeight / 2];
    this.horizontalLanes = opts.horizontalLanes.length > 0
      ? opts.horizontalLanes
      : [opts.lotHeight / 2];
    this.verticalLanes = opts.verticalLanes.length > 0
      ? opts.verticalLanes
      : [opts.lotWidth / 2];
    this.rng = opts.rng ?? Math.random;
    for (let i = 0; i < opts.pedestrians; i++) {
      const p: Pedestrian = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: PED_RADIUS,
        heading: 0,
        stuckTime: 0,
      };
      this.respawnPedestrian(p);
      this.pedestrians.push(p);
    }
    for (let i = 0; i < opts.aiCars; i++) {
      const c: AICar = {
        x: 0,
        y: 0,
        heading: 0,
        speed: AI_CAR_SPEED_MIN,
        length: AI_CAR_LENGTH,
        width: AI_CAR_WIDTH,
        color: AI_CAR_COLORS[Math.floor(this.rng() * AI_CAR_COLORS.length)],
        stuckTime: 0,
      };
      this.respawnAICar(c);
      this.cars.push(c);
    }
  }

  /** Advance the world. Returns true if anything collided with the player. */
  update(dt: number, playerOBB: OBB): boolean {
    let collided = false;

    // Build the avoidance set once: every agent's current footprint, modeled as
    // a circle so the "would I overlap?" check is a cheap distance compare.
    const footprints: { x: number; y: number; r: number }[] = [];
    for (const p of this.pedestrians) footprints.push({ x: p.x, y: p.y, r: p.radius });
    for (const c of this.cars) {
      footprints.push({ x: c.x, y: c.y, r: Math.max(c.length, c.width) / 2 });
    }

    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      const lookX = p.x + p.vx * PED_LOOKAHEAD;
      const lookY = p.y + p.vy * PED_LOOKAHEAD;
      const blocked = isBlocked(lookX, lookY, p.radius, footprints, i);
      if (!blocked) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        footprints[i].x = p.x;
        footprints[i].y = p.y;
        p.stuckTime = 0;
      } else {
        p.stuckTime += dt;
      }
      if (circleVsOBB(p.x, p.y, p.radius, playerOBB)) collided = true;
      if (p.stuckTime >= STUCK_TIMEOUT) {
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.heading = Math.atan2(p.vy, p.vx);
        p.stuckTime = 0;
      }
      if (this.outOfRange(p.x, p.y, 1.5)) {
        this.respawnPedestrian(p);
        footprints[i].x = p.x;
        footprints[i].y = p.y;
      }
    }

    const carOffset = this.pedestrians.length;
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const fx = c.x + Math.cos(c.heading) * (c.length / 2 + CAR_LOOKAHEAD);
      const fy = c.y + Math.sin(c.heading) * (c.length / 2 + CAR_LOOKAHEAD);
      const carR = Math.max(c.length, c.width) / 2;
      // Treat the player just like another agent: if the lookahead circle
      // overlaps the player's OBB, the AI car holds station instead of
      // ramming through. Same brake behavior as for pedestrians and other AI.
      const blocked = isBlocked(fx, fy, carR, footprints, carOffset + i)
        || circleVsOBB(fx, fy, carR, playerOBB);
      if (!blocked) {
        c.x += Math.cos(c.heading) * c.speed * dt;
        c.y += Math.sin(c.heading) * c.speed * dt;
        footprints[carOffset + i].x = c.x;
        footprints[carOffset + i].y = c.y;
        c.stuckTime = 0;
      } else {
        c.stuckTime += dt;
      }
      const carOBB: OBB = {
        cx: c.x,
        cy: c.y,
        hx: c.length / 2,
        hy: c.width / 2,
        angle: c.heading,
      };
      if (obbIntersect(carOBB, playerOBB)) collided = true;
      if (c.stuckTime >= STUCK_TIMEOUT) {
        // U-turn in place: face the other way and head back out the lane.
        // Instant heading flip reads as "decided to give way" at AI car speeds.
        c.heading = normalizeAngle(c.heading + Math.PI);
        c.stuckTime = 0;
      }
      if (this.outOfRange(c.x, c.y, c.length)) {
        this.respawnAICar(c);
        footprints[carOffset + i].x = c.x;
        footprints[carOffset + i].y = c.y;
      }
    }
    return collided;
  }

  private outOfRange(x: number, y: number, margin: number): boolean {
    return x < -margin || x > this.lotW + margin || y < -margin || y > this.lotH + margin;
  }

  private respawnPedestrian(p: Pedestrian): void {
    // Pedestrians only walk in pre-computed clear lanes (horizontal strips
    // between row pairs, or vertical gaps between adjacent slot columns) so
    // they never have to pass through a parked car. They enter from one edge
    // of the chosen lane, cross to the other, then despawn just past it.
    const speed = PED_SPEED_MIN + this.rng() * (PED_SPEED_MAX - PED_SPEED_MIN);
    if (this.rng() < 0.5) {
      const y = this.horizontalLanes[Math.floor(this.rng() * this.horizontalLanes.length)];
      const dir = this.rng() < 0.5 ? 1 : -1;
      p.x = dir > 0 ? -0.5 : this.lotW + 0.5;
      p.y = y;
      p.vx = dir * speed;
      p.vy = 0;
    } else {
      const x = this.verticalLanes[Math.floor(this.rng() * this.verticalLanes.length)];
      const dir = this.rng() < 0.5 ? 1 : -1;
      p.x = x;
      p.y = dir > 0 ? -0.5 : this.lotH + 0.5;
      p.vx = 0;
      p.vy = dir * speed;
    }
    p.heading = Math.atan2(p.vy, p.vx);
    p.stuckTime = 0;
  }

  private respawnAICar(c: AICar): void {
    // AI cars only travel along driveways (the horizontal gaps between row
    // pairs) so they don't slice through parked cars. They appear just past
    // a side wall, drive across, and despawn off the far side.
    const dir = this.rng() < 0.5 ? 1 : -1;
    const driveway = this.driveways[Math.floor(this.rng() * this.driveways.length)];
    c.y = driveway;
    c.x = dir > 0 ? -c.length : this.lotW + c.length;
    c.heading = dir > 0 ? 0 : Math.PI;
    c.speed = AI_CAR_SPEED_MIN + this.rng() * (AI_CAR_SPEED_MAX - AI_CAR_SPEED_MIN);
    c.stuckTime = 0;
  }
}

function isBlocked(
  x: number,
  y: number,
  r: number,
  footprints: { x: number; y: number; r: number }[],
  selfIndex: number,
): boolean {
  for (let i = 0; i < footprints.length; i++) {
    if (i === selfIndex) continue;
    const o = footprints[i];
    const dx = x - o.x;
    const dy = y - o.y;
    const rr = r + o.r;
    if (dx * dx + dy * dy < rr * rr) return true;
  }
  return false;
}

function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

function circleVsOBB(cx: number, cy: number, r: number, o: OBB): boolean {
  const dx = cx - o.cx;
  const dy = cy - o.cy;
  const lx = dx * Math.cos(o.angle) + dy * Math.sin(o.angle);
  const ly = -dx * Math.sin(o.angle) + dy * Math.cos(o.angle);
  const clampedX = Math.max(-o.hx, Math.min(o.hx, lx));
  const clampedY = Math.max(-o.hy, Math.min(o.hy, ly));
  const distX = lx - clampedX;
  const distY = ly - clampedY;
  return distX * distX + distY * distY <= r * r;
}
