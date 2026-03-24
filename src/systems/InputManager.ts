export class InputManager {
  private static instance: InputManager;
  private keysPressed: Set<string> = new Set();

  private constructor() {
    this.setupListeners();
  }

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

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  getMovementInput(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.isKeyPressed("q") || this.isKeyPressed("arrowleft")) {
      dx = -1;
    } else if (this.isKeyPressed("d") || this.isKeyPressed("arrowright")) {
      dx = 1;
    }

    if (this.isKeyPressed("z") || this.isKeyPressed("arrowup")) {
      dy = -1;
    } else if (this.isKeyPressed("s") || this.isKeyPressed("arrowdown")) {
      dy = 1;
    }

    return { dx, dy };
  }
}
