'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, RefreshCw, Send, ChevronDown, ChevronUp,
  MessageSquare, Camera, Phone, Webhook, FileText,
  ExternalLink, AlertTriangle, Loader2, Eye, Clock
} from 'lucide-react';
import { api } from '@/lib/api';

const CHANNEL_COLOR = {
  messenger: '#0099FF',
  instagram: '#E1306C',
  whatsapp: '#25D366',
};

const CHANNEL_LABEL = {
  messenger: 'Messenger',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

function Badge({ text, variant = 'default' }) {
  const styles = {
    default: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${styles[variant]}`}>
      {text}
    </span>
  );
}

function Row({ label, value, mono = false, dim = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-[12px] text-zinc-500 dark:text-zinc-400 shrink-0 w-44">{label}</span>
      <span className={`text-[12px] break-all text-right ${mono ? 'font-mono' : ''} ${dim ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-zinc-500" />}
          <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function AssetCard({ asset }) {
  const color = CHANNEL_COLOR[asset.channel] || '#6366f1';
  const label = CHANNEL_LABEL[asset.channel] || asset.channel;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
        <Badge text={asset.status} variant={asset.status === 'active' ? 'success' : 'warning'} />
      </div>
      {asset.channel === 'whatsapp' && (
        <>
          <Row label="Display Name" value={asset.displayName} />
          <Row label="Phone Number" value={asset.phone} mono />
          <Row label="Phone Number ID" value={asset.phoneNumberId} mono />
          <Row label="WABA ID" value={asset.wabaId} mono />
          <Row label="Business Name" value={asset.businessName} />
          <Row label="Business ID" value={asset.businessId} mono />
          <Row label="Quality Rating" value={asset.qualityRating} />
          <Row label="Verification" value={asset.codeVerificationStatus} />
        </>
      )}
      {asset.channel === 'messenger' && (
        <>
          <Row label="Page Name" value={asset.pageName} />
          <Row label="Page ID" value={asset.pageId} mono />
        </>
      )}
      {asset.channel === 'instagram' && (
        <>
          <Row label="IG Username" value={asset.igUsername ? `@${asset.igUsername}` : ''} />
          <Row label="IG Account ID" value={asset.igAccountId} mono />
          <Row label="Linked Page" value={asset.pageName} />
          <Row label="Page ID" value={asset.pageId} mono />
        </>
      )}
      <Row label="Connected" value={asset.connectedAt ? new Date(asset.connectedAt).toLocaleString('en-GB') : ''} />
      <Row label="Access Token" value={asset.accessTokenMasked} mono dim />
    </div>
  );
}

function WebhookStatusPanel({ status }) {
  const channels = Object.entries(status?.channels || {});
  return (
    <div className="space-y-4">
      {channels.map(([ch, info]) => (
        <div key={ch} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_COLOR[ch] }} />
            <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{CHANNEL_LABEL[ch]}</span>
            {(info.total > 0) ? (
              <Badge text="RECEIVING" variant="success" />
            ) : (
              <Badge text="NO EVENTS YET" variant="warning" />
            )}
          </div>
          <Row label="Callback URL" value={info.callbackUrl} mono />
          <Row label="Object Type" value={info.object} />
          <Row label="Subscribed Fields" value={info.subscribedFields} />
          <Row label="Total Events" value={info.total ?? 0} />
          <Row label="Processed" value={info.processed ?? 0} />
          <Row label="Last Event" value={info.lastReceived ? new Date(info.lastReceived).toLocaleString('en-GB') : 'Never'} />
        </div>
      ))}
    </div>
  );
}

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: CHANNEL_COLOR[event.channel] }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">{CHANNEL_LABEL[event.channel]}</span>
            <Badge text={event.event_type} variant="info" />
            <Badge text={event.processed_status} variant={event.processed_status === 'processed' ? 'success' : 'default'} />
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{event.summary}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {event.asset_name && <span className="mr-2">{event.asset_name}</span>}
            {new Date(event.received_at).toLocaleString('en-GB')}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-1" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-1">
          <Row label="Provider Event ID" value={event.provider_event_id} mono />
          <Row label="Asset ID" value={event.asset_id} mono />
          <Row label="Asset Name" value={event.asset_name} />
          <Row label="Received" value={new Date(event.received_at).toLocaleString('en-GB')} />
          {event.processed_at && <Row label="Processed" value={new Date(event.processed_at).toLocaleString('en-GB')} />}
          {event.raw_payload_redacted && (
            <div className="mt-2">
              <p className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wider">Redacted Payload Snapshot</p>
              <pre className="bg-zinc-50 dark:bg-zinc-800 rounded p-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto">
                {JSON.stringify(event.raw_payload_redacted, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateRow({ tmpl }) {
  const statusVariant = tmpl.status === 'APPROVED' ? 'success' : tmpl.status === 'REJECTED' ? 'error' : 'warning';
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{tmpl.name}</span>
        <div className="flex items-center gap-1.5">
          <Badge text={tmpl.status} variant={statusVariant} />
          <Badge text={tmpl.language} variant="default" />
          <Badge text={tmpl.category} variant="info" />
        </div>
      </div>
      <Row label="Template ID" value={tmpl.templateId} mono />
      {tmpl.rejectedReason && <Row label="Rejection Reason" value={tmpl.rejectedReason} />}
      {tmpl.components?.map((c, i) => (
        c.text ? <Row key={i} label={c.type} value={c.text} /> : null
      ))}
    </div>
  );
}

function SendTestForm({ channel, onSend }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recipientId, setRecipientId] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('Hello from ChatorAI — Meta App Review test message.');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body = channel === 'whatsapp'
        ? { to, message }
        : { recipientId, message };
      const data = await onSend(body);
      setResult({ ok: true, data });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 mt-3">
      {channel === 'whatsapp' ? (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Recipient Phone (E.164)</label>
          <input
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+201234567890"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
            {channel === 'messenger' ? 'Recipient PSID' : 'Recipient IG Scoped ID'}
          </label>
          <input
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the user ID from an existing conversation"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            required
          />
        </div>
      )}
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Message</label>
        <textarea
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[13px] font-medium transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Send Test Message
      </button>

      {result && (
        <div className={`rounded-lg p-3 text-[12px] ${result.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
          {result.ok ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Message sent successfully
              </div>
              {result.data.providerMessageId && (
                <div className="font-mono text-[11px]">Provider ID: {result.data.providerMessageId}</div>
              )}
              <div className="text-[11px] opacity-70">Open the native client to verify delivery.</div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" /> {result.error}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function TemplateSendForm({ templates }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState('');
  const [lang, setLang] = useState('ar');

  const approved = templates.filter((t) => t.status === 'APPROVED');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.post('/api/meta-review/whatsapp/templates/send-test', {
        to,
        templateName: selected,
        languageCode: lang,
      });
      setResult({ ok: true, data });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 mt-3">
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Recipient Phone (E.164)</label>
        <input
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+201234567890"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Approved Template</label>
        <select
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-[13px] bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            const t = approved.find((a) => a.name === e.target.value);
            if (t) setLang(t.language);
          }}
          required
        >
          <option value="">Select a template…</option>
          {approved.map((t) => (
            <option key={t.templateId} value={t.name}>{t.name} ({t.language})</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !approved.length}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[13px] font-medium transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Send Template
      </button>
      {!approved.length && (
        <p className="text-[11px] text-orange-600 dark:text-orange-400">No approved templates found. Create and submit templates in Meta WhatsApp Manager, then return here to send them.</p>
      )}
      {result && (
        <div className={`rounded-lg p-3 text-[12px] ${result.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
          {result.ok ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Template sent
              </div>
              {result.data.providerMessageId && (
                <div className="font-mono text-[11px]">Provider ID: {result.data.providerMessageId}</div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5" /> {result.error}</div>
          )}
        </div>
      )}
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Main page                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function MetaReviewPage() {
  const [assets, setAssets] = useState([]);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, statusData] = await Promise.all([
        api.get('/api/meta-review/assets'),
        api.get('/api/meta-review/webhooks/status'),
      ]);
      setAssets(assetsData.assets || []);
      setWebhookStatus(statusData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await api.get('/api/meta-review/webhooks/events?limit=30');
      setEvents(data.events || []);
    } catch {}
    finally { setEventsLoading(false); }
  }, []);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await api.post('/api/meta-review/page/posts/fetch', {});
      setPosts(data);
    } catch (err) {
      setPosts({ error: err.message });
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await api.get('/api/meta-review/whatsapp/templates');
      setTemplates(data);
    } catch (err) {
      setTemplates({ error: err.message });
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadEvents();
  }, [load, loadEvents]);

  const messengerAsset = assets.find((a) => a.channel === 'messenger');
  const igAsset = assets.find((a) => a.channel === 'instagram');
  const waAsset = assets.find((a) => a.channel === 'whatsapp');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Meta Review Center</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Evidence panel for Meta App Review — all data is live from the Meta Graph API and your database.
          </p>
        </div>
        <button
          onClick={() => { load(); loadEvents(); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-[13px] text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Section 1: Connected Assets ──────────────────────────────────────── */}
      <Section title="Connected Meta Assets" icon={Eye}>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[13px] text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : assets.length === 0 ? (
          <div className="text-[13px] text-zinc-500 py-4">
            No Meta channels connected.{' '}
            <a href="/dashboard/channels" className="text-blue-600 underline">Connect a channel</a>
          </div>
        ) : (
          <div className="grid gap-4 mt-2 sm:grid-cols-2">
            {assets.map((a) => <AssetCard key={a.id} asset={a} />)}
          </div>
        )}
      </Section>

      {/* ── Section 2: Webhook Status ─────────────────────────────────────────── */}
      <Section title="Webhook Status" icon={Webhook}>
        {webhookStatus ? (
          <div className="mt-2">
            <WebhookStatusPanel status={webhookStatus} />
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 text-[13px] text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
      </Section>

      {/* ── Section 3: Recent Webhook Events ─────────────────────────────────── */}
      <Section title="Recent Webhook Events" icon={Clock}>
        <div className="flex items-center justify-between mb-3 mt-1">
          <p className="text-[12px] text-zinc-500">Latest 30 inbound events across all channels. Expand for redacted payload.</p>
          <button
            onClick={loadEvents}
            disabled={eventsLoading}
            className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${eventsLoading ? 'animate-spin' : ''}`} />
            Reload
          </button>
        </div>
        {events.length === 0 ? (
          <div className="text-[13px] text-zinc-500 py-2">
            No webhook events yet. Send a message on any connected channel to generate the first event.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => <EventRow key={e.id} event={e} />)}
          </div>
        )}
      </Section>

      {/* ── Section 4: Page Engagement (pages_read_engagement) ───────────────── */}
      <Section title="Page Engagement — Facebook Posts" icon={MessageSquare}>
        <p className="text-[12px] text-zinc-500 mb-3 mt-1">
          Demonstrates <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[11px]">pages_read_engagement</code> permission — fetches live posts from the connected Facebook Page.
        </p>
        {!messengerAsset ? (
          <div className="text-[13px] text-zinc-500">Connect a Facebook Page via Messenger to fetch posts.</div>
        ) : (
          <>
            <div className="text-[12px] text-zinc-600 dark:text-zinc-400 mb-3">
              Page: <strong>{messengerAsset.pageName || messengerAsset.pageId}</strong>{' '}
              <span className="font-mono text-zinc-400">(ID: {messengerAsset.pageId})</span>
            </div>
            <button
              onClick={fetchPosts}
              disabled={postsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[13px] font-medium transition-colors"
            >
              {postsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Fetch Page Posts
            </button>

            {posts?.error && (
              <div className="mt-3 text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {posts.error}
              </div>
            )}
            {posts?.posts && (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] text-zinc-400">{posts.posts.length} posts fetched from <strong>{posts.pageName || posts.pageId}</strong></p>
                {posts.posts.map((p) => (
                  <div key={p.postId} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] text-zinc-800 dark:text-zinc-200 flex-1">
                        {p.message || <span className="text-zinc-400 italic">[no text — {p.type}]</span>}
                      </p>
                      {p.permalinkUrl && (
                        <a href={p.permalinkUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-zinc-400 hover:text-blue-500">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                      <span>ID: {p.postId}</span>
                      <span>{new Date(p.createdTime).toLocaleString('en-GB')}</span>
                      <Badge text={p.type} variant="default" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── Section 5: Messenger Send Proof ──────────────────────────────────── */}
      <Section title="Messenger — Send Test Message" icon={MessageSquare}>
        <p className="text-[12px] text-zinc-500 mb-1 mt-1">
          Demonstrates <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[11px]">pages_messaging</code> permission.
          After sending, open Messenger on your phone to verify delivery.
        </p>
        {!messengerAsset ? (
          <div className="text-[13px] text-zinc-500">No Messenger Page connected.</div>
        ) : (
          <>
            <div className="text-[12px] text-zinc-600 dark:text-zinc-400 mb-1">
              From Page: <strong>{messengerAsset.pageName}</strong> (ID: <span className="font-mono">{messengerAsset.pageId}</span>)
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              Use a PSID from an existing conversation — find it in ChatorAI → Conversations.
            </p>
            <SendTestForm
              channel="messenger"
              onSend={(body) => api.post('/api/meta-review/messenger/send-test', body)}
            />
          </>
        )}
      </Section>

      {/* ── Section 6: Instagram Send Proof ──────────────────────────────────── */}
      <Section title="Instagram — Send Test DM" icon={Camera}>
        <p className="text-[12px] text-zinc-500 mb-1 mt-1">
          Demonstrates <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[11px]">instagram_manage_messages</code> permission.
          After sending, open Instagram DMs on your phone to verify delivery.
        </p>
        {!igAsset ? (
          <div className="text-[13px] text-zinc-500">No Instagram account connected.</div>
        ) : (
          <>
            <div className="text-[12px] text-zinc-600 dark:text-zinc-400 mb-1">
              From: <strong>@{igAsset.igUsername}</strong> (IG ID: <span className="font-mono">{igAsset.igAccountId}</span>)
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              Use the scoped IG user ID from an existing conversation.
            </p>
            <SendTestForm
              channel="instagram"
              onSend={(body) => api.post('/api/meta-review/instagram/send-test', body)}
            />
          </>
        )}
      </Section>

      {/* ── Section 7: WhatsApp Session Message ─────────────────────────────── */}
      <Section title="WhatsApp — Send Session Message" icon={Phone}>
        <p className="text-[12px] text-zinc-500 mb-1 mt-1">
          Demonstrates <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[11px]">whatsapp_business_messaging</code> permission.
          Only works inside a 24-hour customer-initiated window. Open WhatsApp on your phone to verify.
        </p>
        {!waAsset ? (
          <div className="text-[13px] text-zinc-500">No WhatsApp account connected.</div>
        ) : (
          <>
            <div className="text-[12px] text-zinc-600 dark:text-zinc-400 mb-1">
              From: <strong>{waAsset.displayName || waAsset.phone}</strong>
              {' · '}Phone ID: <span className="font-mono">{waAsset.phoneNumberId}</span>
              {' · '}WABA ID: <span className="font-mono">{waAsset.wabaId}</span>
            </div>
            <SendTestForm
              channel="whatsapp"
              onSend={(body) => api.post('/api/meta-review/whatsapp/send-test', body)}
            />
          </>
        )}
      </Section>

      {/* ── Section 8: WhatsApp Templates ─────────────────────────────────────── */}
      <Section title="WhatsApp Templates — List &amp; Send" icon={FileText}>
        <p className="text-[12px] text-zinc-500 mb-3 mt-1">
          Demonstrates <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[11px]">whatsapp_business_management</code> permission.
          Templates must be approved by Meta before sending.
        </p>
        {!waAsset ? (
          <div className="text-[13px] text-zinc-500">No WhatsApp account connected.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[12px] text-zinc-600 dark:text-zinc-400">
                WABA ID: <span className="font-mono">{waAsset.wabaId}</span>
              </div>
              <button
                onClick={fetchTemplates}
                disabled={templatesLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-[12px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {templatesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Fetch Templates
              </button>
              <a
                href={`https://business.facebook.com/wa/manage/message-templates/?waba_id=${waAsset.wabaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                Manage in Meta
              </a>
            </div>

            {templates?.error && (
              <div className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">
                {templates.error}
              </div>
            )}
            {templates?.templates && (
              <div className="space-y-2 mb-6">
                <p className="text-[11px] text-zinc-400">{templates.templates.length} templates found</p>
                {templates.templates.map((t) => <TemplateRow key={t.templateId} tmpl={t} />)}
              </div>
            )}

            {templates?.templates && (
              <>
                <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
                <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Send Approved Template</p>
                <TemplateSendForm templates={templates.templates} />
              </>
            )}
          </>
        )}
      </Section>

      {/* ── Footer note ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 p-4 text-[12px] text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Recording checklist</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Show this page and all Connected Assets with real IDs visible</li>
          <li>Show Webhook Status panel with callback URLs and last event timestamp</li>
          <li>Show at least one Webhook Event expanded with redacted payload</li>
          <li>Click Fetch Page Posts and show real posts loaded</li>
          <li>Send a Messenger test message → open native Messenger and confirm delivery</li>
          <li>Send an Instagram test DM → open native Instagram and confirm delivery</li>
          <li>Show WhatsApp templates list → send an approved template → confirm in native WhatsApp</li>
          <li>Ensure no raw API keys or full phone numbers are visible in the recording</li>
        </ul>
      </div>
    </div>
  );
}
