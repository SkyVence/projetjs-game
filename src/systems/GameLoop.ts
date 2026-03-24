/**
 * Core game loop managing update and render cycles.
 * Uses requestAnimationFrame for smooth 60fps gameplay.
 */
export class GameLoop {
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private deltaTime: number = 0;

  private onUpdate: ((deltaTime: number) => void)[] = [];
  private onRender: ((deltaTime: number) => void)[] = [];

  /**
   * Register a callback to be called on each update.
   */
  addUpdateListener(callback: (deltaTime: number) => void): void {
    this.onUpdate.push(callback);
  }

  /**
   * Register a callback to be called on each render.
   */
  addRenderListener(callback: (deltaTime: number) => void): void {
    this.onRender.push(callback);
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * The main loop function (called by requestAnimationFrame).
   */
  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.016); // Cap at 60fps
    this.lastTime = now;

    // Update phase
    this.onUpdate.forEach((cb) => cb(this.deltaTime));

    // Render phase
    this.onRender.forEach((cb) => cb(this.deltaTime));

    this.frameCount++;
    requestAnimationFrame(this.loop);
  };

  /**
   * Get current frame count.
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get delta time (time elapsed since last frame).
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }
}
