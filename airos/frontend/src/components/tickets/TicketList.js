'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MessageSquare, User } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

const statusTones = {
  escalated: "bg-red-500/10 text-red-500 border-red-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  waiting: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  open: "bg-primary/10 text-primary border-primary/20",
};

const priorityTones = {
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export default function TicketList({ tickets, selectedId, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      {tickets.map((ticket) => {
        const isSelected = ticket.id === selectedId;

        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onSelect(ticket.id)}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-all duration-200 group relative overflow-hidden",
              isSelected 
                ? "border-primary bg-primary/[0.03] shadow-sm" 
                : "border-transparent bg-card hover:bg-muted/50 hover:border-border"
            )}
          >
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none shrink-0">
                    {ticket.ticket_code || `#${ticket.ticket_number}`}
                  </span>
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4 border-none",
                    priorityTones[ticket.priority] || priorityTones.low
                  )}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4 border-none",
                    statusTones[ticket.status] || statusTones.open
                  )}>
                    {String(ticket.status || '').replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-muted-foreground/60 uppercase">
                  <Clock className="h-3 w-3" />
                  {formatDate(ticket.created_at)}
                </div>
              </div>

              <div className="text-[14px] font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
                {ticket.title}
              </div>

              <div className="flex items-center justify-between gap-4 mt-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium truncate">
                  <User className="h-3 w-3 opacity-50 shrink-0" />
                  <span className="truncate">{ticket.customer_name || 'Anonymous'}</span>
                  <span className="opacity-30">•</span>
                  <span className="uppercase tracking-tighter text-[9px] font-black">{ticket.channel || 'manual'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {ticket.assignee_name || '—'}
                  </div>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-black bg-muted/50 text-muted-foreground/80 border-none gap-1">
                    <MessageSquare className="h-2.5 w-2.5 opacity-50" />
                    {Number(ticket.message_count || 0)}
                  </Badge>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
