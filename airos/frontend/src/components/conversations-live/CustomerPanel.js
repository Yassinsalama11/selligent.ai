'use client';

import * as React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Tag as TagIcon, 
  Ticket as TicketIcon, 
  ExternalLink,
  Plus,
  X,
  History,
  TrendingUp,
  AlertCircle,
  Clock,
  DollarSign,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

const sentimentColors = {
  positive: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/10',
  neutral: 'text-slate-600 bg-slate-500/10 border-slate-500/10',
  negative: 'text-red-600 bg-red-500/10 border-red-500/10',
};

export function CustomerPanel({
  conversation,
  handoff,
  currentUser,
  onAcceptHandoff,
  onDeclineHandoff,
  onCancelHandoff,
  handoffBusy,
  tickets,
  ticketsLoading,
  onCreateTicket,
  ticketBusy,
  onAddTag,
  onRemoveTag,
  tagLibrary = [],
  tagLibraryMeta = {},
}) {
  const [tagInput, setTagInput] = React.useState('');

  const appliedTags = new Set(conversation.tags || []);
  const suggestions = tagLibrary.filter((t) => !appliedTags.has(t));

  const handleAddTag = (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    onAddTag(tagInput.trim());
    setTagInput('');
  };

  return (
    <aside className="w-[280px] border-l bg-card flex flex-col hidden xl:flex shrink-0">
      <header className="h-14 border-b px-6 flex items-center shrink-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Customer Context</h2>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
              <AvatarFallback className="text-xl bg-primary/5 text-primary font-semibold uppercase">
                {conversation.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-base font-semibold tracking-tight leading-tight">{conversation.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase font-medium tracking-wider opacity-60">
                {conversation.channel} Member
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-muted/10 rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-tighter">Lead Score</span>
              </div>
              <div className="text-lg font-semibold text-primary tabular-nums">
                {conversation.leadScore != null ? conversation.leadScore : '—'}
              </div>
            </div>
            <div className="bg-muted/10 rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-tighter">Value</span>
              </div>
              <div className="text-[13px] font-semibold truncate tabular-nums">
                {conversation.value ? `$${Number(conversation.value).toLocaleString()}` : '—'}
              </div>
            </div>
            <div className="bg-muted/10 rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1">
                <Heart className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-tighter">Sentiment</span>
              </div>
              <Badge variant="outline" className={cn(
                "text-[9px] font-semibold uppercase tracking-tight py-0.5 border-none px-1.5",
                sentimentColors[conversation.sentiment?.toLowerCase()] || sentimentColors.neutral
              )}>
                {conversation.sentiment || 'Neutral'}
              </Badge>
            </div>
            <div className="bg-muted/10 rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1">
                <History className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-tighter">Intent</span>
              </div>
              <div className="text-[11px] font-semibold capitalize truncate opacity-80">
                {conversation.intent?.replace(/_/g, ' ') || 'Unknown'}
              </div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Contact Info</h4>
            <div className="space-y-3 px-1">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                <span className="truncate font-medium text-foreground/80">{conversation.email || 'No email saved'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                <span className="truncate font-medium text-foreground/80 font-mono text-xs">{conversation.phone || 'No phone saved'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                <span className="truncate font-medium text-foreground/80">{conversation.location || 'Unknown location'}</span>
              </div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Tags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Segmentation</h4>
              <Badge variant="outline" className="text-[9px] h-3.5 font-medium px-1.5 opacity-40">{conversation.tags?.length || 0}</Badge>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {conversation.tags?.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="pl-2 pr-1 py-0.5 gap-1 group bg-primary/5 hover:bg-primary/10 border-primary/10 text-primary transition-all font-medium"
                >
                  {tag}
                  <button onClick={() => onRemoveTag(tag)} className="p-0.5 rounded-full hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>

            <form onSubmit={handleAddTag} className="relative">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="New tag..."
                className="h-8 text-xs pr-8 bg-muted/10 border-input shadow-none"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors">
                <Plus className="h-3 w-3" />
              </button>
            </form>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {suggestions.map((tag) => {
                  const color = tagLibraryMeta[tag]?.color || '#6366f1';
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onAddTag(tag)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white transition-opacity opacity-70 hover:opacity-100"
                      style={{ backgroundColor: color }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Active Tickets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Tickets</h4>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-primary" onClick={onCreateTicket} disabled={ticketBusy}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2">
              {ticketsLoading ? (
                <div className="text-[11px] text-muted-foreground animate-pulse py-2 italic text-center">Synchronizing...</div>
              ) : tickets.length === 0 ? (
                <div className="text-[11px] text-muted-foreground py-2 italic text-center opacity-40">No active tickets</div>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id} className="bg-muted/10 border-none shadow-none">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium leading-snug">
                          {ticket.title}
                        </span>
                        <Badge className={cn(
                          "text-[9px] h-4 px-1.5 uppercase font-semibold",
                          ticket.priority === 'high' ? "bg-red-500/10 text-red-600 border-none" : "bg-muted text-muted-foreground border-none"
                        )}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase opacity-50">
                        <Clock className="h-2.5 w-2.5" />
                        {ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Handoff Section */}
          {handoff && (
            <div className="mt-8 animate-in fade-in zoom-in-95">
              <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Escalation Requested</span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Human Intervention Required</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic opacity-80">"{handoff.reason}"</p>
                  </div>

                  <div className="grid gap-2 pt-1">
                    <Button size="sm" onClick={onAcceptHandoff} disabled={handoffBusy} className="h-8 text-xs font-semibold bg-primary shadow-sm">
                      Accept Request
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={onDeclineHandoff} disabled={handoffBusy} className="h-8 text-[11px] font-medium bg-background">
                        Decline
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onCancelHandoff} disabled={handoffBusy} className="h-8 text-[11px] font-medium text-muted-foreground">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
