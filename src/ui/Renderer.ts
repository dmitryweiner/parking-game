import type { Game } from '../game/Game';
import type { Slot, ParkedCar } from '../game/ParkingLot';
import type { Car } from '../game/Car';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
// Cap the canvas buffer's pixel density. On real mobile devices DPR is often
// 3–4, which can push the internal buffer past per-device canvas size limits
// and make draws silently no-op. 2 is plenty for crisp 2D rendering.
const MAX_DPR = 2;

export class Renderer {
  private zoom = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  resize(): void {
    // Prefer the visual viewport: on mobile Chrome it tracks the area actually
    // visible to the user as the URL bar collapses/expands, whereas
    // window.innerHeight stays stuck at the layout viewport.
    const vv = window.visualViewport;
    const cssW = vv ? vv.width : window.innerWidth;
    const cssH = vv ? vv.height : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(z: number): void {
    this.zoom = clamp(z, MIN_ZOOM, MAX_ZOOM);
  }

  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  render(game: Game): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1f2229';
    ctx.fillRect(0, 0, w, h);

    const margin = 40;
    const baseScale = Math.min(
      (w - 2 * margin) / game.lot.width,
      (h - 2 * margin) / game.lot.height,
    );
    const scale = baseScale * this.zoom;

    const viewW = w / scale;
    const viewH = h / scale;
    let focusX = game.car.position.x;
    let focusY = game.car.position.y;
    if (viewW < game.lot.width) {
      focusX = clamp(focusX, viewW / 2, game.lot.width - viewW / 2);
    } else {
      focusX = game.lot.width / 2;
    }
    if (viewH < game.lot.height) {
      focusY = clamp(focusY, viewH / 2, game.lot.height - viewH / 2);
    } else {
      focusY = game.lot.height / 2;
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-focusX, -focusY);

    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, 0, game.lot.width, game.lot.height);

    ctx.lineWidth = 0.15;
    ctx.strokeStyle = '#f8e9b0';
    for (const slot of game.lot.slots) drawSlot(ctx, slot, !slot.occupied);

    for (const p of game.lot.parkedCars) drawParked(ctx, p);

    drawEntrance(ctx, game.lot.entrance);
    const dead = game.state === 'crashed' || game.state === 'timeout';
    drawPlayerCar(ctx, game.car, dead);

    ctx.restore();
  }
}

function drawSlot(ctx: CanvasRenderingContext2D, slot: Slot, highlight: boolean): void {
  ctx.save();
  ctx.translate(slot.cx, slot.cy);
  ctx.rotate(slot.angle);
  const hl = slot.length / 2;
  const hw = slot.width / 2;
  if (highlight) {
    ctx.fillStyle = 'rgba(120, 220, 130, 0.18)';
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
  }
  ctx.beginPath();
  ctx.moveTo(-hl, -hw);
  ctx.lineTo(hl, -hw);
  ctx.lineTo(hl, hw);
  ctx.lineTo(-hl, hw);
  ctx.stroke();
  ctx.restore();
}

function drawParked(ctx: CanvasRenderingContext2D, p: ParkedCar): void {
  ctx.save();
  ctx.translate(p.obb.cx, p.obb.cy);
  ctx.rotate(p.obb.angle);
  ctx.fillStyle = p.color;
  const hl = p.obb.hx;
  const hw = p.obb.hy;
  roundRect(ctx, -hl, -hw, hl * 2, hw * 2, 0.4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(hl * 0.4, -hw * 0.7, hl * 0.4, hw * 1.4);
  ctx.restore();
}

function drawPlayerCar(ctx: CanvasRenderingContext2D, car: Car, dead: boolean): void {
  ctx.save();
  ctx.translate(car.position.x, car.position.y);
  ctx.rotate(car.heading);
  const hl = car.length / 2;
  const hw = car.width / 2;
  ctx.fillStyle = dead ? '#6b6f78' : '#ffce4d';
  roundRect(ctx, -hl, -hw, hl * 2, hw * 2, 0.4);
  ctx.fill();
  ctx.fillStyle = dead ? '#3b3e45' : '#222';
  ctx.fillRect(hl * 0.45, -hw * 0.75, hl * 0.35, hw * 1.5);

  if (!dead) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hl * 0.95, -hw * 0.6, 0.15, 0, Math.PI * 2);
    ctx.arc(hl * 0.95, hw * 0.6, 0.15, 0, Math.PI * 2);
    ctx.fill();

    const reversing = car.velocity < -0.05 || (car.velocity < 0.5 && car.brakeInput > 0.1);
    const braking = !reversing && car.brakeInput > 0.1;
    ctx.fillStyle = reversing ? '#ffffff' : braking ? '#ff2828' : '#a52323';
    ctx.beginPath();
    ctx.arc(-hl * 0.95, -hw * 0.6, 0.18, 0, Math.PI * 2);
    ctx.arc(-hl * 0.95, hw * 0.6, 0.18, 0, Math.PI * 2);
    ctx.fill();
    if (braking) {
      ctx.shadowColor = '#ff2828';
      ctx.shadowBlur = 0.5;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else {
    ctx.fillStyle = '#2a2c32';
    ctx.beginPath();
    ctx.arc(hl * 0.95, -hw * 0.6, 0.15, 0, Math.PI * 2);
    ctx.arc(hl * 0.95, hw * 0.6, 0.15, 0, Math.PI * 2);
    ctx.arc(-hl * 0.95, -hw * 0.6, 0.18, 0, Math.PI * 2);
    ctx.arc(-hl * 0.95, hw * 0.6, 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEntrance(ctx: CanvasRenderingContext2D, entrance: { x: number; y: number }): void {
  ctx.save();
  ctx.translate(entrance.x, entrance.y);
  ctx.fillStyle = 'rgba(80, 200, 120, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '0.9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IN', 0, 0);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
