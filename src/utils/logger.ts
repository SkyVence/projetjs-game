export enum SystemName {
  Game = "Game",
  Database = "Database",
}

const systemColors: Record<SystemName, string> = {
  [SystemName.Game]: "#60a5fa",
  [SystemName.Database]: "#f472b6",
  // [SystemName.Input]: "#34d399",
  // [SystemName.Combat]: "#f59e0b",
  // [SystemName.AI]: "#a78bfa",
};

export class Logger {
  log(system: SystemName, message: string, ...args: unknown[]) {
    const color = systemColors[system] ?? "#ffffff";

    console.log(
      `%c[${system}]%c: ${message}`,
      `color: ${color}; font-weight: bold;`,
      "color: inherit;",
      ...args
    );
  }

  warn(system: SystemName, message: string, ...args: unknown[]) {
    this.log(system, message, ...args);
  }

  error(system: SystemName, message: string, ...args: unknown[]) {
    this.log(system, message, ...args);
  }
}
