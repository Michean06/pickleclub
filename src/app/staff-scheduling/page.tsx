'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, RefreshCw, AlertCircle, CheckCircle2, X, UserCheck, Sun, Sunset, Moon } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface StaffMember {
  id: string;
  full_name: string;
  role: 'staff' | 'admin';
  is_active: boolean;
}

interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  day: number; // 0=Mon ... 6=Sun
  shiftType: 'morning' | 'afternoon' | 'evening';
  startTime: string;
  endTime: string;
  note: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFT_TYPES = [
  { key: 'morning', label: 'Morning', start: '06:00', end: '14:00', icon: Sun, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'afternoon', label: 'Afternoon', start: '14:00', end: '22:00', icon: Sunset, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { key: 'evening', label: 'Evening', start: '18:00', end: '23:00', icon: Moon, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
] as const;


interface AddShiftModalProps {
  onClose: () => void;
  onAdd: (shift: Omit<Shift, 'id'>) => void;
  staffList: StaffMember[];
}

function AddShiftModal({ onClose, onAdd, staffList }: AddShiftModalProps) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [shiftType, setShiftType] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === selectedStaff);
    if (!staff) return;
    const st = SHIFT_TYPES.find((t) => t.key === shiftType)!;
    onAdd({
      staffId: staff.id,
      staffName: staff.full_name,
      role: staff.role,
      day: selectedDay,
      shiftType,
      startTime: st.start,
      endTime: st.end,
      note,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md p-6 slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-foreground">Add Shift</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Assign a staff member to a shift</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select staff...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Day of Week</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedDay === i ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Shift Type</label>
            <div className="grid grid-cols-3 gap-2">
              {SHIFT_TYPES.map((st) => {
                const Icon = st.icon;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setShiftType(st.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${shiftType === st.key ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon size={16} />
                    {st.label}
                    <span className="text-2xs opacity-70">{st.start}–{st.end}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Opening duties, Weekend close..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button type="submit" className="btn-primary flex-1 text-sm">Add Shift</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffSchedulingPage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'staff'>('week');

  const getWeekDates = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
    return DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekDates = getWeekDates();

  const fetchStaff = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, is_active')
        .in('role', ['staff', 'admin'])
        .order('full_name', { ascending: true });
      if (fetchError) throw fetchError;
      setStaffList((data as StaffMember[]) || []);
    } catch (err: any) {
      setError('Failed to load staff.');
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAddShift = (shift: Omit<Shift, 'id'>) => {
    setShifts((prev) => [...prev, { ...shift, id: `s${Date.now()}` }]);
  };

  const handleDeleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  const getShiftsForDay = (dayIndex: number) =>
    shifts.filter((s) => s.day === dayIndex);

  const getShiftsForStaff = (staffId: string) =>
    shifts.filter((s) => s.staffId === staffId);

  const totalShifts = shifts.length;
  const coveredDays = new Set(shifts.map((s) => s.day)).size;
  const uniqueStaffScheduled = new Set(shifts.map((s) => s.staffId)).size;

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-warning flex-shrink-0" />
            <p className="text-sm text-warning flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 rounded hover:bg-warning/10">
              <X size={14} className="text-warning" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Staff Scheduling</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage weekly shifts and staff assignments</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm gap-2">
              <Plus size={15} />
              Add Shift
            </button>
            <button onClick={fetchStaff} className="btn-secondary text-sm gap-2">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Shifts', value: totalShifts, icon: Calendar, color: 'text-primary' },
            { label: 'Days Covered', value: `${coveredDays}/7`, icon: CheckCircle2, color: 'text-positive' },
            { label: 'Staff Scheduled', value: uniqueStaffScheduled, icon: UserCheck, color: 'text-info' },
            { label: 'Total Staff', value: staffList.length, icon: Users, color: 'text-accent' },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Week Navigator + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((p) => p - 1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 py-1.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground min-w-[180px] text-center">
              {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
              {weekOffset === 0 && <span className="ml-2 text-xs text-primary font-medium">This Week</span>}
            </div>
            <button onClick={() => setWeekOffset((p) => p + 1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight size={16} />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-primary font-semibold hover:underline">
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['week', 'staff'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${viewMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === 'week' ? 'Weekly View' : 'By Staff'}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Grid View */}
        {viewMode === 'week' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className={`px-2 py-3 text-center border-r border-border last:border-r-0 ${isToday(weekDates[i]) ? 'bg-primary/5' : ''}`}
                >
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday(weekDates[i]) ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
                  <p className={`text-sm font-extrabold mt-0.5 ${isToday(weekDates[i]) ? 'text-primary' : 'text-foreground'}`}>
                    {weekDates[i].getDate()}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[320px]">
              {DAYS.map((_, dayIndex) => {
                const dayShifts = getShiftsForDay(dayIndex);
                return (
                  <div
                    key={dayIndex}
                    className={`p-2 border-r border-border last:border-r-0 flex flex-col gap-1.5 ${isToday(weekDates[dayIndex]) ? 'bg-primary/5' : ''}`}
                  >
                    {dayShifts.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-2xs text-muted-foreground text-center">No shifts</p>
                      </div>
                    )}
                    {dayShifts.map((shift) => {
                      const st = SHIFT_TYPES.find((t) => t.key === shift.shiftType)!;
                      const Icon = st.icon;
                      return (
                        <div
                          key={shift.id}
                          className={`group relative rounded-lg border px-2 py-1.5 text-xs ${st.color}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Icon size={10} />
                            <span className="font-semibold truncate">{shift.staffName.split(' ')[0]}</span>
                          </div>
                          <p className="text-2xs opacity-70">{shift.startTime}–{shift.endTime}</p>
                          {shift.note && <p className="text-2xs opacity-60 truncate mt-0.5">{shift.note}</p>}
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-auto w-full py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-2xs flex items-center justify-center gap-1"
                    >
                      <Plus size={10} />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff View */}
        {viewMode === 'staff' && (
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Users size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No staff members found</p>
              </div>
            ) : (
              staffList.map((staff) => {
                const staffShifts = getShiftsForStaff(staff.id);
                const totalHours = staffShifts.reduce((acc, s) => {
                  const [sh, sm] = s.startTime.split(':').map(Number);
                  const [eh, em] = s.endTime.split(':').map(Number);
                  return acc + (eh * 60 + em - sh * 60 - sm) / 60;
                }, 0);
                return (
                  <div key={staff.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-green flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {staff.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{staff.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-2xs px-1.5 py-0.5 rounded-full font-semibold border ${staff.role === 'admin' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {staff.role}
                            </span>
                            <span className={`text-2xs font-medium ${staff.is_active ? 'text-positive' : 'text-muted-foreground'}`}>
                              {staff.is_active ? '● Active' : '○ Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-foreground">{totalHours}h</p>
                        <p className="text-2xs text-muted-foreground">{staffShifts.length} shifts</p>
                      </div>
                    </div>
                    {staffShifts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No shifts assigned this week</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {staffShifts.map((shift) => {
                          const st = SHIFT_TYPES.find((t) => t.key === shift.shiftType)!;
                          const Icon = st.icon;
                          return (
                            <div key={shift.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${st.color}`}>
                              <Icon size={12} />
                              <span>{DAYS[shift.day]}</span>
                              <span className="opacity-70">{shift.startTime}–{shift.endTime}</span>
                              <button onClick={() => handleDeleteShift(shift.id)} className="ml-1 hover:opacity-70">
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddShiftModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddShift}
          staffList={staffList}
        />
      )}
    </AppLayout>
  );
}
