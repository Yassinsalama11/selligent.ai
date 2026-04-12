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

const { authMiddleware } = require('./api/middleware/auth');
const { tenantMiddleware } = require('./api/middleware/tenant');
const { initSocketServer } = require('./channels/livechat/socket');

const app = express();
const server = http.createServer(app);

// Init Socket.io
initSocketServer(server);

// Core middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'https://selligent-ai.pages.dev',
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

// Webhook routes (public — Meta verifies these)
app.use('/webhooks', require('./channels/whatsapp/webhook'));
app.use('/webhooks', require('./channels/instagram/webhook'));
app.use('/webhooks', require('./channels/messenger/webhook'));

// Public catalog API (for plugins)
app.use('/v1/catalog', catalogRoutes);

// Protected routes — require JWT + tenant context
app.use('/api', authMiddleware, tenantMiddleware);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reports', reportsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`AIROS backend running on port ${PORT}`));

module.exports = { app, server };
