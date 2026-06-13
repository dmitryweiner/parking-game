import type { Game } from '../game/Game';

export class Hud {
  private readonly timeEl: HTMLElement | null;
  private readonly scoreEl: HTMLElement | null;
  private readonly restartLabelEl: HTMLElement | null;
  private readonly restartBtnEl: HTMLElement | null;
  private lastSecondShown = -1;
  private lastButtonKey = '';
  private lastScoreShown = -1;

  constructor() {
    this.timeEl = document.querySelector('[data-value="time"]');
    this.scoreEl = document.querySelector('[data-value="score"]');
    this.restartBtnEl = document.getElementById('btn-restart');
    this.restartLabelEl = document.querySelector('[data-value="restart-label"]');
  }

  update(game: Game, sessionScore: number): void {
    const remaining = Math.max(0, game.maxTime - game.timeElapsed);
    const sec = Math.ceil(remaining);
    if (sec !== this.lastSecondShown) {
      this.lastSecondShown = sec;
      if (this.timeEl) this.timeEl.textContent = String(sec);
    }

    const totalScore = sessionScore + (game.state === 'won' ? game.finalScore : 0);
    if (totalScore !== this.lastScoreShown) {
      this.lastScoreShown = totalScore;
      if (this.scoreEl) this.scoreEl.textContent = String(totalScore);
    }

    if (this.restartBtnEl && this.restartLabelEl) {
      const state = game.state;
      const key = state === 'won' ? `won:${game.finalScore}` : state;
      if (key !== this.lastButtonKey) {
        this.lastButtonKey = key;
        const btn = this.restartBtnEl;
        const label = this.restartLabelEl;
        btn.classList.remove('won', 'lost');
        // Labels are kept short so the whole "Time / Score / Restart" row fits
        // on a single line on narrow phones. The ↻ icon is the affordance for
        // "tap to restart" — the title attribute carries the full sentence.
        switch (state) {
          case 'playing':
            label.textContent = 'Restart';
            btn.setAttribute('title', 'Restart (R)');
            break;
          case 'won':
            label.textContent = 'Parked';
            btn.classList.add('won');
            btn.setAttribute('title', `Parked — +${game.finalScore}. Restart (R)`);
            break;
          case 'crashed':
            label.textContent = 'Crashed';
            btn.classList.add('lost');
            btn.setAttribute('title', 'Crashed. Restart (R)');
            break;
          case 'timeout':
            label.textContent = 'Timeout';
            btn.classList.add('lost');
            btn.setAttribute('title', "Time's up. Restart (R)");
            break;
        }
      }
    }
  }
}
