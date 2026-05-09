'use client';

import * as React from 'react';
import { Smartphone, Camera, MessageCircle, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const CHANNEL_ICONS = {
  whatsapp: { Icon: Smartphone, color: '#25D366' },
  instagram: { Icon: Camera,     color: '#E1306C' },
  messenger: { Icon: MessageCircle, color: '#0099FF' },
  livechat:  { Icon: Monitor,    color: '#ff5a1f' },
};

function ChannelBadge({ channel }) {
  const meta = CHANNEL_ICONS[String(channel || '').toLowerCase()] || CHANNEL_ICONS.livechat;
  const { Icon, color } = meta;
  return (
    <div
      className="absolute -bottom-1 -right-1 bg-background rounded-full w-5 h-5 flex items-center justify-center border shadow-sm"
      style={{ color }}
    >
      <Icon className="h-2.5 w-2.5" />
    </div>
  );
}

export function ThreadList({ conversations, activeId, onSelect, loading, emptyLabel, slaBreaches = {} }) {
  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/40">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-36 opacity-70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40 italic text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all relative group",
              activeId === c.id
                ? "bg-primary/10 border-primary/10 shadow-sm"
                : "hover:bg-muted/40 border border-transparent"
            )}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold uppercase">
                  {c.initials}
                </AvatarFallback>
              </Avatar>
              <ChannelBadge channel={c.channel} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-sm font-semibold truncate",
                  c.unread > 0 ? "text-foreground" : "text-foreground/80"
                )}>
                  {c.name}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0">
                  {c.timestamp}
                </span>
              </div>
              <p className={cn(
                "text-xs truncate mt-0.5",
                c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground/70"
              )}>
                {c.lastMessage}
              </p>
              <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                {c.tags?.slice(0, 2).map((t) => (
                  <Badge key={t} variant="outline" className="text-[9px] font-medium py-0 h-3.5 opacity-50 px-1.5">
                    {t}
                  </Badge>
                ))}
                {slaBreaches[c.id] && (
                  <Badge className="text-[9px] font-bold py-0 h-3.5 px-1.5 bg-red-500/10 text-red-600 border-none uppercase tracking-tight">
                    SLA
                  </Badge>
                )}
                {c.unread > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,90,31,0.5)]" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
