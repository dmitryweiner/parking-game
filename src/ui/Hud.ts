import type { Game } from '../game/Game';

export class Hud {
  private readonly timeEl: HTMLElement | null;
  private readonly scoreEl: HTMLElement | null;
  private readonly restartLabelEl: HTMLElement | null;
  private readonly restartBtnEl: HTMLElement | null;
  private lastSecondShown = -1;
  private lastButtonState = '';

  constructor() {
    this.timeEl = document.querySelector('[data-value="time"]');
    this.scoreEl = document.querySelector('[data-value="score"]');
    this.restartBtnEl = document.getElementById('btn-restart');
    this.restartLabelEl = document.querySelector('[data-value="restart-label"]');
  }

  update(game: Game): void {
    const remaining = Math.max(0, game.maxTime - game.timeElapsed);
    const sec = Math.ceil(remaining);
    if (sec !== this.lastSecondShown) {
      this.lastSecondShown = sec;
      if (this.timeEl) this.timeEl.textContent = String(sec);
    }
    if (this.scoreEl) this.scoreEl.textContent = String(game.finalScore);

    if (this.restartBtnEl && this.restartLabelEl) {
      const state = game.state;
      if (state !== this.lastButtonState) {
        this.lastButtonState = state;
        const btn = this.restartBtnEl;
        const label = this.restartLabelEl;
        btn.classList.remove('won', 'lost');
        switch (state) {
          case 'playing':
            label.textContent = 'Restart';
            btn.setAttribute('title', 'Restart (R)');
            break;
          case 'won':
            label.textContent = `Parked! ${game.finalScore} — Restart`;
            btn.classList.add('won');
            btn.setAttribute('title', `Parked — score ${game.finalScore}. Restart (R)`);
            break;
          case 'crashed':
            label.textContent = 'Crashed — Restart';
            btn.classList.add('lost');
            btn.setAttribute('title', 'Crashed. Restart (R)');
            break;
          case 'timeout':
            label.textContent = "Time's up — Restart";
            btn.classList.add('lost');
            btn.setAttribute('title', "Time's up. Restart (R)");
            break;
        }
      } else if (state === 'won') {
        this.restartLabelEl.textContent = `Parked! ${game.finalScore} — Restart`;
      }
    }
  }
}
