const { Server } = require('socket.io');

let io;

const getAllowedOrigins = () => {
  const defaults = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://myapp.seseducare.com',
    'https://myapp.seseducare.com',
    'http://seseducare.com',
    'https://seseducare.com',
    'http://www.seseducare.com',
    'https://www.seseducare.com'
  ];

  if (process.env.FRONTEND_URL) {
    defaults.push(process.env.FRONTEND_URL);
  }

  if (process.env.SOCKET_CORS_ORIGINS) {
    return process.env.SOCKET_CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  }

  return [...new Set(defaults)];
};

const initSocket = (server) => {
  const connectionLog = new Map();
  const MAX_CONNECTIONS_PER_MINUTE = 30;

  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
  });

  io.on('connection', (socket) => {
    const ip = socket.handshake.address || 'unknown';
    const now = Date.now();
    const windowKey = `${ip}:${Math.floor(now / 60000)}`;
    const count = (connectionLog.get(windowKey) || 0) + 1;
    connectionLog.set(windowKey, count);

    if (count > MAX_CONNECTIONS_PER_MINUTE) {
      socket.disconnect(true);
      return;
    }

    const userId = socket.handshake.query?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join-franchise', (franchiseId) => {
      if (franchiseId) {
        socket.join(`franchise:${franchiseId}`);
      }
    });

    socket.on('join-exam', (examId) => {
      if (examId) {
        socket.join(`exam:${examId}`);
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Socket connected:', socket.id, userId ? `(user:${userId})` : '');
    }

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Socket disconnected:', socket.id);
      }
    });
  });

  // Prune connection log every 5 minutes
  setInterval(() => {
    const cutoff = Math.floor(Date.now() / 60000) - 2;
    for (const key of connectionLog.keys()) {
      const minute = Number(key.split(':').pop());
      if (minute < cutoff) connectionLog.delete(key);
    }
  }, 5 * 60 * 1000).unref();

  return io;
};

const getIO = () => {
  if (!io) {
    return { emit: () => {}, to: () => ({ emit: () => {} }) };
  }
  return io;
};

module.exports = { initSocket, getIO };
