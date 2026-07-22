'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Users, X, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface Alert {
  id: string;
  type: 'queue' | 'overrun' | 'coverage';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
}

const QUEUE_THRESHOLD = 8;
const OVERRUN_MINUTES = 60;
const LOW_STAFF_THRESHOLD = 1; // fewer than 2 staff on duty triggers alert

export default function NotificationBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createClient();

  const buildAlerts = useCallback(async () => {
    const newAlerts: Alert[] = [];

    try {
      // 1. Queue threshold alert
      const { count: queueCount } = await supabase
        .from('queue_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting');

      if ((queueCount ?? 0) >= QUEUE_THRESHOLD) {
        newAlerts.push({
          id: 'queue-threshold',
          type: 'queue',
          severity: (queueCount ?? 0) >= QUEUE_THRESHOLD + 4 ? 'critical' : 'warning',
          title: 'Queue Threshold Reached',
          message: `${queueCount} players are waiting. Consider opening additional courts or assigning the next group.`,
          timestamp: new Date(),
        });
      }

      // 2. Session overrun alert (sessions > 60 min)
      const { data: activeSessions } = await supabase
        .from('active_matches')
        .select('id, started_at, courts(name)')
        .order('started_at');

      const now = Date.now();
      const overrunSessions = (activeSessions || []).filter((s: any) => {
        const duration = Math.floor((now - new Date(s.started_at).getTime()) / 60000);
        return duration > OVERRUN_MINUTES;
      });

      if (overrunSessions.length > 0) {
        const courtNames = overrunSessions
          .map((s: any) => s.courts?.name || 'Unknown Court')
          .join(', ');
        newAlerts.push({
          id: 'session-overrun',
          type: 'overrun',
          severity: 'critical',
          title: `Session Overrun Detected (${overrunSessions.length} court${overrunSessions.length > 1 ? 's' : ''})`,
          message: `${courtNames} ${overrunSessions.length > 1 ? 'have' : 'has'} exceeded 60 minutes. Please check and end sessions if needed.`,
          timestamp: new Date(),
        });
      }

      // 3. Low staff coverage alert
      const { count: staffCount } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'staff')
        .eq('is_active', true);

      if ((staffCount ?? 0) <= LOW_STAFF_THRESHOLD) {
        newAlerts.push({
          id: 'low-coverage',
          type: 'coverage',
          severity: 'warning',
          title: 'Low Staff Coverage',
          message: `Only ${staffCount ?? 0} staff member${(staffCount ?? 0) === 1 ? '' : 's'} currently active. Consider calling in additional staff.`,
          timestamp: new Date(),
        });
      }
    } catch (err: any) {
      console.error('[NotificationBanner] error:', err?.message);
    }

    setAlerts(newAlerts);
  }, [supabase]);

  useEffect(() => {
    buildAlerts();
    const interval = setInterval(buildAlerts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [buildAlerts]);

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length;
  const hasCritical = criticalCount > 0;

  const iconMap = {
    queue: Clock,
    overrun: AlertTriangle,
    coverage: Users,
  };

  const colorMap = {
    warning: {
      banner: 'bg-amber-50 border-amber-200',
      icon: 'text-amber-500',
      iconBg: 'bg-amber-100',
      title: 'text-amber-800',
      message: 'text-amber-700',
      dismiss: 'text-amber-400 hover:text-amber-600 hover:bg-amber-100',
      badge: 'bg-amber-100 text-amber-700',
    },
    critical: {
      banner: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      iconBg: 'bg-red-100',
      title: 'text-red-800',
      message: 'text-red-700',
      dismiss: 'text-red-400 hover:text-red-600 hover:bg-red-100',
      badge: 'bg-red-100 text-red-700',
    },
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header bar */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
          hasCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${hasCritical ? 'bg-red-100' : 'bg-amber-100'}`}>
            <Bell size={13} className={hasCritical ? 'text-red-500' : 'text-amber-500'} />
            {hasCritical && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
            )}
          </div>
          <span className={`text-xs font-bold ${hasCritical ? 'text-red-800' : 'text-amber-800'}`}>
            {visibleAlerts.length} Active Alert{visibleAlerts.length > 1 ? 's' : ''}
          </span>
          {hasCritical && (
            <span className="text-2xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`flex items-center gap-1 text-2xs font-semibold px-2 py-1 rounded-lg transition-colors ${
            hasCritical ? 'text-red-600 hover:bg-red-100' : 'text-amber-600 hover:bg-amber-100'
          }`}
        >
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {/* Alert cards */}
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {visibleAlerts.map((alert) => {
            const colors = colorMap[alert.severity];
            const Icon = iconMap[alert.type];
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${colors.banner} transition-all duration-200`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.iconBg}`}>
                  <Icon size={16} className={colors.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${colors.title}`}>{alert.title}</p>
                  <p className={`text-xs mt-0.5 ${colors.message}`}>{alert.message}</p>
                  <p className={`text-2xs mt-1 ${colors.message} opacity-70`}>
                    {alert.timestamp.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${colors.dismiss}`}
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
