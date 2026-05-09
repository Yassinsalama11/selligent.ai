'use client';

import { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      ...form,
      title: form.title.trim(),
      customer_name: form.customer_name.trim(),
      description: form.description.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl bg-background">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black tracking-tight">
            {mode === 'edit' ? 'Edit Ticket' : 'Create New Ticket'}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Fill in the details below to manage this support request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] px-8">
            <div className="space-y-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Subject Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g. Broken screen on delivery"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Customer Name</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => updateField('customer_name', e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Provide a detailed summary of the issue..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Category</Label>
                  <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Source Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => updateField('channel', v)}>
                    <SelectTrigger className="h-10 uppercase text-[10px] font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((opt) => <SelectItem key={opt} value={opt} className="uppercase text-[10px] font-bold">{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((opt) => <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((opt) => <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Assignee</Label>
                  <Select value={form.assignee_id || 'unassigned'} onValueChange={(v) => updateField('assignee_id', v === 'unassigned' ? '' : v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name || agent.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Thread Reference</Label>
                  <Input
                    value={form.conversation_id}
                    onChange={(e) => updateField('conversation_id', e.target.value)}
                    placeholder="Optional UUID"
                    className="h-10 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
            <Button type="button" variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-widest">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary px-8 font-black uppercase tracking-widest text-[11px] shadow-lg">
              {saving ? 'Processing...' : mode === 'edit' ? 'Update Ticket' : 'Finalize Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
