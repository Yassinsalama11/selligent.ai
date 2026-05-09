'use client';

import * as React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  ExternalLink,
  UserPlus,
  AlertCircle,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatDateTime(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const statusTones = {
  escalated: "bg-red-500/10 text-red-500 border-none",
  resolved: "bg-emerald-500/10 text-emerald-500 border-none",
  closed: "bg-emerald-500/10 text-emerald-500 border-none",
  waiting: "bg-amber-500/10 text-amber-500 border-none",
  in_progress: "bg-indigo-500/10 text-indigo-500 border-none",
  open: "bg-primary/10 text-primary border-none",
};

export default function TicketDetailPanel({
  ticket,
  agents = [],
  onEdit,
  onDelete,
  onStatusChange,
  onEscalate,
  onAssign,
}) {
  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed rounded-3xl bg-muted/10 opacity-40">
        <div className="text-center space-y-3">
          <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Select a ticket</p>
        </div>
      </div>
    );
  }

  const openStatuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

  return (
    <div className="flex-1 flex flex-col bg-card border rounded-3xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <header className="px-6 h-16 border-b flex items-center justify-between shrink-0 bg-card backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-1 rounded">
            {ticket.ticket_code || `#${ticket.ticket_number}`}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-2", statusTones[ticket.status])}>
            {ticket.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => onEdit(ticket)}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(ticket)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-8 space-y-8">
          {/* Title & Priority */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-6">
              <h2 className="text-2xl font-black tracking-tight leading-tight text-foreground">
                {ticket.title}
              </h2>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-red-500/5 text-red-500 border-red-500/20 px-3 shrink-0">
                {ticket.priority} Priority
              </Badge>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              {ticket.description || 'No detailed description provided.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/20 border-none shadow-none">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  <User className="h-3 w-3" />
                  Requestor
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {ticket.customer_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate">{ticket.customer_name || 'Unknown'}</div>
                    <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">{ticket.customer_channel || 'manual'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-none shadow-none">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  <UserPlus className="h-3 w-3" />
                  Ownership
                </div>
                <Select
                  value={ticket.assignee_id || 'unassigned'}
                  onValueChange={(val) => onAssign(ticket, val === 'unassigned' ? null : val)}
                >
                  <SelectTrigger className="bg-muted border-none h-10">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name || agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created
                </span>
                <span className="text-[13px] font-bold">{formatDateTime(ticket.created_at)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Last Update
                </span>
                <span className="text-[13px] font-bold">{formatDateTime(ticket.updated_at)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Source Thread
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold truncate max-w-[120px]">{ticket.conversation_id || '—'}</span>
                  {ticket.conversation_id && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3" />
                  Escalation
                </span>
                <span className="text-[13px] font-medium text-muted-foreground italic truncate">
                  {ticket.escalation_reason || 'Not escalated'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Workflow Actions</h4>
            <div className="flex flex-wrap gap-3">
              {openStatuses.map((status) => (
                <Button
                  key={status}
                  variant={ticket.status === status ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 px-4 text-xs font-bold uppercase tracking-tight",
                    ticket.status === status && "shadow-lg scale-105"
                  )}
                  onClick={() => onStatusChange(ticket, status)}
                >
                  {status.replace(/_/g, ' ')}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-4 text-xs font-bold uppercase tracking-tight text-red-500 hover:bg-red-500/10"
                onClick={() => onEscalate(ticket)}
                disabled={ticket.status === 'closed' || ticket.status === 'escalated'}
              >
                Escalate Ticket
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function TicketIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 9V5.2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2V9a2 2 0 0 0 0 6v3.8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V15a2 2 0 0 0 0-6z"/>
      <path d="M14 3v4"/>
      <path d="M14 17v4"/>
      <path d="M10 3v4"/>
      <path d="M10 17v4"/>
    </svg>
  );
}
