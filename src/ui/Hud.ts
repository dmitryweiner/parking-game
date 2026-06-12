import type { Game } from '../game/Game';

export class Hud {
  private readonly timeEl: HTMLElement | null;
  private readonly scoreEl: HTMLElement | null;
  private readonly statusEl: HTMLElement | null;

  constructor() {
    this.timeEl = document.querySelector('[data-value="time"]');
    this.scoreEl = document.querySelector('[data-value="score"]');
    this.statusEl = document.querySelector('[data-value="status"]');
  }

  update(game: Game): void {
    const remaining = Math.max(0, game.maxTime - game.timeElapsed);
    if (this.timeEl) this.timeEl.textContent = remaining.toFixed(1);
    if (this.scoreEl) this.scoreEl.textContent = String(game.finalScore);
    if (this.statusEl) {
      switch (game.state) {
        case 'playing':
          this.statusEl.textContent = 'Find the highlighted slot';
          this.statusEl.className = '';
          break;
        case 'won':
          this.statusEl.textContent = `Parked! Score ${game.finalScore} — press R to play again`;
          this.statusEl.className = 'won';
          break;
        case 'crashed':
          this.statusEl.textContent = 'Crashed! Press R to restart';
          this.statusEl.className = 'lost';
          break;
        case 'timeout':
          this.statusEl.textContent = "Time's up! Press R to restart";
          this.statusEl.className = 'lost';
          break;
      }
    }
  }
}
