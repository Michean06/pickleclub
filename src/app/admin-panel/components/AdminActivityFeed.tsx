'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, CreditCard, Trophy, Wrench, LogIn, AlertTriangle, Calendar, ShieldCheck, TrendingUp, Filter, RefreshCw, ChevronDown, Circle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ActivityEvent {
  id: string;
  type: 'player' | 'payment' | 'match' | 'maintenance' | 'auth' | 'alert' | 'booking' | 'system';
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  actor?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  meta?: string;
}

const typeConfig: Record<ActivityEvent['type'], { icon: React.ElementType; bg: string; color: string }> = {
  player: { icon: UserPlus, bg: 'bg-blue-100', color: 'text-blue-600' },
  payment: { icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600' },
  match: { icon: Trophy, bg: 'bg-amber-100', color: 'text-amber-600' },
  maintenance: { icon: Wrench, bg: 'bg-orange-100', color: 'text-orange-600' },
  auth: { icon: LogIn, bg: 'bg-purple-100', color: 'text-purple-600' },
  alert: { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  booking: { icon: Calendar, bg: 'bg-cyan-100', color: 'text-cyan-600' },
  system: { icon: ShieldCheck, bg: 'bg-slate-100', color: 'text-slate-600' },
};

const severityDot: Record<string, string> = {
  success: 'bg-positive',
  info: 'bg-blue-500',
  warning: 'bg-warning',
  error: 'bg-negative',
};

const filterOptions = ['All', 'Players', 'Payments', 'Matches', 'Alerts', 'System'];
const filterMap: Record<string, ActivityEvent['type'][]> = {
  All: [],
  Players: ['player'],
  Payments: ['payment'],
  Matches: ['match'],
  Alerts: ['alert', 'maintenance'],
  System: ['auth', 'system', 'booking'],
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function mapAuditLogToEvent(log: any): ActivityEvent {
  const typeMap: Record<string, ActivityEvent['type']> = {
    'player_created': 'player',
    'player_updated': 'player',
    'credit_purchase': 'payment',
    'credit_added': 'payment',
    'match_completed': 'match',
    'match_created': 'match',
    'court_maintenance': 'maintenance',
    'user_login': 'auth',
    'system_alert': 'alert',
    'booking_created': 'booking',
    'booking_cancelled': 'booking',
    'system_backup': 'system',
  };

  const type = typeMap[log.action] || 'system';
  const severityMap: Record<string, ActivityEvent['severity']> = {
    'player_created': 'success',
    'credit_purchase': 'success',
    'match_completed': 'info',
    'court_maintenance': 'warning',
    'system_alert': 'error',
    'booking_cancelled': 'warning',
  };

  return {
    id: log.id,
    type,
    title: log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: log.details || log.action,
    timestamp: new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    timeAgo: formatTimeAgo(new Date(log.created_at)),
    actor: log.performed_by,
    severity: severityMap[log.action] || 'info',
    meta: log.target_id,
  };
}

export default function AdminActivityFeed() {
  const supabase = createClient();
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const events = (data || []).map(mapAuditLogToEvent);
      setActivityEvents(events);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivity().finally(() => setRefreshing(false));
  };

  const filtered = activeFilter === 'All'
    ? activityEvents
    : activityEvents.filter((e) => filterMap[activeFilter]?.includes(e.type));

  const displayed = showAll ? filtered : filtered.slice(0, 7);

  const stats = {
    total: activityEvents.length,
    alerts: activityEvents.filter((e) => e.severity === 'error' || e.severity === 'warning').length,
    payments: activityEvents.filter((e) => e.type === 'payment').length,
    matches: activityEvents.filter((e) => e.type === 'match').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Feed KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Events Today', value: stats.total, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Alerts', value: stats.alerts, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Payments', value: stats.payments, icon: CreditCard, color: 'text-positive', bg: 'bg-positive/10' },
          { label: 'Matches', value: stats.matches, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className="stat-card shadow-card">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                <KpiIcon size={16} className={kpi.color} />
              </div>
              <div>
                <div className={`text-xl font-extrabold tabular-nums ${kpi.color}`}>{kpi.value}</div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feed panel */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <h3 className="font-semibold text-foreground">Live Activity Feed</h3>
            <span className="text-2xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border overflow-x-auto scrollbar-thin">
          <Filter size={13} className="text-muted-foreground flex-shrink-0 mr-1" />
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Events list */}
        <div className="divide-y divide-border">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Filter size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No events for this filter</p>
            </div>
          ) : displayed.map((event) => {
            const cfg = typeConfig[event.type];
            const EventIcon = cfg.icon;
            return (
              <div key={event.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                  <EventIcon size={15} className={cfg.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{event.title}</p>
                      {event.meta && (
                        <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{event.meta}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Circle size={6} className={`${severityDot[event.severity || 'info']} fill-current`} />
                      <span className="text-2xs text-muted-foreground whitespace-nowrap">{event.timeAgo}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more */}
        {filtered.length > 7 && (
          <div className="px-5 py-3 border-t border-border">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              <ChevronDown size={15} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Show less' : `Show ${filtered.length - 7} more events`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
