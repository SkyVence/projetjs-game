import type { View } from "@/router/types";

export class LevelView implements View {
  private params: Record<string, string>;
  constructor(params: Record<string, string> = {}) {
    this.params = params;
  }

  mount(root: HTMLElement) {
    const { id } = this.params;
    root.innerHTML = `
      <h1>🎯 Level ${id}</h1>
      <p>This scene could load a different game map depending on ID.</p>
    `;
  }

  unmount() {
    console.log(`Leaving Level ${this.params.id} view — cleaning up...`);
  }
}
