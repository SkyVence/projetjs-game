/**
 * Overall lifecycle state of the game.
 */
export enum GameStatus {
  /** Actively running gameplay. */
  PLAYING,
  /** Assets and setup are in progress. */
  LOADING,
  /** Temporarily halted but can resume. */
  PAUSED,
  /** Terminal state after play ends. */
  GAME_OVER,
}

/**
 * Living state of the player character.
 */
export enum PlayerStatus {
  /** Player is active and can interact. */
  ALIVE,
  /** Player can no longer act. */
  DEAD,
}
