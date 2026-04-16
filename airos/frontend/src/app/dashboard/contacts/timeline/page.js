'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

const CHANNEL_ICON = {
  whatsapp: '📱',
  instagram: '📸',
  messenger: '💬',
  livechat: '⚡',
  intercom: '☁',
  zendesk: '🎧',
};

function money(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function time(value) {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString();
}

function eventColor(type) {
  if (type === 'message') return '#38bdf8';
  if (type === 'deal') return '#34d399';
  return '#818cf8';
}

export default function CustomerTimelinePage() {
  const [customerId, setCustomerId] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingDeal, setCreatingDeal] = useState(false);

  useEffect(() => {
    setCustomerId(new URLSearchParams(window.location.search).get('id') || '');
  }, []);

  async function loadTimeline() {
    if (!customerId) return;
    try {
      const data = await api.get(`/api/customers/${customerId}/timeline`);
      setTimeline(data);
    } catch (err) {
      toast.error(err.message || 'Could not load customer timeline');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeline();
  }, [customerId]);

  const conversationIds = useMemo(() => new Set(
    (timeline?.conversations || []).map((conversation) => conversation.id)
  ), [timeline]);

  useEffect(() => {
    if (!conversationIds.size) return undefined;
    const socket = connectSocket();
    const refreshIfRelevant = (event = {}) => {
      const conversationId = event.conversation_id || event.conversationId || event.conversation?.id;
      if (conversationIds.has(conversationId)) loadTimeline();
    };

    socket.on('message:new', refreshIfRelevant);
    socket.on('whatsapp:message', refreshIfRelevant);
    socket.on('instagram:message', refreshIfRelevant);
    socket.on('messenger:message', refreshIfRelevant);
    socket.on('livechat:message', refreshIfRelevant);

    return () => {
      socket.off('message:new', refreshIfRelevant);
      socket.off('whatsapp:message', refreshIfRelevant);
      socket.off('instagram:message', refreshIfRelevant);
      socket.off('messenger:message', refreshIfRelevant);
      socket.off('livechat:message', refreshIfRelevant);
    };
  }, [conversationIds]);

  async function createDeal() {
    setCreatingDeal(true);
    try {
      await api.post('/api/deals', {
        customer_id: customerId,
        conversation_id: timeline?.quickActions?.openConversationId,
        stage: 'new_lead',
        intent: 'manual',
        lead_score: 40,
        probability: 25,
        estimated_value: 0,
        notes: 'Created from customer timeline quick action.',
      });
      toast.success('Deal created');
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Could not create deal');
    } finally {
      setCreatingDeal(false);
    }
  }

  async function addVipTag() {
    const customer = timeline?.customer;
    if (!customer) return;
    const tags = Array.from(new Set([...(customer.tags || []), 'VIP']));
    try {
      await api.patch(`/api/customers/${customer.id}`, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        channel: customer.channel,
        country: customer.country,
        tags,
        customFields: customer.customFields || {},
      });
      toast.success('VIP tag added');
      await loadTimeline();
    } catch (err) {
      toast.error(err.message || 'Could not add tag');
    }
  }

  const customer = timeline?.customer;
  const activity = timeline?.activity || [];

  if (!customerId) {
    return <div style={{ padding:28, color:'var(--t4)' }}>Missing customer id.</div>;
  }

  if (loading) {
    return <div style={{ padding:28, color:'var(--t4)' }}>Loading customer timeline...</div>;
  }

  if (!customer) {
    return <div style={{ padding:28, color:'var(--t4)' }}>Customer not found.</div>;
  }

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20, maxWidth:1280 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <Link href="/dashboard/contacts" style={{ fontSize:12, color:'var(--t4)' }}>← Contacts</Link>
          <h1 style={{ fontSize:26, fontWeight:900, marginTop:8, marginBottom:6 }}>{customer.name || customer.phone}</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Unified customer history across inbox, deals, imported tickets, and real-time channel messages.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadTimeline}>Refresh</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:18, alignItems:'start' }}>
        <aside style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <section style={{ padding:22, borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
              <div style={{ width:58, height:58, borderRadius:'50%', background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(6,182,212,0.18))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900 }}>
                {(customer.name || customer.phone || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize:16, fontWeight:900, color:'var(--t1)' }}>{customer.name || 'Unnamed customer'}</p>
                <p style={{ fontSize:12, color:'var(--t4)' }}>{CHANNEL_ICON[customer.channel] || '•'} {customer.channel}</p>
              </div>
            </div>

            {[
              ['Phone', customer.phone || '—'],
              ['Email', customer.email || '—'],
              ['Country', customer.country || '—'],
              ['Lifetime value', money(customer.lifetimeValue)],
              ['Orders', customer.orders || 0],
            ].map(([label, value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderTop:'1px solid var(--b1)', gap:12 }}>
                <span style={{ fontSize:12, color:'var(--t4)' }}>{label}</span>
                <span style={{ fontSize:12.5, fontWeight:800, color:'var(--t1)', textAlign:'right' }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:12, color:'var(--t4)', marginBottom:8 }}>Tags</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(customer.tags || []).length === 0 && <span style={{ fontSize:12, color:'var(--t4)' }}>No tags</span>}
                {(customer.tags || []).map((tag) => (
                  <span key={tag} style={{ fontSize:11, fontWeight:800, color:'#a5b4fc', padding:'3px 9px', borderRadius:99, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </section>

          <section style={{ padding:22, borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
            <p style={{ fontSize:12, color:'var(--t4)', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Risk and actions</p>
            <div style={{ height:8, borderRadius:99, background:'var(--s3)', marginBottom:8 }}>
              <div style={{ height:8, borderRadius:99, width:`${customer.churnScore}%`, background:customer.churnScore > 70 ? '#f87171' : customer.churnScore > 40 ? '#fbbf24' : '#34d399' }} />
            </div>
            <p style={{ fontSize:12, color:'var(--t3)', marginBottom:16 }}>Churn score {customer.churnScore}/100</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <Link className="btn btn-ghost btn-sm" href="/dashboard/conversations">Open Inbox</Link>
              <button className="btn btn-ghost btn-sm" onClick={addVipTag}>Add VIP Tag</button>
              <button className="btn btn-primary btn-sm" onClick={createDeal} disabled={creatingDeal || !timeline?.quickActions?.canCreateDeal}>
                {timeline?.quickActions?.canCreateDeal ? 'Create Deal' : 'Active Deal Exists'}
              </button>
            </div>
          </section>
        </aside>

        <main style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              ['Conversations', timeline.conversations.length, '#818cf8'],
              ['Messages', timeline.messages.length, '#38bdf8'],
              ['Deals', timeline.deals.length, '#34d399'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', borderTop:`2px solid ${color}` }}>
                <p style={{ fontSize:24, fontWeight:900, color }}>{value}</p>
                <p style={{ fontSize:12, color:'var(--t4)' }}>{label}</p>
              </div>
            ))}
          </div>

          <section style={{ borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--b1)' }}>
              <h2 style={{ fontSize:17, fontWeight:900 }}>Activity Feed</h2>
            </div>
            {activity.length === 0 && <p style={{ padding:18, color:'var(--t4)', fontSize:13 }}>No activity yet.</p>}
            {activity.map((event) => (
              <div key={event.id} style={{ display:'grid', gridTemplateColumns:'28px 1fr 150px', gap:14, padding:'16px 18px', borderTop:'1px solid var(--b1)' }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background:`${eventColor(event.type)}22`, color:eventColor(event.type), display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>
                  {event.type === 'message' ? 'M' : event.type === 'deal' ? '$' : 'C'}
                </span>
                <div>
                  <p style={{ fontSize:13, fontWeight:900, color:'var(--t1)', textTransform:event.type === 'deal' ? 'capitalize' : 'none' }}>{event.title}</p>
                  <p style={{ fontSize:12.5, color:'var(--t3)', marginTop:4, whiteSpace:'pre-wrap' }}>{event.description || 'No details'}</p>
                  {event.channel && <p style={{ fontSize:11.5, color:'var(--t4)', marginTop:6 }}>{CHANNEL_ICON[event.channel] || '•'} {event.channel}</p>}
                </div>
                <span style={{ fontSize:11.5, color:'var(--t4)', textAlign:'right' }}>{time(event.timestamp)}</span>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
