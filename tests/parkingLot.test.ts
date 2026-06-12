import { describe, it, expect } from 'vitest';
import { ParkingLot } from '../src/game/ParkingLot';
import { Car } from '../src/game/Car';

const makeLot = (seed = 1) =>
  new ParkingLot({
    width: 60,
    height: 40,
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

describe('ParkingLot generation', () => {
  it('creates the configured number of slots', () => {
    const lot = makeLot();
    expect(lot.slots).toHaveLength(12);
  });

  it('marks exactly one slot as the target (empty) slot', () => {
    const lot = makeLot();
    const empties = lot.slots.filter((s) => !s.occupied);
    expect(empties).toHaveLength(1);
    expect(lot.targetSlot).toBe(empties[0]);
  });

  it('places parked cars in every non-target slot', () => {
    const lot = makeLot();
    expect(lot.parkedCars).toHaveLength(lot.slots.length - 1);
  });

  it('exposes an entrance position inside the lot bounds', () => {
    const lot = makeLot();
    expect(lot.entrance.x).toBeGreaterThanOrEqual(0);
    expect(lot.entrance.x).toBeLessThanOrEqual(60);
    expect(lot.entrance.y).toBeGreaterThanOrEqual(0);
    expect(lot.entrance.y).toBeLessThanOrEqual(40);
  });
});

describe('ParkingLot win condition', () => {
  const lot = makeLot(42);
  const slot = lot.targetSlot;

  it('returns true when car is centered, slow, and aligned with the slot', () => {
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
    (car as unknown as { velocity: number }).velocity = 5;
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

  it('returns false when car is outside the slot bounds', () => {
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
});
