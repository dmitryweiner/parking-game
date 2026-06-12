import { Game, type GameOptions } from './game/Game';
import { Input } from './ui/Input';
import { Renderer } from './ui/Renderer';
import { Hud } from './ui/Hud';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas #game not found');

const renderer = new Renderer(canvas);
const input = new Input();
const hud = new Hud();

function gameOptions(): GameOptions {
  const portrait = window.innerHeight > window.innerWidth;
  return portrait ? { rows: 8, cols: 4 } : { rows: 4, cols: 10 };
}

let game = new Game(gameOptions());
renderer.resize();
window.addEventListener('resize', () => renderer.resize());

canvas.addEventListener('wheel', (e: WheelEvent) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  renderer.zoomBy(factor);
}, { passive: false });

let mouseDragging = false;
let mouseLastX = 0;
let mouseLastY = 0;
canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return;
  mouseDragging = true;
  mouseLastX = e.clientX;
  mouseLastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e: MouseEvent) => {
  if (!mouseDragging) return;
  const dx = e.clientX - mouseLastX;
  const dy = e.clientY - mouseLastY;
  mouseLastX = e.clientX;
  mouseLastY = e.clientY;
  renderer.panByScreen(dx, dy);
});
const endMouseDrag = (): void => {
  if (!mouseDragging) return;
  mouseDragging = false;
  canvas.style.cursor = '';
};
window.addEventListener('mouseup', endMouseDrag);
window.addEventListener('mouseleave', endMouseDrag);

let pinchInitialDist = 0;
let pinchInitialZoom = 1;
let panTouchId: number | null = null;
let panLastX = 0;
let panLastY = 0;

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  if (e.touches.length >= 2) {
    pinchInitialDist = touchDistance(e.touches[0], e.touches[1]);
    pinchInitialZoom = renderer.getZoom();
    panTouchId = null;
    e.preventDefault();
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    panTouchId = t.identifier;
    panLastX = t.clientX;
    panLastY = t.clientY;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length >= 2 && pinchInitialDist > 0) {
    const d = touchDistance(e.touches[0], e.touches[1]);
    renderer.setZoom(pinchInitialZoom * (d / pinchInitialDist));
    e.preventDefault();
  } else if (panTouchId !== null) {
    for (const t of Array.from(e.touches)) {
      if (t.identifier === panTouchId) {
        const dx = t.clientX - panLastX;
        const dy = t.clientY - panLastY;
        panLastX = t.clientX;
        panLastY = t.clientY;
        renderer.panByScreen(dx, dy);
        e.preventDefault();
        break;
      }
    }
  }
}, { passive: false });

const endTouch = (e: TouchEvent): void => {
  if (e.touches.length < 2) pinchInitialDist = 0;
  if (panTouchId !== null) {
    let stillThere = false;
    for (const t of Array.from(e.touches)) {
      if (t.identifier === panTouchId) {
        stillThere = true;
        break;
      }
    }
    if (!stillThere) panTouchId = null;
  }
};
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.consumeReset()) {
    game = new Game(gameOptions());
    renderer.resetView();
  }

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
