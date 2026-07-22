'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Clock, Zap, RefreshCw, ChevronRight, Trophy, Users } from 'lucide-react';


interface LiveMatch {
  id: string;
  courtName: string;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  status: 'in_progress' | 'completed' | 'scheduled';
  startedAt: string | null;
  elapsedMinutes: number;
  winnerTeam: 'A' | 'B' | null;
}

export default function LiveMatchResults() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  const fetchLiveMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, score_a, score_b, winner_team, played_at, duration_minutes,
          court:courts!matches_court_id_fkey(name),
          player_a1:user_profiles!matches_player_a1_id_fkey(full_name),
          player_a2:user_profiles!matches_player_a2_id_fkey(full_name),
          player_b1:user_profiles!matches_player_b1_id_fkey(full_name),
          player_b2:user_profiles!matches_player_b2_id_fkey(full_name)
        `)
        .order('played_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      const mapped: LiveMatch[] = (data || []).map((m: any) => {
        const playedAt = m.played_at ? new Date(m.played_at) : null;
        const elapsedMinutes = playedAt
          ? Math.floor((Date.now() - playedAt.getTime()) / 60000)
          : 0;

        // Treat recent matches (< 90 min ago, no winner) as in_progress
        const isLive = !m.winner_team && elapsedMinutes < 90;
        const status: LiveMatch['status'] = m.winner_team
          ? 'completed'
          : isLive
          ? 'in_progress' :'scheduled';

        return {
          id: m.id,
          courtName: m.court?.name || 'Court —',
          teamA: [m.player_a1?.full_name, m.player_a2?.full_name].filter(Boolean) as string[],
          teamB: [m.player_b1?.full_name, m.player_b2?.full_name].filter(Boolean) as string[],
          scoreA: m.score_a ?? 0,
          scoreB: m.score_b ?? 0,
          status,
          startedAt: m.played_at,
          elapsedMinutes: Math.max(0, elapsedMinutes),
          winnerTeam: m.winner_team || null,
        };
      });

      setLiveMatches((prev) => {
        // Detect score changes for pulse animation
        const changed = new Set<string>();
        mapped.forEach((m) => {
          const old = prev.find((p) => p.id === m.id);
          if (old && (old.scoreA !== m.scoreA || old.scoreB !== m.scoreB)) {
            changed.add(m.id);
          }
        });
        if (changed.size > 0) {
          setPulsingIds(changed);
          setTimeout(() => setPulsingIds(new Set()), 1200);
        }
        return mapped;
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[LiveMatchResults] fetch error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveMatches]);

  // Supabase realtime subscription for matches table
  useEffect(() => {
    const channel = supabase
      .channel('live-matches-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchLiveMatches();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchLiveMatches]);

  const liveCount = liveMatches.filter((m) => m.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
          <h3 className="font-semibold text-foreground">Live Match Results</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Activity size={18} className="text-positive" />
            {liveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-positive rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Match Results</h3>
            <p className="text-2xs text-muted-foreground">
              {liveCount > 0 ? `${liveCount} match${liveCount > 1 ? 'es' : ''} in progress` : 'Real-time court activity'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-2xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchLiveMatches}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Live indicator strip */}
      {liveCount > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 bg-positive/5 border-b border-positive/10">
          <Zap size={12} className="text-positive" />
          <span className="text-xs font-semibold text-positive">
            {liveCount} LIVE — scores update automatically every 15 seconds
          </span>
        </div>
      )}

      {liveMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Trophy size={32} className="mb-2 opacity-20" />
          <p className="text-sm font-medium">No matches recorded yet</p>
          <p className="text-xs mt-1">Match results will appear here in real time</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {liveMatches.map((match) => {
            const isPulsing = pulsingIds.has(match.id);
            const isLive = match.status === 'in_progress';
            const aWins = match.winnerTeam === 'A';
            const bWins = match.winnerTeam === 'B';

            return (
              <div
                key={match.id}
                className={`px-5 py-4 transition-all duration-300 ${isPulsing ? 'pulse-highlight' : ''} ${isLive ? 'bg-positive/[0.02]' : ''}`}
              >
                {/* Court + status row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{match.courtName}</span>
                    {isLive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive/10 text-positive text-2xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {match.status === 'completed' && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-2xs font-semibold">
                        FINAL
                      </span>
                    )}
                  </div>
                  {isLive && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={11} />
                      <span className="text-2xs tabular-nums">{match.elapsedMinutes}m</span>
                    </div>
                  )}
                </div>

                {/* Scoreboard */}
                <div className="flex items-center gap-3">
                  {/* Team A */}
                  <div className={`flex-1 flex flex-col gap-1 ${aWins ? 'opacity-100' : bWins ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <Users size={11} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground font-medium truncate">
                        {match.teamA.length > 0 ? match.teamA.join(' & ') : 'Team A'}
                      </span>
                      {aWins && <Trophy size={11} className="text-accent flex-shrink-0" />}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-2xl font-extrabold tabular-nums w-8 text-center transition-all duration-300 ${
                        aWins ? 'text-positive' : bWins ? 'text-muted-foreground' : 'text-foreground'
                      } ${isPulsing ? 'scale-110' : ''}`}
                    >
                      {match.scoreA}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">–</span>
                    <span
                      className={`text-2xl font-extrabold tabular-nums w-8 text-center transition-all duration-300 ${
                        bWins ? 'text-positive' : aWins ? 'text-muted-foreground' : 'text-foreground'
                      } ${isPulsing ? 'scale-110' : ''}`}
                    >
                      {match.scoreB}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className={`flex-1 flex flex-col gap-1 items-end ${bWins ? 'opacity-100' : aWins ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {bWins && <Trophy size={11} className="text-accent flex-shrink-0" />}
                      <span className="text-xs text-foreground font-medium truncate text-right">
                        {match.teamB.length > 0 ? match.teamB.join(' & ') : 'Team B'}
                      </span>
                      <Users size={11} className="text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
        <span className="text-2xs text-muted-foreground">Auto-refreshes every 15s · Realtime enabled</span>
        <a href="/leaderboard" className="flex items-center gap-1 text-2xs font-semibold text-primary hover:underline">
          Full Leaderboard <ChevronRight size={11} />
        </a>
      </div>
    </div>
  );
}
