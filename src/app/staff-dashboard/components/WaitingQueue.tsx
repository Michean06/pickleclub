'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, UserCheck, X, Clock, CreditCard, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface QueuePlayer {
  id: string;
  queueNumber: number;
  name: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  credits: number;
  rating: number;
  arrivalTime: string;
  waitMinutes: number;
  playerId: string;
  userId: string;
}

const RECONNECT_DELAYS = [2000, 5000, 10000, 30000];
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function WaitingQueue() {
  const [queue, setQueue] = useState<QueuePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchQueueRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          id, queue_number, checked_in_at, session_name,
          player:user_profiles!queue_entries_player_id_fkey(
            id, full_name, skill_level, credits, rating, player_id
          )
        `)
        .eq('status', 'waiting')
        .order('queue_number', { ascending: true });

      if (error) {
        console.error('[WaitingQueue] fetchQueue error:', error.message);
        setFetchError('Failed to load queue. ' + error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setQueue([]);
        setLoading(false);
        return;
      }

      const mapped: QueuePlayer[] = data.map((entry: any) => {
        const checkedIn = new Date(entry.checked_in_at);
        const waitMinutes = Math.floor((Date.now() - checkedIn.getTime()) / 60000);
        return {
          id: entry.id,
          queueNumber: entry.queue_number,
          name: entry.player?.full_name || 'Unknown',
          skillLevel: (entry.player?.skill_level || 'beginner') as QueuePlayer['skillLevel'],
          credits: entry.player?.credits || 0,
          rating: entry.player?.rating || 1200,
          arrivalTime: checkedIn.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          waitMinutes: Math.max(0, waitMinutes),
          playerId: entry.player?.player_id || '',
          userId: entry.player?.id || '',
        };
      });

      setQueue(mapped);
    } catch (err: any) {
      console.error('[WaitingQueue] Unexpected error:', err?.message);
      setFetchError('Failed to load queue data.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Keep fetchQueueRef in sync so the stable realtime handler always calls the latest version
  useEffect(() => {
    fetchQueueRef.current = fetchQueue;
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();

    const subscribeToRealtime = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setConnectionStatus('connecting');

      const scheduleReconnect = () => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const attempt = reconnectAttemptRef.current;
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = setTimeout(() => {
          subscribeToRealtime();
        }, delay);
      };

      const channel = supabase
        .channel(`queue_realtime_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => {
          fetchQueueRef.current(true);
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttemptRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error');
            console.error('[WaitingQueue] Realtime error:', err);
            scheduleReconnect();
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    };

    subscribeToRealtime();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckIn = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast.info('Use the QR Check-in panel below to scan or enter a Player ID.');
    }, 800);
  };

  const handleAssignCourt = (player: QueuePlayer) => {
    if (player.credits <= 0) {
      toast.error(`${player.name} has no credits. Please purchase credits first.`);
      return;
    }
    toast.info(`Select an available court in the Court Grid to assign ${player.name}.`);
  };

  const handleRemove = async (entryId: string, playerName: string) => {
    const previousQueue = [...queue];
    setRemovingId(entryId);
    setQueue((prev) => prev.filter((p) => p.id !== entryId));

    try {
      const { error } = await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('id', entryId);

      if (error) {
        setQueue(previousQueue);
        console.error('[WaitingQueue] handleRemove error:', error.message);
        toast.error(`Failed to remove ${playerName} from queue.`);
        return;
      }

      toast.success(`${playerName} removed from queue`);
    } catch (err: any) {
      setQueue(previousQueue);
      console.error('[WaitingQueue] handleRemove unexpected error:', err?.message);
      toast.error('Failed to remove player. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAssignNext4 = async () => {
    const next4 = queue.slice(0, 4);
    if (next4.length === 0) {
      toast.error('No players in queue to assign.');
      return;
    }
    // Find first available court
    const { data: availableCourts } = await supabase
      .from('courts')
      .select('id, name')
      .eq('status', 'available')
      .limit(1);

    if (!availableCourts || availableCourts.length === 0) {
      toast.error('No available courts right now.');
      return;
    }

    const court = availableCourts[0];
    const playerIds = next4.map((p) => p.userId);

    try {
      const { data, error } = await supabase.rpc('assign_players_to_court', {
        p_court_id: court.id,
        p_player_a1_id: playerIds[0] || null,
        p_player_a2_id: playerIds[1] || null,
        p_player_b1_id: playerIds[2] || null,
        p_player_b2_id: playerIds[3] || null,
        p_session_name: 'Open Play',
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Assignment failed');

      toast.success(`${next4.map((p) => p.name.split(' ')[0]).join(', ')} assigned to ${court.name}!`);
      await fetchQueue(true);
    } catch (err: any) {
      console.error('[WaitingQueue] handleAssignNext4 error:', err?.message);
      toast.error('Failed to assign players: ' + (err?.message || 'Please try again.'));
    }
  };

  const connectionLabel = {
    connecting: 'Connecting...',
    connected: 'Live',
    disconnected: 'Reconnecting...',
    error: 'Retrying...',
  }[connectionStatus];

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Waiting Queue</h3>
            <div className="flex items-center gap-1">
              {connectionStatus === 'connected'
                ? <Wifi size={11} className="text-positive" />
                : connectionStatus === 'error'
                ? <AlertCircle size={11} className="text-negative" />
                : <WifiOff size={11} className="text-orange-400 animate-pulse" />
              }
              <span className={`text-2xs ${
                connectionStatus === 'connected' ? 'text-positive' :
                connectionStatus === 'error' ? 'text-negative' : 'text-orange-400'
              }`}>
                {connectionLabel}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{queue.length} players waiting · Session: Morning Open Play</p>
        </div>
        <button onClick={handleCheckIn} disabled={scanning} className="btn-primary text-xs py-2">
          {scanning ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scanning...
            </span>
          ) : (
            <>
              <QrCode size={14} />
              Scan Check-In
            </>
          )}
        </button>
      </div>

      {fetchError && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-negative/10 border border-negative/20 rounded-lg px-3 py-2 text-xs text-negative">
          <AlertCircle size={13} />
          {fetchError}
          <button onClick={() => fetchQueue()} className="ml-auto flex items-center gap-1 underline font-medium">
            <RefreshCw size={11} />
            Retry
          </button>
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2 border-b border-border bg-muted/30">
        {[
          { label: '#', span: 'col-span-1' },
          { label: 'Player', span: 'col-span-3' },
          { label: 'Skill', span: 'col-span-2' },
          { label: 'Credits', span: 'col-span-2' },
          { label: 'Rating', span: 'col-span-1' },
          { label: 'Wait', span: 'col-span-1' },
          { label: 'Actions', span: 'col-span-2 text-right' },
        ].map((h) => (
          <div
            key={`qh-${h.label}`}
            className={`text-2xs font-semibold text-muted-foreground uppercase tracking-wider ${h.span}`}
          >
            {h.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="px-5 py-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <UserCheck size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No players in queue</p>
          <p className="text-xs mt-1">Use Scan Check-In to add players</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {queue.map((player) => {
            const lowCredits = player.credits <= 2;
            const isRemoving = removingId === player.id;
            return (
              <div
                key={player.id}
                className={`grid grid-cols-12 gap-2 px-5 py-3 items-center table-row-hover transition-opacity ${
                  lowCredits ? 'bg-orange-50/50' : ''
                } ${isRemoving ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className="col-span-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${player.queueNumber <= 4 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {player.queueNumber}
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-foreground truncate">{player.name}</p>
                  <p className="text-2xs text-muted-foreground">{player.arrivalTime}</p>
                </div>
                <div className="col-span-2">
                  <StatusBadge status={player.skillLevel} size="sm" />
                </div>
                <div className="col-span-2">
                  <div className={`flex items-center gap-1 text-xs font-bold tabular-nums ${lowCredits ? 'text-orange-600' : 'text-foreground'}`}>
                    <CreditCard size={11} />
                    {player.credits}
                    {lowCredits && <span className="text-orange-500 text-2xs">⚠</span>}
                  </div>
                </div>
                <div className="col-span-1">
                  <span className="text-xs font-semibold tabular-nums text-foreground">{player.rating}</span>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Clock size={11} />
                    <span className="tabular-nums">{player.waitMinutes}m</span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <div className="relative group/assign">
                    <button
                      onClick={() => handleAssignCourt(player)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                      title="Assign to court"
                    >
                      <UserCheck size={14} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/assign:opacity-100 transition-opacity pointer-events-none z-10">
                      Assign to court
                    </div>
                  </div>
                  <div className="relative group/remove">
                    <button
                      onClick={() => handleRemove(player.id, player.name)}
                      disabled={isRemoving}
                      className="p-1.5 rounded-lg hover:bg-negative/10 hover:text-negative transition-colors text-muted-foreground"
                      title="Remove from queue"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/remove:opacity-100 transition-opacity pointer-events-none z-10">
                      Remove from queue
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-5 py-4 border-t border-border bg-muted/20">
        <button
          onClick={handleAssignNext4}
          disabled={queue.length === 0}
          className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserCheck size={16} />
          Assign Next 4 to Available Court
        </button>
      </div>
    </div>
  );
}