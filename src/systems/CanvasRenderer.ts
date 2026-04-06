import type { Entity } from "@/class/entity";
import type { Position } from "@/class/base/position";
import type { Enemy } from "@/class/enemy";

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
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.canvas.style.border = "4px solid #111";
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.display = "block";
    this.canvas.style.margin = "0 auto";
    this.canvas.style.boxShadow = "6px 6px 0 #000";

    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
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

  drawDungeonBackground(
    offsetX: number,
    offsetY: number,
    tileSize: number,
    mapWidth: number,
    mapHeight: number,
  ): void {
    const startX = Math.floor(-offsetX / tileSize) - 1;
    const startY = Math.floor(-offsetY / tileSize) - 1;
    const endX = startX + Math.ceil(this.canvas.width / tileSize) + 3;
    const endY = startY + Math.ceil(this.canvas.height / tileSize) + 3;

    this.ctx.fillStyle = "#100e14";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let gy = startY; gy < endY; gy += 1) {
      for (let gx = startX; gx < endX; gx += 1) {
        const worldX = gx * tileSize;
        const worldY = gy * tileSize;
        if (worldX < 0 || worldY < 0 || worldX >= mapWidth || worldY >= mapHeight) {
          continue;
        }

        const px = Math.round(worldX + offsetX);
        const py = Math.round(worldY + offsetY);
        const isWalkable = this.isWalkableTile(gx, gy);
        const isWall = !isWalkable;

        this.ctx.fillStyle = isWalkable ? "#50495f" : "#221d2b";
        this.ctx.fillRect(px, py, tileSize, tileSize);

        this.ctx.fillStyle = isWalkable ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.25)";
        this.ctx.fillRect(px, py, tileSize, 2);
        this.ctx.fillRect(px, py, 2, tileSize);

        if (isWall) {
          this.ctx.fillStyle = "#0f0c14";
          this.ctx.fillRect(px + 2, py + tileSize - 4, tileSize - 4, 2);
          this.ctx.fillStyle = "#2f2839";
          this.ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        }

        if (isWalkable && (gx + gy) % 9 === 0) {
          this.ctx.fillStyle = "#5e576e";
          this.ctx.fillRect(px + 8, py + 8, tileSize - 16, tileSize - 16);
        }

        if (this.isTorchTile(gx, gy)) {
          this.ctx.fillStyle = "#6e4f2f";
          this.ctx.fillRect(px + tileSize / 2 - 2, py + 6, 4, 8);
          this.ctx.fillStyle = "#ffcf6a";
          this.ctx.fillRect(px + tileSize / 2 - 2, py + 3, 4, 4);
          this.ctx.fillStyle = "rgba(255, 211, 120, 0.2)";
          this.ctx.fillRect(px + tileSize / 2 - 6, py + 0, 12, 12);
        }

        if (this.isPuddleTile(gx, gy)) {
          this.ctx.fillStyle = "#2a4f8f";
          this.ctx.fillRect(px + 6, py + 10, tileSize - 12, tileSize - 14);
          this.ctx.fillStyle = "rgba(141, 193, 255, 0.35)";
          this.ctx.fillRect(px + 10, py + 12, tileSize - 22, 4);
        }
      }
    }
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

    const x = Math.round(pos.x + offsetX);
    const y = Math.round(pos.y + offsetY);
    const sprite = enemy.worldSprite;

    this.ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.ctx.fillRect(x + 6, y + size - 4, size - 12, 4);

    if (sprite === "bat") {
      this.ctx.fillStyle = "#5f4ec9";
      this.ctx.fillRect(x + 6, y + 10, size - 12, 14);
      this.ctx.fillRect(x + 2, y + 13, 8, 8);
      this.ctx.fillRect(x + size - 10, y + 13, 8, 8);
      this.ctx.fillStyle = "#f5f5f5";
      this.ctx.fillRect(x + 11, y + 14, 3, 3);
      this.ctx.fillRect(x + size - 14, y + 14, 3, 3);
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(x + 11, y + 16, 2, 2);
      this.ctx.fillRect(x + size - 13, y + 16, 2, 2);
      return;
    }

    if (sprite === "skeleton") {
      this.ctx.fillStyle = "#d9dde3";
      this.ctx.fillRect(x + 6, y + 6, size - 12, size - 10);
      this.ctx.fillStyle = "#131313";
      this.ctx.fillRect(x + 11, y + 12, 4, 4);
      this.ctx.fillRect(x + size - 15, y + 12, 4, 4);
      this.ctx.fillRect(x + size / 2 - 3, y + 21, 6, 4);
      return;
    }

    if (sprite === "mush") {
      this.ctx.fillStyle = "#6d3f2e";
      this.ctx.fillRect(x + 6, y + 6, size - 12, 12);
      this.ctx.fillStyle = "#c9c2ab";
      this.ctx.fillRect(x + 12, y + 18, size - 24, 10);
      this.ctx.fillStyle = "#f2f2f2";
      this.ctx.fillRect(x + 13, y + 11, 3, 3);
      this.ctx.fillRect(x + size - 16, y + 11, 3, 3);
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(x + 13, y + 13, 2, 2);
      this.ctx.fillRect(x + size - 15, y + 13, 2, 2);
      return;
    }

    this.ctx.fillStyle = enemy.color;
    this.ctx.fillRect(x + 4, y + 8, size - 8, size - 10);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(x + 11, y + 14, 4, 4);
    this.ctx.fillRect(x + size - 15, y + 14, 4, 4);
    this.ctx.fillStyle = "#220000";
    this.ctx.fillRect(x + 11, y + 16, 3, 3);
    this.ctx.fillRect(x + size - 14, y + 16, 3, 3);
  }

  private isWalkableTile(gx: number, gy: number): boolean {
    const chunkX = Math.floor(gx / 12);
    const chunkY = Math.floor(gy / 9);
    const seed = (chunkX * 92821 + chunkY * 68917) % 7;
    const localX = gx % 12;
    const localY = gy % 9;

    if (seed <= 2) {
      return localX >= 2 && localX <= 9 && localY >= 2 && localY <= 6;
    }
    if (seed <= 4) {
      return localX >= 1 && localX <= 10 && localY >= 3 && localY <= 5;
    }

    return localX >= 5 && localX <= 6;
  }

  private isTorchTile(gx: number, gy: number): boolean {
    return gx % 14 === 0 && gy % 10 === 0;
  }

  private isPuddleTile(gx: number, gy: number): boolean {
    return gx % 16 === 5 && gy % 12 === 8;
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
