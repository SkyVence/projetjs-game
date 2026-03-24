import type { View } from "../types";

export class HomeView implements View {
  private counter = 0;
  mount(root: HTMLElement) {
    root.innerHTML = `
      <h1>🏠 Home</h1>
      <p>Welcome, Antoine. Click the button to play!</p>
      <a href="/level/1" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #00ff00;
        color: #000;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        cursor: pointer;
      ">Play Game (Level 1)</a>
      <br><br>
      <button id="playBtn" style="
        padding: 10px 20px;
        background-color: #0066ff;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      ">Increase: ${this.counter}</button>
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
