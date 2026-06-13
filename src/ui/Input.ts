import type { CarInput } from '../game/Car';

const TRACKED_KEYS = new Set<string>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
]);

export class Input {
  private readonly pressed = new Set<string>();
  private touchSteer = 0;
  private touchThrottle = 0;
  private touchBrake = 0;
  resetRequested = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.bindMobileControls();
    this.bindRestartButton();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  read(): CarInput {
    const throttleKey = this.pressed.has('ArrowUp') || this.pressed.has('KeyW') ? 1 : 0;
    const brakeKey =
      this.pressed.has('ArrowDown') || this.pressed.has('KeyS') || this.pressed.has('Space') ? 1 : 0;
    const steerKey =
      (this.pressed.has('ArrowLeft') || this.pressed.has('KeyA') ? -1 : 0) +
      (this.pressed.has('ArrowRight') || this.pressed.has('KeyD') ? 1 : 0);

    return {
      throttle: Math.max(throttleKey, this.touchThrottle),
      brake: Math.max(brakeKey, this.touchBrake),
      steer: clamp(steerKey + this.touchSteer, -1, 1),
    };
  }

  consumeReset(): boolean {
    const r = this.resetRequested;
    this.resetRequested = false;
    return r;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (TRACKED_KEYS.has(e.code)) {
      this.pressed.add(e.code);
      e.preventDefault();
    }
    if (e.code === 'KeyR' || e.code === 'Enter') {
      this.resetRequested = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (TRACKED_KEYS.has(e.code)) {
      this.pressed.delete(e.code);
      e.preventDefault();
    }
  };

  private bindMobileControls(): void {
    const wheel = document.getElementById('steering-wheel');
    const inner = document.getElementById('steering-wheel-inner');
    if (wheel && inner) {
      let activeTouch: number | null = null;
      let startX = 0;
      let dragRange = 1;
      let directionSign = 1;
      const setRotation = (t: number): void => {
        const deg = t * 110;
        inner.setAttribute('transform', `rotate(${deg})`);
      };

      const update = (clientX: number): void => {
        const dx = (clientX - startX) * directionSign;
        const t = clamp(dx / dragRange, -1, 1);
        this.touchSteer = t;
        setRotation(t);
      };

      setRotation(0);

      wheel.addEventListener('touchstart', (e: TouchEvent) => {
        if (activeTouch !== null) return;
        const touch = e.changedTouches[0];
        activeTouch = touch.identifier;
        const rect = wheel.getBoundingClientRect();
        startX = touch.clientX;
        dragRange = rect.width / 2;
        directionSign = touch.clientY < rect.top + rect.height / 2 ? 1 : -1;
        this.touchSteer = 0;
        setRotation(0);
        e.preventDefault();
      }, { passive: false });

      wheel.addEventListener('touchmove', (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeTouch) {
            update(t.clientX);
            e.preventDefault();
            break;
          }
        }
      }, { passive: false });

      const endTouch = (e: TouchEvent): void => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeTouch) {
            activeTouch = null;
            this.touchSteer = 0;
            setRotation(0);
            break;
          }
        }
      };
      wheel.addEventListener('touchend', endTouch);
      wheel.addEventListener('touchcancel', endTouch);
    }

    bindPedal('pedal-gas', (v) => { this.touchThrottle = v; });
    bindPedal('pedal-brake', (v) => { this.touchBrake = v; });
  }

  private bindRestartButton(): void {
    const btn = document.getElementById('btn-restart');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.resetRequested = true;
    });
  }
}

function bindPedal(id: string, onChange: (v: number) => void): void {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e: Event): void => { onChange(1); e.preventDefault(); };
  const release = (e: Event): void => { onChange(0); e.preventDefault(); };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release);
  el.addEventListener('touchcancel', release);
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
