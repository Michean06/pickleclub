'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, StopCircle, RefreshCw, PlayCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ActiveSession {
  courtId: string;
  courtName: string;
  players: string[];
  startedAt: string;
  durationMinutes: number;
  matchId: string;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingSession, setEndingSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('active_matches')
        .select(`
          id, started_at, court_id,
          courts(id, name),
          player_a1:user_profiles!active_matches_player_a1_id_fkey(full_name),
          player_a2:user_profiles!active_matches_player_a2_id_fkey(full_name),
          player_b1:user_profiles!active_matches_player_b1_id_fkey(full_name),
          player_b2:user_profiles!active_matches_player_b2_id_fkey(full_name)
        `)
        .order('started_at');

      if (fetchError) throw fetchError;

      const now = Date.now();
      const mapped: ActiveSession[] = (data || []).map((match: any) => {
        const startedAt = new Date(match.started_at);
        const durationMinutes = Math.floor((now - startedAt.getTime()) / 60000);
        const players = [
          match.player_a1?.full_name,
          match.player_a2?.full_name,
          match.player_b1?.full_name,
          match.player_b2?.full_name,
        ].filter(Boolean) as string[];

        return {
          courtId: match.courts?.id ?? match.court_id,
          courtName: match.courts?.name ?? 'Unknown Court',
          players,
          startedAt: match.started_at,
          durationMinutes,
          matchId: match.id,
        };
      });

      setSessions(mapped);
      setLastSync(new Date());
    } catch (err: any) {
      console.error('[SessionManager] fetchSessions error:', err?.message);
      setError('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleEndSession = async (session: ActiveSession) => {
    setEndingSession(session.matchId);
    try {
      // Mark court as available
      const { error: courtErr } = await supabase
        .from('courts')
        .update({ status: 'available' })
        .eq('id', session.courtId);
      if (courtErr) throw courtErr;

      // Remove the active_match record (session ended)
      const { error: matchErr } = await supabase
        .from('active_matches')
        .delete()
        .eq('id', session.matchId);
      if (matchErr) throw matchErr;

      await fetchSessions();
    } catch (err: any) {
      console.error('[SessionManager] endSession error:', err?.message);
      setError('Failed to end session. Please try again.');
    } finally {
      setEndingSession(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getDurationColor = (minutes: number) => {
    if (minutes >= 60) return 'text-negative';
    if (minutes >= 45) return 'text-warning';
    return 'text-positive';
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
          <h3 className="font-semibold text-foreground">Active Sessions</h3>
          {!loading && (
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {sessions.length} live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-2xs text-muted-foreground hidden sm:block">
              Synced {lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh sessions"
          >
            <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mx-5 mt-4 px-3 py-2 bg-negative/10 border border-negative/20 rounded-lg">
          <AlertCircle size={14} className="text-negative flex-shrink-0" />
          <p className="text-xs text-negative">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <PlayCircle size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No active sessions</p>
          <p className="text-xs mt-1">Sessions will appear here when courts are in use</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.matchId} className="px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Court + duration */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm text-foreground">{session.courtName}</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className={getDurationColor(session.durationMinutes)} />
                      <span className={`text-xs font-bold tabular-nums ${getDurationColor(session.durationMinutes)}`}>
                        {formatDuration(session.durationMinutes)}
                      </span>
                    </div>
                    {session.durationMinutes >= 60 && (
                      <span className="text-2xs font-semibold text-negative bg-negative/10 px-1.5 py-0.5 rounded-full">
                        Overtime
                      </span>
                    )}
                  </div>

                  {/* Players */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Users size={12} className="text-muted-foreground flex-shrink-0" />
                    {session.players.length > 0 ? (
                      session.players.map((name, idx) => (
                        <span
                          key={`${session.matchId}-player-${idx}`}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            idx < 2
                              ? 'bg-primary/10 text-primary' :'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Players not assigned</span>
                    )}
                  </div>

                  {/* Start time */}
                  <p className="text-2xs text-muted-foreground mt-1.5">
                    Started at {new Date(session.startedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* End session button */}
                <button
                  onClick={() => handleEndSession(session)}
                  disabled={endingSession === session.matchId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-negative border border-negative/30 hover:bg-negative/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {endingSession === session.matchId ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <StopCircle size={12} />
                  )}
                  End
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
