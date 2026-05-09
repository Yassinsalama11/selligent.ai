const express = require('express');
const { requireRole } = require('../middleware/rbac');
const {
  buildBillingSummary,
  createBillingCheckoutSession,
  createBillingPortalSession,
  listBillingEvents,
  recordBillingEvent,
  updateTenantBillingProfile,
} = require('../../services/billingService');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const summary = await buildBillingSummary(req.tenant);
    const events = await listBillingEvents(req.user.tenant_id, { limit: 100 });

    res.json({
      summary,
      invoices: events.filter((entry) => String(entry.event_type || '').includes('invoice')),
      payments: events.filter((entry) => String(entry.event_type || '').includes('payment')),
      history: events,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/preferences', requireOwnerRole, async (req, res, next) => {
  try {
    const next = await updateTenantBillingProfile(req.user.tenant_id, {
      billingCycle: req.body?.billingCycle,
      billingCurrency: req.body?.billingCurrency,
      region: req.body?.region,
      seatCount: Number.parseInt(req.body?.seatCount, 10),
      selectedChannels: Array.isArray(req.body?.selectedChannels) ? req.body.selectedChannels : undefined,
      billing: {
        selected_channels: req.body?.selectedChannels,
      },
      auditAction: 'billing.preferences.updated',
      auditMetadata: {
        billingCycle: req.body?.billingCycle,
        seatCount: req.body?.seatCount,
        selectedChannels: req.body?.selectedChannels,
      },
    }, {
      actorType: 'user',
      actorId: req.user.id,
    });

    await recordBillingEvent({
      tenantId: req.user.tenant_id,
      actorType: 'user',
      actorId: req.user.id,
      eventType: 'billing_preferences_updated',
      metadata: {
        billingCycle: req.body?.billingCycle,
        seatCount: req.body?.seatCount,
        selectedChannels: req.body?.selectedChannels,
      },
    }).catch(() => {});

    res.json({ summary: next });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout-session', requireOwnerRole, async (req, res, next) => {
  try {
    const session = await createBillingCheckoutSession({
      tenant: req.tenant,
      user: req.user,
      plan: req.body?.plan || req.tenant.plan,
      seats: req.body?.seatCount,
      billingCycle: req.body?.billingCycle,
    });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post('/portal-session', requireOwnerRole, async (req, res, next) => {
  try {
    const session = await createBillingPortalSession({ tenant: req.tenant });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post('/retry-payment', requireOwnerRole, async (req, res, next) => {
  try {
    const session = await createBillingCheckoutSession({
      tenant: req.tenant,
      user: req.user,
      plan: req.body?.plan || req.tenant.plan,
      seats: req.body?.seatCount,
      billingCycle: req.body?.billingCycle,
    });
    await recordBillingEvent({
      tenantId: req.user.tenant_id,
      actorType: 'user',
      actorId: req.user.id,
      eventType: 'payment_retry_requested',
      status: 'pending',
      metadata: {
        checkout_session_id: session.sessionId,
      },
    }).catch(() => {});
    res.json(session);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
