import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";
import type { GeneratedMap } from "@/utils/MapGen";
import { TileType } from "@/utils/MapGen";
import { Enemy } from "@/class/enemy";

export interface RenderConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  tileSize?: number;
  aspectRatio?: number;
  fixedResolution?: boolean;
}

const TILE_GRADIENTS: Record<TileType, [string, string]> = {
  [TileType.Wall]: ["#342f44", "#262235"],
  [TileType.Floor]: ["#64607a", "#4b4660"],
  [TileType.Corridor]: ["#8a8268", "#6a624c"],
  [TileType.Entry]: ["#6aa8c9", "#3a6380"],
  [TileType.Exit]: ["#b58b54", "#7a5a2f"],
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private internalWidth: number;
  private internalHeight: number;

  // Offscreen canvas for static map layer caching
  private staticCanvas: OffscreenCanvas | HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private staticLayerValid: boolean = false;
  private lastStaticCameraX: number = 0;
  private lastStaticCameraY: number = 0;

  // FPS counter throttling
  private fpsFrameCounter: number = 0;
  private lastFpsValue: number = 0;
  private readonly FPS_UPDATE_INTERVAL = 10;

  // Entity culling margin (tiles outside viewport to still render)
  private cullingMargin: number = 64; // pixels

  constructor(
    private container: HTMLElement,
    private config: RenderConfig,
  ) {
    this.internalWidth = config.width ?? 1280;
    this.internalHeight = config.height ?? 720;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.internalWidth;
    this.canvas.height = this.internalHeight;
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }
    this.ctx = ctx;

    // Initialize offscreen canvas for static layer
    this.staticCanvas = new OffscreenCanvas(this.internalWidth, this.internalHeight);
    const staticCtx = this.staticCanvas.getContext("2d", { alpha: false });
    if (!staticCtx) {
      throw new Error("Failed to get 2D context from offscreen canvas");
    }
    this.staticCtx = staticCtx;

    this.updateCSSSize();
    requestAnimationFrame(() => this.updateCSSSize());
    window.setTimeout(() => this.updateCSSSize(), 50);

    let resizeTimeout: number;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => this.updateCSSSize(), 100);
    });
  }

  /**
   * Set the culling margin for entity visibility checks
   */
  setCullingMargin(margin: number): void {
    this.cullingMargin = margin;
  }

  /**
   * Get the culling margin
   */
  getCullingMargin(): number {
    return this.cullingMargin;
  }

  /**
   * Invalidate the static layer cache (call when map changes)
   */
  invalidateStaticLayer(): void {
    this.staticLayerValid = false;
  }

  /**
   * Check if an entity is visible within the viewport (with margin)
   */
  isEntityVisible(entity: Entity, offsetX: number, offsetY: number, entitySize: number): boolean {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return false;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;
    const margin = this.cullingMargin;

    return (
      x + entitySize >= -margin &&
      x <= this.internalWidth + margin &&
      y + entitySize >= -margin &&
      y <= this.internalHeight + margin
    );
  }

  /**
   * Render the static map layer to the offscreen canvas
   * This should be called when camera moves beyond threshold
   */
  renderStaticLayer(map: GeneratedMap, cameraX: number, cameraY: number, tileSize: number): void {
    // Calculate visible range with padding
    const padding = tileSize * 2;
    const startCol = Math.max(0, Math.floor(cameraX / tileSize) - 2);
    const endCol = Math.min(map.width, Math.ceil((cameraX + this.internalWidth) / tileSize) + 2);
    const startRow = Math.max(0, Math.floor(cameraY / tileSize) - 2);
    const endRow = Math.min(map.height, Math.ceil((cameraY + this.internalHeight) / tileSize) + 2);

    // Clear offscreen canvas
    this.staticCtx.fillStyle = this.config.backgroundColor || "#000";
    this.staticCtx.fillRect(0, 0, this.internalWidth, this.internalHeight);

    // Store the camera position used for this render
    this.lastStaticCameraX = cameraX;
    this.lastStaticCameraY = cameraY;

    // Calculate offset to align with camera
    const offsetX = -cameraX;
    const offsetY = -cameraY;

    // Render tiles
    for (let row = startRow; row < endRow; row++) {
      const gridRow = map.grid[row];
      if (!gridRow) continue;

      for (let col = startCol; col < endCol; col++) {
        const tile = gridRow[col];
        if (tile === undefined) continue;

        const x = Math.round(col * tileSize + offsetX);
        const y = Math.round(row * tileSize + offsetY);

        // Skip tiles outside canvas bounds
        if (x + tileSize < 0 || x > this.internalWidth || y + tileSize < 0 || y > this.internalHeight) {
          continue;
        }

        const gradient = this.staticCtx.createLinearGradient(x, y, x, y + tileSize);
        const [topColor, bottomColor] = TILE_GRADIENTS[tile];
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        this.staticCtx.fillStyle = gradient;
        this.staticCtx.fillRect(x, y, tileSize, tileSize);
        this.staticCtx.strokeStyle = "#252230";
        this.staticCtx.lineWidth = 1;
        this.staticCtx.strokeRect(x, y, tileSize, tileSize);

        if (tile === TileType.Corridor) {
          this.staticCtx.strokeStyle = "rgba(20, 16, 10, 0.55)";
          this.staticCtx.lineWidth = 2;
          this.staticCtx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          this.staticCtx.fillStyle = "rgba(255, 238, 184, 0.16)";
          this.staticCtx.fillRect(x + tileSize * 0.2, y + tileSize * 0.2, tileSize * 0.6, tileSize * 0.08);
          this.staticCtx.fillRect(x + tileSize * 0.2, y + tileSize * 0.72, tileSize * 0.6, tileSize * 0.08);
        }

        if (tile === TileType.Floor || tile === TileType.Corridor) {
          this.staticCtx.fillStyle = "rgba(0, 0, 0, 0.1)";
          this.staticCtx.fillRect(x + tileSize * 0.3, y + tileSize * 0.3, tileSize * 0.4, tileSize * 0.4);

          if ((row + col) % 7 === 0) {
            this.staticCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
            this.staticCtx.fillRect(x + tileSize * 0.15, y + tileSize * 0.15, tileSize * 0.15, tileSize * 0.15);
          }

          if ((row * 3 + col * 5) % 11 === 0) {
            this.staticCtx.fillStyle = "rgba(16, 12, 24, 0.35)";
            this.staticCtx.fillRect(x + tileSize * 0.72, y + tileSize * 0.18, tileSize * 0.12, tileSize * 0.12);
          }
        }

        if (tile === TileType.Wall) {
          this.staticCtx.strokeStyle = "#1a1720";
          this.staticCtx.lineWidth = 2;
          this.staticCtx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

          this.staticCtx.fillStyle = "rgba(0, 0, 0, 0.22)";
          this.staticCtx.fillRect(x + 1, y + tileSize - 4, tileSize - 2, 3);

          if ((row + col) % 4 === 0) {
            this.staticCtx.fillStyle = "rgba(0, 0, 0, 0.22)";
            this.staticCtx.fillRect(x + tileSize * 0.22, y + tileSize * 0.22, tileSize * 0.18, tileSize * 0.18);
          }
        }

        if (tile === TileType.Entry) {
          this.drawEntryTileToContext(this.staticCtx, x, y, tileSize);
        }

        if (tile === TileType.Exit) {
          this.drawExitTileToContext(this.staticCtx, x, y, tileSize);
        }
      }
    }

    this.staticLayerValid = true;
  }

  /**
   * Composite the static layer with dynamic entities
   * This is the main render method when using dirty rendering
   */
  compositeLayers(cameraX: number, cameraY: number): void {
    // Calculate sub-pixel offset for smooth camera movement
    const subPixelX = cameraX - this.lastStaticCameraX;
    const subPixelY = cameraY - this.lastStaticCameraY;

    // Clear main canvas
    this.ctx.fillStyle = this.config.backgroundColor || "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw static layer with sub-pixel offset for smoothness
    this.ctx.drawImage(this.staticCanvas, -subPixelX, -subPixelY);
  }

  private updateCSSSize(): void {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
  }

  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor || "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawEntity(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    color: string = "#fff",
    size: number = 32,
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = Math.round(pos.x + offsetX);
    const y = Math.round(pos.y + offsetY);

    this.ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.ctx.fillRect(x + 8, y + size - 4, size - 16, 4);

    const sprite = entity instanceof Enemy ? entity.combatSprite : "slime";

    if (sprite === "bat") {
      const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
      gradient.addColorStop(0, "#8c70ff");
      gradient.addColorStop(1, "#4f37b8");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x + 6, y + 9, size - 12, size - 12);
      this.ctx.fillRect(x + 2, y + 13, 8, 8);
      this.ctx.fillRect(x + size - 10, y + 13, 8, 8);
      this.ctx.strokeStyle = "#111";
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x + 6, y + 9, size - 12, size - 12);
      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(x + 12, y + 15, 4, 4);
      this.ctx.fillRect(x + size - 16, y + 15, 4, 4);
      this.ctx.fillStyle = "#24135e";
      this.ctx.fillRect(x + 12, y + 17, 3, 3);
      this.ctx.fillRect(x + size - 15, y + 17, 3, 3);
      return;
    }

    if (sprite === "skeleton") {
      const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
      gradient.addColorStop(0, "#f1f3f7");
      gradient.addColorStop(1, "#b9bec8");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x + 6, y + 6, size - 12, size - 8);
      this.ctx.strokeStyle = "#111";
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x + 6, y + 6, size - 12, size - 8);
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(x + 12, y + 13, 5, 5);
      this.ctx.fillRect(x + size - 17, y + 13, 5, 5);
      this.ctx.fillRect(x + size / 2 - 4, y + 23, 8, 5);
      return;
    }

    if (sprite === "mush") {
      const capGradient = this.ctx.createLinearGradient(x, y, x, y + size);
      capGradient.addColorStop(0, "#8b4d2f");
      capGradient.addColorStop(1, "#603221");
      this.ctx.fillStyle = capGradient;
      this.ctx.fillRect(x + 5, y + 7, size - 10, 14);
      this.ctx.strokeStyle = "#111";
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x + 5, y + 7, size - 10, 14);
      this.ctx.fillStyle = "#dfd6c2";
      this.ctx.fillRect(x + 11, y + 21, size - 22, 10);
      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(x + 13, y + 13, 4, 4);
      this.ctx.fillRect(x + size - 17, y + 13, 4, 4);
      this.ctx.fillStyle = "#2c1a12";
      this.ctx.fillRect(x + 13, y + 15, 3, 3);
      this.ctx.fillRect(x + size - 16, y + 15, 3, 3);
      return;
    }

    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "#8a1313");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = "#111";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);

    const eyeSize = Math.max(3, size * 0.15);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(x + size * 0.2, y + size * 0.28, eyeSize, eyeSize);
    this.ctx.fillRect(x + size * 0.62, y + size * 0.28, eyeSize, eyeSize);
    this.ctx.fillStyle = "#2a0505";
    this.ctx.fillRect(
      x + size * 0.22,
      y + size * 0.62,
      eyeSize * 0.9,
      eyeSize * 0.9,
    );
    this.ctx.fillRect(
      x + size * 0.64,
      y + size * 0.62,
      eyeSize * 0.9,
      eyeSize * 0.9,
    );
  }

  drawCharacter(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    size: number = 32,
    _direction: { dx: number; dy: number } = { dx: 0, dy: 0 },
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = Math.round(pos.x + offsetX);
    const y = Math.round(pos.y + offsetY);

    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, "#4f7bff");
    gradient.addColorStop(1, "#1e3eaa");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = "#111";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);

    const faceSize = size * 0.35;
    const faceX = x + (size - faceSize) / 2;
    const faceY = y + size * 0.15;
    this.ctx.fillStyle = "#ffe2a6";
    this.ctx.fillRect(faceX, faceY, faceSize, faceSize);
  }

  /**
   * Draw FPS counter with throttling (updates every N frames)
   */
  drawFPS(fps: number): void {
    this.fpsFrameCounter++;

    // Update cached FPS value every N frames
    if (this.fpsFrameCounter >= this.FPS_UPDATE_INTERVAL) {
      this.lastFpsValue = Math.round(fps);
      this.fpsFrameCounter = 0;
    }

    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(8, 8, 80, 22);
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(8, 8, 80, 22);
    this.ctx.fillStyle = "#4aff4a";
    this.ctx.font = "bold 12px monospace";
    this.ctx.fillText(`FPS: ${this.lastFpsValue}`, 15, 23);
  }

  renderMap(
    map: GeneratedMap,
    offsetX: number,
    offsetY: number,
    tileSize: number,
  ): void {
    const startCol = Math.max(0, Math.floor(-offsetX / tileSize));
    const endCol = Math.min(
      map.width,
      Math.ceil((-offsetX + this.canvas.width) / tileSize),
    );
    const startRow = Math.max(0, Math.floor(-offsetY / tileSize));
    const endRow = Math.min(
      map.height,
      Math.ceil((-offsetY + this.canvas.height) / tileSize),
    );

    for (let row = startRow; row < endRow; row++) {
      const gridRow = map.grid[row];
      if (!gridRow) continue;

      for (let col = startCol; col < endCol; col++) {
        const tile = gridRow[col];
        if (tile === undefined) continue;

        const x = Math.round(col * tileSize + offsetX);
        const y = Math.round(row * tileSize + offsetY);

        const gradient = this.ctx.createLinearGradient(x, y, x, y + tileSize);
        const [topColor, bottomColor] = TILE_GRADIENTS[tile];
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, tileSize, tileSize);
        this.ctx.strokeStyle = "#252230";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, tileSize, tileSize);

        if (tile === TileType.Corridor) {
          this.ctx.strokeStyle = "rgba(20, 16, 10, 0.55)";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          this.ctx.fillStyle = "rgba(255, 238, 184, 0.16)";
          this.ctx.fillRect(
            x + tileSize * 0.2,
            y + tileSize * 0.2,
            tileSize * 0.6,
            tileSize * 0.08,
          );
          this.ctx.fillRect(
            x + tileSize * 0.2,
            y + tileSize * 0.72,
            tileSize * 0.6,
            tileSize * 0.08,
          );
        }

        if (tile === TileType.Floor || tile === TileType.Corridor) {
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
          this.ctx.fillRect(
            x + tileSize * 0.3,
            y + tileSize * 0.3,
            tileSize * 0.4,
            tileSize * 0.4,
          );

          if ((row + col) % 7 === 0) {
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            this.ctx.fillRect(
              x + tileSize * 0.15,
              y + tileSize * 0.15,
              tileSize * 0.15,
              tileSize * 0.15,
            );
          }

          if ((row * 3 + col * 5) % 11 === 0) {
            this.ctx.fillStyle = "rgba(16, 12, 24, 0.35)";
            this.ctx.fillRect(
              x + tileSize * 0.72,
              y + tileSize * 0.18,
              tileSize * 0.12,
              tileSize * 0.12,
            );
          }
        }

        if (tile === TileType.Wall) {
          this.ctx.strokeStyle = "#1a1720";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

          this.ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
          this.ctx.fillRect(x + 1, y + tileSize - 4, tileSize - 2, 3);

          if ((row + col) % 4 === 0) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
            this.ctx.fillRect(
              x + tileSize * 0.22,
              y + tileSize * 0.22,
              tileSize * 0.18,
              tileSize * 0.18,
            );
          }
        }

        if (tile === TileType.Entry) {
          this.drawEntryTile(x, y, tileSize);
        }

        if (tile === TileType.Exit) {
          this.drawExitTile(x, y, tileSize);
        }
      }
    }
  }

  private drawEntryTile(x: number, y: number, tileSize: number): void {
    this.drawEntryTileToContext(this.ctx, x, y, tileSize);
  }

  private drawEntryTileToContext(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, tileSize: number): void {
    context.strokeStyle = "#111";
    context.lineWidth = 3;
    context.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

    context.fillStyle = "#7bd0ff";
    context.fillRect(x + tileSize * 0.25, y + tileSize * 0.22, tileSize * 0.5, tileSize * 0.56);
    context.fillStyle = "#c7eeff";
    context.fillRect(x + tileSize * 0.34, y + tileSize * 0.3, tileSize * 0.32, tileSize * 0.32);

    context.fillStyle = "#153648";
    context.fillRect(x + tileSize * 0.43, y + tileSize * 0.53, tileSize * 0.12, tileSize * 0.08);
  }

  private drawExitTile(x: number, y: number, tileSize: number): void {
    this.drawExitTileToContext(this.ctx, x, y, tileSize);
  }

  private drawExitTileToContext(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, tileSize: number): void {
    context.strokeStyle = "#111";
    context.lineWidth = 3;
    context.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

    context.fillStyle = "#8a6131";
    context.fillRect(x + tileSize * 0.2, y + tileSize * 0.18, tileSize * 0.6, tileSize * 0.62);
    context.fillStyle = "#d9b679";
    context.fillRect(x + tileSize * 0.27, y + tileSize * 0.25, tileSize * 0.46, tileSize * 0.46);

    context.fillStyle = "#36220f";
    context.fillRect(x + tileSize * 0.49, y + tileSize * 0.48, tileSize * 0.08, tileSize * 0.1);
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
