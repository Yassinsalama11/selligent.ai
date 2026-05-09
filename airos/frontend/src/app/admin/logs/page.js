'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, RefreshCcw, Shield, UserCog } from 'lucide-react';

import { adminApi } from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionTone(action) {
  if (String(action || '').includes('suspend') || String(action || '').includes('failed')) {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-500';
  }
  if (String(action || '').includes('login')) {
    return 'border-sky-500/20 bg-sky-500/5 text-sky-500';
  }
  return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500';
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.get('/api/admin/logs');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((log) => (
      String(log.action || '').toLowerCase().includes(needle)
      || String(log.entity_type || '').toLowerCase().includes(needle)
      || String(log.entity_id || '').toLowerCase().includes(needle)
      || String(log.actor_id || '').toLowerCase().includes(needle)
    ));
  }, [logs, query]);

  const summary = useMemo(() => filteredLogs.reduce((acc, log) => {
    acc.total += 1;
    if (String(log.action || '').includes('login')) acc.sessions += 1;
    if (String(log.action || '').includes('billing')) acc.billing += 1;
    if (String(log.action || '').includes('team')) acc.access += 1;
    return acc;
  }, { total: 0, sessions: 0, billing: 0, access: 0 }), [filteredLogs]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Shield className="h-3.5 w-3.5" />
            Audit Trail
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Platform Activity Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review admin access changes, billing interventions, and operational actions written to the platform audit trail.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by action, actor, or entity"
            className="w-full sm:w-[280px]"
          />
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Events" value={summary.total} icon={Activity} />
        <MetricCard label="Session actions" value={summary.sessions} icon={UserCog} />
        <MetricCard label="Billing actions" value={summary.billing} icon={FileText} />
        <MetricCard label="Access changes" value={summary.access} icon={Shield} />
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Event Stream</CardTitle>
            <CardDescription>
              Reverse-chronological platform audit records from `audit_log`.
            </CardDescription>
          </div>
          <Badge variant="outline">{filteredLogs.length} visible</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">Loading audit events…</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">No audit events match this filter.</TableCell>
                </TableRow>
              ) : filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="align-top">
                    <Badge className={cn('border', actionTone(log.action))}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="text-sm font-medium">{log.actor_type}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{log.actor_id}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="text-sm font-medium">{log.entity_type}</div>
                    <div className="mt-1 text-xs text-muted-foreground break-all">{log.entity_id}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <pre className="max-w-[420px] overflow-x-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-3 text-[11px] leading-5 text-muted-foreground">
                      {JSON.stringify(log.metadata || {}, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell className="text-right align-top text-sm text-muted-foreground">
                    {formatTime(log.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/30">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
