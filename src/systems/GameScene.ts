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
import { gameDataService, gameState } from "@/data";
import { navigateTo } from "@/router";
import { SeededRNG } from "@/utils/rng";
import { deriveNextSeed } from "@/utils/seed";

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
  private fleeAttemptsThisFloor = 0;
  private readonly maxFleeAttemptsPerFloor = 3;
  private readonly fleeFailureChance = 0.15;
  private hudRoot: HTMLDivElement | null = null;
  private menuPanel: HTMLDivElement | null = null;
  private menuContent: HTMLDivElement | null = null;
  private menuToggle: HTMLButtonElement | null = null;
  private menuOpen = false;
  private externalUI: HTMLElement | null = null;
  private externalUIToggle: HTMLElement | null = null;
  private hudMeta: HTMLElement | null = null;

  private map: GeneratedMap | null = null;

  private readonly PLAYER_SPEED = 220;
  private readonly TILE_SIZE = 48;
  private readonly PLAYER_SIZE = 40;
  private readonly MAP_TILES_W = 40;
  private readonly MAP_TILES_H = 40;

  // Dirty rendering state tracking
  private readonly CAMERA_THRESHOLD = 48; // pixels - one tile
  private lastCameraOffset = { x: 0, y: 0 };
  private lastEntityPositions = new Map<string, { x: number; y: number }>();
  private lastEntityCount = 0;
  private lastPlayerPosition = { x: 0, y: 0 };
  private frameCounter = 0;

  // Dirty flags
  private cameraDirty = true;
  private staticDirty = true;
  private entitiesDirty = true;

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
    this.menuPanel = null;
    this.menuContent = null;
    this.menuToggle = null;
    this.menuOpen = false;
    this.container.innerHTML = "";

    // Clean up dirty rendering state
    this.lastEntityPositions.clear();
  }

  private startLevel(): void {
    if (!this.player) return;

    // Get or initialize level state (ensures we have a seed)
    const levelState = gameState.getLevelState(this.dungeonLevel);

    const mapGen = new MapGenerator({
      width: this.MAP_TILES_W,
      height: this.MAP_TILES_H,
      maxDepth: Math.min(8, 4 + Math.floor((this.dungeonLevel - 1) / 2)),
    });

    // Generate map with the stored seed for deterministic layout
    this.map = mapGen.generate(levelState.seed);
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
    this.updateExternalUI();

    // Invalidate static layer for new level
    this.invalidateStaticLayer();
  }

  /**
   * Invalidate all rendering caches (call on level change or major state change)
   */
  private invalidateStaticLayer(): void {
    this.staticDirty = true;
    this.cameraDirty = true;
    this.entitiesDirty = true;
    this.renderer.invalidateStaticLayer();
    this.camera.forceDirty();
    // Reset tracking state
    this.lastEntityPositions.clear();
    this.lastEntityCount = 0;
    this.lastCameraOffset = { x: 0, y: 0 };
    this.lastPlayerPosition = { x: 0, y: 0 };
  }

  /**
   * Check if any visible state has changed since last render
   */
  private checkDirtyState(): void {
    const { offsetX, offsetY } = this.camera.getOffset();
    const cameraX = -offsetX;
    const cameraY = -offsetY;

    // Check camera movement
    const cameraMoved =
      Math.abs(cameraX - this.lastCameraOffset.x) >= this.CAMERA_THRESHOLD ||
      Math.abs(cameraY - this.lastCameraOffset.y) >= this.CAMERA_THRESHOLD;

    if (cameraMoved || this.camera.hasChanged(this.CAMERA_THRESHOLD)) {
      this.cameraDirty = true;
      this.staticDirty = true;
    }

    // Check entity changes
    let entitiesChanged = this.enemies.length !== this.lastEntityCount;

    if (!entitiesChanged) {
      // Check if any entity moved
      for (const enemy of this.enemies) {
        const pos = enemy.getComponent<Position>("position");
        if (!pos) continue;

        const lastPos = this.lastEntityPositions.get(enemy.id);
        if (!lastPos || lastPos.x !== pos.x || lastPos.y !== pos.y) {
          entitiesChanged = true;
          break;
        }
      }
    }

    // Check player movement
    if (this.player && !entitiesChanged) {
      const playerPos = this.player.getComponent<Position>("position");
      if (playerPos) {
        if (
          playerPos.x !== this.lastPlayerPosition.x ||
          playerPos.y !== this.lastPlayerPosition.y
        ) {
          entitiesChanged = true;
        }
      }
    }

    if (entitiesChanged) {
      this.entitiesDirty = true;
    }
  }

  /**
   * Update tracking state after render
   */
  private markRenderClean(): void {
    const { offsetX, offsetY } = this.camera.getOffset();
    this.lastCameraOffset = { x: -offsetX, y: -offsetY };
    this.lastEntityCount = this.enemies.length;

    // Update entity position tracking
    this.lastEntityPositions.clear();
    for (const enemy of this.enemies) {
      const pos = enemy.getComponent<Position>("position");
      if (pos) {
        this.lastEntityPositions.set(enemy.id, { x: pos.x, y: pos.y });
      }
    }

    // Update player position tracking
    if (this.player) {
      const playerPos = this.player.getComponent<Position>("position");
      if (playerPos) {
        this.lastPlayerPosition = { x: playerPos.x, y: playerPos.y };
      }
    }

    // Reset dirty flags
    this.cameraDirty = false;
    this.staticDirty = false;
    this.entitiesDirty = false;
    this.camera.markClean();
  }

  /**
   * Determine if render should be skipped this frame
   */
  private shouldSkipRender(): boolean {
    // Always render on first frame or when explicitly dirty
    if (this.frameCounter === 0) return false;

    // Skip if nothing visible has changed
    return !this.cameraDirty && !this.staticDirty && !this.entitiesDirty;
  }

  private advanceToNextLevel(): void {
    const nextLevel = this.dungeonLevel + 1;

    // Ensure next level has a derived seed (if not already visited)
    if (!gameState.levelStates[nextLevel]) {
      const currentState = gameState.getLevelState(this.dungeonLevel);
      const nextSeed = deriveNextSeed(currentState.seed, nextLevel);
      gameState.levelStates[nextLevel] = {
        seed: nextSeed,
        deadEnemies: [],
      };
    }

    this.dungeonLevel = nextLevel;
    this.fleeAttemptsThisFloor = 0;
    this.startLevel();
    this.escapeCollisionLockUntil = performance.now() + 700;
  }

  private createHud(): void {
    if (this.hudRoot) return;

    // Find external UI elements created by gameRoute
    this.externalUI = document.getElementById("game-ui-panel");
    this.externalUIToggle = document.getElementById("game-ui-toggle");
    const metaBar = document.getElementById("game-meta-bar");
    
    // Store reference to meta bar for updates
    if (metaBar) {
      this.hudMeta = metaBar;
    }

    // Create in-game menu (top-right toggle for camp menu)
    this.hudRoot = document.createElement("div");
    this.hudRoot.className = "ingame-ui";

    this.menuToggle = document.createElement("button");
    this.menuToggle.className = "ingame-menu-toggle";
    this.menuToggle.textContent = "Campement";
    this.updateHudVisibility();

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

    const exitBtn = document.createElement("button");
    exitBtn.className = "ingame-menu-btn ingame-menu-exit";
    exitBtn.textContent = "Quitter";

    this.menuContent = document.createElement("div");
    this.menuContent.className = "ingame-menu-content";

    menuActions.append(inventoryBtn, statsBtn, saveBtn, closeBtn, exitBtn);
    this.menuPanel.append(menuHeader, menuActions, this.menuContent);
    this.hudRoot.append(this.menuToggle, this.menuPanel);
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
    exitBtn.addEventListener("click", () => this.handleExit());

    this.updateExternalUI();
  }

  private toggleMenu(force?: boolean): void {
    if (!this.menuPanel) return;

    this.menuOpen = force ?? !this.menuOpen;
    this.menuPanel.hidden = !this.menuOpen;
    this.menuPanel.style.display = this.menuOpen ? "block" : "none";

    if (this.menuToggle) {
      this.menuToggle.hidden = this.menuOpen;
      this.menuToggle.textContent = this.menuOpen ? "Fermer" : "Campement";
      this.updateHudVisibility();
    }

    if (this.menuOpen) {
      this.renderStatsPanel();
    } else {
      this.menuContent?.replaceChildren();
    }
  }

  private updateExternalUI(): void {
    if (!this.player) return;
    const { hp, maxHp, xp, xpToNext, level, attack, defense, speed } = this.player.stats;
    
    // Update top meta bar
    if (this.hudMeta) {
      const ratio = Math.max(0, Math.min(100, Math.round((xp / Math.max(1, xpToNext)) * 100)));
      this.hudMeta.textContent = `Etage ${this.dungeonLevel} | ${this.player.getPlayerName()} | Niv ${level} | XP ${xp}/${xpToNext} (${ratio}%)`;
    }

    // Update external UI panel (if elements exist)
    const hpFill = document.getElementById("ui-hp-fill") as HTMLElement | null;
    const hpText = document.getElementById("ui-hp-text") as HTMLElement | null;
    const xpText = document.getElementById("ui-xp-text") as HTMLElement | null;
    const atkEl = document.getElementById("ui-atk") as HTMLElement | null;
    const defEl = document.getElementById("ui-def") as HTMLElement | null;
    const spdEl = document.getElementById("ui-spd") as HTMLElement | null;
    const invEl = document.getElementById("ui-inventory") as HTMLElement | null;

    if (hpFill) {
      hpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
    }
    if (hpText) {
      hpText.textContent = `${hp}/${maxHp}`;
    }
    if (xpText) {
      const ratio = Math.max(0, Math.min(100, Math.round((xp / Math.max(1, xpToNext)) * 100)));
      xpText.textContent = `Niv ${level} (${ratio}%)`;
    }
    if (atkEl) {
      atkEl.textContent = `${attack}`;
    }
    if (defEl) {
      defEl.textContent = `${defense}`;
    }
    if (spdEl) {
      spdEl.textContent = `${speed}`;
    }
    if (invEl) {
      const items = this.player.getInventory();
      const itemText = items
        .filter((item) => item.quantity > 0)
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");
      invEl.textContent = itemText || "Vide";
    }
  }

  private updateHudVisibility(): void {
    if (this.hudMeta) {
      this.hudMeta.hidden = this.inCombat;
    }

    if (this.menuToggle) {
      this.menuToggle.hidden = this.inCombat || this.menuOpen;
    }
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

  private async handleSave(): Promise<void> {
    if (!this.player) return;
    try {
      await gameDataService.saveGame(this.player, this.dungeonLevel);
      this.renderSavePanel();
    } catch {
      if (!this.menuContent) return;
      this.menuContent.innerHTML = `
        <h3>Sauvegarde</h3>
        <p>Erreur: impossible de sauvegarder ici.</p>
      `;
    }
  }

  private async handleExit(): Promise<void> {
    if (!this.player) return;
    
    // Save the game before exiting
    try {
      await gameDataService.saveGame(this.player, this.dungeonLevel);
    } catch {
      // Continue with exit even if save fails
    }
    
    // Navigate to main menu
    navigateTo("/");
  }

  private spawnEnemies(): void {
    if (!this.map) return;

    // Use seeded RNG for deterministic enemy spawning
    const levelState = gameState.getLevelState(this.dungeonLevel);
    const rng = new SeededRNG(levelState.seed);

    const occupiedTiles = new Set<string>();
    occupiedTiles.add(`${this.map.entry.x},${this.map.entry.y}`);
    occupiedTiles.add(`${this.map.exit.x},${this.map.exit.y}`);

    const spawnPool = ENEMY_TEMPLATES.filter((template) =>
      ["slime", "bat", "skeleton"].includes(template.worldSprite),
    );

    this.map.rooms.forEach((room, roomIndex) => {
      if (this.roomContains(room, this.map!.entry)) return;

      // Use seeded RNG for deterministic enemy count
      const baseCount = 1 + (rng.chance(0.5) ? 1 : 0);
      const bonusCount = this.dungeonLevel >= 3 && rng.chance(0.35) ? 1 : 0;
      const enemiesInRoom = Math.min(3, baseCount + bonusCount);
      let spawned = 0;

      for (let attempt = 0; attempt < 24 && spawned < enemiesInRoom; attempt += 1) {
        // Use seeded RNG for deterministic position selection
        const tx = rng.randomInt(room.x + 1, room.x + room.w - 2);
        const ty = rng.randomInt(room.y + 1, room.y + room.h - 2);
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

        // Generate deterministic enemy ID from position and template
        // This ensures the same enemy gets the same ID on every load
        const enemyId = this.generateDeterministicEnemyId(tx, ty, template.name);

        // Skip spawning if this enemy is already dead
        if (gameState.isEnemyDead(this.dungeonLevel, enemyId)) {
          occupiedTiles.add(key);
          spawned += 1; // Count as spawned (but don't actually spawn)
          continue;
        }

        const enemy = new Enemy(scaledTemplate, tx * this.TILE_SIZE, ty * this.TILE_SIZE, enemyId);
        this.enemies.push(enemy);
        this.entities.push(enemy);
        occupiedTiles.add(key);
        spawned += 1;
      }
    });
  }

  /**
   * Generate a deterministic UUID for an enemy based on its spawn conditions.
   * This ensures the same enemy gets the same ID on every load with the same seed.
   */
  private generateDeterministicEnemyId(x: number, y: number, templateName: string): string {
    const levelState = gameState.getLevelState(this.dungeonLevel);
    // Create a hash string from the seed, level, position, and template
    const hashInput = `${levelState.seed}-${this.dungeonLevel}-${x}-${y}-${templateName}`;

    // Simple hash function to convert string to number
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & 0xffffffff;
    }

    // Convert hash to UUID format
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const paddedHex = hex.padEnd(12, '0');

    // Return deterministic UUID
    return `${hex.substring(0, 8)}-${hex.substring(0, 4)}-4${hex.substring(0, 3)}-8${hex.substring(0, 3)}-${paddedHex}`;
  }

  private scaleEnemyTemplate(template: EnemyTemplate): EnemyTemplate {
    const depthBonus = Math.max(0, this.dungeonLevel - 1);
    if (depthBonus === 0) return template;

    const hpScale = 1 + depthBonus * 0.28;
    const atkScale = 1 + depthBonus * 0.24;
    const defScale = 1 + depthBonus * 0.18;
    const speedScale = 1 + depthBonus * 0.1;
    const xpScale = 1 + depthBonus * 0.22;

    return {
      ...template,
      maxHp: Math.max(1, Math.round(template.maxHp * hpScale)),
      attack: Math.max(1, Math.round(template.attack * atkScale)),
      defense: Math.max(0, Math.round(template.defense * defScale)),
      speed: Math.max(1, Math.round(template.speed * speedScale)),
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

  private update(deltaTime: number): void {
    if (!this.player || this.inCombat || this.menuOpen) return;

    this.frameCounter++;

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

    // Check for state changes after all updates
    this.checkDirtyState();
  }

  private render(deltaTime: number): void {
    // Skip render if nothing visible has changed
    if (this.shouldSkipRender()) {
      return;
    }

    const { offsetX, offsetY } = this.camera.getOffset();
    const cameraX = -offsetX;
    const cameraY = -offsetY;

    // Render static map layer if needed (camera moved or level changed)
    if (this.staticDirty && this.map) {
      this.renderer.renderStaticLayer(this.map, cameraX, cameraY, this.TILE_SIZE);
      this.staticDirty = false;
    }

    // Composite static layer to main canvas
    this.renderer.compositeLayers(cameraX, cameraY);

    // Render dynamic entities with culling
    const visibleEnemies = this.enemies.filter((enemy) =>
      this.renderer.isEntityVisible(enemy, offsetX, offsetY, this.TILE_SIZE),
    );

    visibleEnemies.forEach((enemy) => {
      this.renderer.drawEntity(enemy, offsetX, offsetY, enemy.color, this.TILE_SIZE);
    });

    // Render player
    if (this.player) {
      this.renderer.drawCharacter(
        this.player,
        offsetX,
        offsetY,
        this.PLAYER_SIZE,
        this.lastMovementInput,
      );
    }

    // Draw FPS counter
    this.renderer.drawFPS(1 / Math.max(deltaTime, 0.001));

    // Mark render as clean and update tracking state
    this.markRenderClean();
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
    this.updateHudVisibility();
    this.gameLoop.stop();
    
    // Hide external UI during combat
    if (this.externalUI) {
      this.externalUI.classList.add("combat-hidden");
    }
    if (this.externalUIToggle) {
      (this.externalUIToggle as HTMLElement).style.display = "none";
    }

    const engagedEnemy = enemy;
    this.combatManager?.destroy();
    this.combatManager = new CombatManager(this.container, this.player, enemy, {
      attemptsLeft: Math.max(
        0,
        this.maxFleeAttemptsPerFloor - this.fleeAttemptsThisFloor,
      ),
      maxAttempts: this.maxFleeAttemptsPerFloor,
      failureChance: this.fleeFailureChance,
      onAttempt: () => {
        this.fleeAttemptsThisFloor += 1;
      },
    });

    this.combatManager.start().then((result) => {
      if (!this.player) return;

      if (result.outcome === "victory") {
        // Mark enemy as dead before removing (for persistence)
        gameState.markEnemyDead(this.dungeonLevel, engagedEnemy.id);
        this.removeEnemy(engagedEnemy);
        const xpGain = Math.max(result.xpGained, engagedEnemy.xpReward);
        const levelsGained = this.player.gainExperience(xpGain);
        if (levelsGained > 0) {
          this.updateExternalUI();
        }
      } else if (result.outcome === "defeat") {
        this.player.revive(1);
      } else if (result.outcome === "escaped") {
        this.handleEscapeFrom(engagedEnemy);
      }

      this.combatManager?.destroy();
      this.combatManager = null;
      this.inCombat = false;
      
      // Show external UI after combat
      if (this.externalUI) {
        this.externalUI.classList.remove("combat-hidden");
      }
      if (this.externalUIToggle) {
        (this.externalUIToggle as HTMLElement).style.display = "";
      }
      
      this.updateExternalUI();
      this.updateHudVisibility();
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
    // Entity removed, mark entities as dirty
    this.entitiesDirty = true;
    this.lastEntityPositions.delete(enemy.id);
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
