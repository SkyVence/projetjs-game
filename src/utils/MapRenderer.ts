import type { GeneratedMap } from './MapGen';
import { TileType } from './MapGen';

export interface RendererOptions {
  tileSize?:  number;
  colors?:    Partial<TileColors>;
}

export interface TileColors {
  wall:     string;
  floor:    string;
  corridor: string;
  entry:    string;
  exit:     string;
  fog:      string;
}

const DEFAULT_COLORS: TileColors = {
  wall:     '#0d0d1a',
  floor:    '#2d6a4f',
  corridor: '#6a4c93',
  entry:    '#f4d03f',
  exit:     '#e74c3c',
  fog:      '#080808',
};

export class MapRenderer {
  private readonly canvas:   HTMLCanvasElement;
  private readonly ctx:      CanvasRenderingContext2D;
  private readonly tileSize: number;
  private readonly colors:   TileColors;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Impossible d\'obtenir le contexte 2D du canvas');

    this.canvas   = canvas;
    this.ctx      = ctx;
    this.tileSize = options.tileSize ?? 16;
    this.colors   = { ...DEFAULT_COLORS, ...options.colors };
  }

  render(map: GeneratedMap, revealed?: boolean[][]): void {
    this.canvas.width  = map.width  * this.tileSize;
    this.canvas.height = map.height * this.tileSize;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const row = map.grid[y];
        if (!row) continue;
        const tile = row[x];
        if (tile === undefined) continue;

        const revealedRow = revealed?.[y];
        if (revealedRow && !revealedRow[x]) {
          this.drawTile(x, y, this.colors.fog);
          continue;
        }

        this.drawTile(x, y, this.tileColor(tile));

        if (tile === TileType.Entry) this.drawGlyph(x, y, 'E');
        if (tile === TileType.Exit)  this.drawGlyph(x, y, 'X');
      }
    }
  }

  renderRegion(map: GeneratedMap, rx: number, ry: number, rw: number, rh: number): void {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;
        const row = map.grid[y];
        if (!row) continue;
        const tile = row[x];
        if (tile === undefined) continue;
        this.drawTile(x, y, this.tileColor(tile));
      }
    }
  }

  pixelToTile(px: number, py: number): { x: number; y: number } {
    return {
      x: Math.floor(px / this.tileSize),
      y: Math.floor(py / this.tileSize),
    };
  }

  private drawTile(tx: number, ty: number, color: string): void {
    const { ctx, tileSize: s } = this;
    ctx.fillStyle = color;
    ctx.fillRect(tx * s, ty * s, s, s);
  }

  private drawGlyph(tx: number, ty: number, char: string): void {
    const { ctx, tileSize: s } = this;
    ctx.fillStyle = '#000';
    ctx.font = `bold ${Math.floor(s * 0.6)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, tx * s + s / 2, ty * s + s / 2);
  }

  private tileColor(tile: TileType): string {
    switch (tile) {
      case TileType.Floor:    return this.colors.floor;
      case TileType.Corridor: return this.colors.corridor;
      case TileType.Entry:    return this.colors.entry;
      case TileType.Exit:     return this.colors.exit;
      default:                return this.colors.wall;
    }
  }
}
