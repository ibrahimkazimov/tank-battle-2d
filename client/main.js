import { Game } from './game/game.js';

class GameManager {
    constructor() {
        this.game = null;
        this.playerName = '';
        this.setupLobby();
    }

    setupLobby() {
        // Get DOM elements
        this.lobby = document.getElementById('lobby');
        this.nameInput = document.getElementById('nameInput');
        this.playButton = document.getElementById('playButton');
        this.gameContainer = document.getElementById('gameContainer');

        // Enable/disable play button based on name input
        this.nameInput.addEventListener('input', () => {
            const name = this.nameInput.value.trim();
            this.playButton.disabled = name.length < 3;
        });

        // Handle play button click
        this.playButton.addEventListener('click', () => {
            this.playerName = this.nameInput.value.trim();
            this.startGame();
        });

        // Handle enter key in name input
        this.nameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !this.playButton.disabled) {
                this.playerName = this.nameInput.value.trim();
                this.startGame();
            }
        });
    }

    startGame() {
        // Hide lobby and show game
        this.lobby.style.display = 'none';
        this.gameContainer.style.display = 'block';

        // Initialize game
        this.game = new Game();
        this.game.playerName = this.playerName; // Pass player name to game
        this.game.init();
    }
}

// Start the game manager when the page loads
window.addEventListener('load', () => {
    new GameManager();
}); 