import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SessionManager } from './session-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve static files from the client dist directory
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Socket connection
io.on('connection', (socket) => {
  sessionManager.handleConnection(socket);
  
  socket.on('createSession', (callback) => {
      const sessionId = sessionManager.createSession();
      callback({ sessionId });
  });
});

// Handle SPA routing - serve index.html for all non-api routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
