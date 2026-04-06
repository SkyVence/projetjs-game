import { Entity } from "@/class/entity";
import { Player } from "@/class/player";
import { Enemy } from "@/class/enemy";
import { Position } from "@/class/base/position";
import { Velocity } from "@/class/base/velocity";
import { Health } from "@/class/base/health";
import { InputManager } from "@/systems/InputManager";
import { CanvasRenderer } from "@/systems/CanvasRenderer";
import { Camera } from "@/systems/Camera";
import { GameLoop } from "@/systems/GameLoop";
import { ENEMY_TEMPLATES } from "@/data/enemies";
import { CombatManager } from "@/systems/combat/CombatManager";
import { MapGenerator, TileType } from "@/utils/MapGen";
import type { GeneratedMap, Room } from "@/utils/MapGen";
import { navigateTo } from "@/router";

export interface GameSceneConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  aspectRatio?: number;
}

export class GameScene {
  private container: HTMLElement;
  private config: GameSceneConfig;

  private renderer: CanvasRenderer;
  private camera: Camera;
  private gameLoop: GameLoop;
  private input: InputManager;

  private entities: Entity[] = [];
  private enemies: Entity[] = [];
  private player: Player | null = null;
  private currentEnemy: Enemy | null = null;
  private inCombat = false;
  private combatOverlay: HTMLDivElement | null = null;
  private combatBackdrop: HTMLDivElement | null = null;
  private combatPanel: HTMLDivElement | null = null;
  private combatHeader: HTMLDivElement | null = null;
  private combatBattlefield: HTMLDivElement | null = null;
  private combatLog: HTMLDivElement | null = null;
  private combatHint: HTMLDivElement | null = null;
  private combatTurnBanner: HTMLDivElement | null = null;
  private combatStatusLine: HTMLDivElement | null = null;
  private combatMessage: HTMLParagraphElement | null = null;
  private combatStats: HTMLDivElement | null = null;
  private playerHpFill: HTMLDivElement | null = null;
  private enemyHpFill: HTMLDivElement | null = null;
  private playerHpText: HTMLSpanElement | null = null;
  private enemyHpText: HTMLSpanElement | null = null;
  private enemyNameLabel: HTMLSpanElement | null = null;
  private timingWrap: HTMLDivElement | null = null;
  private timingTrack: HTMLDivElement | null = null;
  private timingZone: HTMLDivElement | null = null;
  private timingCursor: HTMLDivElement | null = null;
  private attackBtn: HTMLButtonElement | null = null;
  private itemBtn: HTMLButtonElement | null = null;
  private runBtn: HTMLButtonElement | null = null;
  private actionLocked = false;
  private pendingStart = false;
  private potionCount = 3;
  private combatSequenceRunning = false;
  private timingActive = false;
  private timingAnimation: number | null = null;
  private timingStart = 0;
  private timingDuration = 1200;
  private timingZoneStart = 0.25;
  private timingZoneWidth = 0.2;
  private timingCursorPosition = 0;
  private waitingTimingResult = false;
  private spaceHeld = false;
  private combatKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private combatKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private readonly enemyParryChance = 0.25;
  private lastSafePosition = { x: 0, y: 0 };
  private combatManager: CombatManager | null = null;

  private readonly PLAYER_SPEED = 220;
  private readonly TILE_SIZE = 48;
  private readonly PLAYER_SIZE = 40;
  private readonly MAP_TILES_W = 40;
  private readonly MAP_TILES_H = 40;
  private lastMovementInput = { dx: 0, dy: 0 };
  private enemyMoveTick = 0;
  private movementAccumulator = 0;

  private map: GeneratedMap | null = null;
  private spawnRoom: Room | null = null;

  constructor(container: HTMLElement, config: GameSceneConfig) {
    this.container = container;
    this.config = config;

    // Fixed viewport size for fair gameplay - scales via CSS
    const fixedWidth = 1280;
    const fixedHeight = 720;

    // Create renderer with fixed internal resolution
    this.renderer = new CanvasRenderer(container, {
      width: fixedWidth,
      height: fixedHeight,
      backgroundColor: "#000",
      tileSize: this.TILE_SIZE,
      aspectRatio: config.aspectRatio ?? 16 / 9,
      fixedResolution: true,
    });

    // Use fixed internal resolution for camera (all players see same area)
    this.camera = new Camera({
      viewportWidth: fixedWidth,
      viewportHeight: fixedHeight,
      mapWidth: config.mapWidth,
      mapHeight: config.mapHeight,
      smoothness: 0.15,
    });

    this.gameLoop = new GameLoop();
    this.input = InputManager.getInstance();

    this.gameLoop.addUpdateListener((dt) => this.update(dt));
    this.gameLoop.addRenderListener((dt) => this.render(dt));
  }

  initialize(): void {
    if (!this.player) {
      throw new Error("Player must be provided before initializing the scene");
    }

    // Generate dungeon map
    const mapGen = new MapGenerator({
      width: this.MAP_TILES_W,
      height: this.MAP_TILES_H,
      maxDepth: 4,
    });
    this.map = mapGen.generate();

    // Get spawn room (first room where entry is)
    this.spawnRoom = this.map.rooms[0] ?? null;

    // Fixed viewport size for fair gameplay (same for all players)
    const fixedViewportWidth = 1280;
    const fixedViewportHeight = 720;

    // Update camera with fixed viewport dimensions
    this.camera = new Camera({
      viewportWidth: fixedViewportWidth,
      viewportHeight: fixedViewportHeight,
      mapWidth: this.MAP_TILES_W * this.TILE_SIZE,
      mapHeight: this.MAP_TILES_H * this.TILE_SIZE,
      smoothness: 0.15,
      scrollMargin: 150,
    });

    this.entities = [];
    this.enemies = [];
    this.enemyMoveTick = 0;
    this.movementAccumulator = 0;

    // Place player at map entry point
    const entryX = this.map.entry.x * this.TILE_SIZE;
    const entryY = this.map.entry.y * this.TILE_SIZE;
    this.player.addComponent(new Position(entryX, entryY));
    this.player.addComponent(new Velocity(0, 0));
    this.player.addComponent(new Health(this.player.stats.hp));

    this.entities.push(this.player);
    this.spawnEnemies();
    this.gameLoop.start();
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  private spawnEnemies(): void {
    if (!this.map || !this.spawnRoom) return;

    // Spawn one enemy at the center of the spawn room
    const room = this.spawnRoom;
    const enemyTileX = Math.floor(room.x + room.w / 2);
    const enemyTileY = Math.floor(room.y + room.h / 2);

    // Ensure enemy is not on the entry point (offset by a few tiles if needed)
    let spawnX = enemyTileX;
    let spawnY = enemyTileY;

    // If too close to entry, move a bit
    const distanceToEntry = Math.sqrt(
      Math.pow(spawnX - this.map.entry.x, 2) +
      Math.pow(spawnY - this.map.entry.y, 2)
    );

    if (distanceToEntry < 3) {
      spawnX += 2;
    }

    const pixelX = spawnX * this.TILE_SIZE;
    const pixelY = spawnY * this.TILE_SIZE;

    const template = ENEMY_TEMPLATES[0]!;
    const enemy = new Enemy(template, pixelX, pixelY);
    this.enemies.push(enemy);
    this.entities.push(enemy);
  }

  private update(deltaTime: number): void {
    if (!this.player) return;

    if (this.inCombat) {
      return;
    }

    this.movementAccumulator += deltaTime;
    const movementStep = Math.min(this.movementAccumulator, 0.1);
    this.movementAccumulator = 0;

    const { dx, dy } = this.input.getMovementInput();
    this.lastMovementInput = { dx, dy };

    const playerPos = this.player.getComponent<Position>("position");
    if (playerPos) {
      this.lastSafePosition = { x: playerPos.x, y: playerPos.y };
    }

    const velocity = this.player.getComponent<Velocity>("velocity");
    if (velocity) {
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        velocity.x = (dx / length) * this.PLAYER_SPEED;
        velocity.y = (dy / length) * this.PLAYER_SPEED;
      } else {
        velocity.x = 0;
        velocity.y = 0;
      }
    }

    // Update player position with wall collision
    if (this.player) {
      this.updatePlayerMovement(movementStep);
    }

    // Update enemy positions
    this.updateEnemyMovement(movementStep);

    this.updateEnemyMovement(movementStep);

    const collidedEnemy = this.enemies.find((enemy) => this.isColliding(this.player!, enemy as Enemy));
    if (collidedEnemy) {
      const playerPosition = this.player.getComponent<Position>("position");
      if (playerPosition) {
        playerPosition.x = this.lastSafePosition.x;
        playerPosition.y = this.lastSafePosition.y;
      }
      this.startCombat(collidedEnemy as Enemy);
    }

    this.updateEnemyMovement(movementStep);

    const collidedEnemy = this.enemies.find((enemy) => this.isColliding(this.player!, enemy as Enemy));
    if (collidedEnemy) {
      const playerPosition = this.player.getComponent<Position>("position");
      if (playerPosition) {
        playerPosition.x = this.lastSafePosition.x;
        playerPosition.y = this.lastSafePosition.y;
      }
      this.startCombat(collidedEnemy as Enemy);
    }

    if (this.player) {
      this.camera.follow(this.player);
      this.camera.update();
    }
  }

  private render(_deltaTime: number): void {
    this.renderer.clear();

    const { offsetX, offsetY } = this.camera.getOffset();

    // Render dungeon map
    if (this.map) {
      this.renderer.renderMap(this.map, offsetX, offsetY, this.TILE_SIZE);
    }

    this.enemies.forEach((enemy) => {
      const enemyEntity = enemy as Enemy;
      this.renderer.drawEntity(enemyEntity, offsetX, offsetY, enemyEntity.color, this.TILE_SIZE);
    });

    if (this.player) {
      this.renderer.drawCharacter(
        this.player,
        offsetX,
        offsetY,
        this.PLAYER_SIZE,
        this.lastMovementInput,
      );
    }

    this.renderer.drawFPS(1 / Math.max(_deltaTime, 0.001));
  }

  // Wall collision helpers
  private pixelToTile(pixel: number): number {
    return Math.floor(pixel / this.TILE_SIZE);
  }

  private isWallTile(tx: number, ty: number): boolean {
    if (!this.map) return true;
    if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) {
      return true;
    }
    const row = this.map.grid[ty];
    if (!row) return true;
    const tile = row[tx];
    return tile === TileType.Wall;
  }

  private canMoveTo(x: number, y: number, size: number = this.TILE_SIZE): boolean {
    // Check all four corners of the entity
    const corners = [
      { x: x, y: y },
      { x: x + size - 1, y: y },
      { x: x, y: y + size - 1 },
      { x: x + size - 1, y: y + size - 1 },
    ];

    for (const corner of corners) {
      const tx = this.pixelToTile(corner.x);
      const ty = this.pixelToTile(corner.y);
      if (this.isWallTile(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  private checkExitReached(x: number, y: number): boolean {
    if (!this.map) return false;
    const tx = this.pixelToTile(x + this.PLAYER_SIZE / 2);
    const ty = this.pixelToTile(y + this.PLAYER_SIZE / 2);
    const row = this.map.grid[ty];
    if (!row) return false;
    return row[tx] === TileType.Exit;
  }

  private updatePlayerMovement(deltaTime: number): void {
    if (!this.player) return;

    const pos = this.player.getComponent<Position>("position");
    const vel = this.player.getComponent<Velocity>("velocity");
    if (!pos || !vel) return;

    // Save safe position before moving
    if (pos.x !== this.lastSafePosition.x || pos.y !== this.lastSafePosition.y) {
      this.lastSafePosition = { x: pos.x, y: pos.y };
    }

    // Calculate new position
    const newX = pos.x + vel.x * deltaTime;
    const newY = pos.y + vel.y * deltaTime;

    // Clamp to map bounds (using PLAYER_SIZE)
    const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.PLAYER_SIZE;
    const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.PLAYER_SIZE;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // Try X movement with player size collision
    if (this.canMoveTo(clampedX, pos.y, this.PLAYER_SIZE)) {
      pos.x = clampedX;
    }

    // Try Y movement with player size collision
    if (this.canMoveTo(pos.x, clampedY, this.PLAYER_SIZE)) {
      pos.y = clampedY;
    }

    // Check if player reached exit
    if (this.checkExitReached(pos.x, pos.y)) {
      navigateTo("/");
      return;
    }
  }

  private updateEnemyMovement(deltaTime: number): void {
    if (!this.player) return;

    const playerPos = this.player.getComponent<Position>("position");
    if (!playerPos) return;

    this.enemies.forEach((enemy) => {
      const enemyEntity = enemy as Enemy;
      if (!enemyEntity.isAlive()) return;

      const pos = enemyEntity.getComponent<Position>("position");
      if (!pos) return;

      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 320) {
        return;
      }

      const patrol = enemyEntity.tickPatrol(deltaTime);
      const speed = enemyEntity.speed * deltaTime;
      const step = Math.max(2, speed);

      const chaseX = Math.abs(dx) > 18 ? Math.sign(dx) * step : 0;
      const chaseY = Math.abs(dy) > 18 ? Math.sign(dy) * step : 0;

      const newX = pos.x + chaseX + patrol.dx * deltaTime * 0.05;
      const newY = pos.y + chaseY + patrol.dy * deltaTime * 0.05;

      // Clamp to map bounds
      const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.TILE_SIZE;
      const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.TILE_SIZE;
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      // Try X movement with wall collision
      if (this.canMoveTo(clampedX, pos.y)) {
        pos.x = clampedX;
      }

      // Try Y movement with wall collision
      if (this.canMoveTo(pos.x, clampedY)) {
        pos.y = clampedY;
      }
    });
  }

  private mountCombatUI(): void {
    if (this.combatOverlay) return;

    this.combatOverlay = document.createElement("div");
    this.combatOverlay.className = "combat-overlay";
    this.combatOverlay.hidden = true;

    this.combatBackdrop = document.createElement("div");
    this.combatBackdrop.className = "combat-backdrop";

    this.combatPanel = document.createElement("div");
    this.combatPanel.className = "combat-frame";

    this.combatHeader = document.createElement("div");
    this.combatHeader.className = "combat-header";

    const titleBlock = document.createElement("div");
    titleBlock.className = "combat-title-block";

    const title = document.createElement("h2");
    title.className = "combat-title";
    title.textContent = "Combat";

    const subtitle = document.createElement("p");
    subtitle.className = "combat-subtitle";
    subtitle.textContent = "Tour par tour";

    titleBlock.append(title, subtitle);

    this.enemyNameLabel = document.createElement("span");
    this.enemyNameLabel.className = "combat-enemy-name";
    this.enemyNameLabel.textContent = "";

    this.combatHeader.append(titleBlock, this.enemyNameLabel);

    this.combatStats = document.createElement("div");
    this.combatStats.className = "combat-status-line";
    this.combatStatusLine = this.combatStats;

    this.combatBattlefield = document.createElement("div");
    this.combatBattlefield.className = "combat-battlefield";

    const enemyPanel = document.createElement("div");
    enemyPanel.className = "combat-actor enemy";

    const enemySprite = document.createElement("div");
    enemySprite.className = "combat-pixel enemy";
    const enemyShadow = document.createElement("div");
    enemyShadow.className = "combat-shadow enemy";
    const enemyInfo = document.createElement("div");
    enemyInfo.className = "combat-actor-info";

    const enemyLabel = document.createElement("div");
    enemyLabel.className = "combat-actor-name";
    enemyLabel.textContent = "ENNEMI";
    this.enemyHpText = document.createElement("div");
    this.enemyHpText.className = "combat-actor-hp";
    this.enemyHpText.textContent = "30/30 PV";
    const enemyBar = document.createElement("div");
    enemyBar.className = "combat-hp-bar";
    this.enemyHpFill = document.createElement("div");
    this.enemyHpFill.className = "combat-hp-fill combat-hp-fill-enemy";
    enemyBar.appendChild(this.enemyHpFill);
    enemyInfo.append(enemyLabel, this.enemyHpText, enemyBar);
    enemyPanel.append(enemySprite, enemyShadow, enemyInfo);

    const playerPanel = document.createElement("div");
    playerPanel.className = "combat-actor player";

    const playerSprite = document.createElement("div");
    playerSprite.className = "combat-pixel player";
    const playerShadow = document.createElement("div");
    playerShadow.className = "combat-shadow player";
    const playerInfo = document.createElement("div");
    playerInfo.className = "combat-actor-info";

    const playerLabel = document.createElement("div");
    playerLabel.className = "combat-actor-name";
    playerLabel.textContent = this.player?.getPlayerName() ?? "JOUEUR";
    this.playerHpText = document.createElement("div");
    this.playerHpText.className = "combat-actor-hp";
    this.playerHpText.textContent = "100/100 PV";
    const playerBar = document.createElement("div");
    playerBar.className = "combat-hp-bar";
    this.playerHpFill = document.createElement("div");
    this.playerHpFill.className = "combat-hp-fill";
    playerBar.appendChild(this.playerHpFill);
    playerInfo.append(playerLabel, this.playerHpText, playerBar);
    playerPanel.append(playerSprite, playerShadow, playerInfo);

    this.combatBattlefield.append(enemyPanel, playerPanel);

    this.timingWrap = document.createElement("div");
    this.timingWrap.className = "timing-wrap";
    this.timingWrap.hidden = true;

    this.timingTrack = document.createElement("div");
    this.timingTrack.className = "timing-track";

    this.timingZone = document.createElement("div");
    this.timingZone.className = "timing-zone";

    this.timingCursor = document.createElement("div");
    this.timingCursor.className = "timing-cursor";

    this.timingTrack.append(this.timingZone, this.timingCursor);
    this.timingWrap.appendChild(this.timingTrack);

    this.combatMessage = document.createElement("p");
    this.combatMessage.className = "combat-message";

    this.combatLog = document.createElement("div");
    this.combatLog.className = "combat-log";

    this.combatHint = document.createElement("div");
    this.combatHint.className = "combat-hint";
    this.combatHint.textContent = "Maintiens Espace pour valider au bon moment.";

    this.combatTurnBanner = document.createElement("div");
    this.combatTurnBanner.className = "combat-turn-banner";
    this.combatTurnBanner.textContent = "Ton tour";

    const actions = document.createElement("div");
    actions.className = "combat-actions";

    this.attackBtn = document.createElement("button");
    this.attackBtn.className = "combat-action";
    this.attackBtn.textContent = "Attaquer";

    this.itemBtn = document.createElement("button");
    this.itemBtn.className = "combat-action";
    this.itemBtn.textContent = "Objet";

    this.runBtn = document.createElement("button");
    this.runBtn.className = "combat-action";
    this.runBtn.textContent = "Fuir";

    this.attackBtn.addEventListener("click", () => this.playerAttack());
    this.itemBtn.addEventListener("click", () => this.usePotion());
    this.runBtn.addEventListener("click", () => this.tryRun());

    actions.append(this.attackBtn, this.itemBtn, this.runBtn);
    this.combatLog.append(this.combatMessage);
    this.combatPanel.append(this.combatHeader, this.combatBattlefield, this.combatStats, this.timingWrap, this.combatHint, this.combatTurnBanner, this.combatLog, actions);
    this.combatOverlay.append(this.combatBackdrop, this.combatPanel);
    this.container.appendChild(this.combatOverlay);
  }

  private startCombat(enemy: Enemy): void {
    if (this.inCombat || this.actionLocked) return;

    this.inCombat = true;
    this.currentEnemy = enemy;
    if (this.combatManager) {
      this.combatManager.destroy();
      this.combatManager = null;
    }

    this.gameLoop.stop();
    this.combatManager = new CombatManager(this.container, this.player!, enemy);
    void this.combatManager.start().then((result) => {
      if (!this.player || !this.currentEnemy) return;

      if (result.outcome === "victory") {
        this.removeEnemy(this.currentEnemy);
        this.player.gainExperience(result.xpGained);
      }

      if (result.outcome === "defeat") {
        this.player.revive(1);
      }

      this.currentEnemy = null;
      this.combatManager?.destroy();
      this.combatManager = null;
      this.inCombat = false;

      this.gameLoop.start();
    });
  }

  private bindCombatControls(): void {
    if (this.combatKeyDownHandler || this.combatKeyUpHandler) return;

    this.combatKeyDownHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (this.inCombat && !this.spaceHeld) {
        e.preventDefault();
        this.spaceHeld = true;
        if (this.timingActive) {
          this.setCombatState("Validation...");
          this.resolveTimingAttack();
        }
      }
    };

    this.combatKeyUpHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      this.spaceHeld = false;
      if (this.timingActive) {
        this.setCombatState("Charge annulée");
        this.resetTimingCursor();
      }
    };

    window.addEventListener("keydown", this.combatKeyDownHandler, { passive: false });
    window.addEventListener("keyup", this.combatKeyUpHandler, { passive: false });
  }

  private unbindCombatControls(): void {
    if (this.combatKeyDownHandler) {
      window.removeEventListener("keydown", this.combatKeyDownHandler);
      this.combatKeyDownHandler = null;
    }
    if (this.combatKeyUpHandler) {
      window.removeEventListener("keyup", this.combatKeyUpHandler);
      this.combatKeyUpHandler = null;
    }
  }

  private async playCombatIntro(enemy: Enemy): Promise<void> {
    if (this.combatSequenceRunning) return;
    this.combatSequenceRunning = true;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage(`Un ${enemy.name} apparaît !`, 700);
    await this.pushCombatMessage("Prépare ton attaque...", 450);
    if (this.combatTurnBanner) {
      this.combatTurnBanner.textContent = "Ton tour";
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
    this.combatSequenceRunning = false;
  }

  private async playerAttack(): Promise<void> {
    if (!this.player || !this.currentEnemy || this.actionLocked) return;
    if (!this.timingActive) {
      this.startTimingAttack();
      return;
    }

    this.resolveTimingAttack();
  }

  private startTimingAttack(): void {
    if (!this.player || !this.currentEnemy || this.actionLocked) return;

    this.waitingTimingResult = true;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);
    if (this.attackBtn) {
      this.attackBtn.disabled = false;
      this.attackBtn.textContent = "Valider";
    }

    this.timingDuration = 1000;
    this.timingZoneWidth = 0.14 + Math.random() * 0.1;
    this.timingZoneStart = 0.18 + Math.random() * (0.74 - this.timingZoneWidth);
    this.timingCursorPosition = 0;
    this.timingStart = performance.now();
    this.timingActive = true;
    this.waitingTimingResult = true;

    if (this.timingWrap) {
      this.timingWrap.hidden = false;
    }
    if (this.combatHint) {
      this.combatHint.hidden = false;
    }
    if (this.combatTurnBanner) {
      this.combatTurnBanner.textContent = "Maintiens Espace pour charger";
    }

    this.refreshTimingUI();
    this.setCombatMessage("Appuie au bon moment dans la zone verte.");
    this.startTimingLoop();
  }

  private startTimingLoop(): void {
    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
    }

    const tick = (now: number) => {
      if (!this.timingActive) return;

      const elapsed = now - this.timingStart;
      const target = Math.min(elapsed / this.timingDuration, 1);
      this.timingCursorPosition = target;
      this.refreshTimingUI();

      if (target >= 1) {
        this.resolveTimingAttack();
        return;
      }

      this.timingAnimation = requestAnimationFrame(tick);
    };

    this.timingAnimation = requestAnimationFrame(tick);
  }

  private resetTimingCursor(): void {
    this.timingStart = performance.now();
    this.timingCursorPosition = 0;
    this.refreshTimingUI();
    this.setCombatMessage("Relâche et recommence.");
  }

  private resolveTimingAttack(): void {
    if (!this.player || !this.currentEnemy || !this.timingActive || !this.waitingTimingResult) return;

    this.timingActive = false;
    this.waitingTimingResult = false;
    this.spaceHeld = false;

    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
      this.timingAnimation = null;
    }

    const inGreen =
      this.timingCursorPosition >= this.timingZoneStart &&
      this.timingCursorPosition <= this.timingZoneStart + this.timingZoneWidth;

    const baseDamage = this.player.getAttackPower();
    const damageMultiplier = inGreen ? 1.6 : 0;
    const parried = Math.random() < this.enemyParryChance;
    const finalDamage = damageMultiplier === 0
      ? 0
      : parried
        ? Math.max(1, Math.floor(baseDamage * 0.35))
        : Math.max(1, Math.floor(baseDamage * damageMultiplier));

    this.hideTimingUI();
    if (this.attackBtn) {
      this.attackBtn.textContent = "Attaquer";
    }

    if (this.combatTurnBanner) {
      this.combatTurnBanner.textContent = parried || inGreen ? "Impact" : "Raté";
    }

    this.setCombatState(parried || inGreen ? "Impact" : "Raté");

    this.setCombatMessage(
      finalDamage === 0
        ? "Raté !"
        : parried
          ? `${this.currentEnemy.name} pare partiellement l'attaque !`
          : inGreen
            ? "Parfait !"
            : "Raté de peu...",
    );

    this.finishPlayerAttack(finalDamage, parried);
  }

  private async finishPlayerAttack(finalDamage: number, parried: boolean): Promise<void> {
    if (!this.player || !this.currentEnemy) return;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage(parried ? "La garde ennemie tremble..." : "Impact !", 220);

    if (finalDamage <= 0) {
      await this.pushCombatMessage("Aucun dégât.", 650);
      this.refreshCombatUI();
      this.resolveEnemyAfterPlayerMiss();
      return;
    }

    const damage = this.currentEnemy.takeDamage(finalDamage);
    await this.pushCombatMessage(
      parried
        ? `${this.currentEnemy.name} pare et subit ${damage} dégâts.`
        : `Vous infligez ${damage} dégâts.`,
      650,
    );
    this.refreshCombatUI();

    if (!this.currentEnemy.isAlive()) {
      this.setCombatMessage(`${this.currentEnemy.name} est vaincu !`);
      this.player.gainExperience(this.currentEnemy.xpReward);
      this.removeEnemy(this.currentEnemy);
      await this.delay(500);
      this.endCombat();
      return;
    }

    const enemy = this.currentEnemy;
    const enemyResult = this.resolveEnemyTurn(enemy);

    await this.pushCombatMessage(enemyResult.message, 650);
    if (enemyResult.damage > 0) {
      this.player.takeDamage(enemyResult.damage);
    }
    this.refreshCombatUI();

    await this.delay(350);

    if (!this.player.isAlive()) {
      this.setCombatMessage("Vous avez perdu le combat...");
      await this.delay(700);
      this.endCombat(true);
      return;
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
  }

  private async resolveEnemyAfterPlayerMiss(): Promise<void> {
    if (!this.player || !this.currentEnemy) return;

    const enemy = this.currentEnemy;
    const enemyResult = this.resolveEnemyTurn(enemy);
    await this.pushCombatMessage(enemyResult.message, 650);

    if (enemyResult.damage > 0) {
      this.player.takeDamage(enemyResult.damage);
    }

    this.refreshCombatUI();

    if (!this.player.isAlive()) {
      this.setCombatMessage("Vous avez perdu le combat...");
      await this.delay(700);
      this.endCombat(true);
      return;
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
  }

  private resolveEnemyTurn(enemy: Enemy): { damage: number; message: string } {
    const roll = Math.random();
    const baseDamage = enemy.attack;

    if (enemy.behavior === "defensive") {
      if (roll < 0.35) {
        return { damage: 0, message: `${enemy.name} se protège.` };
      }

      return {
        damage: Math.max(1, Math.floor(baseDamage * 0.8)),
        message: `${enemy.name} attaque prudemment.`,
      };
    }

    if (enemy.behavior === "random") {
      if (roll < 0.2) {
        return { damage: 0, message: `${enemy.name} hésite.` };
      }

      if (roll < 0.5) {
        return { damage: Math.max(1, Math.floor(baseDamage * 0.7)), message: `${enemy.name} attaque faiblement.` };
      }

      return { damage: Math.max(1, Math.floor(baseDamage * 1.15)), message: `${enemy.name} frappe violemment !` };
    }

    return { damage: baseDamage, message: `${enemy.name} contre-attaque !` };
  }

  private async usePotion(): Promise<void> {
    if (!this.player || this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    if (this.potionCount <= 0) {
      await this.pushCombatMessage("Plus de potions.", 500);
      this.actionLocked = false;
      this.setCombatButtonsDisabled(false);
      return;
    }

    this.potionCount -= 1;
    const healed = this.player.heal(30);
    await this.pushCombatMessage(`Potion utilisée : +${healed} PV.`, 650);
    this.refreshCombatUI();

    await this.enemyTurnAfterPlayerAction();
  }

  private async tryRun(): Promise<void> {
    if (this.actionLocked) return;
    this.actionLocked = true;
    this.setCombatButtonsDisabled(true);

    await this.pushCombatMessage("Vous prenez la fuite !", 350);
    this.endCombat(false, true);
  }

  private async enemyTurnAfterPlayerAction(): Promise<void> {
    if (!this.player || !this.currentEnemy) return;

    const enemy = this.currentEnemy;
    const enemyResult = this.resolveEnemyTurn(enemy);

    await this.pushCombatMessage(enemyResult.message, 650);
    if (enemyResult.damage > 0) {
      this.player.takeDamage(enemyResult.damage);
    }
    this.refreshCombatUI();

    await this.delay(350);

    if (!this.player.isAlive()) {
      this.setCombatMessage("Vous avez perdu le combat...");
      await this.delay(700);
      this.endCombat(true);
      return;
    }

    this.actionLocked = false;
    this.setCombatButtonsDisabled(false);
  }

  private endCombat(gameOver = false, escaped = false): void {
    this.inCombat = false;
    this.actionLocked = false;
    this.currentEnemy = null;
    this.pendingStart = false;

    if (escaped) {
      const playerPos = this.player?.getComponent<Position>("position");
      if (playerPos) {
        playerPos.x = this.lastSafePosition.x;
        playerPos.y = this.lastSafePosition.y;
      }
    }

    if (this.combatOverlay) {
      this.combatOverlay.hidden = true;
      this.combatOverlay.remove();
    }

    if (this.combatBattlefield) {
      this.combatBattlefield.innerHTML = "";
    }

    this.combatOverlay = null;
    this.combatBackdrop = null;
    this.combatPanel = null;
    this.combatHeader = null;
    this.combatBattlefield = null;
    this.combatLog = null;
    this.combatHint = null;
    this.combatTurnBanner = null;
    this.combatStatusLine = null;
    this.combatMessage = null;
    this.combatStats = null;
    this.playerHpFill = null;
    this.enemyHpFill = null;
    this.playerHpText = null;
    this.enemyHpText = null;
    this.enemyNameLabel = null;
    this.timingWrap = null;
    this.timingTrack = null;
    this.timingZone = null;
    this.timingCursor = null;
    this.attackBtn = null;
    this.itemBtn = null;
    this.runBtn = null;
    this.timingActive = false;
    this.waitingTimingResult = false;
    this.combatSequenceRunning = false;
    this.spaceHeld = false;

    this.unbindCombatControls();

    this.hideTimingUI();

    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
    }
    this.timingAnimation = null;

    if (gameOver) {
      this.gameLoop.stop();
    }
  }

  private setCombatState(state: string): void {
    if (this.combatTurnBanner) {
      this.combatTurnBanner.textContent = state;
    }
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.entities = this.entities.filter((candidate) => candidate !== enemy);
  }

  private refreshCombatUI(): void {
    if (!this.player || !this.combatStats) return;

    const enemy = this.currentEnemy;
    const playerHpRatio = this.player.stats.hp / this.player.getMaxHp();
    if (this.playerHpFill) {
      this.playerHpFill.style.width = `${Math.max(0, playerHpRatio) * 100}%`;
    }
    if (this.playerHpText) {
      this.playerHpText.textContent = `${this.player.stats.hp}/${this.player.getMaxHp()} PV`;
    }

    if (enemy) {
      const enemyHpRatio = enemy.currentHp / enemy.template.maxHp;
      if (this.enemyHpFill) {
        this.enemyHpFill.style.width = `${Math.max(0, enemyHpRatio) * 100}%`;
      }
      if (this.enemyHpText) {
        this.enemyHpText.textContent = `${enemy.currentHp}/${enemy.template.maxHp} PV`;
      }
      this.setEnemyLabel(enemy.name);
    }

    this.combatStats.innerHTML = `ATQ ${this.player.getAttackPower()} • DEF ${this.player.getDefensePower()} • Niveau ${this.player.stats.level} • Potions ${this.potionCount}`;
  }

  private setCombatMessage(message: string): void {
    if (this.combatMessage) {
      this.combatMessage.textContent = message;
    }
  }

  private async pushCombatMessage(message: string, delayMs: number = 700): Promise<void> {
    this.setCombatMessage(message);
    await this.delay(delayMs);
  }

  private setEnemyLabel(name: string): void {
    if (this.enemyNameLabel) {
      this.enemyNameLabel.textContent = name;
    }
  }

  private setCombatButtonsDisabled(disabled: boolean): void {
    if (this.attackBtn) this.attackBtn.disabled = disabled;
    if (this.itemBtn) this.itemBtn.disabled = disabled;
    if (this.runBtn) this.runBtn.disabled = disabled;
  }

  private refreshTimingUI(): void {
    if (!this.timingTrack || !this.timingZone || !this.timingCursor) return;

    this.timingZone.style.left = `${this.timingZoneStart * 100}%`;
    this.timingZone.style.width = `${this.timingZoneWidth * 100}%`;
    this.timingCursor.style.left = `${this.timingCursorPosition * 100}%`;
    this.timingTrack.style.setProperty("--cursor-x", `${this.timingCursorPosition * 100}%`);
  }

  private hideTimingUI(): void {
    if (this.timingWrap) this.timingWrap.hidden = true;
    if (this.combatHint) this.combatHint.hidden = true;
  }

  private isColliding(a: Entity, b: Entity): boolean {
    const aPos = a.getComponent<Position>("position");
    const bPos = b.getComponent<Position>("position");
    if (!aPos || !bPos) return false;

    // Player uses PLAYER_SIZE, enemies use TILE_SIZE
    const aSize = a === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;
    const bSize = b === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;

    return !(
      aPos.x + aSize <= bPos.x ||
      aPos.x >= bPos.x + bSize ||
      aPos.y + aSize <= bPos.y ||
      aPos.y >= bPos.y + bSize
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  destroy(): void {
    this.gameLoop.stop();
    if (this.timingAnimation !== null) {
      cancelAnimationFrame(this.timingAnimation);
      this.timingAnimation = null;
    }
    this.combatOverlay?.remove();
    this.container.innerHTML = "";
  }
}
