export const enum TileType {
  Wall     = 0,
  Floor    = 1,
  Corridor = 2,
  Entry    = 3,
  Exit     = 4,
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room extends Rect {
  id: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GeneratedMap {
  width:    number;
  height:   number;
  grid:     TileType[][];
  rooms:    Room[];
  entry:    Point;
  exit:     Point;
  seed:     number;
}

export interface MapGenOptions {
  width?:        number;
  height?:       number;
  seed?:         number;
  maxDepth?:     number;
  minRoomSize?:  number;
  padding?:      number;
}

export class MapGenerator {
  private readonly width:       number;
  private readonly height:      number;
  private readonly maxDepth:    number;
  private readonly minRoomSize: number;
  private readonly padding:     number;

  private grid!:    TileType[][];
  private rooms!:   Room[];
  private rngState: number = 0;
  private roomIdCounter: number = 0;

  constructor(options: MapGenOptions = {}) {
    this.width       = options.width       ?? 64;
    this.height      = options.height      ?? 40;
    this.maxDepth    = options.maxDepth    ?? 4;
    this.minRoomSize = options.minRoomSize ?? 4;
    this.padding     = options.padding     ?? 2;
  }

  generate(seed?: number): GeneratedMap {
    const usedSeed = seed ?? Date.now();
    this.rngState = usedSeed;
    this.roomIdCounter = 0;

    this.grid = Array.from(
      { length: this.height },
      () => new Array<TileType>(this.width).fill(TileType.Wall),
    );
    this.rooms = [];

    const rootPartition: Rect = {
      x: 1,
      y: 1,
      w: this.width  - 2,
      h: this.height - 2,
    };
    this.bsp(rootPartition, this.maxDepth);

    const [entry, exit] = this.placeEntryAndExit();

    return {
      width:  this.width,
      height: this.height,
      grid:   this.grid,
      rooms:  this.rooms,
      entry,
      exit,
      seed:   usedSeed,
    };
  }

  private bsp(partition: Rect, depth: number): void {
    const { w, h } = partition;
    const minSplit = this.minRoomSize * 2 + this.padding * 2 + 1;

    if (depth === 0 || (w < minSplit && h < minSplit)) {
      this.carveRoom(partition);
      return;
    }

    const canSplitH = w >= minSplit;
    const canSplitV = h >= minSplit;

    const splitHorizontally =
      canSplitH && canSplitV
        ? w >= h
        : canSplitH;

    if (splitHorizontally) {
      const min = partition.x + this.minRoomSize + this.padding;
      const max = partition.x + partition.w - this.minRoomSize - this.padding - 1;
      if (min > max) { this.carveRoom(partition); return; }
      const splitX = this.rng(min, max);
      const left:  Rect = { x: partition.x, y: partition.y, w: splitX - partition.x,                   h };
      const right: Rect = { x: splitX,      y: partition.y, w: partition.x + w - splitX, h };
      this.bsp(left,  depth - 1);
      this.bsp(right, depth - 1);
      this.connectLeaves(left, right);
    } else {
      const min = partition.y + this.minRoomSize + this.padding;
      const max = partition.y + partition.h - this.minRoomSize - this.padding - 1;
      if (min > max) { this.carveRoom(partition); return; }
      const splitY = this.rng(min, max);
      const top:    Rect = { x: partition.x, y: partition.y, w, h: splitY - partition.y };
      const bottom: Rect = { x: partition.x, y: splitY,      w, h: partition.y + h - splitY };
      this.bsp(top,    depth - 1);
      this.bsp(bottom, depth - 1);
      this.connectLeaves(top, bottom);
    }
  }

  private carveRoom(partition: Rect): void {
    const p = this.padding;
    const maxW = partition.w - p * 2;
    const maxH = partition.h - p * 2;

    if (maxW < this.minRoomSize || maxH < this.minRoomSize) return;

    const rw = this.rng(this.minRoomSize, maxW);
    const rh = this.rng(this.minRoomSize, maxH);
    const rx = this.rng(partition.x + p, partition.x + partition.w - rw - p);
    const ry = this.rng(partition.y + p, partition.y + partition.h - rh - p);

    for (let y = ry; y < ry + rh; y++) {
      const row = this.grid[y];
      if (!row) continue;
      for (let x = rx; x < rx + rw; x++) {
        row[x] = TileType.Floor;
      }
    }

    this.rooms.push({ id: this.roomIdCounter++, x: rx, y: ry, w: rw, h: rh });
  }

  private connectLeaves(a: Rect, b: Rect): void {
    const roomA = this.findRoomInPartition(a);
    const roomB = this.findRoomInPartition(b);
    if (!roomA || !roomB) return;

    const ca = this.center(roomA);
    const cb = this.center(roomB);

    this.carveCorridor(ca, { x: cb.x, y: ca.y });
    this.carveCorridor({ x: cb.x, y: ca.y }, cb);
  }

  private carveCorridor(from: Point, to: Point): void {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    let { x, y } = from;

    while (x !== to.x || y !== to.y) {
      const row = this.grid[y];
      if (row && row[x] === TileType.Wall) {
        row[x] = TileType.Corridor;
      }
      if (x !== to.x) x += dx;
      else             y += dy;
    }
    const lastRow = this.grid[y];
    if (lastRow && lastRow[x] === TileType.Wall) {
      lastRow[x] = TileType.Corridor;
    }
  }

  private placeEntryAndExit(): [Point, Point] {
    if (this.rooms.length < 2) {
      const fallback = { x: 1, y: 1 };
      return [fallback, fallback];
    }

    const firstRoom = this.rooms[0];
    if (!firstRoom) return [{x:1, y:1}, {x:1, y:1}];

    const entry = this.center(firstRoom);
    let farthest = this.rooms[1];
    let maxDist = 0;

    for (const room of this.rooms.slice(1)) {
      const c = this.center(room);
      const dist = Math.abs(c.x - entry.x) + Math.abs(c.y - entry.y);
      if (dist > maxDist) { maxDist = dist; farthest = room; }
    }

    const exit = this.center(farthest!);
    const entryRow = this.grid[entry.y];
    const exitRow = this.grid[exit.y];
    if (entryRow) entryRow[entry.x] = TileType.Entry;
    if (exitRow) exitRow[exit.x]   = TileType.Exit;

    return [entry, exit];
  }

  private findRoomInPartition(partition: Rect): Room | undefined {
    return this.rooms.find(
      r =>
        r.x >= partition.x &&
        r.x < partition.x + partition.w &&
        r.y >= partition.y &&
        r.y < partition.y + partition.h,
    );
  }

  private center(rect: Rect): Point {
    return {
      x: Math.floor(rect.x + rect.w / 2),
      y: Math.floor(rect.y + rect.h / 2),
    };
  }

  private rng(lo: number, hi: number): number {
    this.rngState = (this.rngState * 1_664_525 + 1_013_904_223) & 0xffffffff;
    return lo + (Math.abs(this.rngState) % (hi - lo + 1));
  }
}
