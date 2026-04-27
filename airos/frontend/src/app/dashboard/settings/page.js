'use client';

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Settings, User, Building2, Users, Layers, BarChart3, Trash2,
  Layout as LayoutIcon, Palette, Globe, Mail, ShieldAlert, Tags as TagsIcon,
  MessageSquare, Bot, Zap, Route, TrendingUp, Lock, ChevronRight, Plus,
  Save, Smartphone, Camera, MessageCircle, Monitor, RefreshCcw,
  Eye, Shield, FileUp, LineChart, Calendar, Play, X, Edit2, Key,
  CheckCircle2, XCircle, AlertCircle, Minus, Clock, Menu, KeyRound,
} from 'lucide-react';

import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionHeader } from '@/components/ui/section-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/* ── Sidebar Structure ──────────────────────────────────────────────────── */

const STRUCTURE = [
  { group: 'GENERAL', items: [
    { id: 'profile',      label: 'My Profile',           icon: User },
    { id: 'company',      label: 'Company Profile',       icon: Building2 },
    { id: 'operators',    label: 'Operators',             icon: Users },
    { id: 'departments',  label: 'Departments',           icon: Layers },
    { id: 'usage',        label: 'Usage Statistics',      icon: BarChart3 },
    { id: 'recycle_bin',  label: 'Recycle Bin',           icon: Trash2 },
    { id: 'layout',       label: 'Conversation Layout',   icon: LayoutIcon },
  ]},
  { group: 'PERSONALIZE', items: [
    { id: 'brands',       label: 'Brands',                icon: Palette },
    { id: 'global',       label: 'Global Settings',       icon: Globe },
    { id: 'email_tpl',    label: 'Email Templates',        icon: Mail },
    { id: 'profanity',    label: 'Profanity Library',      icon: ShieldAlert },
    { id: 'tags',         label: 'Tags',                  icon: TagsIcon },
  ]},
  { group: 'MESSAGING CHANNELS', items: [
    { id: 'ch_messenger', label: 'Facebook Messenger',    icon: MessageCircle },
    { id: 'ch_livechat',  label: 'Live Chat',             icon: Monitor },
    { id: 'ch_instagram', label: 'Instagram',             icon: Camera },
    { id: 'ch_whatsapp',  label: 'WhatsApp',              icon: Smartphone },
  ]},
  { group: 'AI', items: [
    { id: 'ai_config',    label: 'AI Configuration',      icon: Bot },
  ]},
  { group: 'AUTOMATE', items: [
    { id: 'triggers',        label: 'Triggers',           icon: Zap },
    { id: 'visitor_routing', label: 'Visitor Routing',    icon: Route },
    { id: 'chat_routing',    label: 'Chat Routing',       icon: Route },
    { id: 'lead_scoring',    label: 'Lead Scoring',       icon: TrendingUp },
    { id: 'company_scoring', label: 'Company Scoring',    icon: LineChart },
    { id: 'schedule_report', label: 'Schedule Report',    icon: Calendar },
  ]},
  { group: 'CONTROLS', items: [
    { id: 'monitor',      label: 'Conversation Monitor',  icon: Eye },
    { id: 'import',       label: 'Import',                icon: FileUp },
    { id: 'profiles',     label: 'Profiles',              icon: Shield },
    { id: 'spammers',     label: 'Spammers',              icon: ShieldAlert },
  ]},
];

// Maps section id → API URL slug
function sectionUrl(id) {
  const map = {
    visitor_routing: 'visitor-routing',
    lead_scoring:    'lead-scoring',
    chat_routing:    'chat-routing',
    company_scoring: 'company-scoring',
    schedule_report: 'schedule-report',
    email_tpl:       'email-templates',
    recycle_bin:     'recycle-bin',
  };
  return map[id] || id.replaceAll('_', '-');
}

// Sections that load dedicated data via activeData
const ACTIVE_DATA_SECTIONS = new Set([
  'departments', 'brands', 'triggers', 'visitor_routing', 'lead_scoring',
  'chat_routing', 'company_scoring', 'schedule_report', 'email_tpl',
  'profanity', 'layout', 'profiles', 'import', 'spammers', 'monitor',
]);

/* ── Reusable UI helpers ────────────────────────────────────────────────── */

function SettingSection({ title, description, children, onSave, saving, loading }) {
  return (
    <Card className="border shadow-sm bg-card">
      <CardHeader className="border-b bg-muted/5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onSave && (
            <Button onClick={onSave} disabled={saving || loading} className="h-9 gap-2 px-6 bg-primary font-medium">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground/30" />
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-muted border',
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-6' : 'translate-x-1',
      )} />
    </button>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground opacity-30" />
      </div>
      <p className="text-sm text-muted-foreground italic">{text}</p>
    </div>
  );
}

function UsageBar({ label, used, limit }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Authoritative channel connection normalizer.
 *
 * Uses channel_connections.status as the single source of truth.
 * Never derives connected state from credential decryption, because
 * an ENCRYPTION_KEY rotation makes a live channel appear disconnected.
 */
function normalizeChannelConnection(rec) {
  const isConnected = rec?.status === 'active';
  const details = (rec && typeof rec.details === 'object' && rec.details !== null) ? rec.details : {};
  const detailsAvailable = Object.values(details).some(v => v && v !== '');
  const displayName =
    details.pageName ||
    details.instagramBusinessAccountUsername ||
    details.displayName ||
    details.domain ||
    rec?.channel ||
    '';
  return { isConnected, status: rec?.status || null, details, detailsAvailable, displayName };
}

function ChannelStatus({ connected }) {
  return connected
    ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>
    : <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Not connected</Badge>;
}

/* ── Lead Scoring: predefined signals that matchesRule() recognises ─────── */

const LEAD_SIGNALS = [
  { signal: 'buy/order keywords',      label: 'Buy / Order Keywords' },
  { signal: 'replies within 5 minutes', label: 'Replies Within 5 Minutes' },
  { signal: 'more than 3 messages',    label: 'More Than 3 Messages' },
  { signal: 'shares phone number',     label: 'Shares Phone Number' },
  { signal: 'price objection',         label: 'Price Objection' },
  { signal: 'return/refund',           label: 'Return / Refund Request' },
];

/* ── Import: expected column templates per type ─────────────────────────── */

const IMPORT_COLUMNS = {
  conversations: ['customer_name', 'customer_phone', 'channel', 'message', 'direction', 'sent_at'],
  pipeline:      ['contact_name', 'phone', 'email', 'stage', 'estimated_value', 'notes'],
  tickets:       ['customer_name', 'subject', 'description', 'status', 'priority', 'created_at'],
};

/* ── Trigger engine events ─────────────────────────────────────────────── */

const TRIGGER_EVENTS = [
  { value: 'message_received',     label: 'Message Received' },
  { value: 'conversation_started', label: 'Conversation Started' },
  { value: 'score_updated',        label: 'Score Updated' },
  { value: 'intent_detected',      label: 'Intent Detected' },
  { value: 'ready_to_buy',         label: 'Ready to Buy' },
  { value: 'ticket_created',       label: 'Ticket Created' },
  { value: 'deal_stage_changed',   label: 'Deal Stage Changed' },
];

const TRIGGER_CONDITION_FIELDS = [
  { value: 'score',         label: 'Lead Score' },
  { value: 'intent',        label: 'AI Intent' },
  { value: 'channel',       label: 'Channel' },
  { value: 'language',      label: 'Language' },
  { value: 'message_count', label: 'Message Count' },
  { value: 'wait_time',     label: 'Wait Time (sec)' },
  { value: 'tag',           label: 'Tag' },
];

const TRIGGER_CONDITION_OPS = [
  { value: '>=',       label: '>=' },
  { value: '<=',       label: '<=' },
  { value: '=',        label: 'equals' },
  { value: '!=',       label: 'not equals' },
  { value: 'contains', label: 'contains' },
];

const TRIGGER_ACTION_TYPES = [
  { value: 'add_tag',            label: 'Add Tag' },
  { value: 'remove_tag',         label: 'Remove Tag' },
  { value: 'assign_to',          label: 'Assign To' },
  { value: 'send_message',       label: 'Send Message' },
  { value: 'notify_agent',       label: 'Notify Agent' },
  { value: 'close_conversation', label: 'Close Conversation' },
  { value: 'update_score',       label: 'Adjust Score (+/-)' },
];

const ROUTING_CONDITION_FIELDS = [
  { value: 'channel',  label: 'Channel' },
  { value: 'language', label: 'Language' },
  { value: 'intent',   label: 'AI Intent' },
  { value: 'score',    label: 'Lead Score' },
  { value: 'keyword',  label: 'Message Keyword' },
  { value: 'country',  label: 'Country' },
  { value: 'tag',      label: 'Tag' },
];

const ROUTING_CONDITION_OPS = [
  { value: '=',        label: 'equals' },
  { value: '!=',       label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: '>=',       label: '>=' },
  { value: '<=',       label: '<=' },
];

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [activeId, setActiveId] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Core data — settings is guaranteed non-null (demo mode returns null from API) */
  const [_rawSettings, _setRawSettings] = useState({});
  const settings = _rawSettings ?? {};
  const setSettings = React.useCallback((v) => _setRawSettings(v ?? {}), []);
  const [team, setTeam] = useState([]);
  const [channels, setChannels] = useState([]);
  const [usage, setUsage] = useState(null);
  const [recycle, setRecycle] = useState([]);
  const [activeData, setActiveData] = useState(null);

  /* Operator dialog state */
  const [opDialog, setOpDialog] = useState(null); // null | 'invite' | { mode:'edit', member }
  const [opForm, setOpForm] = useState({ name: '', email: '', role: 'agent', password: '', department: '' });
  const [opSaving, setOpSaving] = useState(false);

  /* Live Chat widget setup dialog */
  const [lcDialog, setLcDialog] = useState(false);
  const [lcForm, setLcForm] = useState({ domain: '', color: '#ff5a1f' });

  /* New tag input */
  const [tagInput, setTagInput] = useState('');

  /* Spammer input */
  const [spamInput, setSpamInput] = useState('');

  /* Spammer add dialog */
  const [spamDialog, setSpamDialog] = useState(false); // false | true
  const [spamForm, setSpamForm] = useState({ value: '', type: 'phone', reason: '', severity: 'medium', temporary: false, expiresAt: '', whitelisted: false });

  /* Monitor supervisor action loading */
  const [monitorActionLoading, setMonitorActionLoading] = useState({});

  /* Import CSV preview */
  const [importPreview, setImportPreview] = useState(null);

  /* Section loading (for activeData sections) */
  const [sectionLoading, setSectionLoading] = useState(false);

  /* Import state */
  const [importType, setImportType] = useState('conversations');
  const [importFile, setImportFile] = useState(null);
  const [importUploading, setImportUploading] = useState(false);
  const [importProcessing, setImportProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);

  /* Mobile nav sheet */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Password change (My Profile) */
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  /* Email template test-send */
  const [tplTestSending, setTplTestSending] = useState(null); // null or index

  /* Profanity word add */
  const [wordInput, setWordInput] = useState('');
  const [wordSeverity, setWordSeverity] = useState('medium');
  const [wordAction, setWordAction] = useState('flag');

  /* Tag add */
  const [tagMeta, setTagMeta] = useState({}); // local mirror of settings.tagMeta
  const [tagColor, setTagColor] = useState('#6366f1');
  const [tagCategory, setTagCategory] = useState('');
  const [tagDesc, setTagDesc] = useState('');

  /* Channel config + health */
  const [chConfig, setChConfig] = useState({});
  const [chHealth, setChHealth] = useState(null);
  const [chConfigSaving, setChConfigSaving] = useState(false);
  const [chConfigLoading, setChConfigLoading] = useState(false);

  /* AI Configuration section */
  const [aiSection, setAiSection] = useState('identity');
  const [aiConfig, setAiConfig] = useState(null);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [aiPrompts, setAiPrompts] = useState([]);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSimInput, setAiSimInput] = useState('');
  const [aiSimChannel, setAiSimChannel] = useState('livechat');
  const [aiSimResult, setAiSimResult] = useState(null);
  const [aiSimulating, setAiSimulating] = useState(false);

  /* Departments list (loaded with core, used for routing dropdowns) */
  const [depts, setDepts] = useState([]);

  /* ── Load ─────────────────────────────────────────────────────────────── */

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, ch, usg, rec, dp] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/auth/team'),
        api.get('/api/channels'),
        api.get('/api/settings/usage').catch(() => null),
        api.get('/api/settings/recycle-bin').catch(() => []),
        api.get('/api/settings/departments').catch(() => []),
      ]);

      // Pre-populate profile from session user when JSONB profile is empty
      let merged = s || {};
      try {
        const sessionUser = JSON.parse(localStorage.getItem('airos_user') || 'null');
        if (sessionUser && (!merged.profile?.name || !merged.profile?.email)) {
          merged = {
            ...merged,
            profile: {
              name: sessionUser.name || '',
              email: sessionUser.email || '',
              ...(merged.profile || {}),
            },
          };
        }
      } catch { /* ignore localStorage parse errors */ }

      setSettings(merged);
      setTagMeta(merged.tagMeta && typeof merged.tagMeta === 'object' && !Array.isArray(merged.tagMeta) ? merged.tagMeta : {});
      setTeam(t || []);
      setChannels(ch || []);
      setUsage(usg);
      setRecycle(rec || []);
      setDepts(Array.isArray(dp) ? dp : []);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadActiveSection(id) {
    if (!ACTIVE_DATA_SECTIONS.has(id)) { setActiveData(null); return; }
    setSectionLoading(true);
    setActiveData(null);
    try {
      const data = await api.get(`/api/settings/${sectionUrl(id)}`);
      // Post-process visitor_routing: DB rules are in engine format, convert to UI flat format
      if (id === 'visitor_routing' && data?.rules) {
        data.rules = data.rules.map(engineRuleToUiFormat);
      }
      setActiveData(data ?? null);
    } catch (err) {
      console.error('Section load error', id, err);
      setActiveData(null);
    } finally {
      setSectionLoading(false);
    }
  }

  /** Convert DB engine rule format → UI flat format for display */
  function engineRuleToUiFormat(rule) {
    const conditions = rule.conditions || {};
    let conditionField = 'channel';
    let conditionOp = '=';
    let conditionValue = '';
    for (const [key, val] of Object.entries(conditions)) {
      if (Array.isArray(val) && val.length > 0) {
        conditionField = key === 'keywords' ? 'keyword' : key;
        conditionValue = val[0];
        break;
      }
    }
    const action = rule.action || {};
    let assignTo = '';
    if (action.assign_to_user) assignTo = `agent:${action.assign_to_user}`;
    else if (action.assign_to_team) assignTo = `dept:${action.assign_to_team}`;
    else if (action.assign_to_ai) assignTo = 'ai_bot';
    else if (action.assign_to_queue) assignTo = 'queue';
    return { ...rule, conditionField, conditionOp, conditionValue, assignTo };
  }

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { loadActiveSection(activeId); }, [activeId]); // eslint-disable-line

  /* Auto-refresh Conversation Monitor every 30 s while section is active */
  useEffect(() => {
    if (activeId !== 'monitor') return;
    const id = setInterval(() => loadActiveSection('monitor'), 30_000);
    return () => clearInterval(id);
  }, [activeId]); // eslint-disable-line

  /* Load channel config + health when switching to a channel section */
  const CH_SECTION_MAP = { ch_messenger: 'messenger', ch_livechat: 'livechat', ch_instagram: 'instagram', ch_whatsapp: 'whatsapp' };
  useEffect(() => {
    const channelName = CH_SECTION_MAP[activeId];
    if (channelName) loadChannelConfig(channelName);
    else { setChConfig({}); setChHealth(null); }
  }, [activeId]); // eslint-disable-line

  /* Load AI config when switching to ai_config section */
  useEffect(() => {
    if (activeId === 'ai_config') { setAiSection('identity'); loadAiConfig(); }
  }, [activeId]); // eslint-disable-line

  /* ── Settings helpers ─────────────────────────────────────────────────── */

  function updateNested(path, value) {
    setSettings(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] };
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      // When the profile section is active, also update the real users table
      if (activeId === 'profile' && settings.profile?.name && settings.profile?.email) {
        try {
          const updatedUser = await api.patch('/api/auth/me', {
            name: settings.profile.name,
            email: settings.profile.email,
          });
          // Sync the session user in localStorage so sidebar reflects the change
          if (updatedUser?.user) {
            const prev = JSON.parse(localStorage.getItem('airos_user') || '{}');
            localStorage.setItem('airos_user', JSON.stringify({ ...prev, ...updatedUser.user }));
          }
        } catch { /* non-fatal — profile JSONB still saves */ }
      }

      const saved = await api.put('/api/settings', settings);
      setSettings(saved || {});
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveActiveData(payload) {
    if (!ACTIVE_DATA_SECTIONS.has(activeId)) return;
    const data = payload ?? activeData;
    setSaving(true);
    try {
      const saved = await api.put(`/api/settings/${sectionUrl(activeId)}`, data);
      setActiveData(saved ?? data);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  /* ── Monitor supervisor actions ─────────────────────────────────────────── */

  async function handleMonitorAssignMe(convId) {
    const me = JSON.parse(localStorage.getItem('airos_user') || 'null');
    if (!me?.id) { toast.error('No user session found'); return; }
    const key = `${convId}_assign`;
    setMonitorActionLoading(p => ({ ...p, [key]: true }));
    try {
      await api.patch(`/api/conversations/${convId}/assign`, { user_id: me.id });
      toast.success('Assigned to you');
      // Optimistic update in monitor list
      setActiveData(prev => ({
        ...prev,
        conversations: (prev?.conversations || []).map(c =>
          c.id === convId ? { ...c, assigned_to: me.id, agent_name: me.name } : c
        ),
      }));
    } catch (err) {
      toast.error(err.message || 'Assign failed');
    } finally {
      setMonitorActionLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleMonitorPauseAI(convId) {
    const key = `${convId}_pause`;
    setMonitorActionLoading(p => ({ ...p, [key]: true }));
    try {
      await api.patch(`/api/conversations/${convId}/ai-mode`, { ai_mode: 'manual' });
      toast.success('AI paused — manual mode');
      setActiveData(prev => ({
        ...prev,
        conversations: (prev?.conversations || []).map(c =>
          c.id === convId ? { ...c, ai_mode: 'manual' } : c
        ),
      }));
    } catch (err) {
      toast.error(err.message || 'Failed to pause AI');
    } finally {
      setMonitorActionLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleMonitorEscalate(convId) {
    const key = `${convId}_escalate`;
    setMonitorActionLoading(p => ({ ...p, [key]: true }));
    try {
      // Pause AI + mark status escalated
      await Promise.all([
        api.patch(`/api/conversations/${convId}/ai-mode`, { ai_mode: 'manual' }),
        api.patch(`/api/conversations/${convId}/status`, { status: 'open', priority: 'urgent' }).catch(() => {}),
      ]);
      toast.success('Escalated — AI paused, priority set to urgent');
      setActiveData(prev => ({
        ...prev,
        conversations: (prev?.conversations || []).map(c =>
          c.id === convId ? { ...c, ai_mode: 'manual', priority: 'urgent', is_urgent: true } : c
        ),
      }));
    } catch (err) {
      toast.error(err.message || 'Escalation failed');
    } finally {
      setMonitorActionLoading(p => ({ ...p, [key]: false }));
    }
  }

  /* ── Import CSV preview ─────────────────────────────────────────────────── */

  function previewCsvFile(file) {
    if (!file || !file.name.endsWith('.csv')) { setImportPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
        if (lines.length === 0) { setImportPreview(null); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 6).map(line =>
          line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        );
        setImportPreview({ headers, rows });
      } catch { setImportPreview(null); }
    };
    reader.readAsText(file);
  }

  /* ── Operators CRUD ───────────────────────────────────────────────────── */

  function openInvite() {
    setOpForm({ name: '', email: '', role: 'agent', password: '', department: '' });
    setOpDialog('invite');
  }

  function openEdit(member) {
    setOpForm({ name: member.name, email: member.email, role: member.role, password: '', department: member.department || '' });
    setOpDialog({ mode: 'edit', member });
  }

  async function handleInviteOperator() {
    if (!opForm.name || !opForm.email) { toast.error('Name and email required'); return; }
    setOpSaving(true);
    try {
      const res = await api.post('/api/auth/invite', {
        name: opForm.name, email: opForm.email, role: opForm.role,
        ...(opForm.password ? { password: opForm.password } : {}),
        ...(opForm.department ? { department: opForm.department } : {}),
      });
      setTeam(prev => [...prev, res.user]);
      if (res.tempPassword) toast.success(`Invited. Temp password: ${res.tempPassword}`);
      else toast.success('Operator invited');
      setOpDialog(null);
    } catch (err) {
      toast.error(err.message || 'Invite failed');
    } finally {
      setOpSaving(false);
    }
  }

  async function handleEditOperator() {
    const id = opDialog?.member?.id;
    if (!id) return;
    setOpSaving(true);
    try {
      const payload = { name: opForm.name, role: opForm.role };
      if (opForm.password) payload.password = opForm.password;
      if (opForm.department !== undefined) payload.department = opForm.department;
      const res = await api.patch(`/api/auth/team/${id}`, payload);
      setTeam(prev => prev.map(m => m.id === id ? res.user : m));
      toast.success('Updated');
      setOpDialog(null);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setOpSaving(false);
    }
  }

  async function handleDeleteOperator(id) {
    if (!window.confirm('Remove this operator from the tenant? This cannot be undone.')) return;
    try {
      await api.delete(`/api/auth/team/${id}`);
      setTeam(prev => prev.filter(m => m.id !== id));
      toast.success('Operator removed');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  }

  /* ── Channel actions ─────────────────────────────────────────────────── */

  async function handleConnectMeta(channel) {
    try {
      const res = await api.get(`/api/channels/meta/oauth-url?channel=${channel}&return_to=/dashboard/settings`);
      if (res?.url) window.location.href = res.url;
    } catch (err) {
      toast.error(err.message || 'OAuth failed');
    }
  }

  async function handleDisconnectChannel(id) {
    if (!window.confirm('Disconnect this channel?')) return;
    try {
      await api.delete(`/api/channels/${id}`);
      setChannels(prev => prev.filter(c => c.id !== id));
      toast.success('Disconnected');
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleConnectLivechat() {
    try {
      const res = await api.post('/api/channels', {
        channel: 'livechat',
        credentials: { domain: lcForm.domain, color: lcForm.color },
      });
      setChannels(prev => {
        const next = prev.filter(c => c.channel !== 'livechat');
        return [...next, res];
      });
      toast.success('Live Chat configured');
      setLcDialog(false);
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  }

  /* ── Recycle bin ─────────────────────────────────────────────────────── */

  async function handleClearRecycleBin() {
    if (!window.confirm('Permanently delete all recycled items?')) return;
    try {
      await api.delete('/api/settings/recycle-bin');
      setRecycle([]);
      toast.success('Recycle bin cleared');
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleRemoveRecycleItem(itemId) {
    try {
      await api.delete(`/api/settings/recycle-bin/${itemId}`);
      setRecycle(prev => prev.filter(r => r.id !== itemId));
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  }

  /* ── Schedule report: run now ─────────────────────────────────────────── */

  async function handleRunReport(reportId) {
    try {
      const res = await api.post(`/api/settings/schedule-report/${reportId}/run`, {});
      const status = res?.[0]?.status;
      if (status === 'sent') toast.success('Report sent');
      else if (status === 'failed') toast.error(`Send failed: ${res?.[0]?.error}`);
      else toast.success('Triggered');
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  }

  /* ── Import: file upload ─────────────────────────────────────────────── */

  async function handleImportUpload() {
    if (!importFile) { toast.error('Select a file first'); return; }
    setImportUploading(true);
    setImportResult(null);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(importFile);
      });

      const uploadRes = await api.post('/api/uploads', {
        data: base64,
        mime_type: importFile.type || 'text/csv',
        file_name: importFile.name,
      });

      // Immediately process after upload
      setImportUploading(false);
      setImportProcessing(true);

      const result = await api.post('/api/settings/import/process', {
        importType,
        filePath: uploadRes.path,
      });

      setImportResult(result);

      // Refresh importConfig to get lastResult persisted
      const saved = await api.get('/api/settings/import');
      setActiveData(saved ?? activeData);

      setImportFile(null);
      const el = document.getElementById('import-file-input');
      if (el) el.value = '';

      if (result.inserted > 0) {
        toast.success(`Import complete: ${result.inserted} rows inserted.`);
      } else {
        toast.error('No rows were inserted. Check the errors below.');
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportUploading(false);
      setImportProcessing(false);
    }
  }

  /* ── Password change (My Profile) ────────────────────────────────────── */

  async function handleChangePassword() {
    const { current, next, confirm } = pwForm;
    if (!current || !next || !confirm) { toast.error('All password fields are required'); return; }
    if (next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (next !== confirm) { toast.error('New passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.patch('/api/auth/password', { currentPassword: current, newPassword: next });
      setPwForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.message || 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  }

  /* ── Tags: save tags + tagMeta together ───────────────────────────────── */

  async function handleSaveTags() {
    setSaving(true);
    try {
      const saved = await api.put('/api/settings', { ...settings, tagMeta });
      setSettings(saved || {});
      setTagMeta(saved.tagMeta && typeof saved.tagMeta === 'object' ? saved.tagMeta : {});
      toast.success('Tags saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  /* ── Email template: test-send ─────────────────────────────────────────── */

  async function handleTestSendTemplate(tpl, idx) {
    setTplTestSending(idx);
    try {
      const res = await api.post('/api/settings/email-templates/test-send', { template: tpl });
      toast.success(`Test email sent to ${res.sentTo}`);
    } catch (err) {
      toast.error(err.message || 'Test send failed');
    } finally {
      setTplTestSending(null);
    }
  }

  /* ── Channel config: load + save ────────────────────────────────────── */

  async function loadChannelConfig(channelName) {
    setChConfig({});
    setChHealth(null);
    setChConfigLoading(true);
    try {
      const [cfg, health] = await Promise.all([
        api.get(`/api/channels/${channelName}/config`).catch(() => ({})),
        api.get(`/api/channels/${channelName}/health`).catch(() => null),
      ]);
      setChConfig(cfg || {});
      setChHealth(health);
    } catch {
      // non-fatal
    } finally {
      setChConfigLoading(false);
    }
  }

  async function handleSaveChConfig(channelName) {
    setChConfigSaving(true);
    try {
      const saved = await api.put(`/api/channels/${channelName}/config`, chConfig);
      setChConfig(saved || chConfig);
      toast.success('Channel settings saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setChConfigSaving(false);
    }
  }

  /* ── AI Configuration helpers ────────────────────────────────────────── */

  async function loadAiConfig() {
    setAiLoading(true);
    setAiConfig(null);
    setAiMetrics(null);
    setAiPrompts([]);
    try {
      const [cfg, metrics, prompts] = await Promise.all([
        api.get('/api/settings/ai').catch(() => null),
        api.get('/api/settings/ai/metrics').catch(() => null),
        api.get('/api/settings/ai/prompts').catch(() => []),
      ]);
      setAiConfig(cfg || {});
      setAiMetrics(metrics);
      setAiPrompts(prompts || []);
    } catch { /* non-fatal */ } finally {
      setAiLoading(false);
    }
  }

  function updateAiConfig(path, value) {
    setAiConfig(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...(cur[parts[i]] || {}) };
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function handleSaveAiConfig(patch) {
    const payload = patch ?? aiConfig;
    setAiSaving(true);
    try {
      const saved = await api.put('/api/settings/ai', payload);
      setAiConfig(saved || payload);
      toast.success('AI configuration saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setAiSaving(false);
    }
  }

  async function handlePinPrompt(promptId, version) {
    try {
      const updated = await api.post(`/api/settings/ai/prompts/${encodeURIComponent(promptId)}/pin`, { version });
      setAiPrompts(prev => prev.map(p => p.id === promptId ? (updated || p) : p));
      toast.success('Prompt version pinned');
    } catch (err) {
      toast.error(err.message || 'Failed to pin prompt');
    }
  }

  async function handleAiSimulate() {
    if (!aiSimInput.trim()) return;
    setAiSimulating(true);
    setAiSimResult(null);
    try {
      const result = await api.post('/api/settings/ai/simulate', { message: aiSimInput, channel: aiSimChannel });
      setAiSimResult(result);
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setAiSimulating(false);
    }
  }

  /* ── Sidebar helpers ─────────────────────────────────────────────────── */

  const activeLabel = useMemo(() =>
    STRUCTURE.flatMap(g => g.items).find(i => i.id === activeId)?.label || 'Settings',
  [activeId]);

  const ActiveIcon = useMemo(() =>
    STRUCTURE.flatMap(g => g.items).find(i => i.id === activeId)?.icon || Settings,
  [activeId]);

  function channelRecord(ch) {
    return channels.find(c => c?.channel === ch) || null;
  }

  /* ── Loading gate ────────────────────────────────────────────────────── */

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="h-8 w-8 text-primary animate-spin opacity-20" />
          <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  /* ── Reusable nav item renderer (shared desktop + mobile) ──────────── */
  function NavItems({ onSelect }) {
    return (
      <div className="space-y-6 pb-20">
        {STRUCTURE.map(group => (
          <div key={group.group} className="space-y-0.5">
            <p className="px-3 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1.5">
              {group.group}
            </p>
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveId(item.id); onSelect?.(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group',
                  activeId === item.id
                    ? 'bg-primary/5 text-primary'
                    : 'text-muted-foreground/80 hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', activeId === item.id ? 'text-primary' : 'opacity-40 group-hover:opacity-100')} />
                <span className="truncate">{item.label}</span>
                {activeId === item.id && <div className="ml-auto w-1 h-4 bg-primary rounded-full" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* Desktop Sidebar — lg and above */}
      <aside className="w-[268px] border-r bg-card flex-col shrink-0 hidden lg:flex">
        <header className="h-14 border-b px-6 flex items-center shrink-0 bg-muted/5">
          <div className="flex items-center gap-3 text-primary">
            <Settings className="h-4 w-4" />
            <h1 className="text-sm font-semibold">Settings</h1>
          </div>
        </header>
        <ScrollArea className="flex-1 px-3 py-4">
          <NavItems />
        </ScrollArea>
      </aside>

      {/* Mobile nav Sheet — below lg */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="bg-muted/5">
            <div className="flex items-center gap-3 text-primary">
              <Settings className="h-4 w-4" />
              <SheetTitle>Settings</SheetTitle>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3 py-4">
            <NavItems onSelect={() => setMobileNavOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/5">
        <header className="h-14 border-b px-4 lg:px-8 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger — hidden on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <ActiveIcon className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold truncate">{activeLabel}</h2>
          </div>
          <Badge variant="outline" className="h-6 font-mono text-[10px] opacity-40 shrink-0">STABLE</Badge>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl mx-auto pb-40 space-y-8">

            {/* ── 1. MY PROFILE ─────────────────────────────────────────── */}
            {activeId === 'profile' && (() => {
              let sessionRole = '';
              try { sessionRole = JSON.parse(localStorage.getItem('airos_user') || '{}')?.role || ''; } catch { /* ignore */ }
              return (
              <div className="space-y-6">
                <SettingSection title="My Profile" description="Your operator identity and display preferences." onSave={handleSaveSettings} saving={saving}>
                  <div className="grid grid-cols-2 gap-6">
                    <Field label="Full Name">
                      <Input value={settings.profile?.name || ''} onChange={e => updateNested('profile.name', e.target.value)} />
                    </Field>
                    <Field label="Work Email">
                      <Input type="email" value={settings.profile?.email || ''} onChange={e => updateNested('profile.email', e.target.value)} />
                    </Field>
                    <Field label="Phone Number">
                      <Input value={settings.profile?.phone || ''} onChange={e => updateNested('profile.phone', e.target.value)} placeholder="+1 555 000 0000" />
                    </Field>
                    <Field label="Job Title">
                      <Input value={settings.profile?.jobTitle || ''} onChange={e => updateNested('profile.jobTitle', e.target.value)} placeholder="e.g. Support Lead" />
                    </Field>
                    <Field label="Timezone">
                      <Input value={settings.profile?.timezone || ''} onChange={e => updateNested('profile.timezone', e.target.value)} placeholder="e.g. Asia/Dubai" />
                    </Field>
                    <Field label="Display Language">
                      <Select value={settings.profile?.lang || 'en'} onValueChange={v => updateNested('profile.lang', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date Format">
                      <Select value={settings.profile?.dateFormat || 'DD/MM/YYYY'} onValueChange={v => updateNested('profile.dateFormat', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Time Format">
                      <Select value={settings.profile?.timeFormat || '24h'} onValueChange={v => updateNested('profile.timeFormat', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {sessionRole && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Role &amp; Permissions</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{sessionRole}</Badge>
                          <span className="text-xs text-muted-foreground">Contact your workspace owner to change role.</span>
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Field label="Email Signature">
                        <Textarea
                          value={settings.profile?.signature || ''}
                          onChange={e => updateNested('profile.signature', e.target.value)}
                          placeholder="Appended to outbound emails…"
                          rows={3}
                        />
                      </Field>
                    </div>
                  </div>
                </SettingSection>

                {/* Notifications */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Notifications</CardTitle>
                        <CardDescription>Choose which events trigger email or browser alerts.</CardDescription>
                      </div>
                      <Button onClick={handleSaveSettings} disabled={saving} className="h-9 gap-2 px-6 bg-primary font-medium">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-0">
                    {[
                      { key: 'profile.notif.emailNewMessage',   label: 'Email — New message assigned to me' },
                      { key: 'profile.notif.emailDailyDigest',  label: 'Email — Daily digest summary' },
                      { key: 'profile.notif.emailAssigned',     label: 'Email — Conversation assigned to me' },
                      { key: 'profile.notif.browserNewMessage', label: 'Browser — New message' },
                      { key: 'profile.notif.browserAssigned',   label: 'Browser — Conversation assigned' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                        <span className="text-sm">{label}</span>
                        <Toggle
                          value={!!(key.split('.').reduce((o, k) => o?.[k], settings))}
                          onChange={v => updateNested(key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Work Preferences */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4 text-muted-foreground" /> Work Preferences</CardTitle>
                        <CardDescription>Personalise your inbox and chat experience.</CardDescription>
                      </div>
                      <Button onClick={handleSaveSettings} disabled={saving} className="h-9 gap-2 px-6 bg-primary font-medium">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-0">
                    {[
                      { key: 'profile.prefs.soundNotifications', label: 'Sound on new message' },
                      { key: 'profile.prefs.autoReadOnOpen',     label: 'Mark conversation as read on open' },
                      { key: 'profile.prefs.compactView',        label: 'Compact conversation list' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                        <span className="text-sm">{label}</span>
                        <Toggle
                          value={!!(key.split('.').reduce((o, k) => o?.[k], settings))}
                          onChange={v => updateNested(key, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Password Change */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          Change Password
                        </CardTitle>
                        <CardDescription>Choose a strong password of at least 8 characters.</CardDescription>
                      </div>
                      <Button onClick={handleChangePassword} disabled={pwSaving} className="h-9 gap-2 px-6 bg-primary font-medium">
                        <Save className="h-4 w-4" />
                        {pwSaving ? 'Saving…' : 'Update Password'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 gap-5 max-w-sm">
                      <Field label="Current Password">
                        <Input
                          type="password"
                          value={pwForm.current}
                          onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                      </Field>
                      <Field label="New Password">
                        <Input
                          type="password"
                          value={pwForm.next}
                          onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                        />
                      </Field>
                      <Field label="Confirm New Password">
                        <Input
                          type="password"
                          value={pwForm.confirm}
                          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              </div>
              );
            })()}

            {/* ── 2. COMPANY PROFILE ────────────────────────────────────── */}
            {activeId === 'company' && (
              <div className="space-y-6">
                <SettingSection title="Company Profile" description="Business identity and contact details." onSave={handleSaveSettings} saving={saving}>
                  <div className="grid grid-cols-2 gap-6">
                    <Field label="Legal / Brand Name">
                      <Input value={settings.company?.name || ''} onChange={e => updateNested('company.name', e.target.value)} />
                    </Field>
                    <Field label="Support Email">
                      <Input type="email" value={settings.company?.email || ''} onChange={e => updateNested('company.email', e.target.value)} />
                    </Field>
                    <Field label="Support Phone">
                      <Input value={settings.company?.supportPhone || ''} onChange={e => updateNested('company.supportPhone', e.target.value)} placeholder="+1 555 000 0000" />
                    </Field>
                    <Field label="Website">
                      <Input value={settings.company?.website || ''} onChange={e => updateNested('company.website', e.target.value)} placeholder="https://example.com" />
                    </Field>
                    <Field label="Industry">
                      <Input value={settings.company?.industry || ''} onChange={e => updateNested('company.industry', e.target.value)} placeholder="e.g. E-commerce, Retail" />
                    </Field>
                    <Field label="Business Type">
                      <Select value={settings.company?.businessType || 'b2c'} onValueChange={v => updateNested('company.businessType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="b2c">B2C — Consumer</SelectItem>
                          <SelectItem value="b2b">B2B — Business</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                          <SelectItem value="saas">SaaS / Software</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Country">
                      <Input value={settings.company?.country || ''} onChange={e => updateNested('company.country', e.target.value)} placeholder="e.g. Saudi Arabia" />
                    </Field>
                    <Field label="City">
                      <Input value={settings.company?.city || ''} onChange={e => updateNested('company.city', e.target.value)} placeholder="e.g. Riyadh" />
                    </Field>
                    <Field label="Address">
                      <Input value={settings.company?.address || ''} onChange={e => updateNested('company.address', e.target.value)} />
                    </Field>
                    <Field label="VAT / Tax Number">
                      <Input value={settings.company?.vatNumber || ''} onChange={e => updateNested('company.vatNumber', e.target.value)} placeholder="Optional" />
                    </Field>
                    <Field label="Timezone">
                      <Input value={settings.company?.timezone || ''} onChange={e => updateNested('company.timezone', e.target.value)} placeholder="e.g. Asia/Dubai" />
                    </Field>
                    <Field label="Currency">
                      <Input value={settings.company?.currency || ''} onChange={e => updateNested('company.currency', e.target.value)} placeholder="e.g. SAR, AED, USD" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Company Description">
                        <Textarea
                          value={settings.company?.description || ''}
                          onChange={e => updateNested('company.description', e.target.value)}
                          placeholder="Brief description of what your business does…"
                          rows={3}
                        />
                      </Field>
                    </div>
                  </div>
                </SettingSection>

                {/* AI Context */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-muted-foreground" /> AI Context</CardTitle>
                        <CardDescription>Shapes the tone and boundaries of every AI reply for this workspace.</CardDescription>
                      </div>
                      <Button onClick={handleSaveSettings} disabled={saving} className="h-9 gap-2 px-6 bg-primary font-medium">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Brand Tone">
                        <Select value={settings.company?.brandTone || 'professional'} onValueChange={v => updateNested('company.brandTone', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly &amp; Casual</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="empathetic">Empathetic</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Default Language">
                        <Select value={settings.company?.defaultLanguage || 'en'} onValueChange={v => updateNested('company.defaultLanguage', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="tr">Turkish</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="col-span-2">
                        <Field label="Forbidden Topics / Replies">
                          <Textarea
                            value={settings.company?.forbiddenTopics || ''}
                            onChange={e => updateNested('company.forbiddenTopics', e.target.value)}
                            placeholder="List topics the AI must never discuss (e.g. competitor prices, refund guarantees)…"
                            rows={3}
                          />
                        </Field>
                      </div>
                      <div className="col-span-2">
                        <Field label="Escalation Rules">
                          <Textarea
                            value={settings.company?.escalationRules || ''}
                            onChange={e => updateNested('company.escalationRules', e.target.value)}
                            placeholder="When should AI hand off to a human? (e.g. angry customer, complaint about order)…"
                            rows={3}
                          />
                        </Field>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Links */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle>Social Links</CardTitle>
                        <CardDescription>Displayed in chat widgets and email signatures.</CardDescription>
                      </div>
                      <Button onClick={handleSaveSettings} disabled={saving} className="h-9 gap-2 px-6 bg-primary font-medium">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { key: 'company.social.instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
                        { key: 'company.social.facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
                        { key: 'company.social.twitter',   label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
                        { key: 'company.social.linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/company/your-co' },
                      ].map(({ key, label, placeholder }) => (
                        <Field key={key} label={label}>
                          <Input
                            value={key.split('.').reduce((o, k) => o?.[k], settings) || ''}
                            onChange={e => updateNested(key, e.target.value)}
                            placeholder={placeholder}
                          />
                        </Field>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── 3. OPERATORS ──────────────────────────────────────────── */}
            {activeId === 'operators' && (
              <div className="space-y-6">
                <SectionHeader title="Operators" description="Team members who access the platform.">
                  <Button size="sm" onClick={openInvite} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Invite Operator
                  </Button>
                </SectionHeader>
                <Card className="border shadow-sm bg-card overflow-hidden">
                  {team.length === 0 ? (
                    <EmptyState icon={Users} text="No operators found." />
                  ) : (
                    <div className="divide-y">
                      {/* Header row */}
                      <div className="px-6 py-2.5 bg-muted/5 grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <span>Name</span>
                        <span>Email</span>
                        <span>Department</span>
                        <span>Role</span>
                        <span>Status</span>
                        <span />
                      </div>
                      {team.map(m => {
                        const isVerified = !!m.email_verified_at;
                        const deptName = m.department || '—';
                        const joined = m.created_at ? new Date(m.created_at).toLocaleDateString() : '—';
                        return (
                          <div key={m.id} className="px-6 py-3 grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center group hover:bg-muted/5 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                                {m.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{m.name}</p>
                                <p className="text-[10px] text-muted-foreground">Joined {joined}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{deptName}</p>
                            <Badge variant="outline" className="capitalize text-xs w-fit">{m.role}</Badge>
                            <Badge
                              className={cn('text-xs w-fit', isVerified
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                                : 'bg-amber-500/10 text-amber-700 border-amber-200')}
                            >
                              {isVerified ? 'Active' : 'Invited'}
                            </Badge>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteOperator(m.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── 4. DEPARTMENTS ────────────────────────────────────────── */}
            {activeId === 'departments' && (
              <div className="space-y-6">
                <SectionHeader title="Departments" description="Specialized support units for routing and reporting.">
                  <Button size="sm" onClick={() => setActiveData(prev => [...(prev || []), { name: 'New Department', description: '', manager: '', slaTarget: 60, priority: 'normal', active: true }])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Department
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Layers} text="No departments defined." /></Card>
                ) : (
                  <div className="space-y-4">
                    {activeData.map((d, i) => {
                      const updateDept = (patch) => {
                        const next = [...activeData];
                        next[i] = { ...next[i], ...patch };
                        setActiveData(next);
                      };
                      return (
                        <Card key={i} className="border shadow-sm bg-card">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                {d.name?.[0] || 'D'}
                              </div>
                              <Input
                                value={d.name}
                                onChange={e => updateDept({ name: e.target.value })}
                                className="h-9 font-medium max-w-xs"
                                placeholder="Department name"
                              />
                              <Badge
                                variant={d.active ? 'default' : 'outline'}
                                className="cursor-pointer ml-auto"
                                onClick={() => updateDept({ active: !d.active })}
                              >
                                {d.active ? 'Active' : 'Inactive'}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <Field label="Description">
                                  <Input
                                    value={d.description || ''}
                                    onChange={e => updateDept({ description: e.target.value })}
                                    placeholder="What this department handles…"
                                  />
                                </Field>
                              </div>
                              <Field label="Manager">
                                <Select value={d.manager || '__none__'} onValueChange={v => updateDept({ manager: v === '__none__' ? '' : v })}>
                                  <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {team.map(m => (
                                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.role})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                              <Field label="Priority">
                                <Select value={d.priority || 'normal'} onValueChange={v => updateDept({ priority: v })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </Field>
                              <Field label="SLA Target (minutes)">
                                <Input
                                  type="number"
                                  min={1}
                                  value={d.slaTarget ?? 60}
                                  onChange={e => updateDept({ slaTarget: Number(e.target.value) })}
                                  className="h-9"
                                />
                              </Field>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <div className="flex justify-end">
                      <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 font-medium bg-primary px-8">
                        {saving ? 'Saving…' : 'Save Departments'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 5. USAGE STATISTICS ───────────────────────────────────── */}
            {activeId === 'usage' && !usage && (
              <EmptyState icon={BarChart3} text="Usage data unavailable." />
            )}
            {activeId === 'usage' && usage && (
              <div className="space-y-6">
                <SectionHeader title="Usage Statistics" description="Live counts across this billing cycle." />

                {/* Plan + billing summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border shadow-sm bg-card">
                    <CardContent className="p-5 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current Plan</p>
                      <p className="text-xl font-bold capitalize">{usage.plan || 'Growth'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm bg-card">
                    <CardContent className="p-5 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cycle Ends</p>
                      <p className="text-xl font-bold">{usage.cycleEnd || '—'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm bg-card">
                    <CardContent className="p-5 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Operators</p>
                      <p className="text-xl font-bold">{team.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage bars */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5 pb-4">
                    <CardTitle className="text-sm font-semibold">Resource Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <UsageBar label="Conversations" used={usage.conversations?.used || 0} limit={usage.conversations?.limit || 1} />
                    <UsageBar label="Messages" used={usage.messages?.used || 0} limit={usage.messages?.limit || 1} />
                    <UsageBar label="AI Replies" used={usage.aiReplies?.used || 0} limit={usage.aiReplies?.limit || 1} />
                    <UsageBar label="Contacts" used={usage.contacts?.used || 0} limit={usage.contacts?.limit || 1} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── 6. RECYCLE BIN ────────────────────────────────────────── */}
            {activeId === 'recycle_bin' && (
              <div className="space-y-6">
                <SectionHeader title="Recycle Bin" description="Soft-deleted records. Permanently delete from here.">
                  {recycle.length > 0 && (
                    <Button variant="outline" size="sm" className="h-9 gap-2 border-destructive/30 text-destructive hover:bg-destructive/5" onClick={handleClearRecycleBin}>
                      <Trash2 className="h-3.5 w-3.5" /> Clear All
                    </Button>
                  )}
                </SectionHeader>
                <Card className="border shadow-sm bg-card overflow-hidden">
                  {recycle.length === 0 ? (
                    <EmptyState icon={Trash2} text="Recycle bin is empty." />
                  ) : (
                    <div className="divide-y">
                      {recycle.map(r => (
                        <div key={r.id} className="p-4 px-6 flex items-center gap-4 group">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.entityType} · deleted {new Date(r.deletedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleRemoveRecycleItem(r.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── 7. CONVERSATION LAYOUT ────────────────────────────────── */}
            {activeId === 'layout' && (
              <SettingSection title="Conversation Layout" description="Chat view density and display preferences." onSave={() => handleSaveActiveData()} saving={saving} loading={sectionLoading}>
                {activeData && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Density">
                        <Select value={activeData.density || 'comfortable'} onValueChange={v => setActiveData(d => ({ ...d, density: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="comfortable">Comfortable</SelectItem>
                            <SelectItem value="spacious">Spacious</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Bubble Style">
                        <Select value={activeData.bubbleStyle || 'rounded'} onValueChange={v => setActiveData(d => ({ ...d, bubbleStyle: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="flat">Flat</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Agent Bubble Color">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg border shrink-0 shadow-sm" style={{ backgroundColor: activeData.agentBubble || '#6366f1' }} />
                          <Input value={activeData.agentBubble || '#6366f1'} onChange={e => setActiveData(d => ({ ...d, agentBubble: e.target.value }))} />
                        </div>
                      </Field>
                      <Field label="Customer Bubble Color">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg border shrink-0 shadow-sm" style={{ backgroundColor: activeData.customerBubble || '#0f172a' }} />
                          <Input value={activeData.customerBubble || '#0f172a'} onChange={e => setActiveData(d => ({ ...d, customerBubble: e.target.value }))} />
                        </div>
                      </Field>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Display Options</p>
                      {[
                        { key: 'showScore',           label: 'Show Lead Score badge' },
                        { key: 'showIntent',           label: 'Show AI Intent badge' },
                        { key: 'showChannel',          label: 'Show Channel badge' },
                        { key: 'showTimestamp',        label: 'Show message timestamps' },
                        { key: 'showAvatars',          label: 'Show operator avatars in thread' },
                        { key: 'showReadReceipts',     label: 'Show read receipts' },
                        { key: 'typingIndicator',      label: 'Show typing indicator' },
                        { key: 'soundNotifications',   label: 'Sound on new message' },
                        { key: 'autoScrollToBottom',   label: 'Auto-scroll to latest message on open' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm">{label}</span>
                          <Toggle value={!!activeData[key]} onChange={v => setActiveData(d => ({ ...d, [key]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SettingSection>
            )}

            {/* ── 8. BRANDS ─────────────────────────────────────────────── */}
            {activeId === 'brands' && (
              <div className="space-y-6">
                <SectionHeader title="Brands" description="Visual identities and AI personalities for each brand you operate.">
                  <Button size="sm" onClick={() => setActiveData(prev => [...(prev || []), {
                    name: 'New Brand', slug: '', color: '#6366f1', secondaryColor: '#8b5cf6',
                    tone: 'professional', lang: 'en', rtl: false, active: true, status: 'active',
                    website: '', email: '', phone: '', country: '',
                    forbiddenPhrases: '', vipHandling: '', complaintStyle: '',
                  }])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Brand
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border">
                    <EmptyState icon={Palette} text="No brands. AI uses tenant default identity." />
                  </Card>
                ) : activeData.map((brand, i) => {
                  function updateBrand(patch) {
                    const next = [...activeData]; next[i] = { ...next[i], ...patch }; setActiveData(next);
                  }
                  return (
                    <Card key={i} className="border shadow-sm bg-card">
                      {/* Card header with color swatch + name + status + delete */}
                      <CardHeader className="border-b bg-muted/5 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl border-2 shadow-sm flex-shrink-0" style={{ backgroundColor: brand.color || '#6366f1' }} />
                            <div>
                              <p className="font-semibold text-sm">{brand.name || 'Untitled Brand'}</p>
                              {brand.slug && <p className="text-xs text-muted-foreground font-mono">/{brand.slug}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={brand.active ? 'default' : 'outline'}
                              className="cursor-pointer select-none"
                              onClick={() => updateBrand({ active: !brand.active })}
                            >
                              {brand.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">

                        {/* ── Identity ── */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Identity</p>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Display Name">
                              <Input value={brand.name || ''} onChange={e => updateBrand({ name: e.target.value })} />
                            </Field>
                            <Field label="Slug">
                              <Input value={brand.slug || ''} onChange={e => updateBrand({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="my-brand" />
                            </Field>
                            <Field label="Website">
                              <Input value={brand.website || ''} onChange={e => updateBrand({ website: e.target.value })} placeholder="https://brand.com" />
                            </Field>
                            <Field label="Contact Email">
                              <Input type="email" value={brand.email || ''} onChange={e => updateBrand({ email: e.target.value })} placeholder="support@brand.com" />
                            </Field>
                            <Field label="Phone">
                              <Input value={brand.phone || ''} onChange={e => updateBrand({ phone: e.target.value })} placeholder="+1 555 000 0000" />
                            </Field>
                            <Field label="Country">
                              <Input value={brand.country || ''} onChange={e => updateBrand({ country: e.target.value })} placeholder="e.g. Saudi Arabia" />
                            </Field>
                          </div>
                        </div>

                        {/* ── Visual Identity ── */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Visual Identity</p>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Primary Color">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={brand.color || '#6366f1'}
                                  onChange={e => updateBrand({ color: e.target.value })}
                                  className="h-9 w-9 cursor-pointer rounded border border-input bg-background p-0.5 flex-shrink-0"
                                />
                                <Input value={brand.color || '#6366f1'} onChange={e => updateBrand({ color: e.target.value })} className="font-mono" />
                              </div>
                            </Field>
                            <Field label="Secondary Color">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={brand.secondaryColor || '#8b5cf6'}
                                  onChange={e => updateBrand({ secondaryColor: e.target.value })}
                                  className="h-9 w-9 cursor-pointer rounded border border-input bg-background p-0.5 flex-shrink-0"
                                />
                                <Input value={brand.secondaryColor || '#8b5cf6'} onChange={e => updateBrand({ secondaryColor: e.target.value })} className="font-mono" />
                              </div>
                            </Field>
                          </div>
                        </div>

                        {/* ── Language ── */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Language</p>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Primary Language">
                              <Select value={brand.lang || 'en'} onValueChange={v => updateBrand({ lang: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="ar">Arabic</SelectItem>
                                  <SelectItem value="fr">French</SelectItem>
                                  <SelectItem value="es">Spanish</SelectItem>
                                  <SelectItem value="tr">Turkish</SelectItem>
                                  <SelectItem value="de">German</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="flex items-center justify-between pt-6">
                              <div>
                                <p className="text-sm font-medium">Right-to-left (RTL)</p>
                                <p className="text-xs text-muted-foreground">Enable for Arabic, Hebrew, etc.</p>
                              </div>
                              <Toggle value={!!brand.rtl} onChange={v => updateBrand({ rtl: v })} />
                            </div>
                          </div>
                        </div>

                        {/* ── AI Personality ── */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">AI Personality</p>
                          <p className="text-[11px] text-muted-foreground mb-3">Tone and language are used live by the AI engine. Other fields stored for future use.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Tone">
                              <Select value={brand.tone || 'professional'} onValueChange={v => updateBrand({ tone: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="professional">Professional</SelectItem>
                                  <SelectItem value="friendly">Friendly &amp; Casual</SelectItem>
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                  <SelectItem value="empathetic">Empathetic</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Complaint Handling Style">
                              <Select value={brand.complaintStyle || '__none__'} onValueChange={v => updateBrand({ complaintStyle: v === '__none__' ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Default</SelectItem>
                                  <SelectItem value="apologetic">Apologetic &amp; empathetic</SelectItem>
                                  <SelectItem value="direct">Direct &amp; solution-focused</SelectItem>
                                  <SelectItem value="escalate">Always escalate to human</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="col-span-2">
                              <Field label="Forbidden Phrases">
                                <Textarea
                                  value={brand.forbiddenPhrases || ''}
                                  onChange={e => updateBrand({ forbiddenPhrases: e.target.value })}
                                  placeholder="Words or phrases this brand's AI must never say (one per line)…"
                                  rows={3}
                                />
                              </Field>
                            </div>
                            <div className="col-span-2">
                              <Field label="VIP Customer Handling">
                                <Textarea
                                  value={brand.vipHandling || ''}
                                  onChange={e => updateBrand({ vipHandling: e.target.value })}
                                  placeholder="Special instructions for high-value or VIP customers…"
                                  rows={2}
                                />
                              </Field>
                            </div>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  );
                })}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Brands'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 9. GLOBAL SETTINGS ────────────────────────────────────── */}
            {activeId === 'global' && (
              <div className="space-y-6">
                {/* Workspace Defaults */}
                <SettingSection title="Workspace Defaults" description="Locale, currency and calendar preferences for the whole workspace." onSave={handleSaveSettings} saving={saving}>
                  <div className="grid grid-cols-2 gap-6">
                    <Field label="Default Language">
                      <Select value={settings.global?.defaultLang || 'ar'} onValueChange={v => updateNested('global.defaultLang', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="tr">Turkish</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Timezone">
                      <Input value={settings.global?.timezone || ''} onChange={e => updateNested('global.timezone', e.target.value)} placeholder="e.g. Asia/Dubai" />
                    </Field>
                    <Field label="Currency">
                      <Select value={settings.global?.currency || 'USD'} onValueChange={v => updateNested('global.currency', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD — US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR — Euro</SelectItem>
                          <SelectItem value="GBP">GBP — British Pound</SelectItem>
                          <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                          <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                          <SelectItem value="EGP">EGP — Egyptian Pound</SelectItem>
                          <SelectItem value="MAD">MAD — Moroccan Dirham</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Week Starts On">
                      <Select value={settings.global?.weekStart || 'Mon'} onValueChange={v => updateNested('global.weekStart', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mon">Monday</SelectItem>
                          <SelectItem value="Sun">Sunday</SelectItem>
                          <SelectItem value="Sat">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date Format">
                      <Select value={settings.global?.dateFormat || 'DD/MM/YYYY'} onValueChange={v => updateNested('global.dateFormat', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </SettingSection>

                {/* Working Hours */}
                <SettingSection title="Working Hours" description="AI and auto-responses respect these hours for your team's availability." onSave={handleSaveSettings} saving={saving}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Working Hours From">
                        <Input type="time" value={settings.global?.workStart || '09:00'} onChange={e => updateNested('global.workStart', e.target.value)} />
                      </Field>
                      <Field label="Working Hours To">
                        <Input type="time" value={settings.global?.workEnd || '18:00'} onChange={e => updateNested('global.workEnd', e.target.value)} />
                      </Field>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Working Days</p>
                      <div className="flex flex-wrap gap-2">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                          const active = (settings.global?.workDays || []).includes(d);
                          return (
                            <button key={d} type="button" onClick={() => {
                              const current = settings.global?.workDays || [];
                              updateNested('global.workDays', active ? current.filter(x => x !== d) : [...current, d]);
                            }} className={cn('h-8 w-12 rounded-lg text-xs font-medium border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:border-primary/50')}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-0">
                      {[
                        { key: 'global.autoClose',   label: 'Auto-close inactive conversations', desc: `After ${settings.global?.autoCloseHours ?? 48}h of inactivity` },
                        { key: 'global.workingHours', label: 'Enforce working hours',              desc: 'AI and bot reply only within working hours' },
                        { key: 'global.soundNotifs',  label: 'Sound notifications',                desc: 'Play a sound on incoming messages' },
                        { key: 'global.desktopNotifs',label: 'Desktop notifications',              desc: 'Show browser push notifications' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                          </div>
                          <Toggle value={!!key.split('.').reduce((o, k) => o?.[k], settings)} onChange={v => updateNested(key, v)} />
                        </div>
                      ))}
                    </div>
                    <Field label="Auto-close After (hours)">
                      <Input type="number" min={1} max={720} className="max-w-[140px]" value={settings.global?.autoCloseHours ?? 48} onChange={e => updateNested('global.autoCloseHours', parseInt(e.target.value) || 48)} />
                    </Field>
                  </div>
                </SettingSection>

                {/* Conversation Defaults */}
                <SettingSection title="Conversation Defaults" description="Behaviour applied when a new conversation opens." onSave={handleSaveSettings} saving={saving}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Default Priority">
                        <Select value={settings.global?.defaultPriority || 'normal'} onValueChange={v => updateNested('global.defaultPriority', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <div className="space-y-0">
                      {[
                        { key: 'global.assignBot',    label: 'Auto-assign AI bot',    desc: 'New conversations are assigned to the AI bot immediately' },
                        { key: 'global.autoAssign',   label: 'Auto-assign to agent',  desc: 'Round-robin assignment to available agents' },
                        { key: 'global.autoTagging',  label: 'AI auto-tagging',        desc: 'AI suggests and applies tags based on conversation content' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                          </div>
                          <Toggle value={!!key.split('.').reduce((o, k) => o?.[k], settings)} onChange={v => updateNested(key, v)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </SettingSection>

                {/* AI Global Rules */}
                <SettingSection title="AI Global Rules" description="Platform-wide constraints applied to every AI reply." onSave={handleSaveSettings} saving={saving}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Escalation Score Threshold">
                        <Input
                          type="number" min={0} max={100}
                          value={settings.global?.aiEscalationThreshold ?? 80}
                          onChange={e => updateNested('global.aiEscalationThreshold', parseInt(e.target.value) || 80)}
                          placeholder="0–100"
                        />
                      </Field>
                      <Field label="Min Score for Qualified Lead">
                        <Input
                          type="number" min={0} max={100}
                          value={settings.global?.minScoreForQualification ?? 60}
                          onChange={e => updateNested('global.minScoreForQualification', parseInt(e.target.value) || 60)}
                          placeholder="0–100"
                        />
                      </Field>
                    </div>
                    <div className="space-y-0">
                      {[
                        { key: 'global.aiEnabled',              label: 'AI Replies Enabled',              desc: 'Master switch — disabling stops all AI auto-replies' },
                        { key: 'global.humanApprovalRequired',  label: 'Human Approval Required',          desc: 'Every AI reply must be approved by an agent before sending' },
                        { key: 'global.autoCreateLead',         label: 'Auto-create Lead from Contact',    desc: 'Automatically create a deal when a new customer is scored' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                          </div>
                          <Toggle value={!!key.split('.').reduce((o, k) => o?.[k], settings)} onChange={v => updateNested(key, v)} />
                        </div>
                      ))}
                    </div>
                    <Field label="Global Forbidden Topics">
                      <Textarea
                        value={settings.global?.globalForbiddenTopics || ''}
                        onChange={e => updateNested('global.globalForbiddenTopics', e.target.value)}
                        placeholder="Topics the AI must never discuss across all brands (e.g. competitor pricing, medical advice)…"
                        rows={3}
                      />
                    </Field>
                  </div>
                </SettingSection>
              </div>
            )}

            {/* ── 10. EMAIL TEMPLATES ───────────────────────────────────── */}
            {activeId === 'email_tpl' && (
              <div className="space-y-6">
                <SectionHeader title="Email Templates" description="Reusable email bodies for notifications and reports.">
                  <Button size="sm" onClick={() => setActiveData(prev => [
                    ...(prev || []),
                    { id: `tpl_${Date.now()}`, name: 'New Template', subject: '', body: '', category: 'system', event: '', status: 'draft' },
                  ])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Template
                  </Button>
                </SectionHeader>

                {/* Variables reference */}
                <Card className="border bg-muted/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Available variables</p>
                    <div className="flex flex-wrap gap-2">
                      {['{{operator_name}}','{{company_name}}','{{customer}}','{{agent}}','{{date}}'].map(v => (
                        <code key={v} className="px-2 py-0.5 rounded bg-background border text-xs font-mono text-muted-foreground">{v}</code>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Mail} text="No email templates configured." /></Card>
                ) : activeData.map((tpl, i) => (
                  <Card key={i} className="border shadow-sm bg-card">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tpl.name || 'Untitled'}</p>
                          <Badge variant={tpl.status === 'active' ? 'default' : 'outline'} className="text-[10px]">
                            {tpl.status === 'active' ? 'Active' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            disabled={tplTestSending === i || !tpl.subject || !tpl.body}
                            onClick={() => handleTestSendTemplate(tpl, i)}
                          >
                            {tplTestSending === i ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                            {tplTestSending === i ? 'Sending…' : 'Test Send'}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Template Name">
                          <Input value={tpl.name} onChange={e => {
                            const next = [...activeData]; next[i] = { ...next[i], name: e.target.value }; setActiveData(next);
                          }} />
                        </Field>
                        <Field label="Status">
                          <Select value={tpl.status || 'draft'} onValueChange={v => {
                            const next = [...activeData]; next[i] = { ...next[i], status: v }; setActiveData(next);
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Category">
                          <Select value={tpl.category || 'system'} onValueChange={v => {
                            const next = [...activeData]; next[i] = { ...next[i], category: v }; setActiveData(next);
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system">System</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="report">Report</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Trigger Event">
                          <Select value={tpl.event || '__none__'} onValueChange={v => {
                            const next = [...activeData]; next[i] = { ...next[i], event: v === '__none__' ? '' : v }; setActiveData(next);
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select event…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None (manual)</SelectItem>
                              <SelectItem value="new_ticket">New Ticket Created</SelectItem>
                              <SelectItem value="ticket_resolved">Ticket Resolved</SelectItem>
                              <SelectItem value="conversation_closed">Conversation Closed</SelectItem>
                              <SelectItem value="lead_qualified">Lead Qualified</SelectItem>
                              <SelectItem value="daily_digest">Daily Digest</SelectItem>
                              <SelectItem value="scheduled_report">Scheduled Report</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <Field label="Subject">
                        <Input value={tpl.subject} onChange={e => {
                          const next = [...activeData]; next[i] = { ...next[i], subject: e.target.value }; setActiveData(next);
                        }} placeholder="Email subject line — supports {{variables}}" />
                      </Field>
                      <Field label="Body">
                        <Textarea rows={6} value={tpl.body} onChange={e => {
                          const next = [...activeData]; next[i] = { ...next[i], body: e.target.value }; setActiveData(next);
                        }} placeholder="Email body. Use {{operator_name}}, {{company_name}}, {{customer}}, {{agent}}, {{date}} as placeholders." className="font-mono text-sm" />
                      </Field>
                    </CardContent>
                  </Card>
                ))}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Templates'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 11. PROFANITY LIBRARY ─────────────────────────────────── */}
            {activeId === 'profanity' && (
              <div className="space-y-6">
                <SettingSection title="Profanity Library" description="Words and phrases that trigger moderation actions in incoming messages." onSave={() => handleSaveActiveData()} saving={saving} loading={sectionLoading}>
                  {activeData && (
                    <div className="space-y-6">
                      {/* Add word row */}
                      <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                        <p className="text-sm font-medium">Add Word or Phrase</p>
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                          <Field label="Word / Phrase">
                            <Input
                              value={wordInput}
                              onChange={e => setWordInput(e.target.value)}
                              placeholder="e.g. profanity, slur…"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && wordInput.trim()) {
                                  const w = wordInput.trim().toLowerCase();
                                  if (!(activeData.words || []).includes(w)) {
                                    const wordMeta = { ...(activeData.controls?.wordMeta || {}) };
                                    wordMeta[w] = { severity: wordSeverity, action: wordAction };
                                    setActiveData(d => ({
                                      ...d,
                                      words: [...(d.words || []), w],
                                      controls: { ...(d.controls || {}), wordMeta },
                                    }));
                                  }
                                  setWordInput('');
                                }
                              }}
                            />
                          </Field>
                          <Field label="Severity">
                            <Select value={wordSeverity} onValueChange={setWordSeverity}>
                              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Action">
                            <Select value={wordAction} onValueChange={setWordAction}>
                              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flag">Flag</SelectItem>
                                <SelectItem value="block">Block</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Button
                            className="h-9"
                            onClick={() => {
                              const w = wordInput.trim().toLowerCase();
                              if (!w || (activeData.words || []).includes(w)) { setWordInput(''); return; }
                              const wordMeta = { ...(activeData.controls?.wordMeta || {}) };
                              wordMeta[w] = { severity: wordSeverity, action: wordAction };
                              setActiveData(d => ({
                                ...d,
                                words: [...(d.words || []), w],
                                controls: { ...(d.controls || {}), wordMeta },
                              }));
                              setWordInput('');
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      </div>

                      {/* Word list */}
                      {(activeData.words || []).length === 0 ? (
                        <EmptyState icon={ShieldAlert} text="No blocked words. Add words above to start filtering." />
                      ) : (
                        <div className="space-y-1">
                          <div className="grid grid-cols-[1fr_100px_100px_36px] gap-3 px-3 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b">
                            <span>Word / Phrase</span>
                            <span>Severity</span>
                            <span>Action</span>
                            <span></span>
                          </div>
                          {(activeData.words || []).map((word, wi) => {
                            const meta = activeData.controls?.wordMeta?.[word] || {};
                            const severityColor = meta.severity === 'high' ? 'text-destructive' : meta.severity === 'medium' ? 'text-amber-600' : 'text-muted-foreground';
                            return (
                              <div key={wi} className="grid grid-cols-[1fr_100px_100px_36px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-muted/30">
                                <span className="text-sm font-mono">{word}</span>
                                <Select value={meta.severity || 'medium'} onValueChange={v => {
                                  const wordMeta = { ...(activeData.controls?.wordMeta || {}) };
                                  wordMeta[word] = { ...wordMeta[word], severity: v };
                                  setActiveData(d => ({ ...d, controls: { ...(d.controls || {}), wordMeta } }));
                                }}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={meta.action || 'flag'} onValueChange={v => {
                                  const wordMeta = { ...(activeData.controls?.wordMeta || {}) };
                                  wordMeta[word] = { ...wordMeta[word], action: v };
                                  setActiveData(d => ({ ...d, controls: { ...(d.controls || {}), wordMeta } }));
                                }}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="flag">Flag</SelectItem>
                                    <SelectItem value="block">Block</SelectItem>
                                    <SelectItem value="review">Review</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  const wordMeta = { ...(activeData.controls?.wordMeta || {}) };
                                  delete wordMeta[word];
                                  setActiveData(d => ({
                                    ...d,
                                    words: (d.words || []).filter(w => w !== word),
                                    controls: { ...(d.controls || {}), wordMeta },
                                  }));
                                }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                          <p className="text-xs text-muted-foreground px-3 pt-2">{(activeData.words || []).length} word{(activeData.words || []).length !== 1 ? 's' : ''} in library</p>
                        </div>
                      )}
                    </div>
                  )}
                </SettingSection>

                {/* Controls card */}
                {activeData && (
                  <Card className="border shadow-sm bg-card">
                    <CardHeader className="border-b bg-muted/5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-muted-foreground" /> Enforcement Controls</CardTitle>
                          <CardDescription>What happens when a blocked word is detected</CardDescription>
                        </div>
                        <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 gap-2 px-6 bg-primary font-medium">
                          <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-0">
                      {[
                        { key: 'flagForReview',       label: 'Flag for review',              desc: 'Route conversations containing blocked words to manual review' },
                        { key: 'autoBlockAfterThree', label: 'Auto-block after 3 violations', desc: 'Add customer to spammers list after 3 profanity detections' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </div>
                          <Toggle value={!!activeData.controls?.[key]} onChange={v => setActiveData(d => ({ ...d, controls: { ...(d.controls || {}), [key]: v } }))} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── 12. TAGS ──────────────────────────────────────────────── */}
            {activeId === 'tags' && (
              <div className="space-y-6">
                <SettingSection title="Tags" description="Labels applied to customers and conversations. Tags are searchable and filterable across the platform." onSave={handleSaveTags} saving={saving}>
                  <div className="space-y-6">
                    {/* Add tag form */}
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <p className="text-sm font-medium">Add New Tag</p>
                      <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-3 items-end">
                        <Field label="Tag Name">
                          <Input
                            placeholder="e.g. vip, hot-lead…"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && tagInput.trim()) {
                                const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
                                if (!(settings.tags || []).includes(t)) {
                                  updateNested('tags', [...(settings.tags || []), t]);
                                  setTagMeta(prev => ({ ...prev, [t]: { color: tagColor, category: tagCategory, description: tagDesc } }));
                                }
                                setTagInput('');
                              }
                            }}
                          />
                        </Field>
                        <Field label="Color">
                          <input
                            type="color"
                            value={tagColor}
                            onChange={e => setTagColor(e.target.value)}
                            className="h-9 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
                          />
                        </Field>
                        <Field label="Category">
                          <Select value={tagCategory || '__none__'} onValueChange={v => setTagCategory(v === '__none__' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="Category…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="segment">Segment</SelectItem>
                              <SelectItem value="campaign">Campaign</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Button
                          onClick={() => {
                            const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
                            if (!t || (settings.tags || []).includes(t)) { setTagInput(''); return; }
                            updateNested('tags', [...(settings.tags || []), t]);
                            setTagMeta(prev => ({ ...prev, [t]: { color: tagColor, category: tagCategory, description: tagDesc } }));
                            setTagInput('');
                          }}
                          className="h-9"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    </div>

                    {/* Tag list */}
                    {(settings.tags || []).length === 0 ? (
                      <EmptyState icon={TagsIcon} text="No tags yet. Add your first tag above." />
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-[auto_1fr_100px_36px] gap-3 px-3 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b">
                          <span>Color</span>
                          <span>Tag Name / Description</span>
                          <span>Category</span>
                          <span></span>
                        </div>
                        {(settings.tags || []).map((tag, ti) => {
                          const meta = tagMeta[tag] || {};
                          return (
                            <div key={ti} className="grid grid-cols-[auto_1fr_100px_36px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-muted/30 group">
                              <input
                                type="color"
                                value={meta.color || '#6366f1'}
                                onChange={e => setTagMeta(prev => ({ ...prev, [tag]: { ...prev[tag], color: e.target.value } }))}
                                className="h-7 w-7 cursor-pointer rounded border border-input bg-background p-0.5"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: meta.color || '#6366f1' }}>
                                    {tag}
                                  </span>
                                </div>
                                <Input
                                  className="h-6 text-xs border-0 bg-transparent p-0 text-muted-foreground focus-visible:ring-0 placeholder:text-muted-foreground/40"
                                  placeholder="Add a description…"
                                  value={meta.description || ''}
                                  onChange={e => setTagMeta(prev => ({ ...prev, [tag]: { ...prev[tag], description: e.target.value } }))}
                                />
                              </div>
                              <Select value={meta.category || '__none__'} onValueChange={v => setTagMeta(prev => ({ ...prev, [tag]: { ...prev[tag], category: v === '__none__' ? '' : v } }))}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">—</SelectItem>
                                  <SelectItem value="lead">Lead</SelectItem>
                                  <SelectItem value="support">Support</SelectItem>
                                  <SelectItem value="segment">Segment</SelectItem>
                                  <SelectItem value="campaign">Campaign</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                updateNested('tags', (settings.tags || []).filter(t => t !== tag));
                                setTagMeta(prev => { const n = { ...prev }; delete n[tag]; return n; });
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground px-3 pt-2">{(settings.tags || []).length} tag{(settings.tags || []).length !== 1 ? 's' : ''} in library</p>
                      </div>
                    )}
                  </div>
                </SettingSection>
              </div>
            )}

            {/* ── 13-16. MESSAGING CHANNELS ─────────────────────────────── */}
            {['ch_messenger', 'ch_livechat', 'ch_instagram', 'ch_whatsapp'].includes(activeId) && (() => {
              const CH_LABELS = { ch_messenger: 'Facebook Messenger', ch_livechat: 'Live Chat', ch_instagram: 'Instagram', ch_whatsapp: 'WhatsApp' };
              const channelKey = CH_SECTION_MAP[activeId];
              const label = CH_LABELS[activeId];
              const rec = channelRecord(channelKey);
              const cfg = chConfig;

              function upCfg(key, val) { setChConfig(prev => ({ ...prev, [key]: val })); }

              function formatTs(iso) {
                if (!iso) return 'Never';
                try { return new Date(iso).toLocaleString(); } catch { return '—'; }
              }

              const chBrands = Array.isArray(settings.brands) ? settings.brands : [];
              const chDepts = Array.isArray(depts) ? depts : [];
              const chOps = Array.isArray(team) ? team : [];

              // normalizeChannelConnection: single source of truth for connection status.
              // Uses channel_connections.status — never derives from credential decryption.
              const { isConnected, details: chDetails, detailsAvailable } = normalizeChannelConnection(rec);

              function renderConnectionDetails() {
                if (!rec) return null;
                if (!detailsAvailable) {
                  return (
                    <p className="text-xs text-muted-foreground italic">
                      Connected — credential details unavailable (may require reconnect)
                    </p>
                  );
                }
                const d = chDetails;
                if (channelKey === 'messenger') return (
                  <div className="space-y-0.5">
                    {d.pageName && <p className="text-sm font-medium">{d.pageName}</p>}
                    {d.pageId && <p className="text-xs font-mono text-muted-foreground">Page ID: {d.pageId}</p>}
                  </div>
                );
                if (channelKey === 'instagram') return (
                  <div className="space-y-0.5">
                    {d.instagramBusinessAccountUsername && <p className="text-sm font-medium">@{d.instagramBusinessAccountUsername}</p>}
                    {d.instagramBusinessAccountId && <p className="text-xs font-mono text-muted-foreground">IG ID: {d.instagramBusinessAccountId}</p>}
                    {d.pageName && <p className="text-xs text-muted-foreground">Page: {d.pageName}</p>}
                  </div>
                );
                if (channelKey === 'whatsapp') return (
                  <div className="space-y-0.5">
                    {d.displayName && <p className="text-sm font-medium">{d.displayName}</p>}
                    {d.phone && <p className="text-xs text-muted-foreground">{d.phone}</p>}
                    {d.wabaId && <p className="text-xs font-mono text-muted-foreground">WABA: {d.wabaId}</p>}
                    {d.qualityRating && <Badge variant="outline" className="text-xs mt-1">{d.qualityRating} quality</Badge>}
                  </div>
                );
                if (channelKey === 'livechat') return (
                  <div className="space-y-0.5">
                    {d.widgetId && <p className="text-xs font-mono text-muted-foreground">Widget ID: {d.widgetId}</p>}
                    {d.domain && <p className="text-xs text-muted-foreground">Domain: {d.domain}</p>}
                  </div>
                );
                return null;
              }

              return (
                <div className="space-y-6">
                  <SectionHeader title={label} description={`Manage your ${label} integration, AI behavior, and routing settings.`} />

                  {/* 1 · Connection Status */}
                  <Card className="border shadow-sm bg-card">
                    <CardHeader className="border-b bg-muted/5 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base">Connection Status</CardTitle>
                        <ChannelStatus connected={isConnected} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {rec ? (
                        <div className="space-y-3">
                          {renderConnectionDetails()}
                          {rec.created_at && (
                            <p className="text-xs text-muted-foreground">
                              Connected {new Date(rec.created_at).toLocaleDateString()}
                            </p>
                          )}
                          {channelKey === 'livechat' && chDetails.widgetId && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
                              <p className="text-xs font-medium">Embed snippet</p>
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{`<script src="https://cdn.chatorai.com/widget.js" data-widget="${chDetails.widgetId}"></script>`}</pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not connected. Set up this channel to start receiving messages.</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        {channelKey === 'livechat' ? (
                          <Button onClick={() => setLcDialog(true)} variant={rec ? 'outline' : 'default'} className="h-9">
                            {rec ? 'Reconfigure Widget' : 'Set Up Widget'}
                          </Button>
                        ) : (
                          <Button onClick={() => handleConnectMeta(channelKey)} variant={rec ? 'outline' : 'default'} className="h-9">
                            {rec ? 'Reconnect via Meta' : 'Connect via Meta'}
                          </Button>
                        )}
                        {rec && (
                          <Button
                            variant="ghost"
                            className="h-9 text-destructive hover:text-destructive"
                            onClick={() => handleDisconnectChannel(rec.id)}
                          >
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Config cards — always shown, save to settings.channels[channel] independently of connection */}
                  {chConfigLoading ? (
                    <div className="flex justify-center py-12">
                      <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground/30" />
                    </div>
                  ) : (
                    <>
                      {/* 2 · Behavior Settings */}
                        <Card className="border shadow-sm bg-card">
                          <CardHeader className="border-b bg-muted/5">
                            <CardTitle className="text-base">Behavior Settings</CardTitle>
                            <CardDescription>Automated messages and business hours enforcement for this channel.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <Field label="Welcome Message">
                              <Textarea rows={3} value={cfg.welcomeMessage || ''} onChange={e => upCfg('welcomeMessage', e.target.value)} placeholder="Sent when a new conversation starts on this channel" />
                            </Field>
                            <Field label="Away Message">
                              <Textarea rows={3} value={cfg.awayMessage || ''} onChange={e => upCfg('awayMessage', e.target.value)} placeholder="Sent when a message arrives outside business hours" />
                            </Field>
                            <Field label="Business Hours Mode">
                              <Select value={cfg.businessHoursMode || 'global'} onValueChange={v => upCfg('businessHoursMode', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="global">Use global workspace hours</SelectItem>
                                  <SelectItem value="always">Always available (24/7)</SelectItem>
                                  <SelectItem value="off">Off — never enforce hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Fallback Reply">
                              <Textarea rows={2} value={cfg.fallbackReply || ''} onChange={e => upCfg('fallbackReply', e.target.value)} placeholder="Reply sent when AI cannot generate a response" />
                            </Field>
                            <Field label="Human Takeover Policy">
                              <Input value={cfg.humanTakeoverPolicy || ''} onChange={e => upCfg('humanTakeoverPolicy', e.target.value)} placeholder="e.g. Escalate after 2 unanswered turns" />
                            </Field>
                            {channelKey === 'whatsapp' && (
                              <div className="space-y-3 pt-2 border-t">
                                <div className="flex items-center justify-between py-2">
                                  <div>
                                    <p className="text-sm">Read Receipts</p>
                                    <p className="text-xs text-muted-foreground">Send read receipts to customers</p>
                                  </div>
                                  <Toggle value={cfg.readReceipts !== false} onChange={v => upCfg('readReceipts', v)} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                  <div>
                                    <p className="text-sm">Typing Indicator</p>
                                    <p className="text-xs text-muted-foreground">Show typing status while composing</p>
                                  </div>
                                  <Toggle value={cfg.typingIndicator !== false} onChange={v => upCfg('typingIndicator', v)} />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* 3 · AI Controls */}
                        <Card className="border shadow-sm bg-card">
                          <CardHeader className="border-b bg-muted/5">
                            <CardTitle className="text-base">AI Controls</CardTitle>
                            <CardDescription>Override global AI settings for this channel specifically.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-2 border-b">
                              <div>
                                <p className="text-sm font-medium">AI Enabled</p>
                                <p className="text-xs text-muted-foreground">Allow AI to process and respond on this channel</p>
                              </div>
                              <Toggle value={cfg.aiEnabled !== false} onChange={v => upCfg('aiEnabled', v)} />
                            </div>
                            <div className="flex items-center justify-between py-2 border-b">
                              <div>
                                <p className="text-sm font-medium">Suggest Only</p>
                                <p className="text-xs text-muted-foreground">AI drafts suggestions — agent reviews before sending</p>
                              </div>
                              <Toggle value={!!cfg.suggestOnly} onChange={v => upCfg('suggestOnly', v)} />
                            </div>
                            <div className="flex items-center justify-between py-2 border-b">
                              <div>
                                <p className="text-sm font-medium">Require Approval</p>
                                <p className="text-xs text-muted-foreground">Block all auto-replies — every message needs human approval</p>
                              </div>
                              <Toggle value={!!cfg.requireApproval} onChange={v => upCfg('requireApproval', v)} />
                            </div>
                            <Field label={`Confidence Threshold: ${cfg.confidenceThreshold ?? 70}%`}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={cfg.confidenceThreshold ?? 70}
                                onChange={e => upCfg('confidenceThreshold', Number(e.target.value))}
                                className="w-full h-2 accent-primary"
                              />
                              <p className="text-xs text-muted-foreground mt-1">AI only replies when confidence exceeds this threshold</p>
                            </Field>
                          </CardContent>
                        </Card>

                        {/* 4 · Routing Ownership */}
                        <Card className="border shadow-sm bg-card">
                          <CardHeader className="border-b bg-muted/5">
                            <CardTitle className="text-base">Routing Ownership</CardTitle>
                            <CardDescription>Default assignment for conversations arriving via this channel.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                              {chBrands.length > 0 && (
                                <Field label="Brand">
                                  <Select value={cfg.brandId || '__none__'} onValueChange={v => upCfg('brandId', v === '__none__' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="No brand override" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">No brand override</SelectItem>
                                      {chBrands.map((b, i) => (
                                        <SelectItem key={b.id || i} value={String(b.id || b.name || i)}>{b.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              )}
                              {chDepts.length > 0 && (
                                <Field label="Department">
                                  <Select value={cfg.departmentId || '__none__'} onValueChange={v => upCfg('departmentId', v === '__none__' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="No department" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">No department</SelectItem>
                                      {chDepts.map((d, i) => (
                                        <SelectItem key={d.id || i} value={String(d.id || d.name || i)}>{d.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              )}
                              {chOps.length > 0 && (
                                <Field label="Default Operator">
                                  <Select value={cfg.defaultOperatorId || '__none__'} onValueChange={v => upCfg('defaultOperatorId', v === '__none__' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="No default operator" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">No default operator</SelectItem>
                                      {chOps.map(op => (
                                        <SelectItem key={op.id} value={String(op.id)}>{op.name} ({op.role})</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              )}
                              <Field label="SLA Target (minutes)">
                                <Input type="number" min={1} value={cfg.slaTargetMinutes ?? 480} onChange={e => upCfg('slaTargetMinutes', Number(e.target.value))} />
                              </Field>
                            </div>
                          </CardContent>
                          <CardFooter className="border-t px-6 py-4 bg-muted/5 flex justify-end">
                            <Button onClick={() => handleSaveChConfig(channelKey)} disabled={chConfigSaving} className="h-9 gap-2 px-6 bg-primary font-medium">
                              <Save className="h-4 w-4" />
                              {chConfigSaving ? 'Saving…' : 'Save Channel Settings'}
                            </Button>
                          </CardFooter>
                        </Card>

                        {/* 5 · Operational Health */}
                        {chHealth && (
                          <Card className="border shadow-sm bg-card">
                            <CardHeader className="border-b bg-muted/5">
                              <CardTitle className="text-base">Operational Health</CardTitle>
                              <CardDescription>Live message activity metrics for this channel.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Inbound</p>
                                  <p className="text-sm font-medium">{formatTs(chHealth.lastInboundAt)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Outbound</p>
                                  <p className="text-sm font-medium">{formatTs(chHealth.lastOutboundAt)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Messages Today</p>
                                  <p className="text-sm font-medium">{(chHealth.messagesToday ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Conversations</p>
                                  <p className="text-sm font-medium">{(chHealth.totalConversations ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failed Sends (7d)</p>
                                  <p className="text-sm font-medium">{chHealth.failedSends7d ?? 0}</p>
                                  {(chHealth.failedSends7d ?? 0) === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Send-error tracking pending</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                </div>
              );
            })()}

            {/* ── 17. AI CONFIGURATION ──────────────────────────────────── */}
            {activeId === 'ai_config' && (() => {
              const AI_TABS = [
                { id: 'identity',    label: 'Identity' },
                { id: 'response',    label: 'Response Control' },
                { id: 'prompts',     label: 'Prompt Governance' },
                { id: 'forbidden',   label: 'Forbidden Actions' },
                { id: 'handoff',     label: 'Handoff Rules' },
                { id: 'knowledge',   label: 'Knowledge Sources' },
                { id: 'performance', label: 'Performance' },
                { id: 'safety',      label: 'Safety' },
                { id: 'model',       label: 'Model' },
                { id: 'simulator',   label: 'Simulator' },
              ];
              const ac = aiConfig || {};
              const identity = ac.identity || {};
              const responseControl = ac.responseControl || {};
              const knowledgeSources = ac.knowledgeSources || {};
              const safety = ac.safety || {};
              const forbiddenActions = Array.isArray(ac.forbiddenActions) ? ac.forbiddenActions : [];
              const handoffRules = Array.isArray(ac.handoffRules) ? ac.handoffRules : [];

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <Card className="border shadow-sm bg-card">
                    <CardHeader className="border-b bg-muted/5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle>AI Configuration</CardTitle>
                          <CardDescription>Enterprise AI control center. Every setting affects live AI behavior. Provider API keys are platform-managed.</CardDescription>
                        </div>
                        <Button onClick={() => handleSaveAiConfig(aiConfig)} disabled={aiSaving || aiLoading} className="h-9 gap-2 px-6 bg-primary font-medium">
                          <Save className="h-4 w-4" />
                          {aiSaving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </div>
                      {/* Sub-nav tabs */}
                      <div className="flex flex-wrap gap-1 pt-3 mt-1">
                        {AI_TABS.map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAiSection(tab.id)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              aiSection === tab.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                            )}
                          >{tab.label}</button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      {aiLoading ? (
                        <div className="flex justify-center py-12">
                          <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground/30" />
                        </div>
                      ) : (
                        <>
                          {/* ── 1. IDENTITY ── */}
                          {aiSection === 'identity' && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <Field label="Assistant Name">
                                  <Input value={ac.agentName || ''} onChange={e => updateAiConfig('agentName', e.target.value)} placeholder="Chator Assistant" />
                                </Field>
                                <Field label="Default Language">
                                  <Select value={identity.defaultLanguage || 'ar'} onValueChange={v => updateAiConfig('identity.defaultLanguage', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ar">Arabic</SelectItem>
                                      <SelectItem value="en">English</SelectItem>
                                      <SelectItem value="fr">French</SelectItem>
                                      <SelectItem value="es">Spanish</SelectItem>
                                      <SelectItem value="auto">Auto-detect</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="Secondary Language">
                                  <Select value={identity.secondaryLanguage || '__none__'} onValueChange={v => updateAiConfig('identity.secondaryLanguage', v === '__none__' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      <SelectItem value="en">English</SelectItem>
                                      <SelectItem value="ar">Arabic</SelectItem>
                                      <SelectItem value="fr">French</SelectItem>
                                      <SelectItem value="es">Spanish</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="Tone">
                                  <Select value={identity.tone || 'friendly and professional'} onValueChange={v => updateAiConfig('identity.tone', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="friendly and professional">Friendly & Professional</SelectItem>
                                      <SelectItem value="formal">Formal</SelectItem>
                                      <SelectItem value="casual">Casual</SelectItem>
                                      <SelectItem value="empathetic">Empathetic</SelectItem>
                                      <SelectItem value="direct">Direct & Concise</SelectItem>
                                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="Formality">
                                  <Select value={identity.formality || 'semi-formal'} onValueChange={v => updateAiConfig('identity.formality', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="formal">Formal</SelectItem>
                                      <SelectItem value="semi-formal">Semi-formal</SelectItem>
                                      <SelectItem value="informal">Informal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>
                              <Field label="Persona / Character Description">
                                <Textarea rows={3} value={identity.persona || ''} onChange={e => updateAiConfig('identity.persona', e.target.value)} placeholder="e.g. A knowledgeable fashion advisor who speaks warmly and always suggests the best style for the customer…" />
                              </Field>
                              <div className="grid grid-cols-2 gap-6">
                                <Field label="Greeting Style">
                                  <Input value={identity.greetingStyle || ''} onChange={e => updateAiConfig('identity.greetingStyle', e.target.value)} placeholder="e.g. Hello! How can I help you today?" />
                                </Field>
                                <Field label="Closing Style">
                                  <Input value={identity.closingStyle || ''} onChange={e => updateAiConfig('identity.closingStyle', e.target.value)} placeholder="e.g. Let me know if you need anything else!" />
                                </Field>
                              </div>
                              <Field label="System Prompt (Base Instructions)">
                                <Textarea rows={5} value={ac.systemPrompt || ''} onChange={e => updateAiConfig('systemPrompt', e.target.value)} placeholder="Instructions for the AI assistant…" />
                                <p className="text-xs text-muted-foreground mt-1">This is the foundation prompt injected into every AI call. Persona, tone and language fields above are appended automatically.</p>
                              </Field>
                            </div>
                          )}

                          {/* ── 2. RESPONSE CONTROL ── */}
                          {aiSection === 'response' && (
                            <div className="space-y-6">
                              <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 p-4 text-sm text-amber-800 dark:text-amber-200">
                                <strong>Auto-reply gate:</strong> The real auto-reply gate per conversation is <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">conversation.ai_mode</code>, set from the live conversations panel. The global Auto-reply toggle below is an additional layer — it bypasses per-conversation mode and forces suggest-only for all conversations when disabled.
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between py-3 border-b">
                                  <div>
                                    <p className="text-sm font-medium">Global Auto-Reply</p>
                                    <p className="text-xs text-muted-foreground">When OFF, AI never sends automatically regardless of conversation mode</p>
                                  </div>
                                  <Toggle value={!!ac.autoReply} onChange={v => updateAiConfig('autoReply', v)} />
                                </div>
                                <div className="flex items-center justify-between py-3 border-b">
                                  <div>
                                    <p className="text-sm font-medium">Suggest Only (Global)</p>
                                    <p className="text-xs text-muted-foreground">AI generates suggestions for agents to review — never sends directly</p>
                                  </div>
                                  <Toggle value={!!ac.suggestOnly} onChange={v => updateAiConfig('suggestOnly', v)} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <Field label={`Confidence Threshold: ${responseControl.confidenceThreshold ?? 50}%`}>
                                  <input
                                    type="range" min={0} max={100} step={5}
                                    value={responseControl.confidenceThreshold ?? 50}
                                    onChange={e => updateAiConfig('responseControl.confidenceThreshold', Number(e.target.value))}
                                    className="w-full accent-primary"
                                  />
                                  <p className="text-xs text-muted-foreground">Derived from lead score. Auto-replies with confidence below this threshold are skipped.</p>
                                </Field>
                                <Field label="Max Consecutive AI Replies">
                                  <Input type="number" min={1} max={20} value={responseControl.maxConsecutiveReplies ?? 5} onChange={e => updateAiConfig('responseControl.maxConsecutiveReplies', Number(e.target.value))} />
                                  <p className="text-xs text-muted-foreground">AI stops auto-replying after this many consecutive messages without human intervention.</p>
                                </Field>
                                <Field label="Escalation Threshold (messages)">
                                  <Input type="number" min={1} max={10} value={responseControl.escalationThreshold ?? 3} onChange={e => updateAiConfig('responseControl.escalationThreshold', Number(e.target.value))} />
                                  <p className="text-xs text-muted-foreground">Trigger escalation after N unanswered/failed AI replies.</p>
                                </Field>
                                <Field label="Business Hours AI Behavior">
                                  <Select value={responseControl.businessHoursAiBehavior || 'auto'} onValueChange={v => updateAiConfig('responseControl.businessHoursAiBehavior', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto-reply (full)</SelectItem>
                                      <SelectItem value="suggest">Suggest only</SelectItem>
                                      <SelectItem value="off">AI off</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="After-Hours AI Behavior">
                                  <Select value={responseControl.afterHoursAiBehavior || 'suggest'} onValueChange={v => updateAiConfig('responseControl.afterHoursAiBehavior', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto-reply (full)</SelectItem>
                                      <SelectItem value="suggest">Suggest only</SelectItem>
                                      <SelectItem value="off">AI off</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>
                              <Field label="Silent Mode Conditions">
                                <Input value={responseControl.silentModeConditions || ''} onChange={e => updateAiConfig('responseControl.silentModeConditions', e.target.value)} placeholder="e.g. when tag=vip, when channel=whatsapp" />
                                <p className="text-xs text-muted-foreground">Comma-separated conditions under which AI stays completely silent.</p>
                              </Field>
                            </div>
                          )}

                          {/* ── 3. PROMPT GOVERNANCE ── */}
                          {aiSection === 'prompts' && (
                            <div className="space-y-6">
                              <div className="rounded-xl border bg-muted/5 p-4 text-sm text-muted-foreground">
                                Prompt versions are code-defined and managed by the platform. You can pin a specific version to ensure stability during platform updates. Content changes require a platform release.
                              </div>
                              {aiPrompts.length === 0 ? (
                                <EmptyState icon={Bot} text="No prompt definitions found." />
                              ) : aiPrompts.map(p => (
                                <Card key={p.id} className="border">
                                  <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-medium text-sm">{p.id}</p>
                                        <p className="text-xs text-muted-foreground">Latest: v{p.version} · Pinned: v{p.pinnedVersion}</p>
                                      </div>
                                      <Badge variant={p.pinnedVersion === p.version ? 'default' : 'secondary'}>
                                        {p.pinnedVersion === p.version ? 'Latest' : `Pinned v${p.pinnedVersion}`}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available versions</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(p.versions || []).map(v => (
                                          <div key={v.version} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs', p.pinnedVersion === v.version ? 'border-primary/30 bg-primary/5 text-primary' : 'bg-muted/20')}>
                                            <span>v{v.version}</span>
                                            {p.pinnedVersion !== v.version && (
                                              <button type="button" onClick={() => handlePinPrompt(p.id, v.version)} className="underline text-muted-foreground hover:text-foreground ml-1">pin</button>
                                            )}
                                            {p.pinnedVersion === v.version && <CheckCircle2 className="h-3 w-3" />}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    {(p.versions || []).find(v => v.version === p.pinnedVersion)?.content && (
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview pinned prompt</summary>
                                        <pre className="mt-2 whitespace-pre-wrap bg-muted/20 rounded-lg p-3 text-muted-foreground leading-relaxed max-h-40 overflow-auto">
                                          {(p.versions || []).find(v => v.version === p.pinnedVersion)?.content}
                                        </pre>
                                      </details>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* ── 4. FORBIDDEN ACTIONS ── */}
                          {aiSection === 'forbidden' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Define topics and actions the AI must never engage with. These rules are checked before every auto-reply.</p>
                                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => updateAiConfig('forbiddenActions', [...forbiddenActions, { id: `fa_${Date.now()}`, pattern: '', severity: 'high', enforcement: 'block', escalate: true }])}>
                                  <Plus className="h-3.5 w-3.5" /> Add Rule
                                </Button>
                              </div>
                              {forbiddenActions.length === 0 ? (
                                <Card className="border"><EmptyState icon={Shield} text="No forbidden action rules." /></Card>
                              ) : forbiddenActions.map((fa, i) => (
                                <Card key={fa.id || i} className="border">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Field label="Pattern / Keyword">
                                          <Input value={fa.pattern || ''} onChange={e => { const next = [...forbiddenActions]; next[i] = { ...next[i], pattern: e.target.value }; updateAiConfig('forbiddenActions', next); }} placeholder="e.g. competitor, refund policy" />
                                        </Field>
                                        <Field label="Severity">
                                          <Select value={fa.severity || 'high'} onValueChange={v => { const next = [...forbiddenActions]; next[i] = { ...next[i], severity: v }; updateAiConfig('forbiddenActions', next); }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="low">Low</SelectItem>
                                              <SelectItem value="medium">Medium</SelectItem>
                                              <SelectItem value="high">High</SelectItem>
                                              <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </Field>
                                        <Field label="Enforcement">
                                          <Select value={fa.enforcement || 'block'} onValueChange={v => { const next = [...forbiddenActions]; next[i] = { ...next[i], enforcement: v }; updateAiConfig('forbiddenActions', next); }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="block">Block reply</SelectItem>
                                              <SelectItem value="warn">Warn agent</SelectItem>
                                              <SelectItem value="log">Log only</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </Field>
                                      </div>
                                      <div className="flex items-center gap-3 pt-6">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Toggle value={!!fa.escalate} onChange={v => { const next = [...forbiddenActions]; next[i] = { ...next[i], escalate: v }; updateAiConfig('forbiddenActions', next); }} />
                                          Escalate
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateAiConfig('forbiddenActions', forbiddenActions.filter((_, j) => j !== i))}>
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* ── 5. HANDOFF RULES ── */}
                          {aiSection === 'handoff' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Define when AI must escalate to a human agent. Rules are evaluated after each message.</p>
                                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => updateAiConfig('handoffRules', [...handoffRules, { id: `hr_${Date.now()}`, condition: 'score_below', threshold: 30, channel: '__all__', action: 'notify_agent', message: '' }])}>
                                  <Plus className="h-3.5 w-3.5" /> Add Rule
                                </Button>
                              </div>
                              {handoffRules.length === 0 ? (
                                <Card className="border"><EmptyState icon={Users} text="No handoff rules configured." /></Card>
                              ) : handoffRules.map((hr, i) => (
                                <Card key={hr.id || i} className="border">
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                      <Field label="Condition">
                                        <Select value={hr.condition || 'score_below'} onValueChange={v => { const next = [...handoffRules]; next[i] = { ...next[i], condition: v }; updateAiConfig('handoffRules', next); }}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="score_below">Score below</SelectItem>
                                            <SelectItem value="intent_detected">Intent detected</SelectItem>
                                            <SelectItem value="consecutive_failures">Consecutive failures</SelectItem>
                                            <SelectItem value="customer_requests_human">Customer requests human</SelectItem>
                                            <SelectItem value="negative_sentiment">Negative sentiment</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </Field>
                                      <Field label="Threshold / Value">
                                        <Input value={hr.threshold ?? ''} onChange={e => { const next = [...handoffRules]; next[i] = { ...next[i], threshold: e.target.value }; updateAiConfig('handoffRules', next); }} placeholder="30 or 'complaint'" />
                                      </Field>
                                      <Field label="Action">
                                        <Select value={hr.action || 'notify_agent'} onValueChange={v => { const next = [...handoffRules]; next[i] = { ...next[i], action: v }; updateAiConfig('handoffRules', next); }}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="notify_agent">Notify agent</SelectItem>
                                            <SelectItem value="assign_to_dept">Assign to dept</SelectItem>
                                            <SelectItem value="send_away_message">Send away message</SelectItem>
                                            <SelectItem value="create_ticket">Create ticket</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </Field>
                                      <div className="flex items-end gap-2">
                                        <Field label="Handoff Message" className="flex-1">
                                          <Input value={hr.message || ''} onChange={e => { const next = [...handoffRules]; next[i] = { ...next[i], message: e.target.value }; updateAiConfig('handoffRules', next); }} placeholder="Optional message to send on handoff" />
                                        </Field>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive mb-0.5" onClick={() => updateAiConfig('handoffRules', handoffRules.filter((_, j) => j !== i))}>
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* ── 6. KNOWLEDGE SOURCES ── */}
                          {aiSection === 'knowledge' && (
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">Control which data sources the AI uses when composing replies. Disabling a source removes it from the prompt context entirely.</p>
                              {[
                                { key: 'companyProfile', label: 'Company Profile', desc: 'Business name, industry, website, contact info' },
                                { key: 'knowledgeBase', label: 'Knowledge Base', desc: 'Uploaded FAQs, policies, and support articles' },
                                { key: 'productCatalog', label: 'Product Catalog', desc: 'Active products with pricing, stock and categories' },
                                { key: 'faq', label: 'Offers & Promotions', desc: 'Active discount codes, sales and promotional offers' },
                                { key: 'policies', label: 'Shipping Policies', desc: 'Shipping zones and rate information' },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                                  <div>
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                  </div>
                                  <Toggle value={knowledgeSources[key] !== false} onChange={v => updateAiConfig(`knowledgeSources.${key}`, v)} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── 7. PERFORMANCE METRICS ── */}
                          {aiSection === 'performance' && (
                            <div className="space-y-6">
                              {!aiMetrics ? (
                                <EmptyState icon={BarChart3} text="No performance data yet." />
                              ) : (
                                <>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                      { label: 'Total Suggestions', value: (aiMetrics.totalSuggestions || 0).toLocaleString() },
                                      { label: 'Auto-Replied', value: (aiMetrics.autoReplied || 0).toLocaleString() },
                                      { label: 'Auto-Reply Rate', value: `${aiMetrics.autoReplyRate ?? 0}%` },
                                      { label: 'Avg Confidence', value: `${Math.round((aiMetrics.avgConfidence || 0) * 100)}%` },
                                    ].map(({ label, value }) => (
                                      <Card key={label} className="border">
                                        <CardContent className="p-4 text-center">
                                          <p className="text-2xl font-bold">{value}</p>
                                          <p className="text-xs text-muted-foreground mt-1">{label}</p>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                  {(aiMetrics.intentBreakdown || []).length > 0 && (
                                    <Card className="border">
                                      <CardHeader className="pb-3"><CardTitle className="text-sm">Intent Distribution</CardTitle></CardHeader>
                                      <CardContent className="space-y-2">
                                        {aiMetrics.intentBreakdown.map(({ intent, count }) => {
                                          const max = Math.max(...aiMetrics.intentBreakdown.map(r => r.count), 1);
                                          return (
                                            <div key={intent} className="flex items-center gap-3">
                                              <span className="text-xs w-28 text-muted-foreground truncate">{intent}</span>
                                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                                              </div>
                                              <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                                            </div>
                                          );
                                        })}
                                      </CardContent>
                                    </Card>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Note: Per-request token counts and cost breakdowns require platform-level observability infrastructure (not exposed per-tenant).
                                  </p>
                                </>
                              )}
                              <Button variant="outline" size="sm" onClick={loadAiConfig} className="h-8 gap-2">
                                <RefreshCcw className="h-3.5 w-3.5" /> Refresh metrics
                              </Button>
                            </div>
                          )}

                          {/* ── 8. SAFETY & COMPLIANCE ── */}
                          {aiSection === 'safety' && (
                            <div className="space-y-4">
                              <div className="rounded-xl border bg-muted/5 p-4 text-sm text-muted-foreground">
                                Core safety restrictions (financial data, private customer records, database queries, system internals) are platform-enforced and cannot be disabled. These toggles add compliance overlays on top.
                              </div>
                              {[
                                { key: 'piiRestriction', label: 'PII Restriction', desc: 'AI refuses to output personally identifiable information from the system context' },
                                { key: 'gdprMode', label: 'GDPR Mode', desc: 'AI explicitly acknowledges data handling rights when customers ask' },
                                { key: 'legalComplianceMode', label: 'Legal Compliance Mode', desc: 'AI appends standard legal disclaimers to financial advice replies' },
                                { key: 'promptInjectionProtection', label: 'Prompt Injection Protection', desc: 'Input is screened for injection patterns before entering AI context' },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                                  <div>
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                  </div>
                                  <Toggle value={safety[key] !== false} onChange={v => updateAiConfig(`safety.${key}`, v)} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── 9. MODEL MANAGEMENT ── */}
                          {aiSection === 'model' && (
                            <div className="space-y-6">
                              <div className="rounded-xl border bg-muted/5 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium"><Lock className="h-4 w-4 text-muted-foreground" />Platform-Managed Provider</div>
                                <p className="text-xs text-muted-foreground">The AI provider (Anthropic / OpenAI), model version, and API keys are managed by the platform for stability and security. You control generation parameters below.</p>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <Field label="Creativity (Temperature)">
                                  <Select value={String(ac.temperature ?? '0.4')} onValueChange={v => updateAiConfig('temperature', parseFloat(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0.1">Very Precise (0.1)</SelectItem>
                                      <SelectItem value="0.2">Precise (0.2)</SelectItem>
                                      <SelectItem value="0.4">Balanced (0.4)</SelectItem>
                                      <SelectItem value="0.6">Creative (0.6)</SelectItem>
                                      <SelectItem value="0.7">Very Creative (0.7)</SelectItem>
                                      <SelectItem value="0.9">Experimental (0.9)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="Max Tokens per Reply">
                                  <Input type="number" min={50} max={2000} step={50} value={ac.maxTokens ?? 300} onChange={e => updateAiConfig('maxTokens', parseInt(e.target.value))} />
                                  <p className="text-xs text-muted-foreground mt-1">Longer replies = higher cost. Keep under 500 for chat.</p>
                                </Field>
                              </div>
                              <div className="rounded-xl border bg-muted/5 p-4 text-xs text-muted-foreground space-y-1">
                                <p><strong>Platform defaults:</strong> Provider: Anthropic claude-sonnet (latest) · Safety mode: enabled · Top-P: 0.9</p>
                                <p>Contact platform admin to change provider or model version.</p>
                              </div>
                            </div>
                          )}

                          {/* ── 10. AI SIMULATOR ── */}
                          {aiSection === 'simulator' && (
                            <div className="space-y-6">
                              <div className="rounded-xl border bg-muted/5 p-4 text-sm text-muted-foreground">
                                Send a test message through the AI engine using your current settings. No message is saved, no reply is sent to any customer.
                              </div>
                              <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                  <Field label="Customer Message">
                                    <Textarea rows={3} value={aiSimInput} onChange={e => setAiSimInput(e.target.value)} placeholder="e.g. Do you have this in blue? Can I get a discount?" />
                                  </Field>
                                </div>
                                <Field label="Channel">
                                  <Select value={aiSimChannel} onValueChange={setAiSimChannel}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="livechat">Live Chat</SelectItem>
                                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                      <SelectItem value="instagram">Instagram</SelectItem>
                                      <SelectItem value="messenger">Messenger</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>
                              <Button onClick={handleAiSimulate} disabled={aiSimulating || !aiSimInput.trim()} className="h-9 gap-2">
                                <Play className="h-4 w-4" />
                                {aiSimulating ? 'Simulating…' : 'Run Simulation'}
                              </Button>
                              {aiSimResult && (
                                <Card className={cn('border', aiSimResult.blocked ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20')}>
                                  <CardContent className="p-5 space-y-3">
                                    {aiSimResult.blocked ? (
                                      <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                                        <ShieldAlert className="h-4 w-4" />
                                        Blocked: {aiSimResult.blockedReason}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Reply generated — {aiSimResult.agentName} · {aiSimResult.tone} · {aiSimResult.channel}
                                      </div>
                                    )}
                                    <div className="rounded-lg bg-background border p-4 text-sm whitespace-pre-wrap">
                                      {aiSimResult.simulatedReply}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Simulation only — not saved, not sent.</p>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* ── 18. TRIGGERS ──────────────────────────────────────────── */}
            {activeId === 'triggers' && (
              <div className="space-y-6">
                <SectionHeader title="Triggers" description="Automation rules that fire when events occur. WHEN event + condition is met → THEN run action.">
                  <Button size="sm" onClick={() => setActiveData(prev => [
                    ...(prev || []),
                    { id: `trg_${Date.now()}`, name: 'New Trigger', event: 'message_received', conditionField: 'score', conditionOp: '>=', conditionValue: '70', actionType: 'add_tag', actionValue: '', active: true },
                  ])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Trigger
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Zap} text="No triggers configured." /></Card>
                ) : activeData.map((t, i) => {
                  function updateTrigger(patch) {
                    const next = [...activeData]; next[i] = { ...next[i], ...patch }; setActiveData(next);
                  }
                  return (
                    <Card key={i} className="border shadow-sm bg-card">
                      <CardContent className="p-6 space-y-5">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-3">
                          <Input
                            className="h-8 font-semibold border-0 px-0 text-sm bg-transparent shadow-none focus-visible:ring-0 w-auto min-w-0 flex-1"
                            value={t.name}
                            onChange={e => updateTrigger({ name: e.target.value })}
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <Toggle value={!!t.active} onChange={v => updateTrigger({ active: v })} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* WHEN block */}
                        <div className="rounded-xl border bg-muted/5 p-4 space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">When</p>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <Field label="Event">
                              <Select value={t.event || 'message_received'} onValueChange={v => updateTrigger({ event: v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_EVENTS.map(ev => (
                                    <SelectItem key={ev.value} value={ev.value}>{ev.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Condition Field">
                              <Select value={t.conditionField || 'score'} onValueChange={v => updateTrigger({ conditionField: v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_CONDITION_FIELDS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Operator">
                              <Select value={t.conditionOp || '>='} onValueChange={v => updateTrigger({ conditionOp: v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_CONDITION_OPS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Value">
                              <Input
                                className="h-9"
                                value={t.conditionValue ?? ''}
                                onChange={e => updateTrigger({ conditionValue: e.target.value })}
                                placeholder="e.g. 70 or whatsapp"
                              />
                            </Field>
                          </div>
                        </div>

                        {/* THEN block */}
                        <div className="rounded-xl border bg-muted/5 p-4 space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Then</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <Field label="Action">
                              <Select value={t.actionType || 'add_tag'} onValueChange={v => updateTrigger({ actionType: v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_ACTION_TYPES.map(a => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            {t.actionType === 'assign_to' ? (
                              <Field label="Assign To">
                                <Select value={t.actionValue || ''} onValueChange={v => updateTrigger({ actionValue: v })}>
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Select agent or dept…" /></SelectTrigger>
                                  <SelectContent>
                                    {depts.map(d => (
                                      <SelectItem key={`dept:${d.name}`} value={`dept:${d.name}`}>Dept: {d.name}</SelectItem>
                                    ))}
                                    {team.map(m => (
                                      <SelectItem key={`agent:${m.id}`} value={`agent:${m.id}`}>{m.name} ({m.role})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                            ) : t.actionType === 'close_conversation' ? (
                              <div className="flex items-end pb-0.5">
                                <p className="text-xs text-muted-foreground">No additional configuration needed.</p>
                              </div>
                            ) : (
                              <Field label={t.actionType === 'update_score' ? 'Points (use + or -)' : t.actionType === 'send_message' ? 'Message Text' : 'Value'}>
                                <Input
                                  className="h-9"
                                  value={t.actionValue ?? ''}
                                  onChange={e => updateTrigger({ actionValue: e.target.value })}
                                  placeholder={
                                    t.actionType === 'add_tag' ? 'e.g. vip' :
                                    t.actionType === 'remove_tag' ? 'e.g. cold' :
                                    t.actionType === 'update_score' ? 'e.g. +10 or -5' :
                                    t.actionType === 'send_message' ? 'Message to send…' :
                                    t.actionType === 'notify_agent' ? 'Notification text…' : ''
                                  }
                                />
                              </Field>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Triggers'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 19. VISITOR ROUTING ───────────────────────────────────── */}
            {activeId === 'visitor_routing' && (
              <div className="space-y-6">
                <SectionHeader title="Visitor Routing" description="How incoming sessions are distributed across agents." />

                {/* Config card */}
                <SettingSection title="Routing Configuration" loading={sectionLoading} onSave={async () => {
                  setSaving(true);
                  try {
                    const saved = await api.put('/api/settings/visitor-routing', { config: activeData?.config ?? {} });
                    setActiveData(d => ({ ...d, ...(saved?.config ? { config: saved.config } : {}) }));
                    toast.success('Saved');
                  } catch (err) { toast.error(err.message || 'Save failed'); }
                  finally { setSaving(false); }
                }} saving={saving}>
                  {activeData && (
                    <div className="grid grid-cols-3 gap-6">
                      <Field label="Routing Mode">
                        <Select value={activeData.config?.mode || 'round_robin'} onValueChange={v => setActiveData(d => ({ ...d, config: { ...d.config, mode: v } }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="least_busy">Least Busy</SelectItem>
                            <SelectItem value="random">Random</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Fallback">
                        <Select value={activeData.config?.fallback || 'AI Bot'} onValueChange={v => setActiveData(d => ({ ...d, config: { ...d.config, fallback: v } }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AI Bot">AI Bot</SelectItem>
                            <SelectItem value="queue">Queue</SelectItem>
                            <SelectItem value="offline">Offline Message</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Threshold (seconds)">
                        <Input type="number" min={5} value={activeData.config?.threshold ?? 30} onChange={e => setActiveData(d => ({ ...d, config: { ...d.config, threshold: parseInt(e.target.value) } }))} />
                      </Field>
                    </div>
                  )}
                </SettingSection>

                {/* Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Routing Rules</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rules are evaluated in priority order. First match wins.</p>
                    </div>
                    <Button size="sm" className="h-9 gap-2" onClick={() => setActiveData(d => ({
                      ...d,
                      rules: [...(d?.rules || []), { id: `vr_${Date.now()}`, name: 'New Rule', conditionField: 'channel', conditionOp: '=', conditionValue: '', assignTo: '', priority: (d?.rules?.length || 0) + 1, enabled: true }],
                    }))}>
                      <Plus className="h-3.5 w-3.5" /> Add Rule
                    </Button>
                  </div>

                  {(!activeData?.rules || activeData.rules.length === 0) ? (
                    <Card className="border"><EmptyState icon={Route} text="No routing rules. All traffic handled by fallback." /></Card>
                  ) : activeData.rules.map((r, i) => {
                    function updateRule(patch) {
                      setActiveData(d => {
                        const next = [...(d.rules || [])];
                        next[i] = { ...next[i], ...patch };
                        return { ...d, rules: next };
                      });
                    }
                    return (
                      <Card key={r.id || i} className="border shadow-sm bg-card">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-muted text-[11px] font-bold flex items-center justify-center shrink-0 text-muted-foreground">{i + 1}</span>
                            <Input
                              className="h-8 font-semibold border-0 px-0 text-sm bg-transparent shadow-none focus-visible:ring-0 flex-1"
                              value={r.name}
                              onChange={e => updateRule({ name: e.target.value })}
                            />
                            <Toggle value={!!r.enabled} onChange={v => updateRule({ enabled: v })} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(d => ({ ...d, rules: d.rules.filter((_, j) => j !== i) }))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* IF condition */}
                            <div className="rounded-xl border bg-muted/5 p-3 space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">If</p>
                              <div className="grid grid-cols-3 gap-2">
                                <Select value={r.conditionField || 'channel'} onValueChange={v => updateRule({ conditionField: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ROUTING_CONDITION_FIELDS.map(f => (
                                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={r.conditionOp || '='} onValueChange={v => updateRule({ conditionOp: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ROUTING_CONDITION_OPS.map(o => (
                                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input className="h-8 text-xs" value={r.conditionValue || ''} onChange={e => updateRule({ conditionValue: e.target.value })} placeholder="value" />
                              </div>
                            </div>

                            {/* THEN assign */}
                            <div className="rounded-xl border bg-muted/5 p-3 space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Route To</p>
                              <Select value={r.assignTo || ''} onValueChange={v => updateRule({ assignTo: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select agent or department…" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ai_bot">AI Bot</SelectItem>
                                  <SelectItem value="queue">Queue</SelectItem>
                                  {depts.map(d => (
                                    <SelectItem key={`dept:${d.name}`} value={`dept:${d.name}`}>Dept: {d.name}</SelectItem>
                                  ))}
                                  {team.map(m => (
                                    <SelectItem key={`agent:${m.id}`} value={`agent:${m.id}`}>{m.name} ({m.role})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {activeData?.rules?.length > 0 && (
                    <div className="flex justify-end">
                      <Button onClick={async () => {
                        setSaving(true);
                        try {
                          const saved = await api.put('/api/settings/visitor-routing', {
                            config: activeData?.config ?? {},
                            rules: activeData?.rules ?? [],
                          });
                          // Normalize DB rules back to UI flat format
                          if (saved?.rules) saved.rules = saved.rules.map(engineRuleToUiFormat);
                          setActiveData(saved);
                          toast.success('Routing rules saved');
                        } catch (err) { toast.error(err.message || 'Save failed'); }
                        finally { setSaving(false); }
                      }} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                        {saving ? 'Saving…' : 'Save Rules'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 20. CHAT ROUTING ──────────────────────────────────────── */}
            {activeId === 'chat_routing' && (
              <div className="space-y-6">
                <SectionHeader title="Chat Routing" description="Rules for assigning incoming conversations to departments or agents. First matching rule wins.">
                  <Button size="sm" onClick={() => setActiveData(prev => [
                    ...(prev || []),
                    { id: `cr_${Date.now()}`, name: 'New Rule', conditionField: 'channel', conditionOp: '=', conditionValue: '', assignTo: '', active: true },
                  ])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Rule
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Route} text="No chat routing rules defined. All conversations go to unassigned." /></Card>
                ) : activeData.map((r, i) => {
                  function updateRule(patch) {
                    const next = [...activeData]; next[i] = { ...next[i], ...patch }; setActiveData(next);
                  }
                  return (
                    <Card key={i} className="border shadow-sm bg-card">
                      <CardContent className="p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-muted text-[11px] font-bold flex items-center justify-center shrink-0 text-muted-foreground">{i + 1}</span>
                          <Input
                            className="h-8 font-semibold border-0 px-0 text-sm bg-transparent shadow-none focus-visible:ring-0 flex-1"
                            value={r.name}
                            onChange={e => updateRule({ name: e.target.value })}
                          />
                          <Toggle value={!!r.active} onChange={v => updateRule({ active: v })} />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* IF block */}
                          <div className="rounded-xl border bg-muted/5 p-3 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">If</p>
                            <div className="grid grid-cols-3 gap-2">
                              <Select value={r.conditionField || 'channel'} onValueChange={v => updateRule({ conditionField: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROUTING_CONDITION_FIELDS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={r.conditionOp || '='} onValueChange={v => updateRule({ conditionOp: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROUTING_CONDITION_OPS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input className="h-8 text-xs" value={r.conditionValue || ''} onChange={e => updateRule({ conditionValue: e.target.value })} placeholder="value" />
                            </div>
                          </div>

                          {/* THEN assign */}
                          <div className="rounded-xl border bg-muted/5 p-3 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Assign To</p>
                            <Select value={r.assignTo || ''} onValueChange={v => updateRule({ assignTo: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select agent or department…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ai_bot">AI Bot</SelectItem>
                                <SelectItem value="queue">Queue (Unassigned)</SelectItem>
                                {depts.map(d => (
                                  <SelectItem key={`dept:${d.name}`} value={`dept:${d.name}`}>Dept: {d.name}</SelectItem>
                                ))}
                                {team.map(m => (
                                  <SelectItem key={`agent:${m.id}`} value={`agent:${m.id}`}>{m.name} ({m.role})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Chat Routing'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 21. LEAD SCORING ──────────────────────────────────────── */}
            {activeId === 'lead_scoring' && (
              <div className="space-y-6">
                <SectionHeader title="Lead Scoring" description="Signal rules that adjust the AI lead score (0–100). Active rules with matching signals increase or decrease the final score." />
                <Card className="border shadow-sm bg-card overflow-hidden">
                  <CardHeader className="border-b bg-muted/5 py-3 px-6 flex-row items-center justify-between">
                    <p className="text-sm font-medium">Signal Rules</p>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => {
                      setActiveData(prev => [
                        ...(Array.isArray(prev) ? prev : []),
                        { id: `lr_${Date.now()}`, signal: LEAD_SIGNALS[0].signal, weight: 10, active: true },
                      ]);
                    }}>
                      <Plus className="h-3.5 w-3.5" /> Add Rule
                    </Button>
                  </CardHeader>
                  <div className="divide-y">
                    {(!activeData || activeData.length === 0) ? (
                      <div className="p-6 text-center text-sm text-muted-foreground italic">
                        No custom rules. System uses purchase history and VIP tag defaults.
                      </div>
                    ) : activeData.map((rule, i) => (
                      <div key={i} className="p-4 px-6 flex items-center gap-4">
                        <Toggle value={!!rule.active} onChange={v => {
                          const next = [...activeData]; next[i] = { ...next[i], active: v }; setActiveData(next);
                        }} />
                        <Select value={rule.signal || LEAD_SIGNALS[0].signal} onValueChange={v => {
                          const next = [...activeData]; next[i] = { ...next[i], signal: v }; setActiveData(next);
                        }}>
                          <SelectTrigger className="h-9 flex-1 max-w-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LEAD_SIGNALS.map(s => (
                              <SelectItem key={s.signal} value={s.signal}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">Weight</span>
                          <Input
                            type="number"
                            className="w-20 h-9 text-center"
                            value={rule.weight ?? 10}
                            onChange={e => {
                              const next = [...activeData]; next[i] = { ...next[i], weight: parseInt(e.target.value) }; setActiveData(next);
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
                {Array.isArray(activeData) && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Lead Rules'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 22. COMPANY SCORING ───────────────────────────────────── */}
            {activeId === 'company_scoring' && (
              <SettingSection title="Company Scoring" description="Thresholds for boosting scores based on customer purchase history. Affects AI lead scoring." onSave={() => handleSaveActiveData()} saving={saving} loading={sectionLoading}>
                {activeData && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="text-sm font-medium">Enable Company Scoring</p>
                        <p className="text-xs text-muted-foreground">Apply revenue and order thresholds to boost lead scores</p>
                      </div>
                      <Toggle value={!!activeData.enabled} onChange={v => setActiveData(d => ({ ...d, enabled: v }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <Field label="Min Revenue for Boost">
                        <Input type="number" min={0} value={activeData.minRevenue ?? 1000} onChange={e => setActiveData(d => ({ ...d, minRevenue: parseFloat(e.target.value) }))} />
                      </Field>
                      <Field label="Min Orders for Boost">
                        <Input type="number" min={0} value={activeData.minOrders ?? 3} onChange={e => setActiveData(d => ({ ...d, minOrders: parseInt(e.target.value) }))} />
                      </Field>
                      <Field label="VIP Threshold (revenue)">
                        <Input type="number" min={0} value={activeData.vipThreshold ?? 5000} onChange={e => setActiveData(d => ({ ...d, vipThreshold: parseFloat(e.target.value) }))} />
                      </Field>
                    </div>
                    <Card className="bg-indigo-500/5 border-indigo-200/30 shadow-none">
                      <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
                        Customers exceeding <strong>VIP Threshold</strong> get +10 points. Those above <strong>Min Revenue</strong> get +5 points. Customers with &ge; <strong>Min Orders</strong> get +5 points. Points stack and are capped at 100.
                      </CardContent>
                    </Card>
                  </div>
                )}
              </SettingSection>
            )}

            {/* ── 23. SCHEDULE REPORT ───────────────────────────────────── */}
            {activeId === 'schedule_report' && (
              <div className="space-y-6">
                <SectionHeader title="Schedule Report" description="Automated performance reports sent by email.">
                  <Button size="sm" onClick={() => setActiveData(prev => [
                    ...(prev || []),
                    { id: `sr_${Date.now()}`, name: 'New Report', freq: 'daily', time: '08:00', email: '', active: true },
                  ])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Schedule
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Calendar} text="No scheduled reports configured." /></Card>
                ) : activeData.map((r, i) => (
                  <Card key={i} className="border shadow-sm bg-card">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{r.name}</p>
                        <div className="flex items-center gap-2">
                          {r.lastStatus && (
                            <Badge variant={r.lastStatus === 'sent' ? 'default' : 'destructive'} className="text-xs">
                              Last: {r.lastStatus}
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Send now" onClick={() => handleRunReport(r.id)}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Toggle value={!!r.active} onChange={v => {
                            const next = [...activeData]; next[i] = { ...next[i], active: v }; setActiveData(next);
                          }} />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Report Name">
                          <Input value={r.name} onChange={e => {
                            const next = [...activeData]; next[i] = { ...next[i], name: e.target.value }; setActiveData(next);
                          }} />
                        </Field>
                        <Field label="Frequency">
                          <Select value={r.freq || 'daily'} onValueChange={v => {
                            const next = [...activeData]; next[i] = { ...next[i], freq: v }; setActiveData(next);
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Send Time">
                          <Input type="time" value={r.time || '08:00'} onChange={e => {
                            const next = [...activeData]; next[i] = { ...next[i], time: e.target.value }; setActiveData(next);
                          }} />
                        </Field>
                        <div className="col-span-3">
                          <Field label="Recipient Email">
                            <Input type="email" value={r.email || ''} onChange={e => {
                              const next = [...activeData]; next[i] = { ...next[i], email: e.target.value }; setActiveData(next);
                            }} placeholder="Leave blank to use company email" />
                          </Field>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Schedules'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 24. CONVERSATION MONITOR ──────────────────────────────── */}
            {activeId === 'monitor' && (() => {
              const conversations = activeData?.conversations || [];
              const now = Date.now();

              const summary = activeData?.summary || {};
              const operators = activeData?.operators || [];

              function waitBadge(mins) {
                if (mins == null) return null;
                const m = Number(mins);
                const hrs = Math.floor(m / 60);
                const label = hrs >= 1 ? `${hrs}h ${m % 60}m` : `${m}m`;
                if (m < 10) return { label, cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-200' };
                if (m < 30) return { label, cls: 'text-amber-600 bg-amber-500/10 border-amber-200' };
                return { label, cls: 'text-destructive bg-destructive/10 border-destructive/20' };
              }

              const CHANNEL_COLORS = {
                whatsapp: 'bg-green-500/10 text-green-700 border-green-200',
                messenger: 'bg-blue-500/10 text-blue-700 border-blue-200',
                instagram: 'bg-purple-500/10 text-purple-700 border-purple-200',
                livechat:  'bg-slate-500/10 text-slate-700 border-slate-200',
              };

              return (
                <div className="space-y-5">
                  <SectionHeader title="Conversation Monitor" description="Live supervisor view. Refresh or take direct action on any conversation.">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live — {conversations.length} open
                      </div>
                      <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => loadActiveSection('monitor')} disabled={sectionLoading}>
                        <RefreshCcw className={cn('h-3.5 w-3.5', sectionLoading && 'animate-spin')} /> Refresh
                      </Button>
                    </div>
                  </SectionHeader>

                  {/* Summary bar */}
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Total open',  value: summary.total ?? conversations.length, cls: '' },
                      { label: 'Delayed >30m', value: summary.delayed ?? 0, cls: summary.delayed > 0 ? 'text-destructive' : '' },
                      { label: 'Urgent',       value: summary.urgent ?? 0,  cls: summary.urgent > 0  ? 'text-amber-600' : '' },
                      { label: 'Unassigned',   value: summary.unassigned ?? 0, cls: summary.unassigned > 0 ? 'text-amber-600' : '' },
                      { label: 'AI active',    value: summary.ai_active ?? 0, cls: 'text-primary' },
                    ].map(s => (
                      <Card key={s.label} className="border shadow-sm bg-card p-4 text-center">
                        <p className={cn('text-2xl font-bold', s.cls)}>{s.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                      </Card>
                    ))}
                  </div>

                  {/* Conversations table */}
                  <Card className="border shadow-sm bg-card overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_90px_70px_70px_70px_160px] gap-2 px-5 py-2.5 bg-muted/5 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      <span>Customer</span>
                      <span>Agent</span>
                      <span>Channel</span>
                      <span>Waiting</span>
                      <span>Score</span>
                      <span>AI</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {conversations.length === 0 ? (
                      <EmptyState icon={Eye} text="No open conversations at this time." />
                    ) : (
                      <div className="divide-y">
                        {conversations.map(c => {
                          const wb = waitBadge(c.waiting_minutes);
                          const chCls = CHANNEL_COLORS[c.channel] || 'bg-muted/30 text-muted-foreground border-border';
                          const isAssigning  = monitorActionLoading[`${c.id}_assign`];
                          const isPausing    = monitorActionLoading[`${c.id}_pause`];
                          const isEscalating = monitorActionLoading[`${c.id}_escalate`];
                          return (
                            <div key={c.id} className={cn(
                              'grid grid-cols-[1fr_120px_90px_70px_70px_70px_160px] gap-2 items-center px-5 py-3 hover:bg-muted/5 transition-colors',
                              c.is_urgent && 'bg-amber-500/5',
                              c.is_delayed && !c.is_urgent && 'bg-destructive/5',
                            )}>
                              {/* Customer */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium truncate">{c.customer_name || 'Unknown'}</p>
                                  {c.is_vip && <Badge className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-600 border-amber-300">VIP</Badge>}
                                  {c.is_urgent && <Badge className="text-[9px] px-1 py-0 bg-red-500/15 text-red-600 border-red-300">URGENT</Badge>}
                                  {c.is_delayed && !c.is_urgent && <Badge className="text-[9px] px-1 py-0 bg-destructive/15 text-destructive border-destructive/30">DELAYED</Badge>}
                                </div>
                                {c.last_message_preview && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[220px]">{c.last_message_preview}</p>
                                )}
                              </div>

                              {/* Agent */}
                              <p className="text-xs text-muted-foreground truncate">
                                {c.agent_name || <span className="italic text-muted-foreground/60">Unassigned</span>}
                              </p>

                              {/* Channel */}
                              <Badge className={cn('capitalize w-fit text-[11px] border font-normal', chCls)}>{c.channel}</Badge>

                              {/* Waiting */}
                              {wb ? (
                                <Badge className={cn('w-fit text-[11px] border font-normal', wb.cls)}>{wb.label}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}

                              {/* Lead score */}
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="text-xs font-semibold">{c.lead_score != null ? c.lead_score : '—'}</span>
                                {c.deal_stage && <span className="text-[10px] text-muted-foreground capitalize">{c.deal_stage}</span>}
                              </div>

                              {/* AI mode */}
                              <Badge className={cn(
                                'text-[10px] border font-normal w-fit',
                                c.ai_mode === 'auto'    && 'bg-primary/10 text-primary border-primary/30',
                                c.ai_mode === 'manual'  && 'bg-muted/40 text-muted-foreground border-border',
                                c.ai_mode === 'suggest' && 'bg-blue-500/10 text-blue-600 border-blue-200',
                              )}>
                                {c.ai_mode === 'auto' ? 'Auto' : c.ai_mode === 'suggest' ? 'Suggest' : 'Manual'}
                              </Badge>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={isAssigning}
                                  onClick={() => handleMonitorAssignMe(c.id)}
                                >
                                  {isAssigning ? <RefreshCcw className="h-3 w-3 animate-spin" /> : 'Assign me'}
                                </Button>
                                {c.ai_mode === 'auto' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px]"
                                    disabled={isPausing}
                                    onClick={() => handleMonitorPauseAI(c.id)}
                                  >
                                    {isPausing ? <RefreshCcw className="h-3 w-3 animate-spin" /> : 'Pause AI'}
                                  </Button>
                                )}
                                {(c.is_urgent || c.is_delayed) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/5"
                                    disabled={isEscalating}
                                    onClick={() => handleMonitorEscalate(c.id)}
                                  >
                                    {isEscalating ? <RefreshCcw className="h-3 w-3 animate-spin" /> : 'Escalate'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Operator load panel */}
                  {operators.length > 0 && (
                    <Card className="border shadow-sm bg-card">
                      <CardHeader className="border-b bg-muted/5 py-3.5 px-5">
                        <p className="text-sm font-semibold">Team Load</p>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {operators.map(op => (
                            <div key={op.id} className="flex items-center justify-between rounded-lg border bg-muted/10 px-3.5 py-2.5">
                              <p className="text-sm font-medium truncate">{op.name}</p>
                              <Badge className={cn(
                                'ml-2 shrink-0 text-[11px]',
                                op.active_conversations === 0
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                  : op.active_conversations >= 5
                                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-200',
                              )}>
                                {op.active_conversations}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}

            {/* ── 25. IMPORT ────────────────────────────────────────────── */}
            {activeId === 'import' && (
              <div className="space-y-6">
                <SectionHeader title="Import" description="Bulk import from CSV or Excel files. First row must be headers." />

                {/* Import Type Selection */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5 py-4 px-6">
                    <p className="text-sm font-semibold">What are you importing?</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'conversations', label: 'Conversations', desc: 'Chat messages and threads' },
                        { id: 'pipeline',      label: 'Pipeline / Leads', desc: 'Sales contacts and deals' },
                        { id: 'tickets',       label: 'Tickets', desc: 'Support requests' },
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setImportType(t.id)}
                          className={cn(
                            'p-4 rounded-xl border text-left transition-all',
                            importType === t.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30 bg-background',
                          )}
                        >
                          <p className={cn('text-sm font-medium', importType === t.id ? 'text-primary' : '')}>{t.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Column Guide */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5 py-4 px-6">
                    <p className="text-sm font-semibold">Expected Columns — {importType === 'conversations' ? 'Conversations' : importType === 'pipeline' ? 'Pipeline / Leads' : 'Tickets'}</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {IMPORT_COLUMNS[importType].map(col => (
                        <code key={col} className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono border">{col}</code>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Column order does not matter. First row must contain the header names above.</p>
                  </CardContent>
                </Card>

                {/* File Upload */}
                <Card className="border shadow-sm bg-card">
                  <CardHeader className="border-b bg-muted/5 py-4 px-6">
                    <p className="text-sm font-semibold">Upload File</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <label
                      htmlFor="import-file-input"
                      className={cn(
                        'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors',
                        importFile
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-muted hover:border-primary/30 hover:bg-muted/30',
                      )}
                    >
                      <input
                        id="import-file-input"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={e => {
  const f = e.target.files?.[0] || null;
  setImportFile(f);
  previewCsvFile(f);
}}
                      />
                      {importFile ? (
                        <div className="text-center space-y-2">
                          <FileUp className="h-8 w-8 text-primary mx-auto" />
                          <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <FileUp className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                          <p className="text-sm font-medium">Drop a file here or click to browse</p>
                          <p className="text-xs text-muted-foreground">CSV, XLSX, XLS · max 8 MB</p>
                        </div>
                      )}
                    </label>

                    {/* CSV preview — first 5 rows */}
                    {importPreview && (
                      <div className="rounded-lg border overflow-auto max-h-48">
                        <table className="text-[11px] w-full">
                          <thead>
                            <tr className="bg-muted/30">
                              {importPreview.headers.map((h, i) => (
                                <th key={i} className="px-3 py-1.5 text-left font-semibold text-muted-foreground border-r last:border-r-0 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.rows.map((row, ri) => (
                              <tr key={ri} className="border-t hover:bg-muted/10">
                                {importPreview.headers.map((_, ci) => (
                                  <td key={ci} className="px-3 py-1.5 border-r last:border-r-0 max-w-[140px] truncate text-muted-foreground">{row[ci] ?? ''}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t bg-muted/10">Showing up to 5 rows preview · actual import processes all rows</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-muted-foreground min-w-0">
                        {activeData?.lastResult ? (
                          <span>
                            Last import: <strong className="text-foreground">{activeData.lastResult.inserted}</strong> inserted
                            {' · '}{activeData.lastResult.skipped} skipped
                            {' · '}{new Date(activeData.lastResult.completedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>No previous imports.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {importFile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-muted-foreground"
                            onClick={() => {
                              setImportFile(null);
                              setImportResult(null);
                              setImportPreview(null);
                              const el = document.getElementById('import-file-input');
                              if (el) el.value = '';
                            }}
                          >
                            Clear
                          </Button>
                        )}
                        <Button
                          onClick={handleImportUpload}
                          disabled={!importFile || importUploading || importProcessing}
                          className="h-9 gap-2 bg-primary px-6 font-medium"
                        >
                          <FileUp className="h-4 w-4" />
                          {importUploading ? 'Uploading…' : importProcessing ? 'Processing…' : 'Upload & Import'}
                        </Button>
                      </div>
                    </div>

                    {/* Import result */}
                    {importResult && (
                      <div className={cn(
                        'rounded-xl border p-5 space-y-3',
                        importResult.inserted > 0 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-destructive/30 bg-destructive/5',
                      )}>
                        <div className="flex items-center gap-2">
                          {importResult.inserted > 0
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <XCircle className="h-4 w-4 text-destructive" />}
                          <p className="text-sm font-semibold">Import Complete</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{importResult.processed}</p>
                            <p className="text-xs text-muted-foreground">Processed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                            <p className="text-xs text-muted-foreground">Inserted</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</p>
                            <p className="text-xs text-muted-foreground">Skipped</p>
                          </div>
                        </div>
                        {importResult.errors?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-destructive">Errors ({importResult.errors.length})</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {importResult.errors.map((e, i) => (
                                <p key={i} className="text-xs text-destructive/80 font-mono">{e}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── 26. PROFILES ──────────────────────────────────────────── */}
            {/* ── 26. PROFILES ──────────────────────────────────────────── */}
            {activeId === 'profiles' && (
              <div className="space-y-6">
                <SectionHeader title="Profiles" description="Custom fields added to every customer profile. Control visibility in AI, reports, search, and imports.">
                  <Button size="sm" onClick={() => setActiveData(prev => [
                    ...(prev || []),
                    { key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, defaultValue: '', aiVisible: true, reportVisible: true, searchable: false, importMappable: true },
                  ])} className="h-9 gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Field
                  </Button>
                </SectionHeader>
                {(!activeData || activeData.length === 0) ? (
                  <Card className="border"><EmptyState icon={Shield} text="No custom profile fields defined." /></Card>
                ) : activeData.map((f, i) => {
                  function updateField(patch) {
                    const next = [...activeData]; next[i] = { ...next[i], ...patch }; setActiveData(next);
                  }
                  return (
                    <Card key={i} className="border shadow-sm bg-card">
                      <CardContent className="p-5 space-y-4">
                        {/* Row 1: identity */}
                        <div className="flex items-start gap-4">
                          <div className="grid grid-cols-3 gap-4 flex-1">
                            <Field label="Field Key">
                              <Input value={f.key} onChange={e => updateField({ key: e.target.value })} placeholder="snake_case_key" className="font-mono text-sm" />
                            </Field>
                            <Field label="Display Label">
                              <Input value={f.label} onChange={e => updateField({ label: e.target.value })} />
                            </Field>
                            <Field label="Type">
                              <Select value={f.type || 'text'} onValueChange={v => updateField({ type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="url">URL</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone</SelectItem>
                                  <SelectItem value="select">Single Select</SelectItem>
                                  <SelectItem value="multiselect">Multi Select</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 mt-6" onClick={() => setActiveData(activeData.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* Row 2: default + metadata */}
                        <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                          <Field label="Default Value">
                            <Input value={f.defaultValue || ''} onChange={e => updateField({ defaultValue: e.target.value })} placeholder="Optional" className="text-sm" />
                          </Field>
                          <div className="space-y-3 pt-1">
                            <Label className="text-xs text-muted-foreground">Flags</Label>
                            <div className="space-y-2">
                              {[
                                { key: 'required',       label: 'Required' },
                                { key: 'aiVisible',      label: 'Visible to AI' },
                                { key: 'reportVisible',  label: 'In Reports' },
                              ].map(flag => (
                                <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                                  <Toggle value={!!f[flag.key]} onChange={v => updateField({ [flag.key]: v })} />
                                  <span className="text-xs">{flag.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3 pt-1">
                            <Label className="text-xs text-muted-foreground">Usage</Label>
                            <div className="space-y-2">
                              {[
                                { key: 'searchable',      label: 'Searchable' },
                                { key: 'importMappable',  label: 'Import Mappable' },
                              ].map(flag => (
                                <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                                  <Toggle value={!!f[flag.key]} onChange={v => updateField({ [flag.key]: v })} />
                                  <span className="text-xs">{flag.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2 pt-1">
                            <Label className="text-xs text-muted-foreground">Summary</Label>
                            <div className="space-y-1">
                              {f.required && <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 block w-fit">Required</Badge>}
                              {f.aiVisible && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 block w-fit">AI visible</Badge>}
                              {f.searchable && <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200 block w-fit">Searchable</Badge>}
                              {f.importMappable && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 block w-fit">Importable</Badge>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {activeData?.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 px-8 bg-primary font-medium">
                      {saving ? 'Saving…' : 'Save Profile Fields'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 27. SPAMMERS ──────────────────────────────────────────── */}
            {activeId === 'spammers' && (() => {
              const blocked    = (activeData || []).filter(s => !s.whitelisted);
              const whitelisted = (activeData || []).filter(s => s.whitelisted);
              const SEV_BADGE = {
                low:    'bg-blue-500/10 text-blue-600 border-blue-200',
                medium: 'bg-amber-500/10 text-amber-600 border-amber-200',
                high:   'bg-destructive/10 text-destructive border-destructive/20',
              };

              function addEntry() {
                const val = spamForm.value.trim();
                if (!val) { toast.error('Value is required'); return; }
                if ((activeData || []).some(s => s.value === val)) { toast.error('Already in list'); return; }
                setActiveData(prev => [...(prev || []), { ...spamForm, value: val }]);
                setSpamForm({ value: '', type: 'phone', reason: '', severity: 'medium', temporary: false, expiresAt: '', whitelisted: spamDialog === 'whitelist' });
                setSpamDialog(false);
              }

              function removeEntry(value) {
                setActiveData(prev => (prev || []).filter(s => s.value !== value));
              }

              function EntryRow({ s, isWhitelist }) {
                const now = Date.now();
                const expired = s.temporary && s.expiresAt && new Date(s.expiresAt).getTime() < now;
                return (
                  <div className={cn('p-4 px-5 flex items-start justify-between gap-4 group', expired && 'opacity-50')}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-medium">{s.value}</span>
                        {s.type && <Badge variant="outline" className="text-[10px] capitalize">{s.type}</Badge>}
                        {!isWhitelist && s.severity && <Badge className={cn('text-[10px]', SEV_BADGE[s.severity] || SEV_BADGE.medium)}>{s.severity}</Badge>}
                        {s.temporary && (
                          expired
                            ? <Badge className="text-[10px] bg-muted/30 text-muted-foreground border-border">Expired</Badge>
                            : <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">Temp · {new Date(s.expiresAt).toLocaleDateString()}</Badge>
                        )}
                      </div>
                      {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeEntry(s.value)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  <SectionHeader title="Spammers" description="Blocked identifiers are silently rejected. Whitelisted identifiers bypass all blocks.">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-9 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => { setSpamForm(p => ({ ...p, whitelisted: true })); setSpamDialog('whitelist'); }}>
                        <Plus className="h-3.5 w-3.5" /> Whitelist
                      </Button>
                      <Button size="sm" className="h-9 gap-2 bg-destructive/90 hover:bg-destructive" onClick={() => { setSpamForm(p => ({ ...p, whitelisted: false })); setSpamDialog('block'); }}>
                        <Plus className="h-3.5 w-3.5" /> Block
                      </Button>
                    </div>
                  </SectionHeader>

                  {/* Blocked list */}
                  <Card className="border shadow-sm bg-card overflow-hidden">
                    <CardHeader className="border-b bg-muted/5 py-3.5 px-5 flex-row items-center justify-between">
                      <p className="text-sm font-semibold">Blocked <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/20 text-[11px]">{blocked.length}</Badge></p>
                    </CardHeader>
                    {blocked.length === 0 ? (
                      <EmptyState icon={ShieldAlert} text="No blocked identifiers." />
                    ) : (
                      <div className="divide-y">{blocked.map((s, i) => <EntryRow key={i} s={s} isWhitelist={false} />)}</div>
                    )}
                  </Card>

                  {/* Whitelist */}
                  <Card className="border shadow-sm bg-card overflow-hidden">
                    <CardHeader className="border-b bg-muted/5 py-3.5 px-5">
                      <p className="text-sm font-semibold">Whitelisted <Badge className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[11px]">{whitelisted.length}</Badge></p>
                    </CardHeader>
                    {whitelisted.length === 0 ? (
                      <EmptyState icon={Shield} text="No whitelisted identifiers." />
                    ) : (
                      <div className="divide-y">{whitelisted.map((s, i) => <EntryRow key={i} s={s} isWhitelist={true} />)}</div>
                    )}
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveActiveData()} disabled={saving} className="h-9 font-medium bg-primary px-8">
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>

                  {/* Add entry dialog */}
                  <Dialog open={!!spamDialog} onOpenChange={open => { if (!open) setSpamDialog(false); }}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{spamDialog === 'whitelist' ? 'Whitelist Identifier' : 'Block Identifier'}</DialogTitle>
                        <DialogDescription>
                          {spamDialog === 'whitelist'
                            ? 'Whitelisted identifiers bypass all spam blocks.'
                            : 'Matching customers will be silently rejected at the message gate.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <Field label="Identifier value">
                          <Input
                            placeholder="Phone number, customer ID, or name"
                            value={spamForm.value}
                            onChange={e => setSpamForm(p => ({ ...p, value: e.target.value }))}
                            className="font-mono"
                            onKeyDown={e => { if (e.key === 'Enter') addEntry(); }}
                          />
                        </Field>
                        <Field label="Type">
                          <Select value={spamForm.type} onValueChange={v => setSpamForm(p => ({ ...p, type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="id">Customer ID</SelectItem>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="channel_id">Channel ID</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Reason (optional)">
                          <Input placeholder="Why is this identifier blocked?" value={spamForm.reason} onChange={e => setSpamForm(p => ({ ...p, reason: e.target.value }))} />
                        </Field>
                        {spamDialog === 'block' && (
                          <Field label="Severity">
                            <Select value={spamForm.severity} onValueChange={v => setSpamForm(p => ({ ...p, severity: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <Toggle value={spamForm.temporary} onChange={v => setSpamForm(p => ({ ...p, temporary: v, expiresAt: v ? p.expiresAt : '' }))} />
                          <span className="text-sm">Temporary ban</span>
                        </label>
                        {spamForm.temporary && (
                          <Field label="Expires at">
                            <Input type="date" value={spamForm.expiresAt} onChange={e => setSpamForm(p => ({ ...p, expiresAt: e.target.value }))} />
                          </Field>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSpamDialog(false)}>Cancel</Button>
                        <Button
                          onClick={addEntry}
                          className={spamDialog === 'whitelist' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}
                        >
                          {spamDialog === 'whitelist' ? 'Whitelist' : 'Block'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })()}

          </div>
        </ScrollArea>
      </div>

      {/* ── Operator Invite/Edit Dialog ───────────────────────────────────── */}
      <Dialog open={!!opDialog} onOpenChange={open => { if (!open) setOpDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{opDialog === 'invite' ? 'Invite Operator' : 'Edit Operator'}</DialogTitle>
            <DialogDescription>
              {opDialog === 'invite' ? 'Add a new team member to this workspace.' : 'Update name, role, or password.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Full Name">
              <Input value={opForm.name} onChange={e => setOpForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            {opDialog === 'invite' && (
              <Field label="Email">
                <Input type="email" value={opForm.email} onChange={e => setOpForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
            )}
            <Field label="Role">
              <Select value={opForm.role} onValueChange={v => setOpForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department (optional)">
              <Select value={opForm.department || '__none__'} onValueChange={v => setOpForm(f => ({ ...f, department: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {depts.map(d => (
                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={opDialog === 'invite' ? 'Password (optional — auto-generated if blank)' : 'New Password (leave blank to keep current)'}>
              <Input type="password" value={opForm.password} onChange={e => setOpForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpDialog(null)}>Cancel</Button>
            <Button onClick={opDialog === 'invite' ? handleInviteOperator : handleEditOperator} disabled={opSaving}>
              {opSaving ? 'Saving…' : opDialog === 'invite' ? 'Send Invite' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Live Chat Widget Setup Dialog ────────────────────────────────── */}
      <Dialog open={lcDialog} onOpenChange={setLcDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Live Chat Widget</DialogTitle>
            <DialogDescription>Set the domain and brand color for your widget.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Allowed Domain">
              <Input value={lcForm.domain} onChange={e => setLcForm(f => ({ ...f, domain: e.target.value }))} placeholder="yoursite.com" />
            </Field>
            <Field label="Widget Color">
              <div className="flex gap-2 items-center">
                <div className="w-9 h-9 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: lcForm.color }} />
                <Input value={lcForm.color} onChange={e => setLcForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLcDialog(false)}>Cancel</Button>
            <Button onClick={handleConnectLivechat}>Configure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
