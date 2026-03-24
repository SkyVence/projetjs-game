export class GameLoop {
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private deltaTime: number = 0;

  private onUpdate: ((deltaTime: number) => void)[] = [];
  private onRender: ((deltaTime: number) => void)[] = [];

  addUpdateListener(callback: (deltaTime: number) => void): void {
    this.onUpdate.push(callback);
  }

  addRenderListener(callback: (deltaTime: number) => void): void {
    this.onRender.push(callback);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.016);
    this.lastTime = now;

    this.onUpdate.forEach((cb) => cb(this.deltaTime));
    this.onRender.forEach((cb) => cb(this.deltaTime));

    this.frameCount++;
    requestAnimationFrame(this.loop);
  };

  getFrameCount(): number {
    return this.frameCount;
  }

  getDeltaTime(): number {
    return this.deltaTime;
  }
}
