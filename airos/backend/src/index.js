const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./api/routes/auth');
const dashboardRoutes = require('./api/routes/dashboard');
const dealsRoutes = require('./api/routes/deals');
const conversationsRoutes = require('./api/routes/conversations');
const channelsRoutes = require('./api/routes/channels');
const productsRoutes = require('./api/routes/products');
const reportsRoutes = require('./api/routes/reports');
const catalogRoutes = require('./api/routes/catalog');
const settingsRoutes = require('./api/routes/settings');
const customersRoutes = require('./api/routes/customers');
const broadcastRoutes = require('./api/routes/broadcast');

const { authMiddleware } = require('./api/middleware/auth');
const { tenantMiddleware } = require('./api/middleware/tenant');
const { initSocketServer } = require('./channels/livechat/socket');
const { startReportScheduler } = require('./core/reportScheduler');

const app = express();
const server = http.createServer(app);

// Init Socket.io
initSocketServer(server);

// Core middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'https://chatorai.com',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ];
    // Allow Cloudflare Pages preview deployments and no-origin requests
    if (!origin || allowed.includes(origin) || origin.endsWith('.pages.dev')) {
      cb(null, true);
    } else {
      cb(null, true); // Allow all for now — restrict in production
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Public routes
app.use('/api/auth', authRoutes);

// Stripe — checkout session creation (public) + webhook (raw body)
const stripeRoutes = require('./api/stripe');
app.use('/api/stripe', stripeRoutes);

// AI brand scan (public — called during onboarding)
const scanRoutes = require('./api/scan');
app.use('/api/scan', scanRoutes);

// Onboarding — trial account registration (public)
const onboardingRoutes = require('./api/onboarding');
app.use('/api/onboarding', onboardingRoutes);

// Live conversations (in-memory store — public for now)
const { getAllConversations, getMessages, markRead } = require('./core/inMemoryStore');
app.get('/api/live/conversations', (req, res) => {
  res.json(getAllConversations());
});
app.get('/api/live/conversations/:id/messages', (req, res) => {
  const msgs = getMessages(decodeURIComponent(req.params.id));
  res.json(msgs);
});
app.post('/api/live/conversations/:id/read', (req, res) => {
  markRead(decodeURIComponent(req.params.id));
  res.json({ ok: true });
});

// Send WhatsApp message
app.post('/api/live/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    // Save outbound message to store
    const { getOrCreateConversation, addMessage } = require('./core/inMemoryStore');
    const conv = getOrCreateConversation(phone, phone, 'whatsapp');
    addMessage(conv.id, {
      id: `out_${Date.now()}`,
      direction: 'outbound',
      content: message,
      type: 'text',
      sent_by: 'agent',
      at: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
      timestamp: new Date().toISOString(),
    });

    res.json({ ok: true, message_id: data.messages?.[0]?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook debug store — last 10 hits
const _webhookLog = [];
app.use('/webhooks', (req, res, next) => {
  if (req.method === 'POST') {
    _webhookLog.unshift({ path: req.path, body: req.body, ts: new Date().toISOString() });
    if (_webhookLog.length > 10) _webhookLog.pop();
  }
  next();
});
app.get('/debug/webhooks', (req, res) => res.json(_webhookLog));

// Webhook routes (public — Meta verifies these)
app.use('/webhooks', require('./channels/whatsapp/webhook'));
app.use('/webhooks', require('./channels/instagram/webhook'));
app.use('/webhooks', require('./channels/messenger/webhook'));

// Public catalog API (for plugins)
app.use('/v1/catalog', catalogRoutes);

// Channel routes expose a public Meta callback and protect the rest internally
app.use('/api/channels', channelsRoutes);

// Protected routes — require JWT + tenant context
app.use('/api', authMiddleware, tenantMiddleware);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/broadcast', broadcastRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
if (process.env.ENABLE_REPORT_SCHEDULER !== '0') {
  startReportScheduler();
}
server.listen(PORT, () => console.log(`ChatOrAI backend running on port ${PORT}`));

module.exports = { app, server };
