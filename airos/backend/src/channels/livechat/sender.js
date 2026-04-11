const { getIO } = require('./socket');

/**
 * Send a message to a live chat visitor via Socket.io.
 * @param {string} sessionId  — visitor's session ID (socket room)
 * @param {string} text       — message content
 * @param {string} sentBy     — 'agent' | 'ai'
 */
function sendText(sessionId, text, sentBy = 'agent') {
  const io = getIO();
  io.to(`session:${sessionId}`).emit('agent:message', {
    type: 'text',
    content: text,
    sent_by: sentBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a typing indicator to the visitor.
 */
function sendTyping(sessionId, isTyping = true) {
  const io = getIO();
  io.to(`session:${sessionId}`).emit('agent:typing', { typing: isTyping });
}

module.exports = { sendText, sendTyping };
