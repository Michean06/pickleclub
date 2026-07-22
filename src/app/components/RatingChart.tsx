'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RatingPoint {
  game: string;
  rating: number;
  result: 'W' | 'L';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-card-md px-3 py-2.5 text-sm">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">
          Rating: <span className="font-bold text-primary tabular-nums">{data.rating}</span>
        </p>
        <p className={`font-medium ${data.result === 'W' ? 'text-positive' : 'text-negative'}`}>
          {data.result === 'W' ? '✓ Win' : '✗ Loss'}
        </p>
      </div>
    );
  }
  return null;
};

export default function RatingChart() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingGain, setRatingGain] = useState(0);

  const fetchRatingHistory = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, winner_team, played_at,
          rating_change_a1, rating_change_a2, rating_change_b1, rating_change_b2,
          player_a1:user_profiles!matches_player_a1_id_fkey(id),
          player_a2:user_profiles!matches_player_a2_id_fkey(id),
          player_b1:user_profiles!matches_player_b1_id_fkey(id),
          player_b2:user_profiles!matches_player_b2_id_fkey(id)
        `)
        .or(`player_a1_id.eq.${profile.id},player_a2_id.eq.${profile.id},player_b1_id.eq.${profile.id},player_b2_id.eq.${profile.id}`)
        .order('played_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        setRatingHistory([]);
        setLoading(false);
        return;
      }

      // Reconstruct rating history by working backwards from current rating
      const currentRating = profile.rating ?? 1200;
      const changes: number[] = (data || []).map((m: any) => {
        const myId = profile.id;
        if (m.player_a1?.id === myId) return m.rating_change_a1 ?? 0;
        if (m.player_a2?.id === myId) return m.rating_change_a2 ?? 0;
        if (m.player_b1?.id === myId) return m.rating_change_b1 ?? 0;
        if (m.player_b2?.id === myId) return m.rating_change_b2 ?? 0;
        return 0;
      });

      // Build rating series from oldest to newest
      let runningRating = currentRating - changes.reduce((a, b) => a + b, 0);
      const points: RatingPoint[] = (data || []).map((m: any, idx: number) => {
        const myId = profile.id;
        const isTeamA = m.player_a1?.id === myId || m.player_a2?.id === myId;
        const isWinner = (isTeamA && m.winner_team === 'A') || (!isTeamA && m.winner_team === 'B');
        runningRating += changes[idx];
        return {
          game: `G${idx + 1}`,
          rating: Math.max(800, runningRating),
          result: isWinner ? 'W' : 'L',
        };
      });

      setRatingHistory(points);

      // Calculate gain over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentChanges = (data || [])
        .filter((m: any) => new Date(m.played_at) >= thirtyDaysAgo)
        .reduce((sum: number, m: any) => {
          const myId = profile.id;
          if (m.player_a1?.id === myId) return sum + (m.rating_change_a1 ?? 0);
          if (m.player_a2?.id === myId) return sum + (m.rating_change_a2 ?? 0);
          if (m.player_b1?.id === myId) return sum + (m.rating_change_b1 ?? 0);
          if (m.player_b2?.id === myId) return sum + (m.rating_change_b2 ?? 0);
          return sum;
        }, 0);
      setRatingGain(recentChanges);
    } catch (err: any) {
      console.error('[RatingChart] fetchRatingHistory error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.rating, supabase]);

  useEffect(() => {
    fetchRatingHistory();
  }, [fetchRatingHistory]);

  const currentRating = profile?.rating ?? 1200;
  const minRating = ratingHistory.length > 0 ? Math.min(...ratingHistory.map((r) => r.rating)) - 30 : currentRating - 100;
  const maxRating = ratingHistory.length > 0 ? Math.max(...ratingHistory.map((r) => r.rating)) + 30 : currentRating + 100;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Rating Trend</h3>
          <p className="text-xs text-muted-foreground">
            Last {ratingHistory.length} games · Current: {currentRating.toLocaleString()}
          </p>
        </div>
        {ratingGain !== 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${ratingGain > 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
            <span className="text-xs font-semibold">
              {ratingGain > 0 ? `+${ratingGain}` : ratingGain} pts this month
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : ratingHistory.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          <p className="text-sm">No match data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ratingHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="game"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(ratingHistory.length / 5) - 1)}
            />
            <YAxis
              domain={[minRating, maxRating]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={1500} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '1500', fill: 'var(--accent)', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`dot-${payload.game}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.result === 'W' ? 'var(--primary)' : 'var(--negative)'}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}