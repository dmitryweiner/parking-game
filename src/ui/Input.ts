import type { CarInput } from '../game/Car';

interface KeyState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  KeyW: boolean;
  KeyA: boolean;
  KeyS: boolean;
  KeyD: boolean;
  Space: boolean;
}

export class Input {
  private keys: KeyState = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false,
  };
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
    const throttleKey = this.keys.ArrowUp || this.keys.KeyW ? 1 : 0;
    const brakeKey = this.keys.ArrowDown || this.keys.KeyS || this.keys.Space ? 1 : 0;
    const steerKey =
      (this.keys.ArrowLeft || this.keys.KeyA ? -1 : 0) +
      (this.keys.ArrowRight || this.keys.KeyD ? 1 : 0);

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
    if (e.code in this.keys) {
      (this.keys as unknown as Record<string, boolean>)[e.code] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyR' || e.code === 'Enter') {
      this.resetRequested = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code in this.keys) {
      (this.keys as unknown as Record<string, boolean>)[e.code] = false;
      e.preventDefault();
    }
  };

  private bindMobileControls(): void {
    const wheel = document.getElementById('steering-wheel');
    const inner = document.getElementById('steering-wheel-inner');
    if (wheel && inner) {
      let activeTouch: number | null = null;
      const setRotation = (t: number): void => {
        const deg = t * 110;
        inner.setAttribute('transform', `rotate(${deg})`);
      };

      const update = (clientX: number): void => {
        const rect = wheel.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const half = rect.width / 2;
        const dx = clientX - cx;
        const t = clamp(dx / half, -1, 1);
        this.touchSteer = t;
        setRotation(t);
      };

      setRotation(0);

      wheel.addEventListener('touchstart', (e: TouchEvent) => {
        if (activeTouch !== null) return;
        const touch = e.changedTouches[0];
        activeTouch = touch.identifier;
        update(touch.clientX);
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
