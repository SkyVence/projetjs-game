export class UIRenderer {
  public readonly root: HTMLDivElement;
  public readonly attackButton: HTMLButtonElement;
  public readonly itemButton: HTMLButtonElement;
  public readonly runButton: HTMLButtonElement;

  private titleEl: HTMLDivElement;
  private battleLabel!: HTMLDivElement;
  private messageEl: HTMLParagraphElement;
  private turnEl: HTMLDivElement;
  private playerHpEl: HTMLDivElement;
  private enemyHpEl: HTMLDivElement;
  private playerHpFill: HTMLDivElement;
  private enemyHpFill: HTMLDivElement;
  private timingWrap: HTMLDivElement;
  private timingBar: HTMLDivElement;
  private timingZone: HTMLDivElement;
  private timingCursor: HTMLDivElement;
  private actionPanel: HTMLDivElement;
  private inventoryPanel: HTMLDivElement;
  private inventoryList: HTMLDivElement;
  private inventoryCloseBtn: HTMLButtonElement;

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

    this.battleLabel = document.createElement("div");
    this.battleLabel.className = "rpg-battle-label";
    this.battleLabel.textContent = "Tour par tour";

    this.turnEl = document.createElement("div");
    this.turnEl.className = "rpg-turn-banner";
    this.turnEl.textContent = "Ton tour";

    const titleWrap = document.createElement("div");
    titleWrap.className = "rpg-title-wrap";
    titleWrap.append(this.titleEl, this.battleLabel);

    header.append(titleWrap, this.turnEl);

    const battlefield = document.createElement("div");
    battlefield.className = "rpg-battlefield";

    const sky = document.createElement("div");
    sky.className = "rpg-sky";

    const ground = document.createElement("div");
    ground.className = "rpg-ground";

    const decorations = document.createElement("div");
    decorations.className = "rpg-decorations";

    const bushPositions = [
      { left: "28%", top: "54%", size: 24 },
      { left: "44%", top: "78%", size: 30 },
      { left: "56%", top: "60%", size: 22 },
      { left: "68%", top: "82%", size: 28 },
      { left: "76%", top: "56%", size: 20 },
    ];

    bushPositions.forEach((pos) => {
      const bush = document.createElement("div");
      bush.className = "rpg-bush";
      bush.style.left = pos.left;
      bush.style.top = pos.top;
      bush.style.setProperty("--size", `${pos.size}px`);
      decorations.appendChild(bush);
    });

    const enemyBox = document.createElement("div");
    enemyBox.className = "rpg-actor rpg-enemy-actor";

    const enemyStatus = document.createElement("div");
    enemyStatus.className = "rpg-status-box rpg-status-box-enemy";

    const enemySprite = document.createElement("div");
    enemySprite.className = "rpg-sprite rpg-sprite-enemy";

    const enemyShadow = document.createElement("div");
    enemyShadow.className = "rpg-shadow rpg-shadow-enemy";

    const enemyFigure = document.createElement("div");
    enemyFigure.className = "rpg-figure";
    enemyFigure.append(enemySprite, enemyShadow);

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
    enemyStatus.append(enemyHud);
    enemyBox.append(enemyFigure, enemyStatus);

    const playerBox = document.createElement("div");
    playerBox.className = "rpg-actor rpg-player-actor";

    const playerStatus = document.createElement("div");
    playerStatus.className = "rpg-status-box rpg-status-box-player";

    const playerSprite = document.createElement("div");
    playerSprite.className = "rpg-sprite rpg-sprite-player";

    const playerShadow = document.createElement("div");
    playerShadow.className = "rpg-shadow rpg-shadow-player";

    const playerFigure = document.createElement("div");
    playerFigure.className = "rpg-figure";
    playerFigure.append(playerSprite, playerShadow);

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
    playerStatus.append(playerHud);
    playerBox.append(playerFigure, playerStatus);

    const vsBadge = document.createElement("div");
    vsBadge.className = "rpg-vs-badge";
    vsBadge.textContent = "VS";

    battlefield.append(sky, ground, decorations, vsBadge, enemyBox, playerBox);

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

    const commandBox = document.createElement("div");
    commandBox.className = "rpg-command-box";

    const dialogPane = document.createElement("div");
    dialogPane.className = "rpg-dialog-pane";

    const menuPane = document.createElement("div");
    menuPane.className = "rpg-menu-pane";

    this.actionPanel = document.createElement("div");
    this.actionPanel.className = "rpg-actions";

    this.inventoryPanel = document.createElement("div");
    this.inventoryPanel.className = "rpg-inventory";
    this.inventoryPanel.hidden = true;

    const inventoryTitle = document.createElement("div");
    inventoryTitle.className = "rpg-inventory-title";
    inventoryTitle.textContent = "Inventaire";

    this.inventoryList = document.createElement("div");
    this.inventoryList.className = "rpg-inventory-list";

    this.inventoryCloseBtn = document.createElement("button");
    this.inventoryCloseBtn.className = "rpg-inventory-close";
    this.inventoryCloseBtn.textContent = "Retour";

    this.inventoryPanel.append(inventoryTitle, this.inventoryList, this.inventoryCloseBtn);

    this.attackButton = document.createElement("button");
    this.attackButton.className = "rpg-action";
    this.attackButton.textContent = "Attaquer";

    this.itemButton = document.createElement("button");
    this.itemButton.className = "rpg-action";
    this.itemButton.textContent = "Objet";

    this.runButton = document.createElement("button");
    this.runButton.className = "rpg-action";
    this.runButton.textContent = "Fuir";

    this.actionPanel.append(this.attackButton, this.itemButton, this.runButton);
    dialogPane.append(this.timingWrap, this.messageEl);
    menuPane.append(this.actionPanel, this.inventoryPanel);
    commandBox.append(dialogPane, menuPane);
    footer.append(commandBox);

    scene.append(header, battlefield, footer);
    this.root.appendChild(scene);
    container.appendChild(this.root);
  }

  setMessage(message: string): void {
    this.messageEl.innerHTML = message;
  }

  setTurnLabel(label: string): void {
    this.turnEl.textContent = label;
  }

  setPlayerStats(name: string, hp: number, maxHp: number): void {
    this.playerHpEl.textContent = `${hp}/${maxHp} PV`;
    this.playerHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  }

  setEnemyStats(name: string, hp: number, maxHp: number): void {
    this.enemyHpEl.textContent = `${hp}/${maxHp} PV`;
    this.enemyHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  }

  setButtonsDisabled(disabled: boolean): void {
    this.attackButton.disabled = disabled;
    this.itemButton.disabled = disabled;
    this.runButton.disabled = disabled;
  }

  showInventory(
    items: Array<{ id: string; name: string; quantity: number }>,
    onSelect: (id: string) => void,
    onCancel: () => void,
  ): void {
    this.inventoryList.innerHTML = "";

    items.forEach((item) => {
      const button = document.createElement("button");
      button.className = "rpg-inventory-item";
      button.textContent = `${item.name} x${item.quantity}`;
      button.disabled = item.quantity <= 0;
      button.addEventListener("click", () => onSelect(item.id));
      this.inventoryList.appendChild(button);
    });

    this.inventoryCloseBtn.onclick = onCancel;
    this.inventoryPanel.hidden = false;
    this.actionPanel.hidden = true;
  }

  hideInventory(): void {
    this.inventoryPanel.hidden = true;
    this.actionPanel.hidden = false;
  }

  setActionLabels(attackLabel: string, itemLabel: string, runLabel: string): void {
    this.attackButton.textContent = attackLabel;
    this.itemButton.textContent = itemLabel;
    this.runButton.textContent = runLabel;
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
