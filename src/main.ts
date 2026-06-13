import { Game, type GameOptions } from './game/Game';
import { Input } from './ui/Input';
import { Renderer } from './ui/Renderer';
import { Hud } from './ui/Hud';

const canvasEl = document.getElementById('game');
if (!(canvasEl instanceof HTMLCanvasElement)) throw new Error('Canvas #game not found');
const canvas = canvasEl;

const renderer = new Renderer(canvas);
const input = new Input();
const hud = new Hud();

const LOT_OPTIONS: GameOptions = { rows: 4, cols: 10 };
const MOBILE_DEFAULT_ZOOM = 2;

function isMobile(): boolean {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

let sessionScore = 0;
let game = new Game(LOT_OPTIONS);
renderer.resize();
if (isMobile()) renderer.setZoom(MOBILE_DEFAULT_ZOOM);
window.addEventListener('resize', () => renderer.resize());

canvas.addEventListener('wheel', (e: WheelEvent) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  renderer.zoomBy(factor);
}, { passive: false });

let pinchInitialDist = 0;
let pinchInitialZoom = 1;

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  if (e.touches.length >= 2) {
    pinchInitialDist = touchDistance(e.touches[0], e.touches[1]);
    pinchInitialZoom = renderer.getZoom();
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length >= 2 && pinchInitialDist > 0) {
    const d = touchDistance(e.touches[0], e.touches[1]);
    renderer.setZoom(pinchInitialZoom * (d / pinchInitialDist));
    e.preventDefault();
  }
}, { passive: false });

const endPinch = (e: TouchEvent): void => {
  if (e.touches.length < 2) pinchInitialDist = 0;
};
canvas.addEventListener('touchend', endPinch);
canvas.addEventListener('touchcancel', endPinch);

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.consumeReset()) {
    if (game.state === 'won') sessionScore += game.finalScore;
    game = new Game(LOT_OPTIONS);
    // intentionally keep the current zoom — restart shouldn't snap the view
  }

  game.update(dt, input.read());
  renderer.render(game);
  hud.update(game, sessionScore);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
