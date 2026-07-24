'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';

import { Shield, Search, RefreshCw, AlertCircle, Download, ChevronLeft, ChevronRight, User, CreditCard, Calendar, Settings, LogIn, LogOut, Trash2, Plus, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type ActionCategory = 'all' | 'auth' | 'booking' | 'credits' | 'admin' | 'system';
type ActionSeverity = 'all' | 'info' | 'warning' | 'critical';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  category: Exclude<ActionCategory, 'all'>;
  severity: Exclude<ActionSeverity, 'all'>;
  target: string;
  details: string;
  ip: string;
  status: 'success' | 'failed';
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  'User Login': LogIn,
  'User Logout': LogOut,
  'Failed Login Attempt': XCircle,
  'Court Status Changed': Settings,
  'Credits Added': Plus,
  'Credits Deducted': CreditCard,
  'Session Auto-Ended': Clock,
  'Player Account Suspended': XCircle,
  'Booking Created': Calendar,
  'Booking Cancelled': Trash2,
  'System Config Updated': Settings,
  'Backup Completed': CheckCircle2,
};

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const CATEGORY_STYLES: Record<string, string> = {
  auth: 'bg-purple-50 text-purple-700 border-purple-200',
  booking: 'bg-green-50 text-green-700 border-green-200',
  credits: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  admin: 'bg-orange-50 text-orange-700 border-orange-200',
  system: 'bg-slate-50 text-slate-700 border-slate-200',
};

const PAGE_SIZE = 8;

export default function AuditLogPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<ActionSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filtered = logs.filter((log) => {
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !log.actor.toLowerCase().includes(q) &&
        !log.action.toLowerCase().includes(q) &&
        !log.target.toLowerCase().includes(q) &&
        !log.details.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const criticalCount = logs.filter((l) => l.severity === 'critical').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const todayCount = logs.filter((l) => {
    const d = new Date(l.timestamp);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  }).length;

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Role', 'Action', 'Category', 'Severity', 'Target', 'Details', 'IP', 'Status'],
      ...filtered.map((l) => [l.timestamp, l.actor, l.actorRole, l.action, l.category, l.severity, l.target, l.details, l.ip, l.status]),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">System Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track all system actions, user events, and security alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary text-sm gap-2">
              <Download size={14} />
              Export CSV
            </button>
            <button onClick={() => { setLoading(true); fetchAuditLogs(); }} className="btn-secondary text-sm gap-2">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: logs.length, icon: Activity, color: 'text-primary' },
            { label: "Today's Events", value: todayCount, icon: Clock, color: 'text-info' },
            { label: 'Critical Alerts', value: criticalCount, icon: AlertCircle, color: 'text-negative' },
            { label: 'Failed Actions', value: failedCount, icon: XCircle, color: 'text-warning' },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search actor, action, target..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as ActionCategory); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Categories</option>
            <option value="auth">Auth</option>
            <option value="booking">Booking</option>
            <option value="credits">Credits</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as ActionSeverity); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'success' | 'failed'); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Log Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
            </p>
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          </div>

          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <Shield size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit events match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginated.map((log) => {
                const ActionIcon = ACTION_ICONS[log.action] || Activity;
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className="px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${SEVERITY_STYLES[log.severity]}`}>
                        <ActionIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{log.action}</span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-semibold ${CATEGORY_STYLES[log.category]}`}>
                            {log.category}
                          </span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-semibold ${SEVERITY_STYLES[log.severity]}`}>
                            {log.severity}
                          </span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-semibold ${log.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User size={11} />
                            {log.actor}
                            <span className="opacity-60">({log.actorRole})</span>
                          </span>
                          <span className="text-xs text-muted-foreground">→ {log.target}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="mt-2.5 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-foreground mb-1.5"><span className="font-semibold">Details:</span> {log.details}</p>
                            <p className="text-xs text-muted-foreground"><span className="font-semibold">IP Address:</span> {log.ip}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${page === p ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
