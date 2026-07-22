'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import StaffKPIStrip from '@/app/staff-dashboard/components/StaffKPIStrip';
import CourtGrid from '@/app/staff-dashboard/components/CourtGrid';
import WaitingQueue from '@/app/staff-dashboard/components/WaitingQueue';
import QRCheckin from '@/app/staff-dashboard/components/QRCheckin';
import SessionManager from '@/app/staff-dashboard/components/SessionManager';
import NotificationBanner from '@/app/staff-dashboard/components/NotificationBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RefreshCw, Calendar, AlertCircle } from 'lucide-react';

export default function StaffDashboardPage() {
  const { profile, loading, profileError, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && profile?.role === 'player') {
      router?.replace('/');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Profile error banner */}
        {profileError && (
          <div className="flex items-center gap-3 bg-negative/10 border border-negative/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-negative flex-shrink-0" />
            <p className="text-sm text-negative flex-1">{profileError}</p>
            <button
              onClick={refreshProfile}
              className="text-xs font-semibold text-negative underline flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Notification banners */}
        <NotificationBanner />

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date()?.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Morning Open Play Session · <span className="text-positive font-semibold">Live</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs gap-2">
              <Calendar size={14} />
              Session Schedule
            </button>
            <button className="btn-secondary text-xs gap-2" onClick={() => window.location?.reload()}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <StaffKPIStrip />

        {/* Court grid + queue */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Live Courts</h2>
            </div>
            <CourtGrid />
          </div>
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Waiting Queue</h2>
              </div>
              <WaitingQueue />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Check-in Counter</h2>
              </div>
              <QRCheckin />
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Session Management</h2>
            <span className="text-xs text-muted-foreground">Auto-refreshes every 15s</span>
          </div>
          <SessionManager />
        </div>
      </div>
    </AppLayout>
  );
}