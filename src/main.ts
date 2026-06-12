import { Game } from './game/Game';
import { Input } from './ui/Input';
import { Renderer } from './ui/Renderer';
import { Hud } from './ui/Hud';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas #game not found');

const renderer = new Renderer(canvas);
const input = new Input();
const hud = new Hud();

let game = new Game();
renderer.resize();
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

  if (input.consumeReset()) game = new Game();

  game.update(dt, input.read());
  renderer.render(game);
  hud.update(game);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
