'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Star, Zap, TrendingUp, RefreshCw, Medal, Crown, Award, BarChart2, Target, Activity, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend,
} from 'recharts';

type SortKey = 'rating' | 'wins' | 'games_played';
type AnalyticsTab = 'overview' | 'distribution' | 'trends';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  player_id: string | null;
  skill_level: string;
  rating: number;
  wins: number;
  losses: number;
  games_played: number;
  current_streak: number;
  win_rate: number;
  rank: number;
}

const SKILL_COLORS: Record<string, string> = {
  beginner: 'bg-slate-100 text-slate-600',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-violet-100 text-violet-700',
  pro: 'bg-amber-100 text-amber-700',
};

const RANK_ICONS = [
  { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50' },
  { icon: Award, color: 'text-orange-400', bg: 'bg-orange-50' },
];

const TABS: { key: SortKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'rating', label: 'Rating', icon: Star, description: 'Ranked by ELO rating' },
  { key: 'wins', label: 'Wins', icon: Trophy, description: 'Ranked by total wins' },
  { key: 'games_played', label: 'Games', icon: Zap, description: 'Ranked by games played' },
];

const ANALYTICS_TABS: { key: AnalyticsTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart2 },
  { key: 'distribution', label: 'Skill Distribution', icon: Target },
  { key: 'trends', label: 'Rating Trends', icon: Activity },
];

// Mock analytics data
const TOP10_WINS_DATA = [
  { name: 'Alex R.', wins: 87 },
  { name: 'Maria S.', wins: 81 },
  { name: 'Juan D.', wins: 76 },
  { name: 'Carla M.', wins: 72 },
  { name: 'Paolo T.', wins: 68 },
  { name: 'Lena V.', wins: 65 },
  { name: 'Marco B.', wins: 61 },
  { name: 'Sofia A.', wins: 58 },
  { name: 'Diego F.', wins: 54 },
  { name: 'Nina C.', wins: 51 },
];

const SKILL_DIST_DATA = [
  { skill: 'Beginner', count: 34, fill: '#94a3b8' },
  { skill: 'Intermediate', count: 58, fill: '#3b82f6' },
  { skill: 'Advanced', count: 27, fill: '#9333ea' },
  { skill: 'Pro', count: 11, fill: '#f59e0b' },
];

const RATING_TREND_DATA = [
  { month: 'Feb', avg: 1180, top: 1620, bottom: 820 },
  { month: 'Mar', avg: 1195, top: 1650, bottom: 830 },
  { month: 'Apr', avg: 1210, top: 1680, bottom: 840 },
  { month: 'May', avg: 1225, top: 1710, bottom: 850 },
  { month: 'Jun', avg: 1248, top: 1740, bottom: 860 },
  { month: 'Jul', avg: 1262, top: 1780, bottom: 870 },
];

const RADAR_DATA = [
  { subject: 'Win Rate', A: 82, B: 65, fullMark: 100 },
  { subject: 'Games', A: 90, B: 55, fullMark: 100 },
  { subject: 'Streak', A: 75, B: 40, fullMark: 100 },
  { subject: 'Rating', A: 88, B: 60, fullMark: 100 },
  { subject: 'Consistency', A: 70, B: 72, fullMark: 100 },
];

const ANALYTICS_KPI = [
  { label: 'Active Players', value: '130', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Avg Rating', value: '1,262', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Avg Win Rate', value: '54%', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Avg Games', value: '38', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
];

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SortKey>('rating');
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('overview');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, player_id, skill_level, rating, wins, losses, games_played, current_streak')
        .eq('role', 'player')
        .eq('is_active', true)
        .order(activeTab, { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const mapped: LeaderboardEntry[] = (data || []).map((p: any, idx: number) => ({
        ...p,
        win_rate: p.games_played > 0 ? Math.round((p.wins / p.games_played) * 100) : 0,
        rank: idx + 1,
      }));

      setEntries(mapped);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [supabase, activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    const channel = supabase
      .channel('rt-leaderboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, () => { fetchLeaderboard(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchLeaderboard]);

  const myEntry = entries.find((e) => e.id === profile?.id);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Trophy size={24} className="text-amber-500" />
              Player Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Top players ranked by performance · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className={`btn-secondary text-xs gap-2 ${showAnalytics ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
            >
              <BarChart2 size={14} />
              Analytics
            </button>
            <button
              onClick={() => { setLoading(true); fetchLeaderboard(); }}
              disabled={loading}
              className="btn-secondary text-xs gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* My rank card */}
        {myEntry && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-green flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-lg">#{myEntry.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Your Ranking</p>
              <p className="text-base font-extrabold text-foreground truncate">{myEntry.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {myEntry.rating} rating · {myEntry.wins}W / {myEntry.losses}L · {myEntry.win_rate}% win rate
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${SKILL_COLORS[myEntry.skill_level] || 'bg-slate-100 text-slate-600'}`}>
                {myEntry.skill_level}
              </span>
              {myEntry.current_streak > 1 && (
                <span className="text-xs font-semibold text-positive flex items-center gap-1">
                  <TrendingUp size={12} />
                  {myEntry.current_streak} streak
                </span>
              )}
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden fade-in">
            {/* Analytics KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border">
              {ANALYTICS_KPI.map((kpi) => {
                const KpiIcon = kpi.icon;
                return (
                  <div key={kpi.label} className="flex items-center gap-3 px-5 py-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
                      <KpiIcon size={16} className={kpi.color} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-foreground tabular-nums">{kpi.value}</p>
                      <p className="text-2xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Analytics sub-tabs */}
            <div className="flex gap-1 p-3 border-b border-border bg-muted/20">
              {ANALYTICS_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = analyticsTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setAnalyticsTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TabIcon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Chart area */}
            <div className="p-5">
              {analyticsTab === 'overview' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top 10 Players by Wins</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={TOP10_WINS_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ fontWeight: 700 }}
                      />
                      <Bar dataKey="wins" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {analyticsTab === 'distribution' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Players by Skill Level</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={SKILL_DIST_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="skill" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {SKILL_DIST_DATA.map((entry, index) => (
                            <rect key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top vs Avg Player Profile</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={RADAR_DATA}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                        <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                        <Radar name="Top Player" dataKey="A" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} />
                        <Radar name="Avg Player" dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {analyticsTab === 'trends' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating Trends (6 Months)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={RATING_TREND_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="top" stroke="#f59e0b" strokeWidth={2} dot={false} name="Top Rating" />
                      <Line type="monotone" dataKey="avg" stroke="#16a34a" strokeWidth={2} dot={false} name="Avg Rating" />
                      <Line type="monotone" dataKey="bottom" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Bottom Rating" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sort Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-negative/10 border border-negative/20 rounded-xl px-4 py-3 text-sm text-negative">{error}</div>
        )}

        {/* Leaderboard table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="grid grid-cols-[48px_1fr_80px_80px_80px_80px] gap-0 px-4 py-3 border-b border-border bg-muted/30">
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-center">#</div>
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">Player</div>
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-right">Rating</div>
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-right">W/L</div>
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Win%</div>
            <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Games</div>
          </div>

          {loading && (
            <div className="flex flex-col divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[48px_1fr_80px_80px_80px_80px] gap-0 px-4 py-3.5 animate-pulse">
                  <div className="h-6 w-6 bg-muted rounded-lg mx-auto" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex-shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3 w-28 bg-muted rounded" />
                      <div className="h-2.5 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-12 bg-muted rounded ml-auto" />
                  <div className="h-3 w-12 bg-muted rounded ml-auto" />
                  <div className="h-3 w-10 bg-muted rounded ml-auto hidden sm:block" />
                  <div className="h-3 w-10 bg-muted rounded ml-auto hidden sm:block" />
                </div>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Trophy size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No players found</p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="flex flex-col divide-y divide-border">
              {entries.map((entry) => {
                const isMe = entry.id === profile?.id;
                const rankMeta = RANK_ICONS[entry.rank - 1];
                const initials = entry.full_name
                  ? entry.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                  : '??';

                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-[48px_1fr_80px_80px_80px_80px] gap-0 px-4 py-3.5 transition-colors duration-100 ${
                      isMe ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {rankMeta ? (
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${rankMeta.bg}`}>
                          <rankMeta.icon size={15} className={rankMeta.color} />
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground w-7 text-center">{entry.rank}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                            {entry.full_name}
                            {isMe && <span className="ml-1 text-2xs font-bold text-primary">(You)</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${SKILL_COLORS[entry.skill_level] || 'bg-slate-100 text-slate-600'}`}>
                            {entry.skill_level}
                          </span>
                          {entry.current_streak >= 3 && (
                            <span className="text-2xs text-positive font-semibold flex items-center gap-0.5">
                              <TrendingUp size={10} />
                              {entry.current_streak}
                            </span>
                          )}
                          {entry.player_id && (
                            <span className="text-2xs text-muted-foreground font-mono hidden sm:inline">{entry.player_id}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <span className={`text-sm font-bold tabular-nums ${activeTab === 'rating' ? 'text-primary' : 'text-foreground'}`}>
                        {entry.rating}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="text-xs font-semibold tabular-nums">
                        <span className="text-positive">{entry.wins}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-negative">{entry.losses}</span>
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center justify-end">
                      <span className={`text-sm font-semibold tabular-nums ${activeTab === 'wins' ? 'text-primary' : 'text-foreground'}`}>
                        {entry.win_rate}%
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center justify-end">
                      <span className={`text-sm font-semibold tabular-nums ${activeTab === 'games_played' ? 'text-primary' : 'text-foreground'}`}>
                        {entry.games_played}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loading && entries.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Showing top {entries.length} active players · Updates in real-time
          </p>
        )}
      </div>
    </AppLayout>
  );
}
