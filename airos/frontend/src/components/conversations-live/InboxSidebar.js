'use client';

import * as React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle,
  Hash,
  Smartphone,
  Camera,
  MessageSquare,
  Zap,
  RefreshCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CHANNEL_ICONS = {
  whatsapp: Smartphone,
  instagram: Camera,
  messenger: MessageSquare,
  livechat: Zap,
};

const QUEUES = [
  { id: 'open',        label: 'All Open',    icon: Inbox,        status: 'open'   },
  { id: 'unassigned',  label: 'Unassigned',  icon: Clock,        assigned_to: 'unassigned' },
  { id: 'closed',      label: 'Archived',    icon: CheckCircle,  status: 'closed' },
];

function RailButton({ icon: Icon, label, active, onClick, side = 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function InboxSidebar({
  filters,
  onFilterChange,
  channels = [],
  teamMembers = [],
}) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const isQueueActive = (queue) =>
    (queue.status && filters.status === queue.status) ||
    (queue.assigned_to === 'unassigned' && filters.assigned_to === 'unassigned');

  const isChannelActive = (ch) => filters.channel === ch.toLowerCase();

  const hasActiveAdvanced =
    (filters.assigned_to && filters.assigned_to !== 'all') ||
    (filters.priority && filters.priority !== 'all');

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-16 border-r bg-card flex flex-col hidden lg:flex shrink-0">
        {/* Brand mark */}
        <div className="h-14 border-b flex items-center justify-center shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Inbox className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center py-4 gap-1">
          {/* Queues */}
          {QUEUES.map((queue) => (
            <RailButton
              key={queue.id}
              icon={queue.icon}
              label={queue.label}
              active={isQueueActive(queue)}
              onClick={() =>
                onFilterChange({
                  ...filters,
                  status: queue.status || 'open',
                  assigned_to: queue.assigned_to || 'all',
                  channel: 'all',
                })
              }
            />
          ))}

          <div className="w-8 my-2">
            <Separator />
          </div>

          {/* Channels */}
          {channels.map((ch) => {
            const Icon = CHANNEL_ICONS[ch.toLowerCase()] || Hash;
            return (
              <RailButton
                key={ch}
                icon={Icon}
                label={ch}
                active={isChannelActive(ch)}
                onClick={() =>
                  onFilterChange({ ...filters, channel: ch.toLowerCase(), status: 'open' })
                }
              />
            );
          })}

          <div className="w-8 my-2">
            <Separator />
          </div>

          {/* Advanced filters */}
          <RailButton
            icon={SlidersHorizontal}
            label="Advanced Filters"
            active={hasActiveAdvanced}
            onClick={() => setFiltersOpen(true)}
          />
        </div>

        {/* Reset */}
        <div className="pb-4 flex justify-center">
          <RailButton
            icon={RefreshCcw}
            label="Reset Filters"
            active={false}
            onClick={() =>
              onFilterChange({ status: 'open', channel: 'all', assigned_to: 'all', priority: 'all', search: '' })
            }
          />
        </div>
      </aside>

      {/* Advanced Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-72 pt-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Advanced Filters
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Assignee
              </label>
              <Select
                value={filters.assigned_to || 'all'}
                onValueChange={(val) => onFilterChange({ ...filters, assigned_to: val })}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/20 border-none shadow-none">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Priority
              </label>
              <Select
                value={filters.priority || 'all'}
                onValueChange={(val) => onFilterChange({ ...filters, priority: val })}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/20 border-none shadow-none">
                  <SelectValue placeholder="Any Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
