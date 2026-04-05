export class UIRenderer {
  public readonly root: HTMLDivElement;
  public readonly attackButton: HTMLButtonElement;
  public readonly itemButton: HTMLButtonElement;
  public readonly runButton: HTMLButtonElement;

  private titleEl: HTMLDivElement;
  private messageEl: HTMLParagraphElement;
  private turnEl: HTMLDivElement;
  private enemyNameEl: HTMLSpanElement;
  private playerHpEl: HTMLDivElement;
  private enemyHpEl: HTMLDivElement;
  private playerHpFill: HTMLDivElement;
  private enemyHpFill: HTMLDivElement;
  private timingWrap: HTMLDivElement;
  private timingBar: HTMLDivElement;
  private timingZone: HTMLDivElement;
  private timingCursor: HTMLDivElement;

  constructor(container: HTMLElement, playerName: string, enemyName: string) {
    this.root = document.createElement("div");
    this.root.className = "rpg-combat-root";

    const scene = document.createElement("div");
    scene.className = "rpg-combat-scene";

    const header = document.createElement("div");
    header.className = "rpg-combat-header";

    this.titleEl = document.createElement("div");
    this.titleEl.className = "rpg-combat-title";
    this.titleEl.textContent = "Combat";

    this.turnEl = document.createElement("div");
    this.turnEl.className = "rpg-turn-banner";
    this.turnEl.textContent = "Ton tour";

    header.append(this.titleEl, this.turnEl);

    const battlefield = document.createElement("div");
    battlefield.className = "rpg-battlefield";

    const sky = document.createElement("div");
    sky.className = "rpg-sky";

    const ground = document.createElement("div");
    ground.className = "rpg-ground";

    const enemyBox = document.createElement("div");
    enemyBox.className = "rpg-actor rpg-enemy-actor";

    const enemySprite = document.createElement("div");
    enemySprite.className = "rpg-sprite rpg-sprite-enemy";

    const enemyShadow = document.createElement("div");
    enemyShadow.className = "rpg-shadow rpg-shadow-enemy";

    const enemyHud = document.createElement("div");
    enemyHud.className = "rpg-hud rpg-hud-enemy";

    const enemyNameLabel = document.createElement("div");
    enemyNameLabel.className = "rpg-hud-name";
    enemyNameLabel.textContent = enemyName;

    this.enemyHpEl = document.createElement("div");
    this.enemyHpEl.className = "rpg-hud-hp";
    this.enemyHpEl.textContent = "30/30 PV";

    const enemyHpBar = document.createElement("div");
    enemyHpBar.className = "rpg-hp-bar rpg-hp-bar-enemy";
    this.enemyHpFill = document.createElement("div");
    this.enemyHpFill.className = "rpg-hp-fill";
    enemyHpBar.appendChild(this.enemyHpFill);
    enemyHud.append(enemyNameLabel, this.enemyHpEl, enemyHpBar);
    enemyBox.append(enemySprite, enemyShadow, enemyHud);

    const playerBox = document.createElement("div");
    playerBox.className = "rpg-actor rpg-player-actor";

    const playerSprite = document.createElement("div");
    playerSprite.className = "rpg-sprite rpg-sprite-player";

    const playerShadow = document.createElement("div");
    playerShadow.className = "rpg-shadow rpg-shadow-player";

    const playerHud = document.createElement("div");
    playerHud.className = "rpg-hud rpg-hud-player";

    const playerNameEl = document.createElement("div");
    playerNameEl.className = "rpg-hud-name";
    playerNameEl.textContent = playerName;

    this.playerHpEl = document.createElement("div");
    this.playerHpEl.className = "rpg-hud-hp";
    this.playerHpEl.textContent = "100/100 PV";

    const playerHpBar = document.createElement("div");
    playerHpBar.className = "rpg-hp-bar";
    this.playerHpFill = document.createElement("div");
    this.playerHpFill.className = "rpg-hp-fill";
    playerHpBar.appendChild(this.playerHpFill);
    playerHud.append(playerNameEl, this.playerHpEl, playerHpBar);
    playerBox.append(playerSprite, playerShadow, playerHud);

    battlefield.append(sky, ground, enemyBox, playerBox);

    const statusLine = document.createElement("div");
    statusLine.className = "rpg-status-line";

    this.enemyNameEl = document.createElement("span");
    this.enemyNameEl.className = "rpg-status-enemy";
    this.enemyNameEl.textContent = enemyName;

    this.titleEl = document.createElement("div");
    this.titleEl.className = "rpg-status-title";
    this.titleEl.textContent = "Combat";
    statusLine.append(this.titleEl, this.enemyNameEl);

    this.timingWrap = document.createElement("div");
    this.timingWrap.className = "rpg-timing-wrap";
    this.timingWrap.hidden = true;

    this.timingBar = document.createElement("div");
    this.timingBar.className = "rpg-timing-bar";

    this.timingZone = document.createElement("div");
    this.timingZone.className = "rpg-timing-zone";

    this.timingCursor = document.createElement("div");
    this.timingCursor.className = "rpg-timing-cursor";

    this.timingBar.append(this.timingZone, this.timingCursor);
    this.timingWrap.appendChild(this.timingBar);

    this.messageEl = document.createElement("p");
    this.messageEl.className = "rpg-dialog";

    const footer = document.createElement("div");
    footer.className = "rpg-footer";

    const actionPanel = document.createElement("div");
    actionPanel.className = "rpg-actions";

    this.attackButton = document.createElement("button");
    this.attackButton.className = "rpg-action";
    this.attackButton.textContent = "Attaquer";

    this.itemButton = document.createElement("button");
    this.itemButton.className = "rpg-action";
    this.itemButton.textContent = "Objet";

    this.runButton = document.createElement("button");
    this.runButton.className = "rpg-action";
    this.runButton.textContent = "Fuir";

    actionPanel.append(this.attackButton, this.itemButton, this.runButton);
    footer.append(this.timingWrap, this.messageEl, actionPanel);

    scene.append(header, battlefield, statusLine, footer);
    this.root.appendChild(scene);
    container.appendChild(this.root);
  }

  setMessage(message: string): void {
    this.messageEl.textContent = message;
  }

  setTurnLabel(label: string): void {
    this.turnEl.textContent = label;
  }

  setPlayerStats(name: string, hp: number, maxHp: number): void {
    this.playerHpEl.textContent = `${hp}/${maxHp} PV`;
    this.playerHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  }

  setEnemyStats(name: string, hp: number, maxHp: number): void {
    this.enemyNameEl.textContent = name;
    this.enemyHpEl.textContent = `${hp}/${maxHp} PV`;
    this.enemyHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  }

  setButtonsDisabled(disabled: boolean): void {
    this.attackButton.disabled = disabled;
    this.itemButton.disabled = disabled;
    this.runButton.disabled = disabled;
  }

  showTiming(show: boolean): void {
    this.timingWrap.hidden = !show;
  }

  updateTiming(cursor: number, zoneStart: number, zoneWidth: number): void {
    this.timingZone.style.left = `${zoneStart * 100}%`;
    this.timingZone.style.width = `${zoneWidth * 100}%`;
    this.timingCursor.style.left = `${cursor * 100}%`;
  }

  flash(target: "player" | "enemy"): void {
    const el = this.root.querySelector(target === "player" ? ".rpg-player-actor" : ".rpg-enemy-actor");
    if (!el) return;
    el.classList.add("rpg-flash");
    window.setTimeout(() => el.classList.remove("rpg-flash"), 180);
  }

  destroy(): void {
    this.root.remove();
  }
}
