import type { Position } from "@/types/pos";

class Entity {
  constructor(pos: Position) {
    this.pos = pos;
  }

  pos: Position;
}
