export enum CombatPhase {
  Intro = "intro",
  PlayerTurn = "player_turn",
  PlayerTiming = "player_timing",
  EnemyTurn = "enemy_turn",
  Animating = "animating",
  Victory = "victory",
  Defeat = "defeat",
  Escaped = "escaped",
}

export class GameState {
  public phase: CombatPhase = CombatPhase.Intro;
  public turnLabel: string = "Combat";
  public message: string = "";

  setPhase(phase: CombatPhase, label?: string): void {
    this.phase = phase;
    if (label) {
      this.turnLabel = label;
    }
  }

  setMessage(message: string): void {
    this.message = message;
  }
}
