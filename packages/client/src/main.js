import './style.css';
import { Game } from './game/game.js';

class GameManager {
  constructor() {
    this.game = null;
    this.setupLobby();
  }

  setupLobby() {
    this.lobby = document.getElementById('lobby');
    this.nameInput = document.getElementById('nameInput');
    this.playButton = document.getElementById('playButton');
    this.gameContainer = document.getElementById('gameContainer');

    this.nameInput.addEventListener('input', () => {
      this.playButton.disabled = this.nameInput.value.trim().length < 3;
    });

    this.playButton.addEventListener('click', () => {
      this.startGame();
    });

    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.playButton.disabled) {
        this.startGame();
      }
    });

    // Auto-focus input
    this.nameInput.focus();
  }

  startGame() {
    const playerName = this.nameInput.value.trim();
    if (!playerName) return;

    this.lobby.style.display = 'none';
    this.gameContainer.style.display = 'block';

    this.game = new Game(this.gameContainer, playerName);
  }
}

new GameManager();
