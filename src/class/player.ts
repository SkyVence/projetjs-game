import { Entity } from "./entity";

export class Player extends Entity {
  public PlayerName: string;

  constructor(name: string) {
    super();
    this.PlayerName = name;
  }

  public getPlayerName(): string {
    return this.PlayerName;
  }
}
