'use client';

import * as React from 'react';
import { User, UserMinus, Search, Mail, Shield } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function AssignModal({ open, onOpenChange, teamMembers, onAssign, currentAssigneeId }) {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filteredMembers = teamMembers.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black tracking-tight">Assign Conversation</DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
            Choose an agent or team lead to handle this thread.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search team members..." 
              className="pl-9 h-10 bg-muted/30 border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] -mx-2 px-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start h-14 gap-3 px-3 hover:bg-muted/50 rounded-xl group"
                onClick={() => onAssign(null)}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                  <UserMinus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-bold">Unassigned</span>
                  <span className="text-[11px] text-muted-foreground">Remove current owner</span>
                </div>
              </Button>

              {filteredMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className="w-full justify-start h-14 gap-3 px-3 hover:bg-muted/50 rounded-xl relative overflow-hidden"
                  onClick={() => onAssign(member)}
                >
                  {currentAssigneeId === member.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <Avatar className="h-9 w-9 border shadow-sm">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold uppercase">
                      {member.name?.[0] || member.email?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{member.name || member.email}</span>
                      {member.role === 'owner' && <Shield className="h-3 w-3 text-amber-500" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                      <Mail className="h-2.5 w-2.5" />
                      {member.email}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter h-5 px-1.5 opacity-60 group-hover:opacity-100">
                    {member.role}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold uppercase tracking-widest">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
