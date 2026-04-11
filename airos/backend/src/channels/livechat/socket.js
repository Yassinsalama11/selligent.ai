const { Server } = require('socket.io');

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    const { tenantId, sessionId } = socket.handshake.query;
    if (!tenantId) return socket.disconnect();

    socket.join(`tenant:${tenantId}`);
    if (sessionId) socket.join(`session:${sessionId}`);

    socket.on('customer:message', async (data) => {
      try {
        const { addToQueue } = require('../../workers/messageProcessor');
        await addToQueue({
          channel: 'livechat',
          tenant_id: tenantId,
          session_id: sessionId,
          raw: data,
        });
      } catch (err) {
        console.error('[LiveChat socket]', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[LiveChat] disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocketServer, getIO };
