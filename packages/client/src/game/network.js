import { io } from "socket.io-client";
import { EVENTS } from "@tank-battle/shared";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const SOCKET_URL = isLocalhost
  ? "http://localhost:3000"
  : "https://tank-battle-2d-1.onrender.com";

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.inputSequenceNumber = 0;
  }

  connect(playerName, sessionId, tankType) {
    this.socket = io(SOCKET_URL, {
      query: {
        playerName,
        sessionId: sessionId || "", // Optional session ID
        tankType: tankType || "standard",
      },
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("sessionJoined", ({ sessionId }) => {
      console.log("Joined session:", sessionId);
      // Update URL without reloading if not already present
      const url = new URL(window.location);
      if (url.searchParams.get("session") !== sessionId) {
        url.searchParams.set("session", sessionId);
        window.history.pushState({}, "", url);
      }
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
      sequenceNumber: this.inputSequenceNumber++,
    });
  }

  sendShoot(rotation) {
    this.socket.emit(EVENTS.SHOOT, rotation);
  }

  sendRespawn() {
    this.socket.emit(EVENTS.RESPAWN);
  }
}
