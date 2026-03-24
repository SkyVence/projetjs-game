/**
 * Global input manager for keyboard controls.
 * Tracks which keys are currently pressed.
 */
export class InputManager {
  private static instance: InputManager;
  private keysPressed: Set<string> = new Set();

  private constructor() {
    this.setupListeners();
  }

  /**
   * Get or create the singleton instance.
   */
  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      this.keysPressed.add(e.key.toLowerCase());
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  /**
   * Check if a key is currently pressed.
   * @param key The key to check (lowercase).
   */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  /**
   * Get movement direction based on pressed keys (Pokémon/Zelda style).
   * @returns Object with dx, dy representing movement direction (-1, 0, or 1).
   */
  getMovementInput(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    // Horizontal movement (ZQSD or Arrow keys)
    if (this.isKeyPressed("q") || this.isKeyPressed("arrowleft")) {
      dx = -1;
    } else if (this.isKeyPressed("d") || this.isKeyPressed("arrowright")) {
      dx = 1;
    }

    // Vertical movement (ZQSD or Arrow keys)
    if (this.isKeyPressed("z") || this.isKeyPressed("arrowup")) {
      dy = -1;
    } else if (this.isKeyPressed("s") || this.isKeyPressed("arrowdown")) {
      dy = 1;
    }

    return { dx, dy };
  }
}
