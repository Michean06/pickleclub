import React from 'react';
import { Trophy, Target, TrendingDown, Percent, Clock, Flame } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface StatItem {
  id: string;
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface PlayerStatGridProps {
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    courtHours: number;
    currentStreak: number;
    longestStreak: number;
    rating: number;
  };
}

export default function PlayerStatGrid({ stats }: PlayerStatGridProps) {
  const statItems: StatItem[] = [
    {
      id: 'stat-games',
      label: 'Games Played',
      value: stats.gamesPlayed,
      sub: 'all time',
      icon: Target,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
      trend: 'up',
      trendValue: '+4 this week',
    },
    {
      id: 'stat-wins',
      label: 'Total Wins',
      value: stats.wins,
      sub: 'all time',
      icon: Trophy,
      color: 'text-primary',
      iconBg: 'bg-primary/10',
      trend: 'up',
      trendValue: '+3 this week',
    },
    {
      id: 'stat-losses',
      label: 'Total Losses',
      value: stats.losses,
      sub: 'all time',
      icon: TrendingDown,
      color: 'text-negative',
      iconBg: 'bg-negative/10',
      trend: 'neutral',
      trendValue: '+1 this week',
    },
    {
      id: 'stat-winrate',
      label: 'Win Rate',
      value: `${stats.winRate}%`,
      sub: 'overall',
      icon: Percent,
      color: stats.winRate >= 50 ? 'text-primary' : 'text-negative',
      iconBg: stats.winRate >= 50 ? 'bg-primary/10' : 'bg-negative/10',
      trend: stats.winRate >= 50 ? 'up' : 'down',
      trendValue: '+1.2% vs last month',
    },
    {
      id: 'stat-hours',
      label: 'Court Hours',
      value: `${stats.courtHours}h`,
      sub: 'total playtime',
      icon: Clock,
      color: 'text-purple-600',
      iconBg: 'bg-purple-50',
      trend: 'up',
      trendValue: '+2.5h this week',
    },
    {
      id: 'stat-streak',
      label: 'Current Streak',
      value: stats.currentStreak,
      sub: `Best: ${stats.longestStreak} games`,
      icon: Flame,
      color: stats.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground',
      iconBg: stats.currentStreak > 0 ? 'bg-orange-50' : 'bg-muted',
      trend: stats.currentStreak > 0 ? 'up' : 'neutral',
      trendValue: stats.currentStreak > 0 ? `${stats.currentStreak} wins in a row` : 'No active streak',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="stat-card shadow-card hover:shadow-card-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                <Icon size={18} className={item.color} />
              </div>
            </div>
            <div>
              <div className={`text-2xl font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">{item.label}</p>
              {item.trendValue && (
                <p className={`text-2xs mt-1 font-medium ${item.trend === 'up' ? 'text-positive' : item.trend === 'down' ? 'text-negative' : 'text-muted-foreground'}`}>
                  {item.trendValue}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}