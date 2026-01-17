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
    this.createPartyButton = document.getElementById('createPartyButton');
    this.gameContainer = document.getElementById('gameContainer');
    this.gameUI = document.getElementById('gameUI');
    this.copyLinkButton = document.getElementById('copyLinkButton');
    this.sessionInfo = document.getElementById('sessionInfo');
    
    // Check for session in URL
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get('session');

    if (this.sessionId) {
        this.sessionInfo.textContent = `Joining Party via Link...`; // Visual feedback
        this.sessionInfo.style.display = 'block';
        this.playButton.textContent = 'Join Party';
    }

    this.nameInput.addEventListener('input', () => {
      const isValid = this.nameInput.value.trim().length >= 3;
      this.playButton.disabled = !isValid;
      this.createPartyButton.disabled = !isValid;
    });

    this.playButton.addEventListener('click', () => {
      this.startGame(this.sessionId);
    });

    this.createPartyButton.addEventListener('click', () => {
        this.startGame('new');
    });

    this.copyLinkButton.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const originalText = this.copyLinkButton.textContent;
            this.copyLinkButton.textContent = 'Copied!';
            setTimeout(() => this.copyLinkButton.textContent = originalText, 2000);
        });
    });

    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.playButton.disabled) {
        this.startGame(this.sessionId);
      }
    });

    // Auto-focus input
    this.nameInput.focus();
  }

  startGame(sessionId) {
    const playerName = this.nameInput.value.trim();
    if (!playerName) return;

    this.lobby.style.display = 'none';
    this.gameContainer.style.display = 'block';
    
    // Show UI overlay if in a party (or always? "Copy Invite" makes sense if in named session)
    // We can show it always, it will copy current URL.
    this.gameUI.style.display = 'block';

    this.game = new Game(this.gameContainer, playerName, sessionId);
  }
}

new GameManager();
