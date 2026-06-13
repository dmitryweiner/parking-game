import type { Game } from '../game/Game';
import type { Slot, ParkedCar } from '../game/ParkingLot';
import type { Car } from '../game/Car';
import type { Pedestrian, AICar } from '../game/Traffic';

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
    // Crossing traffic spawns just outside the lot edge and despawns past the
    // far edge; clip to the lot rect so they appear only while they're
    // actually inside the playfield (entering / exiting cleanly at the edge).
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, game.lot.width, game.lot.height);
    ctx.clip();
    for (const c of game.traffic.cars) drawAICar(ctx, c);
    for (const p of game.traffic.pedestrians) drawPedestrian(ctx, p);
    ctx.restore();
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
  // Parked cars share the player car's visual style (rounded body, tinted
  // windshield, headlights, taillights) so the world feels consistent — only
  // their colors differ from the player's yellow body.
  drawCarBody(ctx, {
    cx: p.obb.cx,
    cy: p.obb.cy,
    angle: p.obb.angle,
    hl: p.obb.hx,
    hw: p.obb.hy,
    bodyColor: p.color,
    windshieldColor: '#222',
    headlightColor: '#fff',
    taillightColor: '#a52323',
  });
}

function drawPlayerCar(ctx: CanvasRenderingContext2D, car: Car, dead: boolean): void {
  const reversing = car.velocity < -0.05 || (car.velocity < 0.5 && car.brakeInput > 0.1);
  const braking = !reversing && car.brakeInput > 0.1;
  drawCarBody(ctx, {
    cx: car.position.x,
    cy: car.position.y,
    angle: car.heading,
    hl: car.length / 2,
    hw: car.width / 2,
    bodyColor: dead ? '#6b6f78' : '#ffce4d',
    windshieldColor: dead ? '#3b3e45' : '#222',
    headlightColor: dead ? '#2a2c32' : '#fff',
    taillightColor: dead ? '#2a2c32' : reversing ? '#ffffff' : braking ? '#ff2828' : '#a52323',
    glowTaillight: braking && !dead,
  });
}

interface CarVisual {
  cx: number;
  cy: number;
  angle: number;
  hl: number;
  hw: number;
  bodyColor: string;
  windshieldColor: string;
  headlightColor: string;
  taillightColor: string;
  glowTaillight?: boolean;
}

function drawCarBody(ctx: CanvasRenderingContext2D, v: CarVisual): void {
  ctx.save();
  ctx.translate(v.cx, v.cy);
  ctx.rotate(v.angle);
  ctx.fillStyle = v.bodyColor;
  roundRect(ctx, -v.hl, -v.hw, v.hl * 2, v.hw * 2, 0.4);
  ctx.fill();
  ctx.fillStyle = v.windshieldColor;
  ctx.fillRect(v.hl * 0.45, -v.hw * 0.75, v.hl * 0.35, v.hw * 1.5);

  ctx.fillStyle = v.headlightColor;
  ctx.beginPath();
  ctx.arc(v.hl * 0.95, -v.hw * 0.6, 0.15, 0, Math.PI * 2);
  ctx.arc(v.hl * 0.95, v.hw * 0.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = v.taillightColor;
  ctx.beginPath();
  ctx.arc(-v.hl * 0.95, -v.hw * 0.6, 0.18, 0, Math.PI * 2);
  ctx.arc(-v.hl * 0.95, v.hw * 0.6, 0.18, 0, Math.PI * 2);
  ctx.fill();
  if (v.glowTaillight) {
    ctx.shadowColor = '#ff2828';
    ctx.shadowBlur = 0.5;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawPedestrian(ctx: CanvasRenderingContext2D, p: Pedestrian): void {
  // Top-down schematic of a person: shoulder ellipse oriented along the walk
  // direction, head circle on top. The shoulder ellipse is wider perpendicular
  // to walking, so the figure visibly "points" the way they're going.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.heading);

  // Shoulders / torso
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.18, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Short arms poking out the sides
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.3);
  ctx.lineTo(0.08, -0.42);
  ctx.moveTo(-0.02, 0.3);
  ctx.lineTo(0.08, 0.42);
  ctx.stroke();

  // Head (slightly forward of torso center so direction reads at a glance)
  ctx.fillStyle = '#f5d6a8';
  ctx.beginPath();
  ctx.arc(0.04, 0, 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,20,20,0.6)';
  ctx.lineWidth = 0.04;
  ctx.stroke();

  ctx.restore();
}

function drawAICar(ctx: CanvasRenderingContext2D, c: AICar): void {
  drawCarBody(ctx, {
    cx: c.x,
    cy: c.y,
    angle: c.heading,
    hl: c.length / 2,
    hw: c.width / 2,
    bodyColor: c.color,
    windshieldColor: '#222',
    headlightColor: '#fff',
    taillightColor: '#a52323',
  });
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
