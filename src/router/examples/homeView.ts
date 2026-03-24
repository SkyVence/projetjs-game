import type { View } from "../types";

export class HomeView implements View {
  mount(root: HTMLElement) {
    root.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h1 style="font-size: 3em; margin-bottom: 20px;">Game</h1>
        <a href="/level/1" style="
          display: inline-block;
          padding: 15px 40px;
          background-color: #00ff00;
          color: #000;
          text-decoration: none;
          border: none;
          border-radius: 0;
          font-weight: bold;
          font-size: 1.2em;
          cursor: pointer;
        ">Play</a>
      </div>
    `;
  }

  unmount() {
    console.log("Leaving Home view");
  }
}
