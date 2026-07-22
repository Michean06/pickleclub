'use client';

import React, { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Search, UserPlus, Edit2, Ban, CreditCard, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

interface Player {
  id: string;
  playerId: string;
  name: string;
  email: string;
  phone: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  credits: number;
  rating: number;
  gamesPlayed: number;
  winRate: number;
  status: 'active' | 'suspended' | 'pending';
  lastActive: string;
  memberSince: string;
}

const playersData: Player[] = [
  { id: 'player-001', playerId: 'PKL-2026-0001', name: 'Angela Torres', email: 'angela.torres@email.com', phone: '09171234567', skillLevel: 'pro', credits: 15, rating: 1642, gamesPlayed: 199, winRate: 74.4, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Jan 2026' },
  { id: 'player-002', playerId: 'PKL-2026-0012', name: 'Kim Ong', email: 'kim.ong@email.com', phone: '09189876543', skillLevel: 'advanced', credits: 8, rating: 1598, gamesPlayed: 186, winRate: 71.0, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Jan 2026' },
  { id: 'player-003', playerId: 'PKL-2026-0024', name: 'Maria Santos', email: 'maria.santos@email.com', phone: '09221112233', skillLevel: 'advanced', credits: 8, rating: 1489, gamesPlayed: 174, winRate: 68.4, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Feb 2026' },
  { id: 'player-004', playerId: 'PKL-2026-0087', name: 'Juan Dela Cruz', email: 'juan.delacruz@email.com', phone: '09154445566', skillLevel: 'advanced', credits: 9, rating: 1515, gamesPlayed: 145, winRate: 62.8, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Jan 2026' },
  { id: 'player-005', playerId: 'PKL-2026-0031', name: 'Jose Ramos', email: 'jose.ramos@email.com', phone: '09278889900', skillLevel: 'intermediate', credits: 7, rating: 1423, gamesPlayed: 144, winRate: 60.4, status: 'active', lastActive: 'Jul 21, 2026', memberSince: 'Feb 2026' },
  { id: 'player-006', playerId: 'PKL-2026-0045', name: 'Shawn Cruz', email: 'shawn.cruz@email.com', phone: '09331234567', skillLevel: 'intermediate', credits: 5, rating: 1312, gamesPlayed: 98, winRate: 55.1, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Mar 2026' },
  { id: 'player-007', playerId: 'PKL-2026-0058', name: 'Peter Lim', email: 'peter.lim@email.com', phone: '09459876543', skillLevel: 'advanced', credits: 3, rating: 1455, gamesPlayed: 132, winRate: 63.6, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Feb 2026' },
  { id: 'player-008', playerId: 'PKL-2026-0063', name: 'Ryan Dela Cruz', email: 'ryan.delacruz@email.com', phone: '09501122334', skillLevel: 'intermediate', credits: 6, rating: 1278, gamesPlayed: 76, winRate: 51.3, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Apr 2026' },
  { id: 'player-009', playerId: 'PKL-2026-0071', name: 'Leo Bautista', email: 'leo.bautista@email.com', phone: '09612233445', skillLevel: 'beginner', credits: 10, rating: 1105, gamesPlayed: 34, winRate: 38.2, status: 'active', lastActive: 'Jul 22, 2026', memberSince: 'Jun 2026' },
  { id: 'player-010', playerId: 'PKL-2026-0079', name: 'Carla Mendoza', email: 'carla.mendoza@email.com', phone: '09723344556', skillLevel: 'intermediate', credits: 0, rating: 1348, gamesPlayed: 88, winRate: 57.9, status: 'suspended', lastActive: 'Jul 18, 2026', memberSince: 'Mar 2026' },
  { id: 'player-011', playerId: 'PKL-2026-0091', name: 'Mark Villanueva', email: 'mark.villanueva@email.com', phone: '09834455667', skillLevel: 'beginner', credits: 5, rating: 1142, gamesPlayed: 22, winRate: 40.9, status: 'active', lastActive: 'Jul 20, 2026', memberSince: 'Jun 2026' },
  { id: 'player-012', playerId: 'PKL-2026-0104', name: 'Mia Reyes', email: 'mia.reyes@email.com', phone: '09945566778', skillLevel: 'intermediate', credits: 2, rating: 1289, gamesPlayed: 61, winRate: 49.2, status: 'pending', lastActive: 'Jul 19, 2026', memberSince: 'May 2026' },
];

export default function AdminPlayers() {
  const [players, setPlayers] = useState<Player[]>(playersData);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [suspendTarget, setSuspendTarget] = useState<Player | null>(null);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [addCreditsTarget, setAddCreditsTarget] = useState<Player | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState('10');
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;

  const filtered = players.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.playerId.toLowerCase().includes(search.toLowerCase());
    const matchSkill = skillFilter === 'all' || p.skillLevel === skillFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchSkill && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSuspend = () => {
    if (!suspendTarget) return;
    setPlayers((prev) => prev.map((p) => p.id === suspendTarget.id ? { ...p, status: p.status === 'suspended' ? 'active' : 'suspended' } : p));
    toast.success(`${suspendTarget.name} has been ${suspendTarget.status === 'suspended' ? 'reactivated' : 'suspended'}.`);
    setSuspendTarget(null);
  };

  const handleAddCredits = () => {
    if (!addCreditsTarget) return;
    const amt = parseInt(creditsToAdd, 10);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid credit amount.'); return; }
    setPlayers((prev) => prev.map((p) => p.id === addCreditsTarget.id ? { ...p, credits: p.credits + amt } : p));
    toast.success(`${amt} credits added to ${addCreditsTarget.name}'s wallet.`);
    setAddCreditsTarget(null);
    setCreditsToAdd('10');
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or player ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={skillFilter}
              onChange={(e) => { setSkillFilter(e.target.value); setPage(1); }}
              className="input-field text-xs w-auto py-2 pr-8"
            >
              <option value="all">All Skills</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="pro">Pro</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field text-xs w-auto py-2 pr-8"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn-primary text-xs py-2 gap-1.5">
              <UserPlus size={14} />
              Register Player
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Player ID', 'Name', 'Skill Level', 'Credits', 'Rating', 'Games', 'Win Rate', 'Status', 'Last Active', 'Actions'].map((col) => (
                  <th key={`pcol-${col}`} className="text-left px-4 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((player, idx) => (
                <tr key={player.id} className={`table-row-hover border-b border-border last:border-0 ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{player.playerId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full gradient-green flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-2xs font-bold">{player.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{player.name}</p>
                        <p className="text-2xs text-muted-foreground">{player.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={player.skillLevel} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold tabular-nums ${player.credits === 0 ? 'text-negative' : player.credits <= 2 ? 'text-warning' : 'text-foreground'}`}>
                      {player.credits}
                      {player.credits === 0 && <span className="ml-1 text-2xs">⚠</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold tabular-nums text-foreground">{player.rating}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs tabular-nums text-foreground">{player.gamesPlayed}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${player.winRate >= 60 ? 'bg-positive' : player.winRate >= 50 ? 'bg-accent' : 'bg-negative'}`}
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums font-semibold text-foreground">{player.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={player.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{player.lastActive}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <div className="relative group/edit">
                        <button onClick={() => setEditTarget(player)} className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-muted-foreground">
                          <Edit2 size={13} />
                        </button>
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none z-10">Edit player</div>
                      </div>
                      {/* Add credits */}
                      <div className="relative group/credits">
                        <button onClick={() => setAddCreditsTarget(player)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
                          <CreditCard size={13} />
                        </button>
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/credits:opacity-100 transition-opacity pointer-events-none z-10">Add credits</div>
                      </div>
                      {/* Suspend */}
                      <div className="relative group/suspend">
                        <button onClick={() => setSuspendTarget(player)} className="p-1.5 rounded-lg hover:bg-negative/10 hover:text-negative transition-colors text-muted-foreground">
                          <Ban size={13} />
                        </button>
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/suspend:opacity-100 transition-opacity pointer-events-none z-10">
                          {player.status === 'suspended' ? 'Reactivate' : 'Suspend'} player
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} players
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={`ppage-${i + 1}`} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all duration-150 ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Suspend/Reactivate confirm modal */}
      <ConfirmModal
        open={!!suspendTarget}
        title={suspendTarget?.status === 'suspended' ? `Reactivate ${suspendTarget?.name}?` : `Suspend ${suspendTarget?.name}?`}
        description={suspendTarget?.status === 'suspended' ?'This will restore the player\'s account and allow them to join sessions again.' :'This will prevent the player from joining any sessions. Their credits will be preserved.'}
        confirmLabel={suspendTarget?.status === 'suspended' ? 'Reactivate Player' : 'Suspend Player'}
        variant={suspendTarget?.status === 'suspended' ? 'warning' : 'danger'}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTarget(null)}
      />

      {/* Add credits modal */}
      {addCreditsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddCreditsTarget(null)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-6 slide-up">
            <button onClick={() => setAddCreditsTarget(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground mb-1">Add Credits</h3>
            <p className="text-xs text-muted-foreground mb-4">Adding credits to <strong>{addCreditsTarget.name}</strong> · Current balance: <strong>{addCreditsTarget.credits}</strong></p>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Credits to Add</label>
            <input
              type="number"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(e.target.value)}
              className="input-field mb-4"
              min="1"
            />
            <div className="flex gap-2 mb-4">
              {['5', '10', '20'].map((amt) => (
                <button key={`amt-${amt}`} onClick={() => setCreditsToAdd(amt)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${creditsToAdd === amt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30 text-muted-foreground'}`}>
                  +{amt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddCreditsTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddCredits} className="btn-primary flex-1">Add Credits</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit player modal (simplified) */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md p-6 slide-up">
            <button onClick={() => setEditTarget(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground mb-4">Edit Player — {editTarget.name}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
                <input defaultValue={editTarget.name} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                <input type="email" defaultValue={editTarget.email} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Phone Number</label>
                <input defaultValue={editTarget.phone} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Skill Level</label>
                <select defaultValue={editTarget.skillLevel} className="input-field">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="pro">Pro</option>
                </select>
                <p className="text-2xs text-muted-foreground mt-1">Changing skill level affects court assignment recommendations</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { toast.success(`${editTarget.name}'s profile updated.`); setEditTarget(null); }} className="btn-primary flex-1">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}