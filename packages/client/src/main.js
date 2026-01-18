import "./style.css";
import { Game } from "./game/game.js";
import { TANK_TYPES } from "@tank-battle/shared";

// Tank icons for visual representation
const TANK_ICONS = {
  standard: "🎯",
  heavy: "💣",
  speeder: "⚡",
  sniper: "🔭",
};

class GameManager {
  constructor() {
    this.game = null;
    this.selectedTankType = "standard";
    this.setupLobby();
  }

  setupLobby() {
    this.lobby = document.getElementById("lobby");
    this.nameInput = document.getElementById("nameInput");
    this.playButton = document.getElementById("playButton");
    this.createPartyButton = document.getElementById("createPartyButton");
    this.gameContainer = document.getElementById("gameContainer");
    this.gameUI = document.getElementById("gameUI");
    this.copyLinkButton = document.getElementById("copyLinkButton");
    this.sessionInfo = document.getElementById("sessionInfo");
    this.tankCardsContainer = document.getElementById("tankCards");

    // Check for session in URL
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get("session");

    if (this.sessionId) {
      this.sessionInfo.textContent = `Joining Party via Link...`; // Visual feedback
      this.sessionInfo.style.display = "block";
      this.playButton.textContent = "Join Party";
    }

    // Generate tank selection cards
    this.generateTankCards();

    this.nameInput.addEventListener("input", () => {
      const isValid = this.nameInput.value.trim().length >= 3;
      this.playButton.disabled = !isValid;
      this.createPartyButton.disabled = !isValid;
    });

    this.playButton.addEventListener("click", () => {
      this.startGame(this.sessionId);
    });

    this.createPartyButton.addEventListener("click", () => {
      this.startGame("new");
    });

    this.copyLinkButton.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = this.copyLinkButton.textContent;
        this.copyLinkButton.textContent = "Copied!";
        setTimeout(
          () => (this.copyLinkButton.textContent = originalText),
          2000,
        );
      });
    });

    this.nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !this.playButton.disabled) {
        this.startGame(this.sessionId);
      }
    });

    // Auto-focus input
    this.nameInput.focus();
  }

  generateTankCards() {
    // Calculate max stats for relative bars
    const tanks = Object.values(TANK_TYPES);
    const maxSpeed = Math.max(...tanks.map((t) => t.maxSpeed));
    const maxPower = Math.max(...tanks.map((t) => t.bullet.damage));
    const maxRate = Math.max(...tanks.map((t) => 1 / t.fireRate));

    for (const [id, tank] of Object.entries(TANK_TYPES)) {
      const card = document.createElement("div");
      card.className = `tank-card${id === this.selectedTankType ? " selected" : ""}`;
      card.dataset.tankId = id;

      const speedPercent = (tank.maxSpeed / maxSpeed) * 100;
      const powerPercent = (tank.bullet.damage / maxPower) * 100;
      const ratePercent = (1 / tank.fireRate / maxRate) * 100;

      card.innerHTML = `
        <div class="tank-card-header">
          <div class="tank-icon">${TANK_ICONS[id] || "🎯"}</div>
          <div class="tank-name">${tank.name}</div>
        </div>
        <div class="tank-description">${tank.description}</div>
        <div class="tank-stats">
          <div class="stat-row">
            <span class="stat-label">Speed</span>
            <div class="stat-bar"><div class="stat-fill speed" style="width: ${speedPercent}%"></div></div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Power</span>
            <div class="stat-bar"><div class="stat-fill power" style="width: ${powerPercent}%"></div></div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Fire Rate</span>
            <div class="stat-bar"><div class="stat-fill rate" style="width: ${ratePercent}%"></div></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => this.selectTank(id));
      this.tankCardsContainer.appendChild(card);
    }
  }

  selectTank(tankId) {
    this.selectedTankType = tankId;

    // Update visual selection
    document.querySelectorAll(".tank-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.tankId === tankId);
    });
  }

  startGame(sessionId) {
    const playerName = this.nameInput.value.trim();
    if (!playerName) return;

    this.lobby.style.display = "none";
    this.gameContainer.style.display = "block";

    // Show UI overlay if in a party (or always? "Copy Invite" makes sense if in named session)
    // We can show it always, it will copy current URL.
    this.gameUI.style.display = "block";

    this.game = new Game(
      this.gameContainer,
      playerName,
      sessionId,
      this.selectedTankType,
    );
  }
}

new GameManager();
