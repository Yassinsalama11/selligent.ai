'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['General', 'Shipping Delay', 'Wrong Item', 'Refund Request', 'Product Defect', 'Payment Issue', 'Billing', 'Other'];
const CHANNELS = ['manual', 'whatsapp', 'instagram', 'messenger', 'livechat', 'email'];

function emptyForm(ticket = null) {
  return {
    title: ticket?.title || '',
    customer_name: ticket?.customer_name || '',
    description: ticket?.description || '',
    category: ticket?.category || 'General',
    channel: ticket?.channel || 'manual',
    status: ticket?.status || 'open',
    priority: ticket?.priority || 'medium',
    assignee_id: ticket?.assignee_id || '',
    conversation_id: ticket?.conversation_id || '',
  };
}

export default function TicketEditorModal({
  open,
  mode = 'create',
  ticket,
  agents = [],
  onClose,
  onSubmit,
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm(ticket));

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(ticket));
  }, [open, ticket]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      title: form.title.trim(),
      customer_name: form.customer_name.trim(),
      description: form.description.trim(),
      category: form.category,
      channel: form.channel,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      conversation_id: form.conversation_id || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Ticket' : 'New Ticket'}
      width={760}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Title</span>
            <input
              className="input"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Order arrived damaged"
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Customer</span>
            <input
              className="input"
              value={form.customer_name}
              onChange={(event) => updateField('customer_name', event.target.value)}
              placeholder="Ahmed Mohamed"
              required
            />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>Description</span>
          <textarea
            className="input"
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Summarize the issue and next steps."
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Category</span>
            <select
              className="input"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Channel</span>
            <select
              className="input"
              value={form.channel}
              onChange={(event) => updateField('channel', event.target.value)}
            >
              {CHANNELS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Priority</span>
            <select
              className="input"
              value={form.priority}
              onChange={(event) => updateField('priority', event.target.value)}
            >
              {PRIORITIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Assignee</span>
            <select
              className="input"
              value={form.assignee_id}
              onChange={(event) => updateField('assignee_id', event.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name || agent.email}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Conversation ID</span>
            <input
              className="input"
              value={form.conversation_id}
              onChange={(event) => updateField('conversation_id', event.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
