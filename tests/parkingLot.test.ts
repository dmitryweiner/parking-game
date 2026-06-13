import { describe, it, expect } from 'vitest';
import { ParkingLot } from '../src/game/ParkingLot';
import { Car } from '../src/game/Car';

const makeLot = (seed = 1) =>
  new ParkingLot({
    rows: 2,
    cols: 6,
    slotLength: 5,
    slotWidth: 2.5,
    rng: () => {
      // deterministic LCG seeded with the constructor seed
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    },
  });

const anyEmpty = (lot: ParkingLot) => {
  const s = lot.slots.find((slot) => !slot.occupied);
  if (!s) throw new Error('no empty slot');
  return s;
};

describe('ParkingLot generation', () => {
  it('creates the configured number of slots', () => {
    const lot = makeLot();
    expect(lot.slots).toHaveLength(12);
  });

  it('marks between 2 and 5 slots as empty', () => {
    const lot = makeLot();
    const empties = lot.slots.filter((s) => !s.occupied);
    expect(empties.length).toBeGreaterThanOrEqual(2);
    expect(empties.length).toBeLessThanOrEqual(5);
  });

  it('places parked cars in every occupied slot', () => {
    const lot = makeLot();
    const occupied = lot.slots.filter((s) => s.occupied);
    expect(lot.parkedCars).toHaveLength(occupied.length);
  });

  it('computes a width/height that fits the layout', () => {
    const lot = makeLot();
    expect(lot.width).toBeGreaterThan(0);
    expect(lot.height).toBeGreaterThan(0);
  });

  it('exposes an entrance position inside the lot bounds', () => {
    const lot = makeLot();
    expect(lot.entrance.x).toBeGreaterThanOrEqual(0);
    expect(lot.entrance.x).toBeLessThanOrEqual(lot.width);
    expect(lot.entrance.y).toBeGreaterThanOrEqual(0);
    expect(lot.entrance.y).toBeLessThanOrEqual(lot.height);
  });

  it('supports more than two rows', () => {
    const lot = new ParkingLot({ rows: 6, cols: 4, slotLength: 5, slotWidth: 2.5, rng: () => 0.5 });
    expect(lot.slots).toHaveLength(24);
  });
});

describe('ParkingLot win condition', () => {
  const lot = makeLot(42);
  const slot = anyEmpty(lot);

  it('returns true when car is centered, slow, and aligned with an empty slot', () => {
    const car = new Car({
      x: slot.cx,
      y: slot.cy,
      heading: slot.angle,
      length: 4,
      width: 2,
    });
    expect(lot.isParked(car)).toBe(true);
  });

  it('returns false when car is moving too fast', () => {
    const car = new Car({
      x: slot.cx,
      y: slot.cy,
      heading: slot.angle,
      length: 4,
      width: 2,
    });
    car.velocity = 5;
    expect(lot.isParked(car)).toBe(false);
  });

  it('returns false when car is misaligned (>20°)', () => {
    const car = new Car({
      x: slot.cx,
      y: slot.cy,
      heading: slot.angle + Math.PI / 4,
      length: 4,
      width: 2,
    });
    expect(lot.isParked(car)).toBe(false);
  });

  it('returns false when car is outside any slot bounds', () => {
    const car = new Car({
      x: slot.cx + 100,
      y: slot.cy + 100,
      heading: slot.angle,
      length: 4,
      width: 2,
    });
    expect(lot.isParked(car)).toBe(false);
  });

  it('accepts 180° flipped heading (parked facing either way)', () => {
    const car = new Car({
      x: slot.cx,
      y: slot.cy,
      heading: slot.angle + Math.PI,
      length: 4,
      width: 2,
    });
    expect(lot.isParked(car)).toBe(true);
  });

  it('accepts any empty slot, not just one specific target', () => {
    const empties = lot.slots.filter((s) => !s.occupied);
    expect(empties.length).toBeGreaterThan(1);
    for (const e of empties) {
      const car = new Car({ x: e.cx, y: e.cy, heading: e.angle, length: 4, width: 2 });
      expect(lot.isParked(car)).toBe(true);
    }
  });
});
