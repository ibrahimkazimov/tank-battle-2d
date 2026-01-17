import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from './game-manager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize game manager
const gameManager = new GameManager(io);

// Socket connection
io.on('connection', (socket) => {
  gameManager.handleConnection(socket);
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
