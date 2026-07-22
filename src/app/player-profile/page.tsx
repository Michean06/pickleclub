'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import PlayerStatGrid from '@/app/components/PlayerStatGrid';
import RatingChart from '@/app/components/RatingChart';
import MatchHistoryTable from '@/app/components/MatchHistoryTable';
import AchievementsGrid from '@/app/components/AchievementsGrid';
import PlayerWalletCard from '@/app/components/PlayerWalletCard';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Camera, Shield, Star, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

const skillColors: Record<string, { bg: string; text: string; dot: string }> = {
  beginner: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  intermediate: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  advanced: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
  pro: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
};

type ProfileTab = 'overview' | 'history' | 'achievements';

const tabs: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'Match History' },
  { id: 'achievements', label: 'Achievements' },
];

export default function PlayerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setNameInput(profile.full_name);
  }, [profile?.full_name]);

  const handleSaveName = useCallback(async () => {
    if (!profile?.id || !nameInput.trim() || nameInput.trim() === profile.full_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: nameInput.trim() })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err: any) {
      console.error('[PlayerProfile] saveName error:', err?.message);
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }, [profile?.id, profile?.full_name, nameInput, supabase, refreshProfile]);

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const skillCfg = skillColors[profile.skill_level] ?? skillColors.beginner;
  const winRate = profile.games_played > 0 ? Math.round((profile.wins / profile.games_played) * 100) : 0;
  const memberSince = profile.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : '—';

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const stats = {
    gamesPlayed: profile.games_played ?? 0,
    wins: profile.wins ?? 0,
    losses: profile.losses ?? 0,
    winRate,
    courtHours: profile.court_hours ?? 0,
    currentStreak: profile.current_streak ?? 0,
    longestStreak: profile.longest_streak ?? 0,
    rating: profile.rating ?? 1200,
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Profile Hero */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Banner */}
          <div className="h-28 gradient-green relative">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />
          </div>

          {/* Avatar + info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl gradient-green border-4 border-card shadow-card-md flex items-center justify-center">
                  <span className="text-white text-2xl font-extrabold">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <Camera size={11} className="text-muted-foreground" />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                        className="text-xl font-extrabold text-foreground bg-muted border border-primary/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                      </button>
                      <button onClick={() => setEditingName(false)} className="px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-extrabold text-foreground">{profile.full_name}</h1>
                      {nameSaved && <CheckCircle2 size={16} className="text-positive" />}
                      <button onClick={() => setEditingName(true)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                        <Edit2 size={13} className="text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${skillCfg.bg} ${skillCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${skillCfg.dot}`} />
                    {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield size={12} />
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    Member since {memberSince}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star size={12} className="text-amber-500" />
                    <span className="font-semibold text-foreground tabular-nums">{profile.rating}</span> rating
                  </span>
                </div>
              </div>

              {/* Player ID badge */}
              {profile.player_id && (
                <div className="flex-shrink-0 bg-muted/60 border border-border rounded-xl px-4 py-2.5 text-center">
                  <p className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Player ID</p>
                  <p className="font-mono text-sm font-bold text-foreground">{profile.player_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        {profile.player_id && (
          <PlayerWalletCard
            credits={profile.credits ?? 0}
            playerId={profile.player_id}
            playerName={profile.full_name}
          />
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={`profile-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="fade-in" key={activeTab}>
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              <PlayerStatGrid stats={stats} />
              <RatingChart />
            </div>
          )}
          {activeTab === 'history' && <MatchHistoryTable />}
          {activeTab === 'achievements' && <AchievementsGrid />}
        </div>
      </div>
    </AppLayout>
  );
}
