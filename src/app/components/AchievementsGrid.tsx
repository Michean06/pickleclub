'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Flame, Star, Zap, Target, Clock, Users, Award, Shield, TrendingUp, Crown, Heart, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


interface Achievement {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  key: string;
}

const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedDate'>[] = [
  { id: 'ach-first-win', key: 'first_win', icon: Trophy, name: 'First Win', description: 'Win your very first match', rarity: 'common' },
  { id: 'ach-10-wins', key: '10_wins', icon: Flame, name: '10 Wins', description: 'Accumulate 10 total wins', rarity: 'common' },
  { id: 'ach-50-wins', key: '50_wins', icon: Star, name: '50 Wins', description: 'Accumulate 50 total wins', rarity: 'rare' },
  { id: 'ach-100-games', key: '100_games', icon: Target, name: '100 Games', description: 'Play 100 games total', rarity: 'rare' },
  { id: 'ach-streak-5', key: 'streak_5', icon: Zap, name: '5-Game Streak', description: 'Win 5 games in a row', rarity: 'rare' },
  { id: 'ach-streak-10', key: 'streak_10', icon: Crown, name: '10-Game Streak', description: 'Win 10 games in a row', rarity: 'epic' },
  { id: 'ach-court-hours-10', key: 'court_hours_10', icon: Clock, name: '10 Court Hours', description: 'Log 10 hours on court', rarity: 'common' },
  { id: 'ach-court-hours-50', key: 'court_hours_50', icon: Clock, name: '50 Court Hours', description: 'Log 50 hours on court', rarity: 'rare' },
  { id: 'ach-social', key: 'team_player', icon: Users, name: 'Team Player', description: 'Play with 10 different partners', rarity: 'common' },
  { id: 'ach-advanced', key: 'advanced_rank', icon: TrendingUp, name: 'Advanced Rank', description: 'Reach Advanced skill level', rarity: 'epic' },
  { id: 'ach-1500', key: 'rating_1500', icon: Shield, name: 'Rating 1500+', description: 'Achieve a rating above 1500', rarity: 'epic' },
  { id: 'ach-faithful', key: 'club_regular', icon: Heart, name: 'Club Regular', description: 'Play every week for a month', rarity: 'rare' },
  { id: 'ach-200-games', key: '200_games', icon: Target, name: '200 Games', description: 'Play 200 games total', rarity: 'epic' },
  { id: 'ach-100-wins', key: '100_wins', icon: Trophy, name: '100 Wins', description: 'Accumulate 100 total wins', rarity: 'epic' },
  { id: 'ach-1600', key: 'rating_1600', icon: Crown, name: 'Rating 1600+', description: 'Achieve a rating above 1600', rarity: 'legendary' },
  { id: 'ach-pro-rank', key: 'pro_rank', icon: Award, name: 'Pro Rank', description: 'Reach Pro skill level', rarity: 'legendary' },
];

const rarityConfig = {
  common: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
  rare: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-600' },
  epic: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-600' },
  legendary: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-600' },
};

export default function AchievementsGrid() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_key, unlocked_at')
        .eq('player_id', profile.id);

      if (error) throw error;

      const unlockedMap: Record<string, string> = {};
      (data || []).forEach((a: any) => {
        unlockedMap[a.achievement_key] = a.unlocked_at;
      });

      // Also check profile stats for auto-unlock logic
      const profileStats = {
        wins: profile.wins ?? 0,
        games_played: profile.games_played ?? 0,
        court_hours: profile.court_hours ?? 0,
        rating: profile.rating ?? 1200,
        skill_level: profile.skill_level ?? 'beginner',
        longest_streak: profile.longest_streak ?? 0,
      };

      // Derive unlocked state from DB achievements + profile stats
      const merged: Achievement[] = ALL_ACHIEVEMENTS.map((ach) => {
        let unlocked = !!unlockedMap[ach.key];
        // Fallback: derive from profile stats if not in DB yet
        if (!unlocked) {
          if (ach.key === 'first_win' && profileStats.wins >= 1) unlocked = true;
          if (ach.key === '10_wins' && profileStats.wins >= 10) unlocked = true;
          if (ach.key === '50_wins' && profileStats.wins >= 50) unlocked = true;
          if (ach.key === '100_wins' && profileStats.wins >= 100) unlocked = true;
          if (ach.key === '100_games' && profileStats.games_played >= 100) unlocked = true;
          if (ach.key === '200_games' && profileStats.games_played >= 200) unlocked = true;
          if (ach.key === 'streak_5' && profileStats.longest_streak >= 5) unlocked = true;
          if (ach.key === 'streak_10' && profileStats.longest_streak >= 10) unlocked = true;
          if (ach.key === 'court_hours_10' && profileStats.court_hours >= 10) unlocked = true;
          if (ach.key === 'court_hours_50' && profileStats.court_hours >= 50) unlocked = true;
          if (ach.key === 'rating_1500' && profileStats.rating >= 1500) unlocked = true;
          if (ach.key === 'rating_1600' && profileStats.rating >= 1600) unlocked = true;
          if (ach.key === 'advanced_rank' && ['advanced', 'pro'].includes(profileStats.skill_level)) unlocked = true;
          if (ach.key === 'pro_rank' && profileStats.skill_level === 'pro') unlocked = true;
        }

        const unlockedAt = unlockedMap[ach.key];
        return {
          ...ach,
          unlocked,
          unlockedDate: unlockedAt
            ? new Date(unlockedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
            : undefined,
        };
      });

      setAchievements(merged);
    } catch (err: any) {
      console.error('[AchievementsGrid] fetchAchievements error:', err?.message);
      // Fallback: derive from profile stats only
      const merged: Achievement[] = ALL_ACHIEVEMENTS.map((ach) => ({
        ...ach,
        unlocked: false,
      }));
      setAchievements(merged);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.wins, profile?.games_played, profile?.rating, profile?.skill_level, profile?.longest_streak, profile?.court_hours, supabase]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-card flex items-center justify-center h-32">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Achievements</h3>
          <p className="text-xs text-muted-foreground">{unlockedCount} of {achievements.length} unlocked</p>
        </div>
        <div className="bg-accent/10 text-accent px-3 py-1 rounded-full">
          <span className="text-xs font-bold">{unlockedCount} / {achievements.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-5 overflow-hidden">
        <div
          className="h-full gradient-green rounded-full transition-all duration-500"
          style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
        />
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {achievements.map((ach) => {
          const Icon = ach.icon;
          const cfg = rarityConfig[ach.rarity];
          const isHovered = hoveredId === ach.id;
          return (
            <div
              key={ach.id}
              className="relative"
              onMouseEnter={() => setHoveredId(ach.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={`
                w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-default transition-all duration-150
                ${ach.unlocked ? `${cfg.bg} ${cfg.border} hover:shadow-card-md` : 'bg-muted/40 border-border opacity-50'}
              `}>
                <Icon size={22} className={ach.unlocked ? cfg.icon : 'text-muted-foreground'} />
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-44 bg-foreground text-primary-foreground rounded-lg shadow-card-lg p-3 pointer-events-none fade-in">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-bold">{ach.name}</p>
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-semibold ${ach.unlocked ? cfg.badge : 'bg-slate-700 text-slate-300'}`}>
                      {ach.rarity}
                    </span>
                  </div>
                  <p className="text-2xs text-white/70 leading-relaxed">{ach.description}</p>
                  {ach.unlocked && ach.unlockedDate && (
                    <p className="text-2xs text-white/50 mt-1">Unlocked {ach.unlockedDate}</p>
                  )}
                  {!ach.unlocked && (
                    <p className="text-2xs text-white/50 mt-1">🔒 Not yet unlocked</p>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}