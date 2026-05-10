'use client';

import * as React from 'react';
import {
  UserPlus,
  CheckCircle2,
  Trophy,
  Send,
  Paperclip,
  Image as ImageIcon,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  X,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  FileText,
  Download,
  Volume2,
  Video,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function isWhatsAppMediaRef(url) {
  return typeof url === 'string' && url.startsWith('whatsapp_media:');
}

function renderMediaAttachment(msg) {
  const { mediaUrl, type, metadata } = msg;

  if (isWhatsAppMediaRef(mediaUrl)) {
    return (
      <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <File className="h-4 w-4 shrink-0" />
        <span>Media unavailable (pending download)</span>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
        <img
          src={mediaUrl}
          alt="Attachment"
          className="rounded-lg max-w-full h-auto border bg-muted cursor-zoom-in"
        />
      </a>
    );
  }

  if (type === 'video') {
    return (
      <video
        src={mediaUrl}
        controls
        className="rounded-lg mb-2 max-w-full border bg-muted"
      />
    );
  }

  if (type === 'voice' || type === 'audio') {
    return (
      <audio src={mediaUrl} controls className="mb-2 w-full" />
    );
  }

  const fileName = metadata?.file_name || metadata?.fileName || mediaUrl.split('/').pop() || 'attachment';
  const fileIcon = type === 'document' ? <FileText className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-muted-foreground" />;

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 mb-2 px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-sm no-underline"
    >
      {fileIcon}
      <span className="flex-1 truncate text-foreground">{fileName}</span>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}

export function MessageThread({
  conversation, 
  messages, 
  loading, 
  sending, 
  composerValue, 
  onComposerChange, 
  onSend, 
  onAssign, 
  onClose, 
  onWon, 
  onToggleAi,
  aiUpdating,
  onAttach,
  onInternalNote,
  bottomRef,
  panelOpen,
  onTogglePanel,
  cannedReplies = [],
  aiSuggestion = null,
  onApplySuggestion,
  onDismissSuggestion
}) {
  const isAuto = conversation.aiMode === 'auto';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background relative">
      {/* Header */}
      <header className="h-14 border-b px-6 flex items-center justify-between shrink-0 bg-card backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold uppercase">
              {conversation.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold truncate leading-tight">{conversation.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-tight">
                {conversation.channel}
              </span>
              <span className="text-muted-foreground/30 text-[10px]">•</span>
              <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60">
                {conversation.assignee}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onAssign} className="h-8 gap-1.5 font-medium px-2.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Assign</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assign to team member</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onWon} className="h-8 gap-1.5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 font-medium px-2.5">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Mark Won</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close deal successfully</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onClose} className="h-8 gap-1.5 text-muted-foreground font-medium px-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Close</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive conversation</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onTogglePanel}>
                  {panelOpen
                    ? <PanelRightClose className="h-4 w-4" />
                    : <PanelRightOpen className="h-4 w-4" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>{panelOpen ? 'Hide context panel' : 'Show context panel'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>
      </header>

      {/* AI State Bar */}
      <div className={cn(
        "h-10 px-6 flex items-center justify-between transition-colors shrink-0",
        isAuto ? "bg-cyan-500/5" : "bg-muted/30"
      )}>
        <div className="flex items-center gap-2">
          {isAuto ? (
            <Bot className="h-3.5 w-3.5 text-cyan-600" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            isAuto ? "text-cyan-600" : "text-muted-foreground"
          )}>
            AI Mode: {isAuto ? 'Autonomous' : 'Manual / Assisted'}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 text-[9px] uppercase font-bold tracking-widest px-2.5",
            isAuto ? "text-cyan-600 hover:bg-cyan-500/10" : "text-primary hover:bg-primary/5"
          )}
          onClick={onToggleAi}
          disabled={aiUpdating}
        >
          {aiUpdating ? '...' : isAuto ? 'Take Over' : 'Enable AI'}
        </Button>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-8 flex flex-col gap-6">
          {loading && messages.length === 0 && (
            <div className="flex flex-col gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cn("flex items-end gap-3 max-w-[75%]", i % 2 === 0 ? "self-start" : "self-end flex-row-reverse")}>
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className={cn("flex flex-col gap-1.5", i % 2 === 0 ? "items-start" : "items-end")}>
                    <div className="h-10 rounded-2xl bg-muted animate-pulse" style={{ width: `${140 + i * 40}px` }} />
                    <div className="h-2.5 w-16 rounded bg-muted animate-pulse opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/50">Start the conversation below</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isAgent = ['agent', 'ai'].includes(msg.sent_by);
            const isInternal = msg.direction === 'internal';
            const showAvatar = idx === 0 || messages[idx-1].sent_by !== msg.sent_by;

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex flex-col items-center py-2">
                  <div className="max-w-[80%] flex items-start gap-3 bg-orange-500/5 border border-orange-500/15 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-[13px] text-orange-900/80 dark:text-orange-200/80 leading-relaxed">
                        {msg.content}
                      </p>
                      <span className="text-[9px] text-orange-500/60 font-semibold uppercase tracking-tighter">
                        AI Event • {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isInternal) {
              return (
                <div key={msg.id} className="flex flex-col items-center py-2">
                  <div className="max-w-[80%] flex items-start gap-3 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                    <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-[13px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed italic">
                        {msg.content}
                      </p>
                      <span className="text-[9px] text-amber-500/60 font-semibold uppercase tracking-tighter">
                        Internal Note • {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex items-end gap-3 group max-w-[85%]",
                  isAgent ? "self-end flex-row-reverse" : "self-start"
                )}
              >
                <div className="w-8 shrink-0 flex flex-col items-center">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 border shadow-sm">
                      <AvatarFallback className={cn(
                        "text-[9px] font-bold uppercase",
                        isAgent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isAgent ? (msg.sent_by === 'ai' ? 'AI' : 'A') : conversation.initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>

                <div className={cn(
                  "flex flex-col gap-1",
                  isAgent ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm",
                    isAgent 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-card border text-foreground rounded-bl-none"
                  )}>
                    {msg.mediaUrl && renderMediaAttachment(msg)}
                    {msg.content}
                  </div>
                  {showAvatar && (
                    <span className="text-[10px] text-muted-foreground font-medium px-1 uppercase tracking-tight opacity-50">
                      {msg.sent_by === 'ai' ? 'Copilot' : msg.sent_by} • {msg.timestamp}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} className="h-px" />
        </div>
      </ScrollArea>

      {/* Suggestion Bar */}
      {aiSuggestion && !isAuto && (
        <div className="px-6 py-3 bg-cyan-500/5 border-t border-cyan-500/10 animate-in slide-in-from-bottom-2">
          <div className="max-w-[1000px] mx-auto flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase text-cyan-600 tracking-widest mb-1">AI Suggestion</p>
              <p className="text-[13px] text-foreground leading-relaxed">
                {aiSuggestion.text}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] font-semibold uppercase border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10"
                  onClick={() => onApplySuggestion(aiSuggestion.text)}
                >
                  Use Suggestion
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] font-semibold uppercase text-muted-foreground"
                  onClick={onDismissSuggestion}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <footer className="p-4 bg-card/20 border-t backdrop-blur-md">
        <div className="max-w-[1000px] mx-auto border rounded-xl bg-background shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            value={composerValue}
            onChange={(e) => onComposerChange(e.target.value)}
            placeholder={isAuto ? "AI is handling this... type here to take over" : "Reply to customer..."}
            className="w-full bg-transparent border-none focus:ring-0 p-4 text-[14px] leading-relaxed min-h-[80px] resize-none placeholder:text-muted-foreground/40 font-medium"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          
          <div className="px-3 py-2 bg-muted/20 border-t flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" onClick={() => onAttach('image')}>
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" onClick={() => onAttach('file')}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1.5 opacity-50" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] font-semibold uppercase tracking-tight text-muted-foreground hover:text-primary transition-colors px-2">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5 opacity-60" />
                    Canned
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest opacity-40">Canned Responses</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {cannedReplies.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-muted-foreground italic">No replies saved.</div>
                  ) : (
                    cannedReplies.map(reply => (
                      <DropdownMenuItem 
                        key={reply.id} 
                        className="flex flex-col items-start gap-0.5 p-3 cursor-pointer"
                        onSelect={() => onComposerChange(reply.content)}
                      >
                        <span className="font-semibold text-xs">{reply.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">{reply.content}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" className="h-8 text-[11px] font-semibold uppercase tracking-tight text-muted-foreground hover:text-amber-600 transition-colors px-2" onClick={onInternalNote}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 opacity-60" />
                Note
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-muted-foreground/40 hidden sm:inline-block">
                Press Enter to send
              </span>
              <Button 
                size="sm" 
                className="h-8 gap-1.5 bg-primary px-4 shadow-sm hover:shadow-md active:scale-95 transition-all font-medium"
                onClick={onSend}
                disabled={sending || !composerValue.trim()}
              >
                {sending ? '...' : <Send className="h-3.5 w-3.5" />}
                <span className="text-xs">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
