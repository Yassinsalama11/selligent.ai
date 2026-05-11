'use client';

/**
 * Meta App Review Evidence panel.
 * Embedded inside each channel section of Settings — uses the already-loaded
 * channel connection record and credential details. Does NOT create its own
 * channel connection state.
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CheckCircle2, XCircle, RefreshCcw, Send, ChevronDown, ChevronUp,
  ExternalLink, Loader2, Webhook, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || 'https://api.chatorai.com';

const WEBHOOK_URLS = {
  messenger: `${BACKEND_URL}/api/webhooks/messenger`,
  instagram: `${BACKEND_URL}/api/webhooks/instagram`,
  whatsapp:  `${BACKEND_URL}/api/webhooks/whatsapp`,
};

const SUBSCRIBED_FIELDS = {
  messenger: 'messages, messaging_postbacks',
  instagram: 'messages',
  whatsapp:  'messages',
};

/* ── tiny shared helpers ─────────────────────────────────────────────────── */

function Row({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-44">{label}</span>
      <span className={`text-xs break-all text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StatusPill({ text, ok }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
      ${ok ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
           : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
      {text}
    </span>
  );
}

function EventCard({ event }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 text-left transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">{event.event_type}</span>
            <StatusPill text={event.processed_status} ok={event.processed_status === 'processed'} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{event.summary}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {new Date(event.received_at).toLocaleString('en-GB')}
          </p>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
               : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 border-t border-border/40 space-y-0.5 bg-muted/20">
          <Row label="Provider Event ID" value={event.provider_event_id} mono />
          <Row label="Asset ID" value={event.asset_id} mono />
          <Row label="Asset Name" value={event.asset_name} />
          <Row label="Received" value={new Date(event.received_at).toLocaleString('en-GB')} />
          {event.processed_at && <Row label="Processed" value={new Date(event.processed_at).toLocaleString('en-GB')} />}
          {event.raw_payload_redacted && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Redacted payload</p>
              <pre className="bg-muted rounded p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto">
                {JSON.stringify(event.raw_payload_redacted, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SendTestForm({ channel, chDetails }) {
  const [to, setTo] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('Hello — Meta App Review test message from ChatorAI.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body = channel === 'whatsapp'
        ? { to, message }
        : { recipientId, message };
      const data = await api.post(`/api/channels/${channel}/send-test`, body);
      setResult({ ok: true, data });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {channel === 'whatsapp' ? (
        <div>
          <Label className="text-xs">Recipient Phone (E.164 format)</Label>
          <Input className="h-8 text-xs mt-1" placeholder="+201234567890"
            value={to} onChange={e => setTo(e.target.value)} required />
        </div>
      ) : (
        <div>
          <Label className="text-xs">
            {channel === 'messenger' ? 'Recipient PSID' : 'Recipient IG Scoped User ID'}
          </Label>
          <Input className="h-8 text-xs mt-1"
            placeholder="Find in Conversations → open a conversation → copy the channel customer ID"
            value={recipientId} onChange={e => setRecipientId(e.target.value)} required />
        </div>
      )}
      <div>
        <Label className="text-xs">Message</Label>
        <Input className="h-8 text-xs mt-1" value={message}
          onChange={e => setMessage(e.target.value)} required />
      </div>
      <Button type="submit" size="sm" disabled={loading} className="h-8 gap-1.5">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Send Test Message
      </Button>

      {result && (
        <div className={`rounded-lg px-3 py-2 text-xs ${result.ok
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
          {result.ok ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sent successfully
              </div>
              {result.data?.providerMessageId && (
                <div className="font-mono text-[11px]">Provider message ID: {result.data.providerMessageId}</div>
              )}
              <div className="text-[11px] opacity-70">Open the native app on your phone to confirm delivery.</div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> {result.error}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export function ChannelReviewEvidence({ channelKey, chDetails, isConnected }) {
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [posts, setPosts] = useState(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateTo, setTemplateTo] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateSending, setTemplateSending] = useState(false);
  const [templateResult, setTemplateResult] = useState(null);
  const [open, setOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await api.get(`/api/channels/${channelKey}/webhook-events`);
      setEvents(data.events || []);
    } catch (err) {
      setEvents({ error: err.message });
    } finally {
      setEventsLoading(false);
    }
  }, [channelKey]);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await api.post('/api/channels/messenger/fetch-page-posts', {});
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
      const data = await api.get('/api/channels/whatsapp/templates');
      setTemplates(data);
    } catch (err) {
      setTemplates({ error: err.message });
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  async function sendTemplate(e) {
    e.preventDefault();
    setTemplateSending(true);
    setTemplateResult(null);
    try {
      const tmpl = templates?.templates?.find(t => t.name === selectedTemplate);
      const data = await api.post('/api/channels/whatsapp/send-template-test', {
        to: templateTo,
        templateName: selectedTemplate,
        languageCode: tmpl?.language || 'ar',
      });
      setTemplateResult({ ok: true, data });
    } catch (err) {
      setTemplateResult({ ok: false, error: err.message });
    } finally {
      setTemplateSending(false);
    }
  }

  if (!isConnected) return null;

  const backendUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' ? 'http://localhost:3011' : 'https://api.chatorai.com')
    : 'https://api.chatorai.com';
  const callbackUrl = `${backendUrl}/api/webhooks/${channelKey}`;
  const approvedTemplates = Array.isArray(templates?.templates)
    ? templates.templates.filter(t => t.status === 'APPROVED')
    : [];

  return (
    <Card className="border shadow-sm bg-card">
      <CardHeader className="border-b bg-muted/5 pb-4 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              Meta App Review Evidence
            </CardTitle>
            <CardDescription>
              Live evidence for Meta App Review — webhook logs, engagement data, and send-proof for this channel.
            </CardDescription>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="p-6 space-y-8">

          {/* ── 1. Connection Identity ─────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold mb-3">Connection Identity</p>
            <div className="rounded-lg border border-border/60 p-4 space-y-0.5">
              {channelKey === 'messenger' && (
                <>
                  <Row label="Page Name" value={chDetails?.pageName} />
                  <Row label="Page ID" value={chDetails?.pageId} mono />
                  <Row label="Permissions Granted" value="pages_manage_metadata, pages_read_engagement, pages_messaging" />
                </>
              )}
              {channelKey === 'instagram' && (
                <>
                  <Row label="IG Username" value={chDetails?.instagramBusinessAccountUsername ? `@${chDetails.instagramBusinessAccountUsername}` : ''} />
                  <Row label="IG Account ID" value={chDetails?.instagramBusinessAccountId} mono />
                  <Row label="Linked Page" value={chDetails?.pageName} />
                  <Row label="Page ID" value={chDetails?.pageId} mono />
                  <Row label="Permissions Granted" value="instagram_manage_messages, pages_manage_metadata" />
                </>
              )}
              {channelKey === 'whatsapp' && (
                <>
                  <Row label="Display Name" value={chDetails?.displayName} />
                  <Row label="Phone Number" value={chDetails?.phone} mono />
                  <Row label="Phone Number ID" value={chDetails?.phoneNumberId} mono />
                  <Row label="WABA ID" value={chDetails?.wabaId} mono />
                  <Row label="Business Name" value={chDetails?.businessName} />
                  <Row label="Business ID" value={chDetails?.businessId} mono />
                  <Row label="Quality Rating" value={chDetails?.qualityRating} />
                  <Row label="Verification Status" value={chDetails?.codeVerificationStatus || chDetails?.verified ? 'VERIFIED' : ''} />
                  <Row label="Permissions Granted" value="whatsapp_business_messaging, whatsapp_business_management" />
                </>
              )}
              <Row label="Access Token" value={chDetails?.accessTokenMasked} mono />
            </div>
          </div>

          {/* ── 2. Webhook Status + Events ────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Webhook Status &amp; Events</p>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
                onClick={loadEvents} disabled={eventsLoading}>
                <RefreshCcw className={`h-3 w-3 ${eventsLoading ? 'animate-spin' : ''}`} />
                {events === null ? 'Load Events' : 'Reload'}
              </Button>
            </div>
            <div className="rounded-lg border border-border/60 p-4 space-y-0.5 mb-4">
              <Row label="Callback URL" value={callbackUrl} mono />
              <Row label="Object Type" value={channelKey === 'whatsapp' ? 'whatsapp_business_account' : 'page'} />
              <Row label="Subscribed Fields" value={SUBSCRIBED_FIELDS[channelKey] || 'messages'} />
              <Row label="Verification Token" value="airos_verify (platform-managed)" />
            </div>
            {events === null && !eventsLoading && (
              <p className="text-xs text-muted-foreground">Click Load Events to see recent webhook activity for this channel.</p>
            )}
            {eventsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading events…
              </div>
            )}
            {events?.error && (
              <p className="text-xs text-red-600 dark:text-red-400">{events.error}</p>
            )}
            {Array.isArray(events) && (
              events.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No events yet for this channel. Send a message to your connected {channelKey === 'messenger' ? 'Page' : channelKey === 'instagram' ? 'Instagram account' : 'WhatsApp number'} to generate one.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">{events.length} recent event{events.length !== 1 ? 's' : ''}</p>
                  {events.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )
            )}
          </div>

          {/* ── 3. Page Engagement (Messenger only) ───────────────────────── */}
          {channelKey === 'messenger' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">Page Engagement</p>
                  <p className="text-xs text-muted-foreground">Demonstrates <code className="bg-muted px-1 rounded">pages_read_engagement</code> — fetches live posts from your connected Facebook Page.</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0"
                  onClick={fetchPosts} disabled={postsLoading}>
                  {postsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                  Fetch Page Posts
                </Button>
              </div>
              {chDetails?.pageName && (
                <p className="text-xs text-muted-foreground mb-3">
                  Page: <strong>{chDetails.pageName}</strong>
                  {chDetails.pageId && <span className="font-mono ml-2 text-muted-foreground/70">(ID: {chDetails.pageId})</span>}
                </p>
              )}
              {posts?.error && <p className="text-xs text-red-600 dark:text-red-400">{posts.error}</p>}
              {posts?.posts && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">{posts.posts.length} post{posts.posts.length !== 1 ? 's' : ''} from {posts.pageName || posts.pageId}</p>
                  {posts.posts.map(p => (
                    <div key={p.postId} className="border border-border/60 rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs flex-1">
                          {p.message || <span className="text-muted-foreground italic">[{p.type}]</span>}
                        </p>
                        {p.permalinkUrl && (
                          <a href={p.permalinkUrl} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                        <span>ID: {p.postId}</span>
                        <span>{new Date(p.createdTime).toLocaleString('en-GB')}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{p.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 4. Send Test Message ──────────────────────────────────────── */}
          {['messenger', 'instagram', 'whatsapp'].includes(channelKey) && (
            <div>
              <p className="text-sm font-semibold mb-1">Send Test Message</p>
              <p className="text-xs text-muted-foreground mb-3">
                {channelKey === 'messenger' && 'Demonstrates pages_messaging — use a PSID from an existing Conversation.'}
                {channelKey === 'instagram' && 'Demonstrates instagram_manage_messages — use a scoped IG user ID from an existing Conversation.'}
                {channelKey === 'whatsapp' && 'Demonstrates whatsapp_business_messaging — works within a 24-hour customer-initiated window.'}
              </p>
              <SendTestForm channel={channelKey} chDetails={chDetails} />
            </div>
          )}

          {/* ── 5. WhatsApp Templates ─────────────────────────────────────── */}
          {channelKey === 'whatsapp' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    WhatsApp Templates
                  </p>
                  <p className="text-xs text-muted-foreground">Demonstrates <code className="bg-muted px-1 rounded">whatsapp_business_management</code></p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
                    onClick={fetchTemplates} disabled={templatesLoading}>
                    <RefreshCcw className={`h-3 w-3 ${templatesLoading ? 'animate-spin' : ''}`} />
                    {templates === null ? 'Fetch Templates' : 'Reload'}
                  </Button>
                  {chDetails?.wabaId && (
                    <a
                      href={`https://business.facebook.com/wa/manage/message-templates/?waba_id=${chDetails.wabaId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Manage in Meta
                    </a>
                  )}
                </div>
              </div>

              {templates?.error && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{templates.error}</p>}
              {Array.isArray(templates?.templates) && (
                <div className="space-y-2 mb-6">
                  <p className="text-[11px] text-muted-foreground">{templates.templates.length} template{templates.templates.length !== 1 ? 's' : ''} in WABA {chDetails?.wabaId}</p>
                  {templates.templates.map(t => (
                    <div key={t.templateId} className="border border-border/60 rounded-lg p-3 space-y-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold">{t.name}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusPill text={t.status} ok={t.status === 'APPROVED'} />
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{t.language}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{t.category}</Badge>
                        </div>
                      </div>
                      <Row label="Template ID" value={t.templateId} mono />
                      {t.rejectedReason && <Row label="Rejected Reason" value={t.rejectedReason} />}
                      {t.components?.filter(c => c.text).map((c, i) => (
                        <Row key={i} label={c.type} value={c.text} />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {approvedTemplates.length > 0 && (
                <form onSubmit={sendTemplate} className="space-y-3 border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold">Send Approved Template</p>
                  <div>
                    <Label className="text-xs">Recipient Phone (E.164)</Label>
                    <Input className="h-8 text-xs mt-1" placeholder="+201234567890"
                      value={templateTo} onChange={e => setTemplateTo(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs">Template</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 h-8 text-xs bg-background mt-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                      required>
                      <option value="">Select an approved template…</option>
                      {approvedTemplates.map(t => (
                        <option key={t.templateId} value={t.name}>{t.name} ({t.language})</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" size="sm" disabled={templateSending} className="h-8 gap-1.5">
                    {templateSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Send Template
                  </Button>
                  {templateResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs ${templateResult.ok
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                      {templateResult.ok ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Template sent
                          </div>
                          {templateResult.data?.providerMessageId && (
                            <div className="font-mono text-[11px]">Provider ID: {templateResult.data.providerMessageId}</div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5" /> {templateResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ── Recording checklist ───────────────────────────────────────── */}
          <div className="rounded-lg bg-muted/40 border border-border/40 p-4">
            <p className="text-xs font-semibold mb-2">Recording Checklist for This Channel</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              {channelKey === 'messenger' && <>
                <li>Show Connection Identity (Page Name + Page ID) on screen</li>
                <li>Load Events → show at least one event with provider event ID visible</li>
                <li>Click Fetch Page Posts → show real posts with post IDs</li>
                <li>Enter PSID + message → click Send → show provider message ID</li>
                <li>Open native Facebook Messenger on phone → verify same message received</li>
              </>}
              {channelKey === 'instagram' && <>
                <li>Show IG username + IG Account ID + linked Page visible</li>
                <li>Load Events → show at least one event</li>
                <li>Enter IG scoped user ID + message → click Send → show provider message ID</li>
                <li>Open native Instagram DM on phone → verify same message received</li>
              </>}
              {channelKey === 'whatsapp' && <>
                <li>Show WABA ID + Phone Number ID + display name visible</li>
                <li>Load Events → show at least one inbound event</li>
                <li>Fetch Templates → show list with APPROVED template visible</li>
                <li>Send template → show provider message ID → verify in native WhatsApp</li>
                <li>Send session message → show provider message ID → verify in native WhatsApp</li>
              </>}
              <li>Confirm no raw API keys or full access tokens visible in recording</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
