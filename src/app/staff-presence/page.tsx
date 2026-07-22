'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import {
  Users, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Clock, Shield, UserCheck, UserX, Search, Activity
} from 'lucide-react';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: 'staff' | 'admin';
  is_active: boolean;
  player_id: string | null;
  games_played: number;
  member_since: string;
  created_at: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';

export default function StaffPresencePage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, is_active, player_id, games_played, member_since, created_at')
        .in('role', ['staff', 'admin'])
        .order('role', { ascending: false })
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setStaffList((data as StaffMember[]) || []);
      setLastSync(new Date());
    } catch (err: any) {
      console.error('[StaffPresence] fetchStaff error:', err?.message);
      setError('Failed to load staff data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStaff();
    const interval = setInterval(fetchStaff, 30000);
    return () => clearInterval(interval);
  }, [fetchStaff]);

  const filtered = staffList.filter((s) => {
    if (filterStatus === 'active' && !s.is_active) return false;
    if (filterStatus === 'inactive' && s.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!s.full_name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeCount = staffList.filter((s) => s.is_active).length;
  const inactiveCount = staffList.filter((s) => !s.is_active).length;
  const adminCount = staffList.filter((s) => s.role === 'admin').length;
  const staffCount = staffList.filter((s) => s.role === 'staff').length;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleStyle = (role: string) =>
    role === 'admin' ?'bg-amber-50 text-amber-700 border border-amber-200' :'bg-blue-50 text-blue-700 border border-blue-200';

  const formatMemberSince = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Staff Presence</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live overview of all staff and admin members
              {lastSync && (
                <span className="ml-2 text-2xs text-muted-foreground/70">
                  · Last synced {lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="btn-secondary text-xs gap-2 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: staffList.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Active Now', value: activeCount, icon: UserCheck, color: 'text-positive', bg: 'bg-positive/10' },
            { label: 'Inactive', value: inactiveCount, icon: UserX, color: 'text-muted-foreground', bg: 'bg-muted' },
            { label: 'Admins', value: adminCount, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl shadow-card px-4 py-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-foreground tabular-nums">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-negative/10 border border-negative/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-negative flex-shrink-0" />
            <p className="text-sm text-negative flex-1">{error}</p>
            <button onClick={fetchStaff} className="text-xs font-semibold text-negative underline flex items-center gap-1">
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Staff table card */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground">Staff Members</h2>
              {!loading && (
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filtered.length} shown
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <div className="flex items-center gap-1">
                {(['all', 'active', 'inactive'] as FilterStatus[]).map((f) => (
                  <button
                    key={`filter-${f}`}
                    onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      filterStatus === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users size={36} className="mb-3 opacity-25" />
              <p className="text-sm font-medium">No staff members found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Member</th>
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Player ID</th>
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Games</th>
                      <th className="text-left text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Member Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white ${member.role === 'admin' ? 'bg-amber-500' : 'bg-primary'}`}>
                              {getInitials(member.full_name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{member.full_name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleStyle(member.role)}`}>
                            {member.role === 'admin' ? <Shield size={11} /> : <Users size={11} />}
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.is_active ? 'bg-positive animate-pulse' : 'bg-muted-foreground/40'}`} />
                            <span className={`text-xs font-semibold ${member.is_active ? 'text-positive' : 'text-muted-foreground'}`}>
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {member.player_id ? (
                            <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded-lg">{member.player_id}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-foreground tabular-nums">{member.games_played ?? 0}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {formatMemberSince(member.member_since || member.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((member) => (
                  <div key={member.id} className="px-5 py-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white ${member.role === 'admin' ? 'bg-amber-500' : 'bg-primary'}`}>
                      {getInitials(member.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{member.full_name}</p>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-positive animate-pulse' : 'bg-muted-foreground/40'}`} />
                          <span className={`text-xs font-semibold ${member.is_active ? 'text-positive' : 'text-muted-foreground'}`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleStyle(member.role)}`}>
                          {member.role === 'admin' ? <Shield size={10} /> : <Users size={10} />}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                        {member.player_id && (
                          <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded-lg">{member.player_id}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={11} />
                          {formatMemberSince(member.member_since || member.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer summary */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {activeCount} active · {inactiveCount} inactive · {adminCount} admin · {staffCount} staff
              </p>
              <div className="flex items-center gap-1.5 text-xs text-positive font-semibold">
                <CheckCircle2 size={13} />
                Live data
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
