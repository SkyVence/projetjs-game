import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";
import type { GeneratedMap } from "@/utils/MapGen";
import { TileType } from "@/utils/MapGen";

export interface RenderConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  tileSize?: number;
  aspectRatio?: number;
  fixedResolution?: boolean;
}

// Dungeon Theme colors - retro pixel art style
const TILE_COLORS: Record<TileType, string> = {
  [TileType.Wall]: "#2d2a3e",      // Dark purple-gray (dungeon wall)
  [TileType.Floor]: "#4a4558",     // Medium gray-purple (platform)
  [TileType.Corridor]: "#3d3a4d",  // Darker gray (corridor)
  [TileType.Entry]: "#5a8f5a",     // Greenish (entry point)
  [TileType.Exit]: "#8f5a5a",      // Reddish (exit point)
};

// Dungeon-style gradients for tiles
const TILE_GRADIENTS: Record<TileType, [string, string]> = {
  [TileType.Wall]: ["#3d3a4e", "#2d2a3e"],
  [TileType.Floor]: ["#5a5568", "#3d3a4d"],
  [TileType.Corridor]: ["#4a4558", "#2d2a3e"],
  [TileType.Entry]: ["#6a9f6a", "#4a7f4a"],
  [TileType.Exit]: ["#9f6a6a", "#7f4a4a"],
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private container: HTMLElement;
  private aspectRatio: number;
  private onResizeCallback?: (width: number, height: number) => void;
  private fixedResolution: boolean;
  private internalWidth: number;
  private internalHeight: number;

  constructor(container: HTMLElement, config: RenderConfig) {
    this.container = container;
    this.config = config;
    this.aspectRatio = config.aspectRatio ?? 16 / 9;
    this.fixedResolution = config.fixedResolution ?? true;

    // Fixed internal resolution for fair gameplay
    this.internalWidth = config.width ?? 1280;
    this.internalHeight = config.height ?? 720;

    this.canvas = document.createElement("canvas");
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.display = "block";

    // Set fixed internal resolution
    this.canvas.width = this.internalWidth;
    this.canvas.height = this.internalHeight;

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }
    this.ctx = ctx;

    // Set initial CSS size
    this.updateCSSSize();

    // Handle window resize with debounce
    let resizeTimeout: number;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => this.updateCSSSize(), 100);
    });
  }

  private updateCSSSize(): void {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const containerRatio = containerWidth / containerHeight;

    let cssWidth: number;
    let cssHeight: number;

    if (containerRatio > this.aspectRatio) {
      // Container is wider - fit to height
      cssHeight = containerHeight;
      cssWidth = cssHeight * this.aspectRatio;
    } else {
      // Container is taller - fit to width
      cssWidth = containerWidth;
      cssHeight = cssWidth / this.aspectRatio;
    }

    // Apply CSS size (internal resolution stays fixed)
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  setOnResize(callback: (width: number, height: number) => void): void {
    this.onResizeCallback = callback;
  }

  getInternalResolution(): { width: number; height: number } {
    return { width: this.internalWidth, height: this.internalHeight };
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

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    // RPG-style enemy: Red gradient background like rpg-sprite-enemy
    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, "#d92f2f");
    gradient.addColorStop(1, "#8a1313");

    // Main body
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);

    // RPG-style border
    this.ctx.strokeStyle = "#111";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);

    // Inner shadow/highlight
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

    // Enemy eyes (angry style)
    const eyeSize = size * 0.15;
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(x + size * 0.2, y + size * 0.3, eyeSize, eyeSize);
    this.ctx.fillRect(x + size * 0.6, y + size * 0.3, eyeSize, eyeSize);

    // Pupils
    this.ctx.fillStyle = "#2a0505";
    this.ctx.fillRect(x + size * 0.25, y + size * 0.35, eyeSize * 0.5, eyeSize * 0.5);
    this.ctx.fillRect(x + size * 0.65, y + size * 0.35, eyeSize * 0.5, eyeSize * 0.5);
  }

  drawCharacter(
    entity: Entity,
    offsetX: number = 0,
    offsetY: number = 0,
    size: number = 32,
    direction: { dx: number; dy: number } = { dx: 0, dy: 0 },
  ): void {
    const pos = entity.getComponent<Position>("position");
    if (!pos) return;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    // RPG-style player: Blue gradient background like rpg-sprite-player
    const gradient = this.ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, "#4f7bff");
    gradient.addColorStop(1, "#1e3eaa");

    // Main body
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, size, size);

    // RPG-style border
    this.ctx.strokeStyle = "#111";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);

    // Inner shadow/highlight
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

    // Player face (simplified pixel art style)
    const faceSize = size * 0.35;
    const faceX = x + (size - faceSize) / 2;
    const faceY = y + size * 0.15;

    this.ctx.fillStyle = "#ffe2a6"; // Skin tone
    this.ctx.fillRect(faceX, faceY, faceSize, faceSize);

    // Eyes
    this.ctx.fillStyle = "#111";
    const eyeSize = faceSize * 0.2;
    this.ctx.fillRect(faceX + faceSize * 0.2, faceY + faceSize * 0.35, eyeSize, eyeSize);
    this.ctx.fillRect(faceX + faceSize * 0.6, faceY + faceSize * 0.35, eyeSize, eyeSize);

    // Direction indicator
    if (direction.dx !== 0 || direction.dy !== 0) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const arrowLength = size / 2.5;

      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + direction.dx * arrowLength,
        centerY + direction.dy * arrowLength,
      );
      this.ctx.stroke();
    }
  }

  drawGrid(gridSize: number = 32, color: string = "#252230"): void {
    // Draw dungeon-style grid with darker lines for that retro pixel look
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawFPS(fps: number): void {
    // Retro green FPS counter like in the reference image
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(8, 8, 80, 22);

    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(8, 8, 80, 22);

    this.ctx.fillStyle = "#4aff4a"; // Bright green like retro games
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillText(`FPS: ${Math.round(fps)}`, 15, 23);
  }

  renderMap(map: GeneratedMap, offsetX: number, offsetY: number, tileSize: number): void {
    // Calculate visible tile range based on camera offset
    const startCol = Math.max(0, Math.floor(-offsetX / tileSize));
    const endCol = Math.min(map.width, Math.ceil((-offsetX + this.canvas.width) / tileSize));
    const startRow = Math.max(0, Math.floor(-offsetY / tileSize));
    const endRow = Math.min(map.height, Math.ceil((-offsetY + this.canvas.height) / tileSize));

    for (let row = startRow; row < endRow; row++) {
      const gridRow = map.grid[row];
      if (!gridRow) continue;

      for (let col = startCol; col < endCol; col++) {
        const tile = gridRow[col];
        if (tile === undefined) continue;

        const x = col * tileSize + offsetX;
        const y = row * tileSize + offsetY;

        // Create gradient for tile
        const gradient = this.ctx.createLinearGradient(x, y, x, y + tileSize);
        const [topColor, bottomColor] = TILE_GRADIENTS[tile];
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, tileSize, tileSize);

        // Draw dungeon grid lines on each tile
        this.ctx.strokeStyle = "#252230";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, tileSize, tileSize);

        // Add subtle inner pattern for floors (dungeon tile look)
        if (tile === TileType.Floor || tile === TileType.Corridor) {
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
          this.ctx.fillRect(x + tileSize * 0.3, y + tileSize * 0.3, tileSize * 0.4, tileSize * 0.4);
        }

        // Add border for walls (dungeon-style)
        if (tile === TileType.Wall) {
          this.ctx.strokeStyle = "#1a1720";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          
          // Add highlight to top-left for 3D effect
          this.ctx.strokeStyle = "#3d3a4e";
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(x + 2, y + tileSize - 2);
          this.ctx.lineTo(x + 2, y + 2);
          this.ctx.lineTo(x + tileSize - 2, y + 2);
          this.ctx.stroke();
        }

        // Add special styling for Entry and Exit tiles
        if (tile === TileType.Entry || tile === TileType.Exit) {
          // Bold border
          this.ctx.strokeStyle = "#111";
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          // Draw letter
          this.ctx.fillStyle = "#111";
          this.ctx.font = `bold ${Math.floor(tileSize * 0.4)}px monospace`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          const letter = tile === TileType.Entry ? "S" : "E"; // Start/Exit
          this.ctx.fillText(letter, x + tileSize / 2, y + tileSize / 2);
        }
      }
    }
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
