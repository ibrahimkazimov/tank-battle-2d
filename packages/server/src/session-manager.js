import { GameManager } from './game-manager.js';


export class SessionManager {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // sessionId -> GameManager
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 60000); // Cleanup every minute
  }

  createSession() {
    // Use simple random string for "Ab3dE" style session IDs
    
    // For collision safety, let's stick to full UUID for internal, but maybe map a short code?
    // Let's keep it simple: use the short random string, retry if collision.
    
    let id = this.generateId();
    while (this.sessions.has(id)) {
        id = this.generateId();
    }

    console.log(`Creating new session: ${id}`);
    const gameManager = new GameManager(this.io, id);
    this.sessions.set(id, gameManager);
    return id;
  }

  generateId() {
      return Math.random().toString(36).substring(2, 7);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  handleConnection(socket) {
    const sessionId = socket.handshake.query.sessionId;

    if (sessionId === 'new') {
        const newId = this.createSession();
        console.log(`Socket ${socket.id} creating and joining new session ${newId}`);
        const session = this.sessions.get(newId);
        session.handleConnection(socket);
        socket.emit('sessionJoined', { sessionId: newId });
        return;
    }

    if (sessionId && this.sessions.has(sessionId)) {
      console.log(`Socket ${socket.id} joining existing session ${sessionId}`);
      const session = this.sessions.get(sessionId);
      session.handleConnection(socket);
    } else {
      // Default behavior: Join a "public" lobby or create one?
      // For now, let's have a persistent "public" session.
      let publicSessionId = 'public';
      if (!this.sessions.has(publicSessionId)) {
        console.log('Creating default public session');
        const gameManager = new GameManager(this.io, publicSessionId);
        this.sessions.set(publicSessionId, gameManager);
      }
      
      console.log(`Socket ${socket.id} joining public session`);
      const session = this.sessions.get(publicSessionId);
      session.handleConnection(socket);
      
      // Notify client of the session they joined (useful if we auto-created one)
      socket.emit('sessionJoined', { sessionId: publicSessionId });
    }
  }

  cleanupSessions() {
    for (const [id, gameManager] of this.sessions) {
      if (id === 'public') continue; // Don't close public lobby
      
      if (gameManager.players.size === 0) {
        // Maybe wait a bit? For now, close if empty to save resources
        console.log(`Closing empty session: ${id}`);
        gameManager.stopGameLoop();
        this.sessions.delete(id);
      }
    }
  }
}
