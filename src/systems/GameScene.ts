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
import type { EnemyTemplate } from "@/data/enemies";
import { CombatManager } from "@/systems/combat/CombatManager";
import { MapGenerator, TileType } from "@/utils/MapGen";
import type { GeneratedMap, Room } from "@/utils/MapGen";
import { saveGame } from "@/utils/save";

export interface GameSceneConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  aspectRatio?: number;
}

export class GameScene {
  private renderer: CanvasRenderer;
  private camera: Camera;
  private gameLoop: GameLoop;
  private input: InputManager;

  private entities: Entity[] = [];
  private enemies: Enemy[] = [];
  private player: Player | null = null;
  private inCombat = false;
  private lastSafePosition = { x: 0, y: 0 };
  private combatManager: CombatManager | null = null;
  private lastMovementInput = { dx: 0, dy: 0 };
  private movementAccumulator = 0;
  private escapeCollisionLockUntil = 0;
  private dungeonLevel = 1;
  private hudRoot: HTMLDivElement | null = null;
  private hudMeta: HTMLDivElement | null = null;
  private menuPanel: HTMLDivElement | null = null;
  private menuContent: HTMLDivElement | null = null;
  private menuToggle: HTMLButtonElement | null = null;
  private menuOpen = false;

  private map: GeneratedMap | null = null;

  private readonly PLAYER_SPEED = 220;
  private readonly TILE_SIZE = 48;
  private readonly PLAYER_SIZE = 40;
  private readonly MAP_TILES_W = 40;
  private readonly MAP_TILES_H = 40;

  constructor(
    private container: HTMLElement,
    private config: GameSceneConfig,
  ) {
    const fixedWidth = config.viewportWidth ?? 1280;
    const fixedHeight = config.viewportHeight ?? 720;

    this.renderer = new CanvasRenderer(container, {
      width: fixedWidth,
      height: fixedHeight,
      backgroundColor: "#0000",
      tileSize: this.TILE_SIZE,
      aspectRatio: config.aspectRatio ?? 16 / 9,
      fixedResolution: true,
    });

    this.camera = new Camera({
      viewportWidth: fixedWidth,
      viewportHeight: fixedHeight,
      mapWidth: this.MAP_TILES_W * this.TILE_SIZE,
      mapHeight: this.MAP_TILES_H * this.TILE_SIZE,
      smoothness: 0.15,
      scrollMargin: 150,
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

    this.createHud();
    this.startLevel();
    this.gameLoop.start();
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  setDungeonLevel(level: number): void {
    this.dungeonLevel = Math.max(1, Math.floor(level));
  }

  getDungeonLevel(): number {
    return this.dungeonLevel;
  }

  destroy(): void {
    this.gameLoop.stop();
    this.combatManager?.destroy();
    this.combatManager = null;
    this.hudRoot?.remove();
    this.hudRoot = null;
    this.hudMeta = null;
    this.menuPanel = null;
    this.menuContent = null;
    this.menuToggle = null;
    this.menuOpen = false;
    this.container.innerHTML = "";
  }

  private startLevel(): void {
    if (!this.player) return;

    const mapGen = new MapGenerator({
      width: this.MAP_TILES_W,
      height: this.MAP_TILES_H,
      maxDepth: Math.min(6, 4 + Math.floor((this.dungeonLevel - 1) / 2)),
    });

    this.map = mapGen.generate();
    this.entities = [];
    this.enemies = [];
    this.movementAccumulator = 0;

    const spawn = this.map.entry;
    const playerPosition = this.player.getComponent<Position>("position");
    if (playerPosition) {
      playerPosition.x = spawn.x * this.TILE_SIZE;
      playerPosition.y = spawn.y * this.TILE_SIZE;
    } else {
      this.player.addComponent(
        new Position(spawn.x * this.TILE_SIZE, spawn.y * this.TILE_SIZE),
      );
    }

    const playerVelocity = this.player.getComponent<Velocity>("velocity");
    if (playerVelocity) {
      playerVelocity.x = 0;
      playerVelocity.y = 0;
    } else {
      this.player.addComponent(new Velocity(0, 0));
    }

    const playerHealth = this.player.getComponent<Health>("health");
    if (playerHealth) {
      playerHealth.setMaxHealth(this.player.getMaxHp());
      playerHealth.setHealth(this.player.getCurrentHp());
    } else {
      this.player.addComponent(
        new Health(this.player.stats.hp, this.player.getMaxHp()),
      );
    }

    this.lastSafePosition = {
      x: spawn.x * this.TILE_SIZE,
      y: spawn.y * this.TILE_SIZE,
    };
    this.entities.push(this.player);
    this.spawnEnemies();
    this.camera.follow(this.player);
    this.camera.update();
    this.updateHudMeta();
  }

  private advanceToNextLevel(): void {
    this.dungeonLevel += 1;
    this.startLevel();
    this.escapeCollisionLockUntil = performance.now() + 700;
  }

  private createHud(): void {
    if (this.hudRoot) return;

    this.hudRoot = document.createElement("div");
    this.hudRoot.className = "ingame-ui";

    this.hudMeta = document.createElement("div");
    this.hudMeta.className = "ingame-meta";

    this.menuToggle = document.createElement("button");
    this.menuToggle.className = "ingame-menu-toggle";
    this.menuToggle.textContent = "Campement";

    this.menuPanel = document.createElement("div");
    this.menuPanel.className = "ingame-menu-panel";
    this.menuPanel.hidden = true;

    const menuHeader = document.createElement("div");
    menuHeader.className = "ingame-menu-header";
    menuHeader.textContent = "Menu aventure";

    const menuActions = document.createElement("div");
    menuActions.className = "ingame-menu-actions";

    const inventoryBtn = document.createElement("button");
    inventoryBtn.className = "ingame-menu-btn";
    inventoryBtn.textContent = "Inventaire";

    const statsBtn = document.createElement("button");
    statsBtn.className = "ingame-menu-btn";
    statsBtn.textContent = "Statistiques";

    const saveBtn = document.createElement("button");
    saveBtn.className = "ingame-menu-btn";
    saveBtn.textContent = "Sauvegarder";

    const closeBtn = document.createElement("button");
    closeBtn.className = "ingame-menu-btn ingame-menu-close";
    closeBtn.textContent = "Fermer";
    closeBtn.type = "button";

    this.menuContent = document.createElement("div");
    this.menuContent.className = "ingame-menu-content";

    menuActions.append(inventoryBtn, statsBtn, saveBtn, closeBtn);
    this.menuPanel.append(menuHeader, menuActions, this.menuContent);
    this.hudRoot.append(this.hudMeta, this.menuToggle, this.menuPanel);
    this.container.appendChild(this.hudRoot);

    this.menuPanel.hidden = true;
    this.menuPanel.style.display = "none";
    this.menuOpen = false;

    this.menuToggle.addEventListener("click", () => this.toggleMenu());

    inventoryBtn.addEventListener("click", () => this.renderInventoryPanel());
    statsBtn.addEventListener("click", () => this.renderStatsPanel());
    saveBtn.addEventListener("click", () => this.handleSave());
    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleMenu(false);
    });

    this.updateHudMeta();
  }

  private toggleMenu(force?: boolean): void {
    if (!this.menuPanel) return;

    this.menuOpen = force ?? !this.menuOpen;
    this.menuPanel.hidden = !this.menuOpen;
    this.menuPanel.style.display = this.menuOpen ? "block" : "none";

    if (this.menuToggle) {
      this.menuToggle.hidden = this.menuOpen;
      this.menuToggle.textContent = this.menuOpen ? "Fermer" : "Campement";
    }

    if (this.menuOpen) {
      this.renderStatsPanel();
    } else if (this.menuContent) {
      this.menuContent.innerHTML = "";
    }
  }

  private updateHudMeta(): void {
    if (!this.hudMeta || !this.player) return;
    const { xp, xpToNext, level } = this.player.stats;
    const ratio = Math.max(
      0,
      Math.min(100, Math.round((xp / Math.max(1, xpToNext)) * 100)),
    );
    this.hudMeta.textContent = `Etage ${this.dungeonLevel} | ${this.player.getPlayerName()} | Niv ${level} | XP ${xp}/${xpToNext} (${ratio}%)`;
  }

  private renderInventoryPanel(): void {
    if (!this.menuContent || !this.player) return;

    const items = this.player.getInventory();
    const list = items
      .map((item) => `<li>${item.name} x${item.quantity}</li>`)
      .join("");

    this.menuContent.innerHTML = `
      <h3>Inventaire</h3>
      <ul>${list || "<li>Vide</li>"}</ul>
    `;
  }

  private renderStatsPanel(): void {
    if (!this.menuContent || !this.player) return;

    const { hp, maxHp, level, xp, xpToNext, attack, defense, speed } =
      this.player.stats;
    this.menuContent.innerHTML = `
      <h3>Statistiques</h3>
      <p>Nom: ${this.player.getPlayerName()}</p>
      <p>Etage actuel: ${this.dungeonLevel}</p>
      <p>Niveau: ${level}</p>
      <p>Experience: ${xp} / ${xpToNext}</p>
      <p>PV: ${hp} / ${maxHp}</p>
      <p>Attaque: ${attack}</p>
      <p>Defense: ${defense}</p>
      <p>Vitesse: ${speed}</p>
    `;
  }

  private renderSavePanel(): void {
    if (!this.menuContent) return;
    this.menuContent.innerHTML = `
      <h3>Sauvegarde</h3>
      <p>Sauvegarde effectuee dans le navigateur.</p>
      <p>Tu peux quitter puis faire Continue depuis le menu principal.</p>
    `;
  }

  private handleSave(): void {
    if (!this.player) return;
    try {
      saveGame(this.player, this.dungeonLevel);
      this.renderSavePanel();
    } catch {
      if (!this.menuContent) return;
      this.menuContent.innerHTML = `
        <h3>Sauvegarde</h3>
        <p>Erreur: impossible de sauvegarder ici.</p>
      `;
    }
  }

  private spawnEnemies(): void {
    if (!this.map) return;

    const occupiedTiles = new Set<string>();
    occupiedTiles.add(`${this.map.entry.x},${this.map.entry.y}`);
    occupiedTiles.add(`${this.map.exit.x},${this.map.exit.y}`);

    const spawnPool = ENEMY_TEMPLATES.filter((template) =>
      ["slime", "bat", "skeleton"].includes(template.worldSprite),
    );

    this.map.rooms.forEach((room, roomIndex) => {
      if (this.roomContains(room, this.map!.entry)) return;

      const baseCount = 1 + (Math.random() < 0.5 ? 1 : 0);
      const bonusCount = this.dungeonLevel >= 3 && Math.random() < 0.35 ? 1 : 0;
      const enemiesInRoom = Math.min(3, baseCount + bonusCount);
      let spawned = 0;

      for (
        let attempt = 0;
        attempt < 24 && spawned < enemiesInRoom;
        attempt += 1
      ) {
        const tx = this.randomInt(room.x + 1, room.x + room.w - 2);
        const ty = this.randomInt(room.y + 1, room.y + room.h - 2);
        const key = `${tx},${ty}`;
        if (occupiedTiles.has(key)) continue;

        const tile = this.map!.grid[ty]?.[tx];
        if (tile === undefined || tile === TileType.Wall) continue;
        if (Math.hypot(tx - this.map!.entry.x, ty - this.map!.entry.y) < 3)
          continue;
        if (Math.hypot(tx - this.map!.exit.x, ty - this.map!.exit.y) < 2)
          continue;

        const tooCloseToAnother = Array.from(occupiedTiles).some((coord) => {
          const [oxStr, oyStr] = coord.split(",");
          const ox = Number(oxStr);
          const oy = Number(oyStr);
          return Math.hypot(tx - ox, ty - oy) < 2;
        });
        if (tooCloseToAnother) continue;

        const template =
          spawnPool[(roomIndex + spawned + attempt) % spawnPool.length]!;
        const scaledTemplate = this.scaleEnemyTemplate(template);
        const enemy = new Enemy(
          scaledTemplate,
          tx * this.TILE_SIZE,
          ty * this.TILE_SIZE,
        );
        this.enemies.push(enemy);
        this.entities.push(enemy);
        occupiedTiles.add(key);
        spawned += 1;
      }
    });
  }

  private scaleEnemyTemplate(template: EnemyTemplate): EnemyTemplate {
    const depthBonus = Math.max(0, this.dungeonLevel - 1);
    if (depthBonus === 0) return template;

    const hpScale = 1 + depthBonus * 0.12;
    const atkScale = 1 + depthBonus * 0.08;
    const defScale = 1 + depthBonus * 0.06;
    const xpScale = 1 + depthBonus * 0.1;

    return {
      ...template,
      maxHp: Math.max(1, Math.round(template.maxHp * hpScale)),
      attack: Math.max(1, Math.round(template.attack * atkScale)),
      defense: Math.max(0, Math.round(template.defense * defScale)),
      xpReward: Math.max(1, Math.round(template.xpReward * xpScale)),
    };
  }

  private roomContains(room: Room, point: { x: number; y: number }): boolean {
    return (
      point.x >= room.x &&
      point.x < room.x + room.w &&
      point.y >= room.y &&
      point.y < room.y + room.h
    );
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private update(deltaTime: number): void {
    if (!this.player || this.inCombat || this.menuOpen) return;

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

    this.updatePlayerMovement(movementStep);
    this.updateEnemyMovement(movementStep);

    const canTriggerCombat = performance.now() >= this.escapeCollisionLockUntil;
    const collidedEnemy = canTriggerCombat
      ? this.enemies.find((enemy) => this.isColliding(this.player!, enemy))
      : null;

    if (collidedEnemy) {
      const playerPosition = this.player.getComponent<Position>("position");
      if (playerPosition) {
        playerPosition.x = this.lastSafePosition.x;
        playerPosition.y = this.lastSafePosition.y;
      }
      this.startCombat(collidedEnemy);
    }

    this.camera.follow(this.player);
    this.camera.update();
  }

  private render(deltaTime: number): void {
    this.renderer.clear();
    const { offsetX, offsetY } = this.camera.getOffset();

    if (this.map) {
      this.renderer.renderMap(this.map, offsetX, offsetY, this.TILE_SIZE);
    }

    this.enemies.forEach((enemy) => {
      this.renderer.drawEntity(
        enemy,
        offsetX,
        offsetY,
        enemy.color,
        this.TILE_SIZE,
      );
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

    this.renderer.drawFPS(1 / Math.max(deltaTime, 0.001));
  }

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

  private canMoveTo(
    x: number,
    y: number,
    size: number = this.TILE_SIZE,
  ): boolean {
    const corners = [
      { x, y },
      { x: x + size - 1, y },
      { x, y: y + size - 1 },
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

    if (
      pos.x !== this.lastSafePosition.x ||
      pos.y !== this.lastSafePosition.y
    ) {
      this.lastSafePosition = { x: pos.x, y: pos.y };
    }

    const newX = pos.x + vel.x * deltaTime;
    const newY = pos.y + vel.y * deltaTime;
    const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.PLAYER_SIZE;
    const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.PLAYER_SIZE;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    if (this.canMoveTo(clampedX, pos.y, this.PLAYER_SIZE)) {
      pos.x = clampedX;
    }

    if (this.canMoveTo(pos.x, clampedY, this.PLAYER_SIZE)) {
      pos.y = clampedY;
    }

    if (this.checkExitReached(pos.x, pos.y)) {
      this.advanceToNextLevel();
    }
  }

  private updateEnemyMovement(deltaTime: number): void {
    if (!this.player) return;

    const playerPos = this.player.getComponent<Position>("position");
    if (!playerPos) return;

    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive()) return;

      const pos = enemy.getComponent<Position>("position");
      if (!pos) return;

      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 320) return;

      const patrol = enemy.tickPatrol(deltaTime);
      const speed = enemy.speed * deltaTime;
      const step = Math.max(0.2, speed);

      const chaseX = Math.abs(dx) > 18 ? Math.sign(dx) * step : 0;
      const chaseY = Math.abs(dy) > 18 ? Math.sign(dy) * step : 0;

      const newX = pos.x + chaseX + patrol.dx * deltaTime * 0.05;
      const newY = pos.y + chaseY + patrol.dy * deltaTime * 0.05;

      const maxX = this.MAP_TILES_W * this.TILE_SIZE - this.TILE_SIZE;
      const maxY = this.MAP_TILES_H * this.TILE_SIZE - this.TILE_SIZE;
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      if (this.canMoveTo(clampedX, pos.y)) {
        pos.x = clampedX;
      }
      if (this.canMoveTo(pos.x, clampedY)) {
        pos.y = clampedY;
      }
    });
  }

  private startCombat(enemy: Enemy): void {
    if (this.inCombat || !this.player) return;

    this.inCombat = true;
    this.gameLoop.stop();

    const engagedEnemy = enemy;
    this.combatManager?.destroy();
    this.combatManager = new CombatManager(this.container, this.player, enemy);

    void this.combatManager.start().then((result) => {
      if (!this.player) return;

      if (result.outcome === "victory") {
        this.removeEnemy(engagedEnemy);
        const xpGain = Math.max(result.xpGained, engagedEnemy.xpReward);
        this.player.gainExperience(xpGain);
      } else if (result.outcome === "defeat") {
        this.player.revive(1);
      } else if (result.outcome === "escaped") {
        this.handleEscapeFrom(engagedEnemy);
      }

      this.combatManager?.destroy();
      this.combatManager = null;
      this.inCombat = false;
      this.updateHudMeta();
      this.gameLoop.start();
    });
  }

  private handleEscapeFrom(enemy: Enemy): void {
    const playerPos = this.player?.getComponent<Position>("position");
    const enemyPos = enemy.getComponent<Position>("position");
    if (!playerPos || !enemyPos) return;

    playerPos.x = this.lastSafePosition.x;
    playerPos.y = this.lastSafePosition.y;

    const dx = enemyPos.x - playerPos.x;
    const dy = enemyPos.y - playerPos.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const push = 128;

    enemyPos.x = Math.max(
      0,
      Math.min(
        enemyPos.x + (dx / len) * push,
        this.config.mapWidth - this.TILE_SIZE,
      ),
    );
    enemyPos.y = Math.max(
      0,
      Math.min(
        enemyPos.y + (dy / len) * push,
        this.config.mapHeight - this.TILE_SIZE,
      ),
    );
    this.escapeCollisionLockUntil = performance.now() + 1200;
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.entities = this.entities.filter((candidate) => candidate !== enemy);
  }

  private isColliding(a: Entity, b: Entity): boolean {
    const aPos = a.getComponent<Position>("position");
    const bPos = b.getComponent<Position>("position");
    if (!aPos || !bPos) return false;

    const aSize = a === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;
    const bSize = b === this.player ? this.PLAYER_SIZE : this.TILE_SIZE;

    return !(
      aPos.x + aSize <= bPos.x ||
      aPos.x >= bPos.x + bSize ||
      aPos.y + aSize <= bPos.y ||
      aPos.y >= bPos.y + bSize
    );
  }
}
