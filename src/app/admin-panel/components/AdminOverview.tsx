'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, CreditCard, Layers, Trophy, Loader2 } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface TopPlayer {
  id: string;
  rank: number;
  name: string;
  rating: number;
  wins: number;
  winRate: number;
  skill: string;
}

export default function AdminOverview() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [creditsSoldToday, setCreditsSoldToday] = useState(0);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);

        // Fetch top players
        const { data: playersData } = await supabase
          .from('user_profiles')
          .select('*')
          .order('rating', { ascending: false })
          .limit(5);

        if (playersData) {
          const mapped = playersData.map((p: any, idx: number) => ({
            id: p.id,
            rank: idx + 1,
            name: p.full_name || 'Unknown',
            rating: p.rating || 1200,
            wins: p.wins || 0,
            winRate: p.games_played ? Math.round((p.wins / p.games_played) * 100 * 10) / 10 : 0,
            skill: p.skill_level || 'beginner',
          }));
          setTopPlayers(mapped);
        }

        // Fetch total members count
        const { count: membersCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });
        setTotalMembers(membersCount || 0);

        // Fetch today's credit transactions
        const today = new Date().toISOString().split('T')[0];
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('credits_delta')
          .gte('created_at', today);

        if (transactions) {
          const totalCredits = transactions.reduce((sum, t) => sum + (t.credits_delta || 0), 0);
          setCreditsSoldToday(totalCredits);
          // Rough revenue estimate (₱45 per credit average)
          setRevenueToday(totalCredits * 45);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const overviewKPIs = [
    { id: 'kpi-rev', label: 'Revenue Today', value: `₱${revenueToday.toLocaleString()}`, sub: 'Estimated', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', trend: 'up' },
    { id: 'kpi-members', label: 'Total Members', value: totalMembers.toString(), sub: 'Registered players', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'up' },
    { id: 'kpi-credits-sold', label: 'Credits Sold Today', value: creditsSoldToday.toString(), sub: 'Total credits', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'up' },
    { id: 'kpi-util', label: 'Court Utilization', value: 'N/A', sub: 'Real-time data', icon: Layers, color: 'text-muted-foreground', bg: 'bg-muted/50', trend: 'neutral' },
    { id: 'kpi-matches', label: 'Matches This Week', value: 'N/A', sub: 'From match history', icon: Trophy, color: 'text-muted-foreground', bg: 'bg-muted/50', trend: 'neutral' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-card-md px-3 py-2.5 text-sm">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((entry: any) => (
            <p key={`tt-${entry.name}`} style={{ color: entry.color }} className="text-xs">
              {entry.name}: <span className="font-bold">{entry.name === 'revenue' ? `₱${entry.value.toLocaleString()}` : entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {overviewKPIs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className={`stat-card shadow-card ${kpi.trend === 'warning' ? 'border-warning/30 bg-warning/5' : ''}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                <Icon size={18} className={kpi.color} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold tabular-nums ${kpi.color}`}>{kpi.value}</div>
                <p className="text-xs font-semibold text-muted-foreground">{kpi.label}</p>
                <p className={`text-2xs mt-0.5 ${kpi.trend === 'warning' ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top players leaderboard */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Top Players — All-Time Leaderboard</h3>
            <p className="text-xs text-muted-foreground">Ranked by ELO rating</p>
          </div>
          <Trophy size={18} className="text-accent" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Rank', 'Player', 'Skill', 'Rating', 'Wins', 'Win Rate'].map((h) => (
                  <th key={`lboard-${h}`} className="text-left px-5 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <p className="text-xs text-muted-foreground">No players found</p>
                  </td>
                </tr>
              ) : topPlayers.map((player) => (
                <tr key={player.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      player.rank === 1 ? 'bg-amber-100 text-amber-600' :
                      player.rank === 2 ? 'bg-slate-100 text-slate-600' :
                      player.rank === 3 ? 'bg-orange-100 text-orange-600': 'bg-muted text-muted-foreground'
                    }`}>
                      {player.rank}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">{player.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      player.skill === 'pro' ? 'badge-skill-pro' :
                      player.skill === 'advanced'? 'badge-skill-advanced' : 'badge-skill-intermediate'
                    }`}>
                      {player.skill}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold tabular-nums text-foreground">{player.rating}</td>
                  <td className="px-5 py-3 tabular-nums text-foreground">{player.wins}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">{player.winRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
