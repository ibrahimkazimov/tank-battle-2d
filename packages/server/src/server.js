import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SessionManager } from './session-manager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize session manager
const sessionManager = new SessionManager(io);

// Socket connection
io.on('connection', (socket) => {
  sessionManager.handleConnection(socket);
  
  socket.on('createSession', (callback) => {
      const sessionId = sessionManager.createSession();
      callback({ sessionId });
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
