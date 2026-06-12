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
  rows: number;
  cols: number;
  slotLength: number;
  slotWidth: number;
  rng?: () => number;
}

const CAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22'];
const PARK_SPEED_THRESHOLD = 0.5;
const PARK_ANGLE_TOLERANCE = (20 * Math.PI) / 180;
const MIN_EMPTY_SLOTS = 2;
const MAX_EMPTY_SLOTS = 5;

export class ParkingLot {
  readonly width: number;
  readonly height: number;
  readonly slots: Slot[] = [];
  readonly parkedCars: ParkedCar[] = [];
  readonly walls: Wall[] = [];
  readonly entrance: Vec2;

  constructor(opts: ParkingLotOptions) {
    const rng = opts.rng ?? Math.random;
    const slotL = opts.slotLength;
    const slotW = opts.slotWidth;
    const rows = Math.max(1, opts.rows);
    const cols = Math.max(1, opts.cols);

    const drivewayWidth = slotL * 1.6;
    const pairGap = 0;
    const padding = slotL * 0.6;
    const corridorWidth = slotL * 1.8;

    const rowLayout: { cy: number; angle: number }[] = [];
    let y = padding;
    let placed = 0;
    const pairs = Math.ceil(rows / 2);
    for (let p = 0; p < pairs; p++) {
      const rowsInPair = Math.min(2, rows - placed);
      if (rowsInPair === 1) {
        rowLayout.push({ cy: y + slotL / 2, angle: Math.PI / 2 });
        placed++;
        y += slotL;
      } else {
        rowLayout.push({ cy: y + slotL / 2, angle: Math.PI / 2 });
        rowLayout.push({ cy: y + slotL + drivewayWidth + slotL / 2, angle: -Math.PI / 2 });
        placed += 2;
        y += 2 * slotL + drivewayWidth;
      }
      if (placed < rows) y += pairGap;
    }
    const lotHeight = y + padding;
    const lotWidth = corridorWidth + cols * slotW + padding;
    this.width = lotWidth;
    this.height = lotHeight;

    const xStart = corridorWidth + slotW / 2;
    for (let r = 0; r < rows; r++) {
      const { cy, angle } = rowLayout[r];
      for (let c = 0; c < cols; c++) {
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

    const total = this.slots.length;
    const maxEmpty = Math.min(MAX_EMPTY_SLOTS, total);
    const minEmpty = Math.min(MIN_EMPTY_SLOTS, total);
    const numEmpty = minEmpty + Math.floor(rng() * (maxEmpty - minEmpty + 1));
    const emptyIndices = pickIndices(total, numEmpty, rng);
    for (const idx of emptyIndices) this.slots[idx].occupied = false;

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
      { obb: { cx: lotWidth / 2, cy: -wallThickness / 2, hx: lotWidth / 2 + wallThickness, hy: wallThickness / 2, angle: 0 } },
      { obb: { cx: lotWidth / 2, cy: lotHeight + wallThickness / 2, hx: lotWidth / 2 + wallThickness, hy: wallThickness / 2, angle: 0 } },
      { obb: { cx: -wallThickness / 2, cy: lotHeight / 2, hx: wallThickness / 2, hy: lotHeight / 2 + wallThickness, angle: 0 } },
      { obb: { cx: lotWidth + wallThickness / 2, cy: lotHeight / 2, hx: wallThickness / 2, hy: lotHeight / 2 + wallThickness, angle: 0 } },
    );

    this.entrance = { x: corridorWidth / 2, y: lotHeight / 2 };
  }

  isParked(car: Car): boolean {
    if (Math.abs(car.velocity) > PARK_SPEED_THRESHOLD) return false;
    return this.parkedSlot(car) !== null;
  }

  parkedSlot(car: Car): Slot | null {
    for (const s of this.slots) {
      if (s.occupied) continue;
      if (!isAligned(car.heading, s.angle, PARK_ANGLE_TOLERANCE)) continue;
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      const halfL = s.length / 2;
      const halfW = s.width / 2;
      let inside = true;
      for (const corner of car.getCorners()) {
        const dx = corner.x - s.cx;
        const dy = corner.y - s.cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        if (Math.abs(u) > halfL + 1e-9 || Math.abs(v) > halfW + 1e-9) {
          inside = false;
          break;
        }
      }
      if (inside) return s;
    }
    return null;
  }
}

function isAligned(a: number, b: number, tol: number): boolean {
  const twoPi = Math.PI * 2;
  let d = ((a - b) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
  d = Math.abs(d);
  return d <= tol || Math.abs(d - Math.PI) <= tol;
}

function pickIndices(total: number, count: number, rng: () => number): number[] {
  const pool = Array.from({ length: total }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const j = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[j]);
    pool.splice(j, 1);
  }
  return out;
}
