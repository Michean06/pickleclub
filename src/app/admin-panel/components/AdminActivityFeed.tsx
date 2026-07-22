'use client';

import React, { useState } from 'react';
import { UserPlus, CreditCard, Trophy, Wrench, LogIn, AlertTriangle, Calendar, ShieldCheck, TrendingUp, Filter, RefreshCw, ChevronDown, Circle } from 'lucide-react';

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

const activityEvents: ActivityEvent[] = [
  { id: 'act-1', type: 'alert', title: 'Court 6 went offline', description: 'Maintenance mode triggered automatically — net sensor fault detected', timestamp: '9:47 AM', timeAgo: '3 min ago', severity: 'error', meta: 'Court 6' },
  { id: 'act-2', type: 'payment', title: 'Credit purchase', description: 'Angela Torres purchased 20 credits for ₱900', timestamp: '9:44 AM', timeAgo: '6 min ago', actor: 'Angela Torres', severity: 'success', meta: '₱900' },
  { id: 'act-3', type: 'match', title: 'Match completed', description: 'Court 2 · Kim Ong vs Maria Santos — Kim won 11-7, 11-9', timestamp: '9:41 AM', timeAgo: '9 min ago', severity: 'info', meta: 'Court 2' },
  { id: 'act-4', type: 'player', title: 'New player registered', description: 'Carlos Mendoza joined as Intermediate · Referred by Angela Torres', timestamp: '9:38 AM', timeAgo: '12 min ago', actor: 'Carlos Mendoza', severity: 'success', meta: 'New' },
  { id: 'act-5', type: 'booking', title: 'Court reservation made', description: 'Juan Dela Cruz booked Court 4 for 2:00–3:00 PM today', timestamp: '9:35 AM', timeAgo: '15 min ago', actor: 'Juan Dela Cruz', severity: 'info', meta: 'Court 4' },
  { id: 'act-6', type: 'auth', title: 'Staff login', description: 'Staff member Reyna Cruz logged in from new device', timestamp: '9:30 AM', timeAgo: '20 min ago', actor: 'Reyna Cruz', severity: 'warning', meta: 'New device' },
  { id: 'act-7', type: 'payment', title: 'Credit purchase', description: 'Jose Ramos purchased 10 credits for ₱450', timestamp: '9:22 AM', timeAgo: '28 min ago', actor: 'Jose Ramos', severity: 'success', meta: '₱450' },
  { id: 'act-8', type: 'match', title: 'Match completed', description: 'Court 1 · Angela Torres vs Juan Dela Cruz — Angela won 11-4, 11-6', timestamp: '9:15 AM', timeAgo: '35 min ago', severity: 'info', meta: 'Court 1' },
  { id: 'act-9', type: 'maintenance', title: 'Maintenance completed', description: 'Court 5 net replacement finished — back online', timestamp: '9:00 AM', timeAgo: '50 min ago', severity: 'success', meta: 'Court 5' },
  { id: 'act-10', type: 'system', title: 'Daily backup completed', description: 'Automated database backup finished — 247 player records secured', timestamp: '8:00 AM', timeAgo: '1 hr 50 min ago', severity: 'info', meta: 'System' },
  { id: 'act-11', type: 'player', title: 'Player rating updated', description: 'Kim Ong\'s ELO rating increased from 1572 → 1598 after 3 wins', timestamp: '8:45 AM', timeAgo: '1 hr 5 min ago', actor: 'Kim Ong', severity: 'success', meta: '+26 ELO' },
  { id: 'act-12', type: 'alert', title: 'Low credit balance alert', description: 'Maria Santos has 1 credit remaining — auto-notification sent', timestamp: '8:30 AM', timeAgo: '1 hr 20 min ago', actor: 'Maria Santos', severity: 'warning', meta: '1 credit' },
];

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

export default function AdminActivityFeed() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
          {displayed.map((event) => {
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

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Filter size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No events for this filter</p>
            </div>
          )}
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
