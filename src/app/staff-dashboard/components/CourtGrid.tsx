'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, CheckCircle, Wrench, Clock, X, Wifi, WifiOff, RefreshCw, AlertCircle, UserPlus } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface CourtPlayer {
  name: string;
  team: 'A' | 'B';
  id?: string;
}

interface Court {
  id: string;
  name: string;
  court_number: number;
  status: 'playing' | 'available' | 'maintenance';
  maintenance_note?: string;
  players?: CourtPlayer[];
  matchStartedAt?: string;
  activeMatchId?: string;
  todayGames?: number;
}

interface MatchConfirmForm {
  winner: 'A' | 'B' | null;
  scoreA: string;
  scoreB: string;
  duration: string;
}

interface QueuePlayer {
  id: string;
  userId: string;
  queueNumber: number;
  name: string;
  credits: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

function formatElapsed(startedAt: string): number {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

const RECONNECT_DELAYS = [2000, 5000, 10000, 30000];

export default function CourtGrid() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [confirmingCourt, setConfirmingCourt] = useState<Court | null>(null);
  const [assigningCourt, setAssigningCourt] = useState<Court | null>(null);
  const [form, setForm] = useState<MatchConfirmForm>({ winner: null, scoreA: '', scoreB: '', duration: '' });
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [assignTeamA, setAssignTeamA] = useState<[string, string]>(['', '']);
  const [assignTeamB, setAssignTeamB] = useState<[string, string]>(['', '']);
  const [assigning, setAssigning] = useState(false);
  const supabase = createClient();
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const channelCounterRef = useRef(0);
  const buildCourtsRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});
  const fetchQueuePlayersRef = useRef<() => Promise<void>>(async () => {});
  const subscribeToRealtimeRef = useRef<() => void>(() => {});
  const scheduleReconnectRef = useRef<() => void>(() => {});

  const buildCourts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(null);

    try {
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .order('court_number', { ascending: true });

      if (courtsError) throw courtsError;

      const { data: activeMatches } = await supabase
        .from('active_matches')
        .select(`
          id, court_id, started_at, session_name,
          player_a1:user_profiles!active_matches_player_a1_id_fkey(id, full_name),
          player_a2:user_profiles!active_matches_player_a2_id_fkey(id, full_name),
          player_b1:user_profiles!active_matches_player_b1_id_fkey(id, full_name),
          player_b2:user_profiles!active_matches_player_b2_id_fkey(id, full_name)
        `);

      const matchMap: Record<string, any> = {};
      activeMatches?.forEach((m: any) => {
        matchMap[m.court_id] = m;
      });

      const mapped: Court[] = (courtsData || []).map((c: any) => {
        const match = matchMap[c.id];
        const players: CourtPlayer[] = match
          ? [
              match.player_a1?.full_name ? { name: match.player_a1.full_name.split(' ')[0] + ' ' + (match.player_a1.full_name.split(' ')[1]?.[0] || '') + '.', team: 'A' as const, id: match.player_a1.id } : null,
              match.player_a2?.full_name ? { name: match.player_a2.full_name.split(' ')[0] + ' ' + (match.player_a2.full_name.split(' ')[1]?.[0] || '') + '.', team: 'A' as const, id: match.player_a2.id } : null,
              match.player_b1?.full_name ? { name: match.player_b1.full_name.split(' ')[0] + ' ' + (match.player_b1.full_name.split(' ')[1]?.[0] || '') + '.', team: 'B' as const, id: match.player_b1.id } : null,
              match.player_b2?.full_name ? { name: match.player_b2.full_name.split(' ')[0] + ' ' + (match.player_b2.full_name.split(' ')[1]?.[0] || '') + '.', team: 'B' as const, id: match.player_b2.id } : null,
            ].filter(Boolean) as CourtPlayer[]
          : [];

        return {
          id: c.id,
          name: c.name,
          court_number: c.court_number,
          status: c.status as Court['status'],
          maintenance_note: c.maintenance_note,
          players: players.length > 0 ? players : undefined,
          matchStartedAt: match?.started_at,
          activeMatchId: match?.id,
          todayGames: c.today_games ?? 0,
        };
      });

      setCourts(mapped);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[CourtGrid] buildCourts error:', err?.message);
      setFetchError('Failed to load court data.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchQueuePlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          id, queue_number,
          player:user_profiles!queue_entries_player_id_fkey(id, full_name, credits)
        `)
        .eq('status', 'waiting')
        .order('queue_number', { ascending: true });

      if (error || !data) return;

      const mapped: QueuePlayer[] = data.map((e: any) => ({
        id: e.id,
        userId: e.player?.id || '',
        queueNumber: e.queue_number,
        name: e.player?.full_name || 'Unknown',
        credits: e.player?.credits ?? 0,
      }));
      setQueuePlayers(mapped);
    } catch (err: any) {
      console.error('[CourtGrid] fetchQueuePlayers error:', err?.message);
    }
  }, [supabase]);

  // Keep refs in sync with latest callbacks without triggering re-subscription
  useEffect(() => {
    buildCourtsRef.current = buildCourts;
  }, [buildCourts]);

  useEffect(() => {
    fetchQueuePlayersRef.current = fetchQueuePlayers;
  }, [fetchQueuePlayers]);

  // Define subscribeToRealtime and scheduleReconnect as stable refs to avoid circular deps
  useEffect(() => {
    subscribeToRealtimeRef.current = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setConnectionStatus('connecting');

      channelCounterRef.current += 1;
      const channelName = `courts_realtime_${channelCounterRef.current}`;

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => {
          buildCourtsRef.current(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'active_matches' }, () => {
          buildCourtsRef.current(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => {
          fetchQueuePlayersRef.current();
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttemptRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error');
            console.error('[CourtGrid] Realtime subscription error:', err);
            scheduleReconnectRef.current();
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
            scheduleReconnectRef.current();
          }
        });

      channelRef.current = channel;
    };
  }, [supabase]);

  useEffect(() => {
    scheduleReconnectRef.current = () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const attempt = reconnectAttemptRef.current;
      const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        subscribeToRealtimeRef.current();
      }, delay);
    };
  }, []);

  useEffect(() => {
    buildCourts();
    fetchQueuePlayers();
    subscribeToRealtimeRef.current();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Live timers
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = { ...prev };
        courts.forEach((c) => {
          if (c.status === 'playing' && c.matchStartedAt) {
            next[c.id] = formatElapsed(c.matchStartedAt);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [courts]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([buildCourts(true), fetchQueuePlayers()]);
    setRefreshing(false);
    toast.success('Courts refreshed');
  };

  const formatElapsedDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const openConfirm = (court: Court) => {
    setConfirmingCourt(court);
    const sec = elapsed[court.id] ?? 0;
    setForm({ winner: null, scoreA: '', scoreB: '', duration: String(Math.round(sec / 60)) });
  };

  const openAssign = (court: Court) => {
    setAssigningCourt(court);
    // Pre-fill with top 4 queue players
    const top4 = queuePlayers.slice(0, 4);
    setAssignTeamA([top4[0]?.userId || '', top4[1]?.userId || '']);
    setAssignTeamB([top4[2]?.userId || '', top4[3]?.userId || '']);
  };

  const handleConfirmMatch = async () => {
    if (!form.winner || !form.scoreA || !form.scoreB) {
      toast.error('Please fill in all match details before confirming.');
      return;
    }
    if (!confirmingCourt?.activeMatchId) {
      toast.error('No active match found for this court.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('process_match_end', {
        p_active_match_id: confirmingCourt.activeMatchId,
        p_winner_team: form.winner,
        p_score_a: parseInt(form.scoreA),
        p_score_b: parseInt(form.scoreB),
        p_duration_minutes: parseInt(form.duration) || 30,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Processing failed');

      // Check for achievements
      const achievements = result?.achievements_awarded || [];
      if (achievements.length > 0) {
        achievements.forEach((ach: any) => {
          toast.success(`🏆 Achievement unlocked: ${ach.name}`, { duration: 4000 });
        });
      }

      toast.success(`Match confirmed! Credits deducted, stats & ratings updated.`);
      setConfirmingCourt(null);
      await buildCourts(true);
    } catch (err: any) {
      console.error('[CourtGrid] handleConfirmMatch error:', err?.message);
      toast.error('Failed to confirm match: ' + (err?.message || 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCourt = async () => {
    if (!assigningCourt) return;
    const playerIds = [assignTeamA[0], assignTeamA[1], assignTeamB[0], assignTeamB[1]];
    const validIds = playerIds.filter(Boolean);
    if (validIds.length < 2) {
      toast.error('Please assign at least 2 players (1 per team minimum).');
      return;
    }
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_players_to_court', {
        p_court_id: assigningCourt.id,
        p_player_a1_id: assignTeamA[0] || null,
        p_player_a2_id: assignTeamA[1] || null,
        p_player_b1_id: assignTeamB[0] || null,
        p_player_b2_id: assignTeamB[1] || null,
        p_session_name: 'Open Play',
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Assignment failed');

      toast.success(`Players assigned to ${assigningCourt.name}! Match started.`);
      setAssigningCourt(null);
      await Promise.all([buildCourts(true), fetchQueuePlayers()]);
    } catch (err: any) {
      console.error('[CourtGrid] handleAssignCourt error:', err?.message);
      toast.error('Failed to assign court: ' + (err?.message || 'Please try again.'));
    } finally {
      setAssigning(false);
    }
  };

  const connectionLabel = {
    connecting: 'Connecting...',
    connected: 'Live updates active',
    disconnected: 'Reconnecting...',
    error: 'Connection error — retrying',
  }[connectionStatus];

  const connectionIcon = connectionStatus === 'connected'
    ? <Wifi size={13} className="text-positive" />
    : connectionStatus === 'error'
    ? <AlertCircle size={13} className="text-negative" />
    : <WifiOff size={13} className="text-orange-400 animate-pulse" />;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="rounded-xl border-2 border-border p-5 animate-pulse bg-muted/30 h-40" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Live indicator + refresh */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {connectionIcon}
          <span className={`text-2xs font-medium ${
            connectionStatus === 'connected' ? 'text-positive' :
            connectionStatus === 'error' ? 'text-negative' : 'text-orange-400'
          }`}>
            {connectionLabel}
          </span>
          {lastUpdated && connectionStatus === 'connected' && (
            <span className="text-2xs text-muted-foreground ml-1">
              · Updated {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {fetchError && (
        <div className="mb-3 flex items-center gap-2 bg-negative/10 border border-negative/20 rounded-lg px-3 py-2 text-xs text-negative">
          <AlertCircle size={13} />
          {fetchError}
          <button onClick={() => buildCourts()} className="ml-auto underline font-medium">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {courts.map((court) => {
          const elapsedSec = elapsed[court.id] ?? (court.matchStartedAt ? formatElapsed(court.matchStartedAt) : 0);
          const isLong = elapsedSec > 30 * 60;

          return (
            <div
              key={court.id}
              className={`rounded-xl border-2 p-5 transition-all duration-200 shadow-card ${
                court.status === 'playing'
                  ? isLong
                    ? 'border-orange-300 bg-orange-50' : 'court-active'
                  : court.status === 'maintenance' ? 'court-maintenance' : 'court-available'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      court.status === 'playing' ? 'bg-primary text-white'
                        : court.status === 'maintenance' ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {court.court_number}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{court.name}</span>
                    {(court.todayGames ?? 0) > 0 && (
                      <p className="text-2xs text-muted-foreground">{court.todayGames} games today</p>
                    )}
                  </div>
                </div>
                <StatusBadge
                  status={court.status}
                  label={
                    court.status === 'playing' ? 'Playing'
                      : court.status === 'maintenance' ? 'Maintenance' : 'Available'
                  }
                />
              </div>

              {court.status === 'playing' && court.players && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['A', 'B'] as const).map((team) => (
                      <div key={team} className="bg-white/60 rounded-lg p-2">
                        <p className="text-2xs font-bold text-muted-foreground mb-1">Team {team}</p>
                        {court.players!.filter((p) => p.team === team).map((p, i) => (
                          <p key={i} className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className={`flex items-center gap-1.5 mt-2 ${isLong ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    <Clock size={11} />
                    <span className="text-xs font-mono tabular-nums font-semibold">
                      {formatElapsedDisplay(elapsedSec)}
                    </span>
                    {isLong && <span className="text-2xs text-orange-500 font-medium">Overtime</span>}
                  </div>
                </div>
              )}

              {court.status === 'maintenance' && court.maintenance_note && (
                <div className="flex items-start gap-1.5 mb-3">
                  <Wrench size={12} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700">{court.maintenance_note}</p>
                </div>
              )}

              {court.status === 'available' && (
                <div className="flex items-center gap-1.5 mb-3">
                  <CheckCircle size={13} className="text-positive" />
                  <p className="text-xs text-positive font-medium">
                    Ready · {queuePlayers.length} players waiting
                  </p>
                </div>
              )}

              {court.status === 'playing' && (
                <button
                  onClick={() => openConfirm(court)}
                  className="btn-primary w-full text-xs py-2 gap-1.5"
                >
                  <Play size={12} />
                  Confirm Match End
                </button>
              )}

              {court.status === 'available' && (
                <button
                  onClick={() => openAssign(court)}
                  disabled={queuePlayers.length === 0}
                  className="btn-secondary w-full text-xs py-2 gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={12} />
                  Assign Players
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Match confirm modal */}
      {confirmingCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmingCourt(null)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-5 slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Confirm Match — {confirmingCourt.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Credits will be deducted · Stats & ratings updated</p>
              </div>
              <button onClick={() => setConfirmingCourt(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Players summary */}
            {confirmingCourt.players && confirmingCourt.players.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['A', 'B'] as const).map((team) => (
                  <div key={team} className="bg-muted/40 rounded-lg p-2.5">
                    <p className="text-2xs font-bold text-muted-foreground mb-1.5">Team {team}</p>
                    {confirmingCourt.players!.filter((p) => p.team === team).map((p, i) => (
                      <p key={i} className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Winner</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['A', 'B'] as const).map((team) => (
                    <button
                      key={team}
                      onClick={() => setForm((f) => ({ ...f, winner: team }))}
                      className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                        form.winner === team
                          ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      Team {team} Wins
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Score A</label>
                  <input
                    type="number"
                    value={form.scoreA}
                    onChange={(e) => setForm((f) => ({ ...f, scoreA: e.target.value }))}
                    className="input-field text-center"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Score B</label>
                  <input
                    type="number"
                    value={form.scoreB}
                    onChange={(e) => setForm((f) => ({ ...f, scoreB: e.target.value }))}
                    className="input-field text-center"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className="input-field"
                  placeholder="30"
                  min="1"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                <p className="font-semibold mb-0.5">Post-match processing:</p>
                <p className="text-primary/80">1 credit deducted per player · Ratings updated · Achievements checked · Queue rotated</p>
              </div>

              <button
                onClick={handleConfirmMatch}
                disabled={submitting}
                className="btn-primary w-full mt-1 gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    Confirm & Process Match
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Court assignment modal */}
      {assigningCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssigningCourt(null)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-5 slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Assign Players — {assigningCourt.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{queuePlayers.length} players in queue</p>
              </div>
              <button onClick={() => setAssigningCourt(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {(['A', 'B'] as const).map((team) => {
                const teamState = team === 'A' ? assignTeamA : assignTeamB;
                const setTeam = team === 'A' ? setAssignTeamA : setAssignTeamB;
                return (
                  <div key={team}>
                    <p className="text-xs font-bold text-foreground mb-2">Team {team}</p>
                    <div className="flex flex-col gap-2">
                      {[0, 1].map((slot) => (
                        <select
                          key={slot}
                          value={teamState[slot]}
                          onChange={(e) => {
                            const updated = [...teamState] as [string, string];
                            updated[slot] = e.target.value;
                            setTeam(updated);
                          }}
                          className="input-field text-sm"
                        >
                          <option value="">— Select player —</option>
                          {queuePlayers.map((p) => {
                            const allSelected = [assignTeamA[0], assignTeamA[1], assignTeamB[0], assignTeamB[1]];
                            const isSelectedElsewhere = allSelected.includes(p.userId) && teamState[slot] !== p.userId;
                            return (
                              <option key={p.userId} value={p.userId} disabled={isSelectedElsewhere}>
                                #{p.queueNumber} {p.name} ({p.credits} credits)
                              </option>
                            );
                          })}
                        </select>
                      ))}
                    </div>
                  </div>
                );
              })}

              {queuePlayers.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No players in queue. Use QR Check-in to add players.
                </div>
              )}

              <button
                onClick={handleAssignCourt}
                disabled={assigning || queuePlayers.length === 0}
                className="btn-primary w-full gap-2 disabled:opacity-50"
              >
                {assigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Start Match on {assigningCourt.name}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}