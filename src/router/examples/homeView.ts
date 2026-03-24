import type { View } from "../types";

export class HomeView implements View {
  private counter = 0;
  mount(root: HTMLElement) {
    root.innerHTML = `
      <h1>🏠 Home</h1>
      <p>Welcome</p>
      <button id="playBtn">Increase: ${this.counter}</button>
    `;

    const btn = root.querySelector("#playBtn")!;
    btn.addEventListener("click", () => {
      this.counter++;
      btn.textContent = `Increase: ${this.counter}`;
    });
  }

  unmount() {
    console.log("Leaving Home view — cleaning up...");
  }
}
