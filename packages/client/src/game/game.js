import { Renderer } from "./renderer.js";
import { InputManager } from "./input.js";
import { NetworkManager } from "./network.js";

export class Game {
  constructor(container, playerName, sessionId, tankType) {
    this.playerName = playerName;
    this.sessionId = sessionId;
    this.tankType = tankType || "standard";
    this.renderer = new Renderer(container);
    this.input = new InputManager();
    this.network = new NetworkManager(this);

    this.scoreboard = document.getElementById("scoreboard");
    this.scoreboardBody = document.getElementById("scoreboardBody");
    this.isScoreboardVisible = false;
    this.isAutoFireEnabled = false;

    this.gameState = null;
    this.lastTime = 0;

    this.init();
  }

  async init() {
    await this.renderer.init();
    this.network.connect(this.playerName, this.sessionId, this.tankType);

    // Start loop
    this.renderer.app.ticker.add(this.update.bind(this));

    // Mouse listener for shooting
    this.renderer.app.stage.eventMode = "static";
    this.renderer.app.stage.hitArea = this.renderer.app.screen;
    this.renderer.app.stage.on("pointerdown", () => this.handleShoot());

    // Space listener for shooting
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.repeat) {
        this.handleShoot();
      }
    });

    // E key listener for toggling autofire
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyE" && !e.repeat) {
        this.isAutoFireEnabled = !this.isAutoFireEnabled;
        console.log(`Autofire: ${this.isAutoFireEnabled ? "ON" : "OFF"}`);
      }
    });

    // Scoreboard Listeners
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault(); // Prevent focus switching
        this.isScoreboardVisible = true;
        this.scoreboard.style.display = "block";
        this.updateScoreboard();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Tab") {
        this.isScoreboardVisible = false;
        this.scoreboard.style.display = "none";
      }
    });

    console.log("Game initialized");
  }

  handleShoot() {
    if (this.localPlayer && !this.localPlayer.isDead) {
      const mousePos = this.renderer.app.renderer.events.pointer.global;
      const worldPos = this.renderer.screenToWorld(mousePos.x, mousePos.y);
      const rotation = Math.atan2(
        worldPos.y - this.localPlayer.y,
        worldPos.x - this.localPlayer.x,
      );
      this.network.sendShoot(rotation);
    } else if (this.localPlayer && this.localPlayer.isDead) {
      this.network.sendRespawn();
    }
  }

  onGameState(state) {
    this.gameState = state;
    if (this.isScoreboardVisible) {
      this.updateScoreboard();
    }
  }

  updateScoreboard() {
    if (!this.gameState || !this.gameState.players) return;

    const players = [...this.gameState.players].sort(
      (a, b) => b.kills - a.kills,
    );

    this.scoreboardBody.innerHTML = "";
    players.forEach((p) => {
      const row = document.createElement("tr");
      if (this.localPlayer && p.id === this.localPlayer.id) {
        row.className = "local-player";
      }

      row.innerHTML = `
              <td>${p.id === this.network.socket?.id ? "(You) " : ""}${p.name}</td>
              <td>${p.kills || 0}</td>
              <td>${p.deaths || 0}</td>
          `;
      this.scoreboardBody.appendChild(row);
    });
  }

  get localPlayer() {
    if (!this.gameState || !this.network.socket) return null;
    return this.gameState.players.find((p) => p.id === this.network.socket.id);
  }

  update(time) {
    if (!this.gameState) return;

    // 1. Process Input
    const inputState = this.input.getState();

    // Calculate rotation based on mouse
    let rotation = 0;
    if (this.localPlayer) {
      const mousePos = this.renderer.app.renderer.events.pointer.global;
      const worldPos = this.renderer.screenToWorld(mousePos.x, mousePos.y);
      rotation = Math.atan2(
        worldPos.y - this.localPlayer.y,
        worldPos.x - this.localPlayer.x,
      );
    }

    const dt = time.deltaTime; // PIXI deltaTime is 1 for 60fps

    // Prepare input payload
    const inputPayload = {
      ...inputState,
      rotation,
      deltaTime: dt,
    };

    // Send to server
    this.network.sendInput(inputPayload);

    // 2. Autofire
    if (this.isAutoFireEnabled) {
      this.handleShoot();
    }

    // 3. Render
    this.renderer.render(this.gameState, this.network.socket?.id);
  }
}
