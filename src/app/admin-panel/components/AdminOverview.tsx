'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, CreditCard, Layers, Trophy } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const creditSalesData = [
  { day: 'Jul 16', credits: 62, revenue: 2790 },
  { day: 'Jul 17', credits: 88, revenue: 3960 },
  { day: 'Jul 18', credits: 74, revenue: 3330 },
  { day: 'Jul 19', credits: 95, revenue: 4275 },
  { day: 'Jul 20', credits: 51, revenue: 2295 },
  { day: 'Jul 21', credits: 110, revenue: 4950 },
  { day: 'Jul 22', credits: 87, revenue: 3915 },
];

const courtUtilizationData = [
  { hour: '7 AM', court1: 0, court2: 0, court3: 0, court4: 0 },
  { hour: '8 AM', court1: 60, court2: 45, court3: 80, court4: 30 },
  { hour: '9 AM', court1: 100, court2: 100, court3: 100, court4: 90 },
  { hour: '10 AM', court1: 100, court2: 100, court3: 100, court4: 100 },
  { hour: '11 AM', court1: 90, court2: 80, court3: 100, court4: 70 },
  { hour: '12 PM', court1: 60, court2: 55, court3: 70, court4: 50 },
  { hour: '1 PM', court1: 40, court2: 30, court3: 50, court4: 35 },
  { hour: '2 PM', court1: 80, court2: 75, court3: 85, court4: 60 },
  { hour: '3 PM', court1: 100, court2: 90, court3: 100, court4: 80 },
  { hour: '4 PM', court1: 95, court2: 100, court3: 90, court4: 100 },
  { hour: '5 PM', court1: 70, court2: 65, court3: 80, court4: 55 },
  { hour: '6 PM', court1: 40, court2: 30, court3: 50, court4: 25 },
];

const topPlayers = [
  { id: 'top-p001', rank: 1, name: 'Angela Torres', rating: 1642, wins: 148, winRate: 74.4, skill: 'Pro' },
  { id: 'top-p002', rank: 2, name: 'Kim Ong', rating: 1598, wins: 132, winRate: 71.0, skill: 'Advanced' },
  { id: 'top-p003', rank: 3, name: 'Maria Santos', rating: 1489, wins: 119, winRate: 68.4, skill: 'Advanced' },
  { id: 'top-p004', rank: 4, name: 'Juan Dela Cruz', rating: 1515, wins: 91, winRate: 62.8, skill: 'Advanced' },
  { id: 'top-p005', rank: 5, name: 'Jose Ramos', rating: 1423, wins: 87, winRate: 60.4, skill: 'Intermediate' },
];

const overviewKPIs = [
  { id: 'kpi-rev', label: 'Revenue Today', value: '₱3,915', sub: '+18% vs yesterday', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', trend: 'up' },
  { id: 'kpi-members', label: 'Total Members', value: '247', sub: '+3 new this week', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'up' },
  { id: 'kpi-credits-sold', label: 'Credits Sold Today', value: '87', sub: '₱45/avg per player', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'up' },
  { id: 'kpi-util', label: 'Court Utilization', value: '78%', sub: '⚠ Court 6 offline', icon: Layers, color: 'text-warning', bg: 'bg-warning/10', trend: 'warning' },
  { id: 'kpi-matches', label: 'Matches This Week', value: '94', sub: '+12 vs last week', icon: Trophy, color: 'text-positive', bg: 'bg-positive/10', trend: 'up' },
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

export default function AdminOverview() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards — 5 cards: grid-cols-5 */}
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
                <p className={`text-2xs mt-0.5 ${kpi.trend === 'warning' ? 'text-warning font-semibold' : 'text-positive'}`}>{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Revenue / credits sold */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Credit Sales — Last 7 Days</h3>
              <p className="text-xs text-muted-foreground">Total: 567 credits · ₱25,515 revenue</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={creditSalesData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="creditsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="credits" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area yAxisId="credits" type="monotone" dataKey="credits" name="Credits Sold" stroke="var(--accent)" fill="url(#creditsGrad)" strokeWidth={2} dot={false} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="var(--primary)" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Court utilization */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Court Utilization by Hour</h3>
              <p className="text-xs text-muted-foreground">Today · % of time occupied per court</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={courtUtilizationData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="court1" name="Court 1" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={8} />
              <Bar dataKey="court2" name="Court 2" fill="var(--accent)" radius={[2, 2, 0, 0]} maxBarSize={8} />
              <Bar dataKey="court3" name="Court 3" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={8} />
              <Bar dataKey="court4" name="Court 4" fill="#06b6d4" radius={[2, 2, 0, 0]} maxBarSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
              {topPlayers.map((player) => (
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
                      player.skill === 'Pro' ? 'badge-skill-pro' :
                      player.skill === 'Advanced'? 'badge-skill-advanced' : 'badge-skill-intermediate'
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