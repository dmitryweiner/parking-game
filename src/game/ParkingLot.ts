import type { Car, Vec2 } from './Car';
import type { OBB } from './Collision';

export interface Slot {
  cx: number;
  cy: number;
  angle: number;
  length: number;
  width: number;
  occupied: boolean;
  index: number;
}

export interface ParkedCar {
  obb: OBB;
  color: string;
}

export interface Wall {
  obb: OBB;
}

export interface ParkingLotOptions {
  width: number;
  height: number;
  rows: number;
  cols: number;
  slotLength: number;
  slotWidth: number;
  rng?: () => number;
}

const CAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22'];
const PARK_SPEED_THRESHOLD = 0.5;
const PARK_ANGLE_TOLERANCE = (20 * Math.PI) / 180;

export class ParkingLot {
  readonly width: number;
  readonly height: number;
  readonly slots: Slot[] = [];
  readonly parkedCars: ParkedCar[] = [];
  readonly walls: Wall[] = [];
  readonly targetSlot: Slot;
  readonly entrance: Vec2;

  constructor(opts: ParkingLotOptions) {
    this.width = opts.width;
    this.height = opts.height;
    const rng = opts.rng ?? Math.random;

    const slotL = opts.slotLength;
    const slotW = opts.slotWidth;
    const totalSlotsX = opts.cols * slotW;
    const xStart = (opts.width - totalSlotsX) / 2 + slotW / 2;
    const drivewayHalf = slotL * 0.8;

    for (let r = 0; r < opts.rows; r++) {
      const facingDown = r % 2 === 0;
      const angle = facingDown ? Math.PI / 2 : -Math.PI / 2;
      const cy = facingDown
        ? opts.height / 2 - drivewayHalf - slotL / 2
        : opts.height / 2 + drivewayHalf + slotL / 2;
      for (let c = 0; c < opts.cols; c++) {
        const cx = xStart + c * slotW;
        this.slots.push({
          cx,
          cy,
          angle,
          length: slotL,
          width: slotW,
          occupied: true,
          index: this.slots.length,
        });
      }
    }

    const targetIdx = Math.floor(rng() * this.slots.length) % this.slots.length;
    this.slots[targetIdx].occupied = false;
    this.targetSlot = this.slots[targetIdx];

    // parked cars sit comfortably inside their slot lines so the player can
    // drive across the white lines without immediately clipping a neighbor
    const carLength = slotL * 0.72;
    const carWidth = slotW * 0.62;
    for (const s of this.slots) {
      if (!s.occupied) continue;
      this.parkedCars.push({
        obb: { cx: s.cx, cy: s.cy, hx: carLength / 2, hy: carWidth / 2, angle: s.angle },
        color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      });
    }

    const wallThickness = 0.5;
    this.walls.push(
      { obb: { cx: opts.width / 2, cy: -wallThickness / 2, hx: opts.width / 2 + wallThickness, hy: wallThickness / 2, angle: 0 } },
      { obb: { cx: opts.width / 2, cy: opts.height + wallThickness / 2, hx: opts.width / 2 + wallThickness, hy: wallThickness / 2, angle: 0 } },
      { obb: { cx: -wallThickness / 2, cy: opts.height / 2, hx: wallThickness / 2, hy: opts.height / 2 + wallThickness, angle: 0 } },
      { obb: { cx: opts.width + wallThickness / 2, cy: opts.height / 2, hx: wallThickness / 2, hy: opts.height / 2 + wallThickness, angle: 0 } },
    );

    this.entrance = { x: Math.min(3, opts.width / 6), y: opts.height / 2 };
  }

  isParked(car: Car): boolean {
    if (this.targetSlot.occupied) return false;
    if (Math.abs(car.velocity) > PARK_SPEED_THRESHOLD) return false;
    if (!isAligned(car.heading, this.targetSlot.angle, PARK_ANGLE_TOLERANCE)) return false;

    const s = this.targetSlot;
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const halfL = s.length / 2;
    const halfW = s.width / 2;
    for (const corner of car.getCorners()) {
      const dx = corner.x - s.cx;
      const dy = corner.y - s.cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if (Math.abs(u) > halfL + 1e-9 || Math.abs(v) > halfW + 1e-9) return false;
    }
    return true;
  }
}

function isAligned(a: number, b: number, tol: number): boolean {
  const twoPi = Math.PI * 2;
  let d = ((a - b) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
  d = Math.abs(d);
  return d <= tol || Math.abs(d - Math.PI) <= tol;
}
