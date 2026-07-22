'use client';

import React, { useState } from 'react';
import { Wrench, Plus, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { toast } from 'sonner';

interface Court {
  id: string;
  name: string;
  surface: string;
  status: 'active' | 'maintenance' | 'inactive';
  totalGames: number;
  totalHoursLifetime: number;
  totalHoursThisMonth: number;
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceIntervalHours: number;
  hoursUntilMaintenance: number;
}

const courtsData: Court[] = [
  { id: 'court-admin-1', name: 'Court 1', surface: 'Hardcourt', status: 'active', totalGames: 1842, totalHoursLifetime: 3542, totalHoursThisMonth: 148, lastMaintenance: 'Jul 10, 2026', nextMaintenance: 'Jul 24, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 52 },
  { id: 'court-admin-2', name: 'Court 2', surface: 'Hardcourt', status: 'active', totalGames: 1765, totalHoursLifetime: 3290, totalHoursThisMonth: 141, lastMaintenance: 'Jul 12, 2026', nextMaintenance: 'Jul 26, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 74 },
  { id: 'court-admin-3', name: 'Court 3', surface: 'Cushioned', status: 'active', totalGames: 1934, totalHoursLifetime: 3780, totalHoursThisMonth: 156, lastMaintenance: 'Jul 8, 2026', nextMaintenance: 'Jul 22, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 8 },
  { id: 'court-admin-4', name: 'Court 4', surface: 'Cushioned', status: 'active', totalGames: 1621, totalHoursLifetime: 3015, totalHoursThisMonth: 128, lastMaintenance: 'Jul 14, 2026', nextMaintenance: 'Jul 28, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 94 },
  { id: 'court-admin-5', name: 'Court 5', surface: 'Hardcourt', status: 'active', totalGames: 1488, totalHoursLifetime: 2741, totalHoursThisMonth: 112, lastMaintenance: 'Jul 15, 2026', nextMaintenance: 'Jul 29, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 110 },
  { id: 'court-admin-6', name: 'Court 6', surface: 'Hardcourt', status: 'maintenance', totalGames: 1203, totalHoursLifetime: 2198, totalHoursThisMonth: 88, lastMaintenance: 'Jul 20, 2026', nextMaintenance: 'Aug 3, 2026', maintenanceIntervalHours: 200, hoursUntilMaintenance: 0 },
];

export default function AdminCourts() {
  const [courts, setCourts] = useState<Court[]>(courtsData);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);

  const toggleStatus = (courtId: string) => {
    setCourts((prev) => prev.map((c) => {
      if (c.id !== courtId) return c;
      const next = c.status === 'active' ? 'inactive' : 'active';
      toast.success(`${c.name} set to ${next}`);
      return { ...c, status: next };
    }));
  };

  const markMaintenance = (court: Court) => {
    setCourts((prev) => prev.map((c) => c.id === court.id ? { ...c, status: 'maintenance' } : c));
    toast.success(`${court.name} scheduled for maintenance`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">6 courts configured · 4 active · 1 maintenance · 1 inactive</p>
        <button className="btn-primary text-xs gap-1.5 py-2">
          <Plus size={14} />
          Add Court
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courts.map((court) => {
          const maintenanceSoon = court.hoursUntilMaintenance <= 20 && court.status !== 'maintenance';
          const utilizationPct = Math.min(100, Math.round((court.totalHoursThisMonth / 200) * 100));

          return (
            <div
              key={court.id}
              className={`bg-card border-2 rounded-xl p-5 shadow-card transition-all duration-200 ${
                court.status === 'maintenance' ? 'border-orange-200 bg-orange-50/30' : maintenanceSoon ?'border-amber-200 bg-amber-50/20': 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{court.name}</h3>
                    {maintenanceSoon && (
                      <span className="text-2xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded">
                        Due soon
                      </span>
                    )}
                    {court.status === 'maintenance' && (
                      <span className="text-2xs bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded">
                        Maintenance
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{court.surface} surface</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="relative group/edit-court">
                    <button onClick={() => setEditingCourt(court)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Edit2 size={14} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/edit-court:opacity-100 transition-opacity pointer-events-none z-10">Edit court</div>
                  </div>
                  <div className="relative group/toggle-court">
                    <button onClick={() => toggleStatus(court.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      {court.status === 'active' ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-foreground text-primary-foreground text-2xs rounded whitespace-nowrap opacity-0 group-hover/toggle-court:opacity-100 transition-opacity pointer-events-none z-10">
                      {court.status === 'active' ? 'Deactivate' : 'Activate'} court
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-base font-extrabold tabular-nums text-foreground">{court.totalGames.toLocaleString()}</p>
                  <p className="text-2xs text-muted-foreground">Total Games</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-extrabold tabular-nums text-foreground">{court.totalHoursLifetime.toLocaleString()}</p>
                  <p className="text-2xs text-muted-foreground">Lifetime Hrs</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-extrabold tabular-nums text-foreground">{court.totalHoursThisMonth}</p>
                  <p className="text-2xs text-muted-foreground">This Month</p>
                </div>
              </div>

              {/* Monthly utilization */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-semibold text-muted-foreground">Monthly Utilization</span>
                  <span className="text-2xs font-bold text-foreground">{utilizationPct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${utilizationPct >= 80 ? 'bg-positive' : utilizationPct >= 50 ? 'bg-accent' : 'bg-negative'}`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>
              </div>

              {/* Maintenance info */}
              <div className={`rounded-lg px-3 py-2.5 text-xs ${maintenanceSoon || court.status === 'maintenance' ? 'bg-amber-50 border border-amber-200' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench size={11} className={maintenanceSoon ? 'text-amber-600' : 'text-muted-foreground'} />
                  <span className={`font-semibold ${maintenanceSoon ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {court.status === 'maintenance' ? 'Under Maintenance' : `${court.hoursUntilMaintenance}h until maintenance`}
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground">Next: {court.nextMaintenance} · Last: {court.lastMaintenance}</p>
              </div>

              {maintenanceSoon && court.status !== 'maintenance' && (
                <button
                  onClick={() => markMaintenance(court)}
                  className="mt-3 w-full py-2 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  Schedule Maintenance Now
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit court modal */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingCourt(null)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md p-6 slide-up">
            <button onClick={() => setEditingCourt(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground mb-4">Edit {editingCourt.name}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Court Name</label>
                <input defaultValue={editingCourt.name} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Surface Type</label>
                <select defaultValue={editingCourt.surface} className="input-field">
                  <option>Hardcourt</option>
                  <option>Cushioned</option>
                  <option>Outdoor Concrete</option>
                  <option>Synthetic Grass</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Maintenance Interval (hours)</label>
                <input type="number" defaultValue={editingCourt.maintenanceIntervalHours} className="input-field" />
                <p className="text-2xs text-muted-foreground mt-1">System will alert when court reaches this usage threshold</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingCourt(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { toast.success(`${editingCourt.name} updated.`); setEditingCourt(null); }} className="btn-primary flex-1">Save Court</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}