import { io } from 'socket.io-client';
import { EVENTS } from '@tank-battle/shared';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.inputSequenceNumber = 0;
  }

  connect(playerName) {
    // In production, this should be the actual server URL.
    // For dev, Vite proxy or localhost:3000
    this.socket = io('http://localhost:3000', {
      query: { playerName }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on(EVENTS.GAME_STATE, (state) => {
      this.game.onGameState(state);
    });

    this.socket.on(EVENTS.PLAYER_RESPAWNED, (data) => {
        // Handle immediate respawn effects if needed
    });

    this.socket.on(EVENTS.PLAYER_DIED, (data) => {
        // Handle death notification
    });
  }

  sendInput(input) {
    this.socket.emit(EVENTS.PLAYER_INPUT, {
      ...input,
      sequenceNumber: this.inputSequenceNumber++
    });
  }

  sendShoot(rotation) {
    this.socket.emit(EVENTS.SHOOT, rotation);
  }

  sendRespawn() {
    this.socket.emit(EVENTS.RESPAWN);
  }
}
