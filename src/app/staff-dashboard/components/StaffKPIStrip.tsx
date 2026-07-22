'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckSquare, Users, CreditCard, Layers, Clock, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface KPIData {
  matchesToday: number;
  activePlayers: number;
  creditsSold: number;
  courtsActive: number;
  courtsTotal: number;
  queueDepth: number;
}

const SYNC_INTERVAL = 20000; // 20 seconds

export default function StaffKPIStrip() {
  const [kpi, setKpi] = useState<KPIData>({
    matchesToday: 0,
    activePlayers: 0,
    creditsSold: 0,
    courtsActive: 0,
    courtsTotal: 0,
    queueDepth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState(SYNC_INTERVAL / 1000);
  const [justSynced, setJustSynced] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const fetchKPIs = useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [matchesRes, courtsRes, queueRes, txRes] = await Promise.all([
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .gte('played_at', today.toISOString()),
        supabase
          .from('courts')
          .select('status'),
        supabase
          .from('queue_entries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'waiting'),
        supabase
          .from('credit_transactions')
          .select('credits_delta')
          .gte('created_at', today.toISOString())
          .gt('credits_delta', 0),
      ]);

      const courts = courtsRes.data || [];
      const courtsActive = courts.filter((c: any) => c.status === 'playing').length;
      const courtsTotal = courts.length;
      const activePlayers = courtsActive * 4;
      const creditsSold = (txRes.data || []).reduce((sum: number, t: any) => sum + (t.credits_delta || 0), 0);

      setKpi({
        matchesToday: matchesRes.count ?? 0,
        activePlayers,
        creditsSold,
        courtsActive,
        courtsTotal,
        queueDepth: queueRes.count ?? 0,
      });

      setLastSync(new Date());
      setNextSyncIn(SYNC_INTERVAL / 1000);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 1200);
    } catch (err: any) {
      console.error('[StaffKPIStrip] fetchKPIs error:', err?.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [supabase]);

  // Auto-sync interval
  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(() => fetchKPIs(), SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchKPIs]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev <= 1) return SYNC_INTERVAL / 1000;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const kpiItems = [
    {
      id: 'kpi-matches',
      label: 'Matches Today',
      value: loading ? '—' : kpi.matchesToday,
      sub: 'completed this session',
      icon: CheckSquare,
      color: 'text-primary',
      iconBg: 'bg-primary/10',
      alert: false,
    },
    {
      id: 'kpi-players',
      label: 'Active Players',
      value: loading ? '—' : kpi.activePlayers,
      sub: `${kpi.courtsActive} courts playing`,
      icon: Users,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
      alert: false,
    },
    {
      id: 'kpi-credits',
      label: 'Credits Sold',
      value: loading ? '—' : kpi.creditsSold,
      sub: 'today',
      icon: CreditCard,
      color: 'text-purple-600',
      iconBg: 'bg-purple-50',
      alert: false,
    },
    {
      id: 'kpi-courts',
      label: 'Courts Active',
      value: loading ? '—' : `${kpi.courtsActive} / ${kpi.courtsTotal}`,
      sub: `${kpi.courtsTotal - kpi.courtsActive} available`,
      icon: Layers,
      color: 'text-positive',
      iconBg: 'bg-positive/10',
      alert: false,
    },
    {
      id: 'kpi-queue',
      label: 'Queue Depth',
      value: loading ? '—' : kpi.queueDepth,
      sub: kpi.queueDepth >= 8 ? '⚠ High volume' : 'players waiting',
      icon: Clock,
      color: kpi.queueDepth >= 8 ? 'text-warning' : 'text-foreground',
      iconBg: kpi.queueDepth >= 8 ? 'bg-warning/10' : 'bg-muted',
      alert: kpi.queueDepth >= 8,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Auto-sync status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${justSynced ? 'bg-positive scale-125' : 'bg-positive'} transition-all duration-300`} />
          <span className="text-xs text-muted-foreground font-medium">
            Auto-Sync
            {lastSync && (
              <span className="ml-1 text-muted-foreground/70">
                · Last: {lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${((SYNC_INTERVAL / 1000 - nextSyncIn) / (SYNC_INTERVAL / 1000)) * 100}%` }}
              />
            </div>
            <span className="text-2xs text-muted-foreground tabular-nums w-8">
              {nextSyncIn}s
            </span>
          </div>
          <button
            onClick={() => fetchKPIs(true)}
            disabled={syncing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 transition-opacity duration-300 ${justSynced ? 'opacity-80' : 'opacity-100'}`}>
        {kpiItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`stat-card shadow-card transition-all duration-300 ${item.alert ? 'border-warning/40 bg-warning/5' : ''} ${justSynced ? 'ring-1 ring-primary/20' : ''}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                <Icon size={18} className={item.color} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
                <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                <p className={`text-2xs mt-0.5 ${item.alert ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}