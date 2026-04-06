# villain-dungeon

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Bun](https://img.shields.io/badge/Bun-Runtime%20%2B%20Package%20Manager-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-00C2A8)](https://villain-dungeon.skyvence.dev/)

**villain-dungeon** is a school project dungeon crawler built with TypeScript and Vite.  
It focuses on exploration, combat, progression, and persistent save management in the browser.

## Live demo

Play the deployed version here:

https://villain-dungeon.skyvence.dev/

## Project overview

This game places you in a dungeon full of enemies, loot, and progression systems.  
The goal is to survive, explore deeper floors, improve your character, and manage your save slots over time.

The project was made as a school assignment, with an emphasis on clean architecture, browser persistence, and game systems implemented in TypeScript.

## Main features

- **Turn-based / real-time dungeon gameplay**
  - Move through dungeon rooms and navigate the map
  - Fight enemies with attack and defense stats
  - Manage health, progression, and survival

- **Player progression**
  - Leveling system
  - XP gain and progression tracking
  - Character stats such as HP, attack, defense, and speed

- **Inventory system**
  - Consumable items
  - Healing and buff items
  - Item usage during gameplay

- **Enemies and combat**
  - Multiple enemy types
  - Different enemy behaviors such as aggressive, defensive, and random
  - Enemy HP, attack, defense, speed, and rewards

- **Dungeon generation**
  - Procedural dungeon structure
  - Deterministic generation using per-level seeds
  - Persistent level state for consistent replay

- **Save system**
  - Multiple save slots
  - Save, load, and delete support
  - Timestamped saves
  - Migration from older save formats

- **Browser persistence**
  - Uses **IndexedDB** for durable save storage
  - Save data persists across sessions

- **UI and screens**
  - Main menu
  - Loading screen
  - Error screen
  - Save slot management interface

## Notable APIs and technical systems

### IndexedDB
The project uses **IndexedDB** as the main persistence layer for save data.  
This includes:

- opening and versioning the database
- creating and maintaining object stores
- storing multiple save slots
- querying and sorting saves by timestamp

### Save migration system
The game includes a migration layer that can import legacy save data and convert it into the current save-slot structure.

### Deterministic level state
Each dungeon level stores its own generated seed and enemy state so the game can preserve the world state consistently between sessions.

## Tech stack

- **TypeScript**
- **Vite**
- **Bun**
- **IndexedDB**
- **Browser APIs**
- **HTML / CSS / DOM rendering**

## Getting started

### Prerequisites
Install [Bun](https://bun.sh/) first.

### Install dependencies
```bash
bun install
```

### Run the development server
```bash
bun run dev
```

### Build for production
```bash
bun run build
```

## Notes

- This project was created for a school assignment.
- The codebase is written in TypeScript and designed to run directly in the browser.
- Save data is stored locally in the browser using IndexedDB.

## Demo

You can try the game here:

https://villain-dungeon.skyvence.dev/
