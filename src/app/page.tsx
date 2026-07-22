'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import PlayerWalletCard from '@/app/components/PlayerWalletCard';
import PlayerStatGrid from '@/app/components/PlayerStatGrid';
import RatingChart from '@/app/components/RatingChart';
import AchievementsGrid from '@/app/components/AchievementsGrid';
import MatchHistoryTable from '@/app/components/MatchHistoryTable';
import PerformanceInsights from '@/app/components/PerformanceInsights';
import LiveMatchResults from '@/app/components/LiveMatchResults';
import StatusBadge from '@/components/ui/StatusBadge';
import PlayerQRCard from '@/components/PlayerQRCard';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Star, MapPin, Calendar, Bell, QrCode, X, AlertCircle, RefreshCw } from 'lucide-react';

interface QueueStatus {
  inQueue: boolean;
  queueNumber: number;
  waitMinutes: number;
  sessionName: string;
}

export default function PlayerDashboardPage() {
  const { profile, loading, profileError, refreshProfile } = useAuth();
  const supabase = createClient();
  const [showQRCard, setShowQRCard] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select('queue_number, checked_in_at, session_name')
        .eq('player_id', profile.id)
        .eq('status', 'waiting')
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setQueueStatus(null);
        return;
      }

      const checkedIn = new Date(data.checked_in_at);
      const waitMinutes = Math.floor((Date.now() - checkedIn.getTime()) / 60000);
      setQueueStatus({
        inQueue: true,
        queueNumber: data.queue_number,
        waitMinutes: Math.max(0, waitMinutes),
        sessionName: data.session_name || 'Open Play',
      });
    } catch (err: any) {
      console.error('[PlayerDashboard] fetchQueueStatus error:', err?.message);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchQueueStatus();
    // Refresh queue status every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  const playerData = {
    id: profile?.player_id || 'PKL-2026-0001',
    name: profile?.full_name || 'Loading...',
    skillLevel: (profile?.skill_level || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'pro',
    rating: profile?.rating || 1200,
    credits: profile?.credits || 0,
    memberSince: profile?.member_since
      ? new Date(profile.member_since).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
      : 'Jan 2026',
    stats: {
      gamesPlayed: profile?.games_played || 0,
      wins: profile?.wins || 0,
      losses: profile?.losses || 0,
      winRate: profile?.games_played ? Math.round((profile.wins / profile.games_played) * 100 * 10) / 10 : 0,
      courtHours: profile?.court_hours || 0,
      currentStreak: profile?.current_streak || 0,
      longestStreak: profile?.longest_streak || 0,
      rating: profile?.rating || 1200,
    },
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'P';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
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

        {/* Queue status banner — live from Supabase */}
        {queueStatus?.inQueue && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-extrabold text-primary text-sm">{queueStatus.queueNumber}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">You are #{queueStatus.queueNumber} in the waiting queue</p>
                <p className="text-xs text-muted-foreground">
                  Waiting {queueStatus.waitMinutes}m · Session: {queueStatus.sessionName}
                </p>
              </div>
            </div>
            <StatusBadge status="waiting" label="In Queue" />
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-green flex items-center justify-center flex-shrink-0 shadow-card-md">
              <span className="text-white font-extrabold text-lg">{initials}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground">{playerData.name}</h1>
                <StatusBadge
                  status={playerData.skillLevel}
                  label={playerData.skillLevel.charAt(0).toUpperCase() + playerData.skillLevel.slice(1)}
                />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-accent" />
                  Rating {playerData.rating}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {playerData.id}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Member since {playerData.memberSince}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowQRCard(true)}
              className="btn-secondary gap-2 text-sm"
            >
              <QrCode size={16} />
              My QR Card
            </button>
            <a href="/notifications" className="btn-secondary gap-2">
              <Bell size={16} />
              Notifications
            </a>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-2">
            <PlayerWalletCard
              credits={playerData.credits}
              playerId={playerData.id}
              playerName={playerData.name}
            />
          </div>
          <div className="lg:col-span-2">
            <RatingChart />
          </div>
        </div>

        <PlayerStatGrid stats={playerData.stats} />
        <AchievementsGrid />
        <PerformanceInsights />
        <LiveMatchResults />
        <MatchHistoryTable />
      </div>

      {/* QR Card Modal */}
      {showQRCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQRCard(false)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-5 slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Digital Player Card</h3>
                <p className="text-xs text-muted-foreground">Your QR code for check-in and verification</p>
              </div>
              <button
                onClick={() => setShowQRCard(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <PlayerQRCard onClose={() => setShowQRCard(false)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}