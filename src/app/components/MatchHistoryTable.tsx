'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronLeft, ChevronRight, Filter, Loader2, Search, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MatchRecord {
  id: string;
  date: string;
  time: string;
  court: string;
  partner: string;
  opponents: string;
  score: string;
  result: 'win' | 'loss';
  duration: string;
  ratingChange: number;
  playedAt: Date;
}

interface Filters {
  result: 'all' | 'win' | 'loss';
  court: string;
  playerSearch: string;
  dateFrom: string;
  dateTo: string;
}

export default function MatchHistoryTable() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    result: 'all',
    court: 'all',
    playerSearch: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 7;

  const fetchMatches = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, winner_team, score_a, score_b, duration_minutes, played_at,
          rating_change_a1, rating_change_a2, rating_change_b1, rating_change_b2,
          court:courts!matches_court_id_fkey(name),
          player_a1:user_profiles!matches_player_a1_id_fkey(id, full_name),
          player_a2:user_profiles!matches_player_a2_id_fkey(id, full_name),
          player_b1:user_profiles!matches_player_b1_id_fkey(id, full_name),
          player_b2:user_profiles!matches_player_b2_id_fkey(id, full_name)
        `)
        .or(`player_a1_id.eq.${profile.id},player_a2_id.eq.${profile.id},player_b1_id.eq.${profile.id},player_b2_id.eq.${profile.id}`)
        .order('played_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mapped: MatchRecord[] = (data || []).map((m: any) => {
        const myId = profile.id;
        const isTeamA = m.player_a1?.id === myId || m.player_a2?.id === myId;
        const isWinner = (isTeamA && m.winner_team === 'A') || (!isTeamA && m.winner_team === 'B');

        let partner = '';
        if (isTeamA) {
          const p = m.player_a1?.id === myId ? m.player_a2 : m.player_a1;
          partner = p?.full_name || '—';
        } else {
          const p = m.player_b1?.id === myId ? m.player_b2 : m.player_b1;
          partner = p?.full_name || '—';
        }

        const opp1 = isTeamA ? m.player_b1?.full_name : m.player_a1?.full_name;
        const opp2 = isTeamA ? m.player_b2?.full_name : m.player_a2?.full_name;
        const opponents = [opp1, opp2].filter(Boolean).join(' & ') || '—';

        let ratingChange = 0;
        if (m.player_a1?.id === myId) ratingChange = m.rating_change_a1 ?? 0;
        else if (m.player_a2?.id === myId) ratingChange = m.rating_change_a2 ?? 0;
        else if (m.player_b1?.id === myId) ratingChange = m.rating_change_b1 ?? 0;
        else if (m.player_b2?.id === myId) ratingChange = m.rating_change_b2 ?? 0;

        const playedAt = new Date(m.played_at);
        return {
          id: m.id,
          date: playedAt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: playedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          court: m.court?.name || '—',
          partner,
          opponents,
          score: isTeamA ? `${m.score_a}–${m.score_b}` : `${m.score_b}–${m.score_a}`,
          result: isWinner ? 'win' : 'loss',
          duration: `${m.duration_minutes ?? 0} min`,
          ratingChange,
          playedAt,
        };
      });

      setMatchHistory(mapped);
    } catch (err: any) {
      console.error('[MatchHistoryTable] fetchMatches error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Unique courts for filter dropdown
  const uniqueCourts = Array.from(new Set(matchHistory.map((m) => m.court).filter((c) => c !== '—')));

  // Apply all filters
  const filtered = matchHistory.filter((m) => {
    if (filters.result !== 'all' && m.result !== filters.result) return false;
    if (filters.court !== 'all' && m.court !== filters.court) return false;
    if (filters.playerSearch.trim()) {
      const q = filters.playerSearch.toLowerCase();
      if (!m.partner.toLowerCase().includes(q) && !m.opponents.toLowerCase().includes(q)) return false;
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      if (m.playedAt < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      if (m.playedAt > to) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const activeFilterCount = [
    filters.result !== 'all',
    filters.court !== 'all',
    filters.playerSearch.trim() !== '',
    filters.dateFrom !== '',
    filters.dateTo !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilters({ result: 'all', court: 'all', playerSearch: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Match History</h3>
          <p className="text-xs text-muted-foreground">
            {filtered.length !== matchHistory.length
              ? `${filtered.length} of ${matchHistory.length} matches`
              : `${matchHistory.length} total matches recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Result quick filters */}
          <div className="flex items-center gap-1">
            {(['all', 'win', 'loss'] as const).map((f) => (
              <button
                key={`filter-${f}`}
                onClick={() => updateFilter('result', f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${filters.result === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
              >
                {f === 'all' ? 'All' : f === 'win' ? '✓ Wins' : '✗ Losses'}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${showFilters || activeFilterCount > 1 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
          >
            <Filter size={12} />
            Filters
            {activeFilterCount > 1 && (
              <span className="bg-primary text-primary-foreground text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={12} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-negative hover:bg-negative/10 transition-colors"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Court filter */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Court</label>
              <select
                value={filters.court}
                onChange={(e) => updateFilter('court', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Courts</option>
                {uniqueCourts.map((court) => (
                  <option key={court} value={court}>{court}</option>
                ))}
              </select>
            </div>

            {/* Player search */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Player Name</label>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.playerSearch}
                  onChange={(e) => updateFilter('playerSearch', e.target.value)}
                  placeholder="Search partner or opponent…"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {filters.playerSearch && (
                  <button
                    onClick={() => updateFilter('playerSearch', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : matchHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm font-medium">No matches yet</p>
          <p className="text-xs mt-1">Your match history will appear here after your first game</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Filter size={28} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No matches match your filters</p>
          <button onClick={resetFilters} className="text-xs text-primary mt-2 underline">Clear all filters</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Match', 'Date & Time', 'Court', 'Partner', 'Opponents', 'Score', 'Duration', 'Rating Δ'].map((col) => (
                    <th key={`col-${col}`} className="text-left px-4 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((match, idx) => (
                  <tr
                    key={match.id}
                    className={`table-row-hover border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-4 py-3">
                      <StatusBadge status={match.result} label={match.result === 'win' ? 'Win' : 'Loss'} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-foreground text-xs">{match.date}</p>
                      <p className="text-2xs text-muted-foreground">{match.time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-foreground">{match.court}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground font-medium">{match.partner}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{match.opponents}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold tabular-nums text-sm ${match.result === 'win' ? 'text-positive' : 'text-negative'}`}>
                        {match.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{match.duration}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold tabular-nums ${match.ratingChange > 0 ? 'text-positive' : match.ratingChange < 0 ? 'text-negative' : 'text-muted-foreground'}`}>
                        {match.ratingChange > 0 ? `+${match.ratingChange}` : match.ratingChange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} matches
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={`page-${i + 1}`}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all duration-150 ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}