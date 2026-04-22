'use client';

import { useMemo, useState } from 'react';
import styles from './ConversationsPrototypePage.module.css';

const conversations = [
  {
    id: 'conv-wa-101',
    name: 'Maya Hassan',
    initials: 'MH',
    channel: 'WhatsApp',
    channelTone: 'wa',
    status: 'Open',
    intent: 'Pricing intent',
    aiMode: 'auto',
    leadScore: 86,
    assignee: 'AI Concierge',
    lastMessage: 'Can you send the annual plan price in EGP?',
    timestamp: '10:42',
    unread: 3,
    tags: ['Enterprise', 'Arabic', 'Hot lead'],
    email: 'maya@northstar-retail.com',
    phone: '+20 100 552 0144',
    location: 'Cairo, Egypt',
    value: '$18.4k',
    sentiment: 'Positive',
    messages: [
      { id: 'm1', conversationId: 'conv-wa-101', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-22T10:31:00.000Z', content: 'Hi, we are comparing support platforms for 22 stores.' },
      { id: 'm2', conversationId: 'conv-wa-101', direction: 'outbound', sent_by: 'ai', timestamp: '2026-04-22T10:31:30.000Z', content: 'I can help with that. Are you looking for WhatsApp automation only, or all channels in one inbox?' },
      { id: 'm3', conversationId: 'conv-wa-101', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-22T10:34:00.000Z', content: 'All channels. WhatsApp, Instagram, and Messenger. Arabic support is important.' },
      { id: 'm4', conversationId: 'conv-wa-101', direction: 'outbound', sent_by: 'ai', timestamp: '2026-04-22T10:35:00.000Z', content: 'ChatorAI supports all three channels in one inbox with Arabic and English AI replies. The Pro plan is usually the best fit for multi-location teams.' },
      { id: 'm5', conversationId: 'conv-wa-101', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-22T10:42:00.000Z', content: 'Can you send the annual plan price in EGP?' },
    ],
    suggestion: {
      confidence: 94,
      intent: 'Plan conversion',
      text: 'Offer annual pricing, mention multi-store onboarding, and invite Maya to a 15-minute setup call.',
    },
  },
  {
    id: 'conv-ig-204',
    name: 'Lina Torres',
    initials: 'LT',
    channel: 'Instagram',
    channelTone: 'ig',
    status: 'Pending',
    intent: 'Product question',
    aiMode: 'manual',
    leadScore: 64,
    assignee: 'Nour Ali',
    lastMessage: 'Does it work with Shopify product catalogs?',
    timestamp: '09:18',
    unread: 0,
    tags: ['Shopify', 'Catalog', 'Follow up'],
    email: 'lina@atelierverde.co',
    phone: '+34 610 114 982',
    location: 'Barcelona, Spain',
    value: '$6.2k',
    sentiment: 'Neutral',
    messages: [
      { id: 'ig1', conversationId: 'conv-ig-204', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-22T09:06:00.000Z', content: 'Saw your Instagram demo. Does it work with product catalogs?' },
      { id: 'ig2', conversationId: 'conv-ig-204', direction: 'outbound', sent_by: 'agent', timestamp: '2026-04-22T09:08:00.000Z', content: 'Yes. You can sync a product catalog and let the AI answer availability, pricing, and order questions.' },
      { id: 'ig3', conversationId: 'conv-ig-204', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-22T09:18:00.000Z', content: 'Does it work with Shopify product catalogs?' },
    ],
  },
  {
    id: 'conv-ms-317',
    name: 'Oliver Grant',
    initials: 'OG',
    channel: 'Messenger',
    channelTone: 'ms',
    status: 'Open',
    intent: 'Support escalation',
    aiMode: 'waiting',
    leadScore: 38,
    assignee: 'Sara Chen',
    lastMessage: 'I need a human to check the invoice.',
    timestamp: 'Yesterday',
    unread: 1,
    tags: ['Billing', 'Needs human'],
    email: 'oliver@grantstudio.io',
    phone: '+44 7700 900 451',
    location: 'London, UK',
    value: '$1.1k',
    sentiment: 'Frustrated',
    messages: [
      { id: 'ms1', conversationId: 'conv-ms-317', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-21T16:11:00.000Z', content: 'The invoice total looks different from the plan I selected.' },
      { id: 'ms2', conversationId: 'conv-ms-317', direction: 'outbound', sent_by: 'ai', timestamp: '2026-04-21T16:12:00.000Z', content: 'I can check common billing questions, but invoice corrections need a teammate.' },
      { id: 'ms3', conversationId: 'conv-ms-317', direction: 'system', sent_by: 'system', timestamp: '2026-04-21T16:12:30.000Z', content: 'AI requested human handoff.' },
      { id: 'ms4', conversationId: 'conv-ms-317', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-21T16:14:00.000Z', content: 'I need a human to check the invoice.' },
    ],
  },
  {
    id: 'conv-wa-422',
    name: 'Aisha Malik',
    initials: 'AM',
    channel: 'WhatsApp',
    channelTone: 'wa',
    status: 'Closed',
    intent: 'Demo booked',
    aiMode: 'manual',
    leadScore: 91,
    assignee: 'Yassin S.',
    lastMessage: 'Booked for Thursday at 2:00 PM.',
    timestamp: 'Mon',
    unread: 0,
    tags: ['Demo booked', 'VIP'],
    email: 'aisha@brightpath.sa',
    phone: '+966 55 019 7721',
    location: 'Riyadh, Saudi Arabia',
    value: '$28.8k',
    sentiment: 'Positive',
    messages: [
      { id: 'wa2-1', conversationId: 'conv-wa-422', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-20T13:22:00.000Z', content: 'We want to see the admin workflow before deciding.' },
      { id: 'wa2-2', conversationId: 'conv-wa-422', direction: 'outbound', sent_by: 'agent', timestamp: '2026-04-20T13:24:00.000Z', content: 'I can show the inbox, AI handoff, and analytics in one call.' },
      { id: 'wa2-3', conversationId: 'conv-wa-422', direction: 'inbound', sent_by: 'customer', timestamp: '2026-04-20T13:29:00.000Z', content: 'Booked for Thursday at 2:00 PM.' },
    ],
  },
];

const filters = ['All', 'WhatsApp', 'Instagram', 'Messenger'];

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDay(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDateSeparator(message, previous) {
  if (!message?.timestamp) return false;
  if (!previous?.timestamp) return true;
  const currentDate = new Date(message.timestamp);
  const previousDate = new Date(previous.timestamp);
  if (Number.isNaN(currentDate.getTime()) || Number.isNaN(previousDate.getTime())) return false;
  return currentDate.toDateString() !== previousDate.toDateString();
}

function messageAuthorLabel(message) {
  if (message.sent_by === 'ai') return 'AI Agent';
  if (message.sent_by === 'agent') return 'Agent';
  if (message.sent_by === 'system') return 'System';
  return 'Customer';
}

export default function ConversationsPrototypePage() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [theme, setTheme] = useState('dark');
  const [filter, setFilter] = useState('All');
  const [mobileView, setMobileView] = useState('list');
  const [contextOpen, setContextOpen] = useState(false);

  const visibleConversations = useMemo(() => {
    if (filter === 'All') return conversations;
    return conversations.filter((conversation) => conversation.channel === filter);
  }, [filter]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || conversations[0];

  function selectConversation(conversation) {
    setActiveId(conversation.id);
    setMobileView('thread');
  }

  return (
    <PrototypeLayoutShell theme={theme}>
      <PrototypeSidebarNav theme={theme} onThemeChange={setTheme} />
      <PrototypeConversationList
        conversations={visibleConversations}
        filters={filters}
        activeId={activeId}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={selectConversation}
        mobileView={mobileView}
      />
      <section className={`${styles.threadColumn} ${mobileView === 'thread' ? styles.mobileVisible : ''}`}>
        <PrototypeChatHeader
          conversation={activeConversation}
          onBack={() => setMobileView('list')}
          onOpenContext={() => setContextOpen(true)}
        />
        <PrototypeAIStateBar conversation={activeConversation} />
        <PrototypeMessageList conversation={activeConversation} />
        <PrototypeAISuggestionBar suggestion={activeConversation.suggestion} aiMode={activeConversation.aiMode} />
        <PrototypeComposer conversation={activeConversation} />
      </section>
      <PrototypeCustomerPanel conversation={activeConversation} />
      <PrototypeContextDrawerMobile
        open={contextOpen}
        conversation={activeConversation}
        onClose={() => setContextOpen(false)}
      />
    </PrototypeLayoutShell>
  );
}

export function PrototypeLayoutShell({ theme, children }) {
  return (
    <div className={`${styles.shell} ${theme === 'light' ? styles.light : styles.dark}`}>
      {children}
    </div>
  );
}

export function PrototypeSidebarNav({ theme, onThemeChange }) {
  const items = [
    { label: 'Inbox', icon: '↗' },
    { label: 'AI', icon: '✦' },
    { label: 'People', icon: '◎' },
    { label: 'Reports', icon: '▣' },
  ];
  return (
    <aside className={styles.prototypeNav} aria-label="Prototype navigation">
      <div className={styles.brandStack}>
        <div className={styles.brandMark}>C</div>
        <span />
      </div>
      <nav className={styles.navStack}>
        {items.map((item) => (
          <button key={item.label} className={`${styles.navButton} ${item.label === 'Inbox' ? styles.navActive : ''}`} title={item.label}>
            <span>{item.icon}</span>
          </button>
        ))}
      </nav>
      <button
        className={styles.themeToggle}
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle prototype theme"
      >
        {theme === 'dark' ? 'LT' : 'DK'}
      </button>
    </aside>
  );
}

export function PrototypeConversationList({
  conversations: list,
  filters: filterItems,
  activeId,
  filter,
  count = 24,
  emptyLabel = 'No conversations match this view.',
  onFilterChange,
  onSelect,
  mobileView,
}) {
  return (
    <aside className={`${styles.listColumn} ${mobileView === 'list' ? styles.mobileVisible : ''}`}>
      <div className={styles.listHeader}>
        <div>
          <p className={styles.eyebrow}>Omnichannel inbox</p>
          <h1>Conversations</h1>
        </div>
        <span className={styles.countPill}>{count}</span>
      </div>
      <label className={styles.searchBox}>
        <span>Search</span>
        <input aria-label="Search prototype conversations" placeholder="Customer, message, tag" />
      </label>
      <div className={styles.filterRow}>
        {filterItems.map((item) => (
          <button
            key={item}
            className={`${styles.filterPill} ${filter === item ? styles.filterActive : ''}`}
            onClick={() => onFilterChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.advancedBar}>
        <span>Priority: Hot</span>
        <span>Assigned: Any</span>
      </div>
      <div className={styles.conversationScroller}>
        {list.length === 0 && (
          <div className={styles.emptyListState}>{emptyLabel}</div>
        )}
        {list.map((conversation) => (
          <PrototypeConversationItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === activeId}
            onSelect={() => onSelect(conversation)}
          />
        ))}
      </div>
    </aside>
  );
}

export function PrototypeConversationItem({ conversation, active, onSelect }) {
  return (
    <button className={`${styles.conversationItem} ${active ? styles.conversationActive : ''}`} onClick={onSelect}>
      <div className={styles.itemTop}>
        <div className={styles.avatar}>{conversation.initials}</div>
        <div className={styles.itemIdentity}>
          <div className={styles.itemNameRow}>
            <strong>{conversation.name}</strong>
            <span>{conversation.timestamp}</span>
          </div>
          <div className={styles.itemMetaRow}>
            <ChannelBadge channel={conversation.channel} tone={conversation.channelTone} />
            <span>{conversation.intent}</span>
          </div>
        </div>
      </div>
      <p className={styles.preview}>{conversation.lastMessage}</p>
      <div className={styles.itemBottom}>
        <span className={styles.aiMini}>{conversation.aiAvailable === false ? 'AI unavailable' : conversation.aiMode === 'auto' ? 'AI handling' : conversation.status}</span>
        {conversation.unread > 0 && <span className={styles.unreadBadge}>{conversation.unread}</span>}
      </div>
    </button>
  );
}

export function PrototypeChatHeader({ conversation, onBack, onOpenContext, onTakeOver }) {
  return (
    <header className={styles.chatHeader}>
      <button className={styles.mobileBack} onClick={onBack}>Back</button>
      <div className={styles.headerIdentity}>
        <div className={styles.avatarLarge}>{conversation.initials}</div>
        <div>
          <div className={styles.headerTitleRow}>
            <h2>{conversation.name}</h2>
            <ChannelBadge channel={conversation.channel} tone={conversation.channelTone} />
          </div>
          <p>{conversation.intent} - {conversation.sentiment} sentiment</p>
        </div>
      </div>
      <div className={styles.headerCenter}>
        <span className={styles.statusDot} />
        {conversation.aiAvailable === false ? 'AI unavailable' : conversation.aiMode === 'auto' ? 'AI handling' : conversation.aiMode === 'waiting' ? 'Waiting for teammate' : 'Manual mode'}
      </div>
      <div className={styles.headerActions}>
        <button>Assign</button>
        <button>Close</button>
        <button className={styles.primaryAction} onClick={onTakeOver}>Take Over</button>
        <button className={styles.contextButton} onClick={onOpenContext}>Context</button>
      </div>
    </header>
  );
}

export function PrototypeAIStateBar({ conversation, onToggleAuto, updating = false }) {
  const state = conversation.aiAvailable === false ? 'unavailable' : conversation.aiMode;
  const copy = {
    auto: {
      title: 'AI is handling this conversation',
      text: 'Replies are generated automatically until a teammate takes over.',
    },
    manual: {
      title: 'Manual mode',
      text: `${conversation.assignee} is responsible for the next reply.`,
    },
    waiting: {
      title: 'Handoff requested',
      text: 'AI paused because this customer needs a human follow-up.',
    },
    unavailable: {
      title: 'AI unavailable',
      text: 'AI is not available for this conversation.',
    },
  }[state] || {
    title: 'AI unavailable',
    text: 'Manual handling is active for this conversation.',
  };

  return (
    <section className={styles.aiStateBar}>
      <div className={styles.aiOrb} />
      <div>
        <strong>{copy.title}</strong>
        <p>{copy.text}</p>
      </div>
      <button
        className={styles.aiSwitch}
        onClick={onToggleAuto}
        disabled={!onToggleAuto || updating || state === 'unavailable'}
        type="button"
      >
        <span>{state === 'auto' ? 'Auto' : 'Manual'}</span>
        <span className={state === 'auto' ? styles.switchOn : styles.switchOff} />
      </button>
    </section>
  );
}

export function PrototypeMessageList({ conversation, messages = conversation.messages || [], loading = false, emptyLabel = 'No messages yet.', bottomRef = null, listRef = null }) {
  return (
    <main className={styles.messageList} ref={listRef}>
      {loading && <div className={styles.emptyThreadState}>Loading messages...</div>}
      {!loading && messages.length === 0 && <div className={styles.emptyThreadState}>{emptyLabel}</div>}
      {!loading && messages.map((message, index) => (
        <div key={message.id}>
          {shouldShowDateSeparator(message, messages[index - 1]) && (
            <div className={styles.dateSeparator}>{formatMessageDay(message.timestamp)}</div>
          )}
          <PrototypeMessageBubble message={message} previous={messages[index - 1]} />
        </div>
      ))}
      {!loading && conversation.aiMode === 'auto' && (
        <div className={styles.typingRow}>
          <span />
          <span />
          <span />
          AI is composing a reply
        </div>
      )}
      <div ref={bottomRef} />
    </main>
  );
}

export function PrototypeMessageBubble({ message, previous }) {
  const grouped = previous && previous.direction === message.direction && previous.sent_by === message.sent_by;
  const isOutbound = message.direction === 'outbound';
  const isAi = message.sent_by === 'ai';
  const isSystem = message.direction === 'system';
  const author = messageAuthorLabel(message);
  const time = formatMessageTime(message.timestamp);

  if (isSystem) {
    return <div className={styles.systemEvent}>{message.content}</div>;
  }

  return (
    <div className={`${styles.messageRow} ${isOutbound ? styles.outboundRow : styles.inboundRow} ${grouped ? styles.grouped : ''}`}>
      {!isOutbound && <div className={styles.messageAvatar}>{author.slice(0, 1)}</div>}
      <div className={`${styles.bubbleStack} ${isOutbound ? styles.outboundStack : ''}`}>
        {!grouped && <span className={styles.messageAuthor}>{author}</span>}
        <div className={`${styles.messageBubble} ${isOutbound ? styles.outboundBubble : styles.inboundBubble}`}>
          {isAi && <span className={styles.aiLabel}>AI</span>}
          <p>{message.content}</p>
        </div>
        <div className={styles.messageMetaRow}>
          {time && <span className={styles.messageTime}>{time}</span>}
          {message.status === 'sending' && <span className={styles.sendingState}>Sending</span>}
          {message.status === 'failed' && <span className={styles.failedState}>Failed</span>}
        </div>
      </div>
      {isOutbound && <div className={styles.messageAvatar}>{isAi ? 'AI' : author.slice(0, 1)}</div>}
    </div>
  );
}

export function PrototypeComposer({ conversation, value, onChange, onSend, sending = false, onTakeOver }) {
  if (conversation.aiMode === 'auto' && conversation.aiAvailable !== false) {
    return (
      <footer className={styles.composerTakeover}>
        <div>
          <strong>AI is handling this conversation</strong>
          <p>Take over when the customer needs a human answer or a custom offer.</p>
        </div>
        <button className={styles.primaryAction} onClick={onTakeOver}>Take Over</button>
      </footer>
    );
  }

  const controlled = typeof value === 'string';
  const currentValue = controlled ? value : undefined;
  const canSend = controlled ? currentValue.trim().length > 0 && !sending : true;

  function handleSubmit(event) {
    event?.preventDefault?.();
    if (!onSend || !canSend) return;
    onSend();
  }

  return (
    <footer className={styles.composer}>
      <div className={styles.composerToolbar}>
        <span>Canned replies</span>
        <span>Attach</span>
        <span>Internal note</span>
      </div>
      <form className={styles.composerInputRow} onSubmit={handleSubmit}>
        <textarea
          rows={2}
          placeholder={`Reply to ${conversation.name}`}
          value={currentValue}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSubmit(event);
          }}
        />
        <button className={styles.sendButton} type="submit" disabled={!canSend}>
          {sending ? 'Sending' : 'Send'}
        </button>
      </form>
    </footer>
  );
}

export function PrototypeAISuggestionBar({ suggestion, aiMode }) {
  if (!suggestion && aiMode !== 'auto') return null;
  if (!suggestion && aiMode === 'auto') {
    return (
      <section className={styles.suggestionBar}>
        <div className={styles.aiOrbSmall} />
        <div>
          <strong>AI is composing...</strong>
          <p>The next reply will appear here before sending if review is needed.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.suggestionBar}>
      <div className={styles.aiOrbSmall} />
      <div className={styles.suggestionCopy}>
        <div className={styles.suggestionMeta}>
          <strong>AI suggestion</strong>
          <span>{suggestion.confidence}% confidence</span>
          <span>{suggestion.intent}</span>
        </div>
        <p>{suggestion.text}</p>
      </div>
      <div className={styles.suggestionActions}>
        <button>Use</button>
        <button className={styles.primaryAction}>Send now</button>
      </div>
    </section>
  );
}

export function PrototypeCustomerPanel({ conversation, handoff, currentUser, onRequestHandoff, onAcceptHandoff, onDeclineHandoff, onCancelHandoff, handoffBusy = false }) {
  return (
    <aside className={styles.customerPanel}>
      <div className={styles.panelCard}>
        <div className={styles.panelIdentity}>
          <div className={styles.avatarXL}>{conversation.initials}</div>
          <div>
            <h3>{conversation.name}</h3>
            <p>{conversation.location || 'No location available'}</p>
          </div>
        </div>
        <div className={styles.contactGrid}>
          <span>{conversation.email || 'No email available'}</span>
          <span>{conversation.phone || 'No phone available'}</span>
        </div>
      </div>
      <div className={styles.panelCard}>
        <PanelTitle title="Lead score" value={conversation.leadScore ? `${conversation.leadScore}/100` : 'Not scored'} />
        <div className={styles.progressTrack}>
          <span style={{ width: `${conversation.leadScore}%` }} />
        </div>
        <div className={styles.metricGrid}>
          <Metric label="Pipeline value" value={conversation.value || 'Not available'} />
          <Metric label="Sentiment" value={conversation.sentiment || 'Not available'} />
        </div>
      </div>
      <div className={styles.panelCard}>
        <PanelTitle title="Conversation facts" value={conversation.status} />
        <div className={styles.factList}>
          <span>Channel <b>{conversation.channel}</b></span>
          <span>Intent <b>{conversation.intent || 'Not detected'}</b></span>
          <span>Assignee <b>{conversation.assignee || 'Unassigned'}</b></span>
        </div>
      </div>
      <div className={styles.panelCard}>
        <PanelTitle title="Tags" />
        <div className={styles.tagWrap}>
          {conversation.tags.length > 0
            ? conversation.tags.map((tag) => <span key={tag}>{tag}</span>)
            : <span>No tags</span>}
        </div>
      </div>
      <PrototypeHandoffCard
        conversation={conversation}
        handoff={handoff}
        currentUser={currentUser}
        onRequestHandoff={onRequestHandoff}
        onAcceptHandoff={onAcceptHandoff}
        onDeclineHandoff={onDeclineHandoff}
        onCancelHandoff={onCancelHandoff}
        busy={handoffBusy}
      />
    </aside>
  );
}

export function PrototypeHandoffCard({ conversation, handoff, currentUser, onRequestHandoff, onAcceptHandoff, onDeclineHandoff, onCancelHandoff, busy = false }) {
  const [reason, setReason] = useState('');
  const pending = handoff?.status === 'pending';
  const userId = currentUser?.id || currentUser?.user_id;
  const role = currentUser?.role;
  const isRequester = userId && String(handoff?.requested_by) === String(userId);
  const canResolve = pending && !isRequester;
  const canCancel = pending && (isRequester || role === 'owner' || role === 'admin');

  return (
    <section className={styles.handoffCard}>
      <PanelTitle title="Handoff" value={pending ? 'Pending' : conversation.aiMode === 'waiting' ? 'Requested' : 'Ready'} />
      {pending ? (
        <>
          <p>{handoff.summary || handoff.reason || 'A teammate handoff is pending for this conversation.'}</p>
          <div className={styles.handoffActions}>
            {canResolve && <button onClick={onAcceptHandoff} disabled={busy} className={styles.primaryAction}>Accept</button>}
            {canResolve && <button onClick={onDeclineHandoff} disabled={busy}>Decline</button>}
            {canCancel && <button onClick={onCancelHandoff} disabled={busy}>Cancel</button>}
          </div>
        </>
      ) : (
        <>
          <p>Route this conversation to a teammate with full context and AI summary.</p>
          {onRequestHandoff && (
            <textarea
              className={styles.handoffInput}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for handoff"
            />
          )}
          <button
            className={styles.primaryAction}
            onClick={() => {
              onRequestHandoff?.(reason.trim());
              setReason('');
            }}
            disabled={busy}
          >
            Request handoff
          </button>
        </>
      )}
    </section>
  );
}

export function PrototypeContextDrawerMobile({ open, conversation, onClose, ...panelProps }) {
  return (
    <div className={`${styles.drawerLayer} ${open ? styles.drawerOpen : ''}`} aria-hidden={!open}>
      <button className={styles.drawerBackdrop} onClick={onClose} aria-label="Close context drawer" />
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHeader}>
          <strong>Customer context</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <PrototypeCustomerPanel conversation={conversation} {...panelProps} />
      </div>
    </div>
  );
}

function ChannelBadge({ channel, tone }) {
  return <span className={`${styles.channelBadge} ${styles[tone]}`}>{channel}</span>;
}

function PanelTitle({ title, value }) {
  return (
    <div className={styles.panelTitle}>
      <strong>{title}</strong>
      {value && <span>{value}</span>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
