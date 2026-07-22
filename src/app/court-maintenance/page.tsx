'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Wrench, CheckCircle2, Clock, Plus, X, Calendar, ClipboardList, History, ArrowRight, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type CourtStatus = 'active' | 'maintenance' | 'scheduled';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface MaintenanceCourt {
  id: string;
  name: string;
  surface: string;
  status: CourtStatus;
  lastMaintenance: string;
  nextMaintenance: string;
  hoursUntilMaintenance: number;
  totalHoursThisMonth: number;
  maintenanceIntervalHours: number;
  pendingTasks: number;
  maintenanceNote?: string;
}

interface MaintenanceTask {
  id: string;
  courtId: string;
  courtName: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  assignedTo: string;
  scheduledDate: string;
  completedDate?: string;
  estimatedHours: number;
}

interface HistoryEntry {
  id: string;
  courtName: string;
  action: string;
  performedBy: string;
  date: string;
  notes?: string;
}

const COURTS: MaintenanceCourt[] = [
  { id: 'c1', name: 'Court 1', surface: 'Hardcourt', status: 'active', lastMaintenance: 'Jul 10, 2026', nextMaintenance: 'Jul 24, 2026', hoursUntilMaintenance: 52, totalHoursThisMonth: 148, maintenanceIntervalHours: 200, pendingTasks: 1 },
  { id: 'c2', name: 'Court 2', surface: 'Hardcourt', status: 'active', lastMaintenance: 'Jul 12, 2026', nextMaintenance: 'Jul 26, 2026', hoursUntilMaintenance: 74, totalHoursThisMonth: 141, maintenanceIntervalHours: 200, pendingTasks: 0 },
  { id: 'c3', name: 'Court 3', surface: 'Cushioned', status: 'scheduled', lastMaintenance: 'Jul 8, 2026', nextMaintenance: 'Jul 22, 2026', hoursUntilMaintenance: 8, totalHoursThisMonth: 156, maintenanceIntervalHours: 200, pendingTasks: 2, maintenanceNote: 'Surface resurfacing scheduled' },
  { id: 'c4', name: 'Court 4', surface: 'Cushioned', status: 'active', lastMaintenance: 'Jul 14, 2026', nextMaintenance: 'Jul 28, 2026', hoursUntilMaintenance: 94, totalHoursThisMonth: 128, maintenanceIntervalHours: 200, pendingTasks: 0 },
  { id: 'c5', name: 'Court 5', surface: 'Hardcourt', status: 'active', lastMaintenance: 'Jul 15, 2026', nextMaintenance: 'Jul 29, 2026', hoursUntilMaintenance: 110, totalHoursThisMonth: 112, maintenanceIntervalHours: 200, pendingTasks: 1 },
  { id: 'c6', name: 'Court 6', surface: 'Hardcourt', status: 'maintenance', lastMaintenance: 'Jul 20, 2026', nextMaintenance: 'Aug 3, 2026', hoursUntilMaintenance: 0, totalHoursThisMonth: 88, maintenanceIntervalHours: 200, pendingTasks: 3, maintenanceNote: 'Net post replacement in progress' },
];

const TASKS: MaintenanceTask[] = [
  { id: 't1', courtId: 'c6', courtName: 'Court 6', title: 'Net post replacement', description: 'Replace damaged net post on north side', priority: 'critical', status: 'in_progress', assignedTo: 'Marco Santos', scheduledDate: '2026-07-22', estimatedHours: 3 },
  { id: 't2', courtId: 'c6', courtName: 'Court 6', title: 'Surface crack repair', description: 'Fill and seal hairline cracks near baseline', priority: 'high', status: 'pending', assignedTo: 'Lena Cruz', scheduledDate: '2026-07-23', estimatedHours: 4 },
  { id: 't3', courtId: 'c6', courtName: 'Court 6', title: 'Line repaint', description: 'Repaint all court lines after surface repair', priority: 'medium', status: 'pending', assignedTo: 'Marco Santos', scheduledDate: '2026-07-24', estimatedHours: 2 },
  { id: 't4', courtId: 'c3', courtName: 'Court 3', title: 'Cushion layer inspection', description: 'Inspect and assess cushion layer wear', priority: 'high', status: 'pending', assignedTo: 'Lena Cruz', scheduledDate: '2026-07-22', estimatedHours: 1 },
  { id: 't5', courtId: 'c3', courtName: 'Court 3', title: 'Net tension adjustment', description: 'Adjust net tension to regulation height', priority: 'low', status: 'pending', assignedTo: 'Rico Tan', scheduledDate: '2026-07-23', estimatedHours: 0.5 },
  { id: 't6', courtId: 'c1', courtName: 'Court 1', title: 'Lighting check', description: 'Inspect and replace any faulty overhead lights', priority: 'medium', status: 'pending', assignedTo: 'Rico Tan', scheduledDate: '2026-07-25', estimatedHours: 1 },
  { id: 't7', courtId: 'c5', courtName: 'Court 5', title: 'Fence repair', description: 'Repair loose fence panel on east side', priority: 'medium', status: 'overdue', assignedTo: 'Marco Santos', scheduledDate: '2026-07-20', estimatedHours: 2 },
];

const HISTORY: HistoryEntry[] = [
  { id: 'h1', courtName: 'Court 6', action: 'Set to Maintenance', performedBy: 'Admin', date: 'Jul 20, 2026', notes: 'Net post damaged during play' },
  { id: 'h2', courtName: 'Court 2', action: 'Maintenance Completed', performedBy: 'Marco Santos', date: 'Jul 12, 2026', notes: 'Full surface cleaning and net replacement' },
  { id: 'h3', courtName: 'Court 1', action: 'Maintenance Completed', performedBy: 'Lena Cruz', date: 'Jul 10, 2026', notes: 'Routine inspection and line repaint' },
  { id: 'h4', courtName: 'Court 4', action: 'Maintenance Completed', performedBy: 'Rico Tan', date: 'Jul 14, 2026', notes: 'Cushion layer patching' },
  { id: 'h5', courtName: 'Court 5', action: 'Maintenance Completed', performedBy: 'Marco Santos', date: 'Jul 15, 2026', notes: 'Fence repair and lighting check' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'bg-negative/10', text: 'text-negative', border: 'border-negative/20' },
  high: { label: 'High', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { label: 'Low', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  in_progress: { label: 'In Progress', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  completed: { label: 'Completed', bg: 'bg-positive/10', text: 'text-positive', dot: 'bg-positive' },
  overdue: { label: 'Overdue', bg: 'bg-negative/10', text: 'text-negative', dot: 'bg-negative' },
};

const COURT_STATUS_CONFIG: Record<CourtStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Active', bg: 'bg-positive/10', text: 'text-positive', border: 'border-positive/20' },
  maintenance: { label: 'In Maintenance', bg: 'bg-negative/10', text: 'text-negative', border: 'border-negative/20' },
  scheduled: { label: 'Scheduled', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

type TabId = 'overview' | 'tasks' | 'history';

export default function CourtMaintenancePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [courts, setCourts] = useState<MaintenanceCourt[]>(COURTS);
  const [tasks, setTasks] = useState<MaintenanceTask[]>(TASKS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ courtId: '', title: '', priority: 'medium' as Priority, assignedTo: '', scheduledDate: '', estimatedHours: '' });

  useEffect(() => {
    if (!loading && profile && profile.role === 'player') {
      router.replace('/');
    }
  }, [profile, loading, router]);

  const kpis = {
    total: courts.length,
    active: courts.filter((c) => c.status === 'active').length,
    inMaintenance: courts.filter((c) => c.status === 'maintenance').length,
    scheduled: courts.filter((c) => c.status === 'scheduled').length,
    overdueTasks: tasks.filter((t) => t.status === 'overdue').length,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
  };

  const toggleCourtStatus = (courtId: string) => {
    setCourts((prev) =>
      prev.map((c) => {
        if (c.id !== courtId) return c;
        const next: CourtStatus = c.status === 'maintenance' ? 'active' : 'maintenance';
        toast.success(`${c.name} set to ${next === 'maintenance' ? 'Maintenance' : 'Active'}`);
        return { ...c, status: next };
      })
    );
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    toast.success(`Task updated to ${TASK_STATUS_CONFIG[status].label}`);
  };

  const handleAddTask = () => {
    if (!newTask.courtId || !newTask.title || !newTask.assignedTo || !newTask.scheduledDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const court = courts.find((c) => c.id === newTask.courtId);
    const task: MaintenanceTask = {
      id: `t${Date.now()}`,
      courtId: newTask.courtId,
      courtName: court?.name || '',
      title: newTask.title,
      description: '',
      priority: newTask.priority,
      status: 'pending',
      assignedTo: newTask.assignedTo,
      scheduledDate: newTask.scheduledDate,
      estimatedHours: parseFloat(newTask.estimatedHours) || 1,
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask({ courtId: '', title: '', priority: 'medium', assignedTo: '', scheduledDate: '', estimatedHours: '' });
    setShowAddTask(false);
    toast.success('Maintenance task added');
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.courtName.toLowerCase().includes(search.toLowerCase()) || t.assignedTo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Court Overview', icon: Wrench },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, count: tasks.filter((t) => t.status !== 'completed').length },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Court Maintenance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage court status, schedule maintenance, and track tasks</p>
          </div>
          <button
            onClick={() => { setActiveTab('tasks'); setShowAddTask(true); }}
            className="btn-primary text-sm gap-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Courts', value: kpis.total, color: 'text-foreground', bg: 'bg-muted/40' },
            { label: 'Active', value: kpis.active, color: 'text-positive', bg: 'bg-positive/10' },
            { label: 'In Maintenance', value: kpis.inMaintenance, color: 'text-negative', bg: 'bg-negative/10' },
            { label: 'Scheduled', value: kpis.scheduled, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Pending Tasks', value: kpis.pendingTasks, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Overdue', value: kpis.overdueTasks, color: 'text-negative', bg: 'bg-negative/10' },
          ].map((kpi) => (
            <div key={kpi.label} className={`${kpi.bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-2xs text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon size={15} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-negative text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courts.map((court) => {
              const statusCfg = COURT_STATUS_CONFIG[court.status];
              const utilizationPct = Math.min(100, Math.round((court.totalHoursThisMonth / 200) * 100));
              const urgentSoon = court.hoursUntilMaintenance <= 20 && court.status === 'active';

              return (
                <div
                  key={court.id}
                  className={`bg-card border-2 rounded-xl p-5 shadow-card transition-all duration-200 ${
                    court.status === 'maintenance' ?'border-negative/30'
                      : urgentSoon
                      ? 'border-amber-300' :'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">{court.name}</h3>
                        {urgentSoon && (
                          <span className="text-2xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded">
                            Due soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{court.surface}</p>
                    </div>
                    <span className={`text-2xs font-semibold px-2 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {court.maintenanceNote && (
                    <div className="flex items-start gap-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-2xs text-amber-700">{court.maintenanceNote}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Monthly utilization</span>
                      <span className="font-semibold text-foreground">{utilizationPct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${utilizationPct > 80 ? 'bg-negative' : utilizationPct > 60 ? 'bg-amber-500' : 'bg-positive'}`}
                        style={{ width: `${utilizationPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Last maintenance</p>
                      <p className="font-semibold text-foreground">{court.lastMaintenance}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next due</p>
                      <p className={`font-semibold ${urgentSoon ? 'text-amber-700' : 'text-foreground'}`}>{court.nextMaintenance}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hours until due</p>
                      <p className={`font-semibold ${court.hoursUntilMaintenance <= 20 ? 'text-amber-700' : 'text-foreground'}`}>
                        {court.hoursUntilMaintenance}h
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending tasks</p>
                      <p className={`font-semibold ${court.pendingTasks > 0 ? 'text-negative' : 'text-positive'}`}>
                        {court.pendingTasks}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCourtStatus(court.id)}
                      className={`flex-1 text-xs py-2 rounded-lg font-semibold border transition-colors ${
                        court.status === 'maintenance' ?'bg-positive/10 text-positive border-positive/20 hover:bg-positive/20' :'bg-negative/10 text-negative border-negative/20 hover:bg-negative/20'
                      }`}
                    >
                      {court.status === 'maintenance' ? 'Mark Active' : 'Set Maintenance'}
                    </button>
                    <button
                      onClick={() => { setActiveTab('tasks'); setShowAddTask(true); setNewTask((p) => ({ ...p, courtId: court.id })); }}
                      className="btn-secondary text-xs py-2 gap-1"
                    >
                      <Plus size={13} />
                      Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Tasks */}
        {activeTab === 'tasks' && (
          <div className="flex flex-col gap-4">
            {/* Add Task Form */}
            {showAddTask && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground">New Maintenance Task</h3>
                  <button onClick={() => setShowAddTask(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X size={16} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Court *</label>
                    <select
                      value={newTask.courtId}
                      onChange={(e) => setNewTask((p) => ({ ...p, courtId: e.target.value }))}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select court</option>
                      {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Task Title *</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Net replacement"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as Priority }))}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Assigned To *</label>
                    <input
                      type="text"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask((p) => ({ ...p, assignedTo: e.target.value }))}
                      placeholder="Staff name"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Scheduled Date *</label>
                    <input
                      type="date"
                      value={newTask.scheduledDate}
                      onChange={(e) => setNewTask((p) => ({ ...p, scheduledDate: e.target.value }))}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Est. Hours</label>
                    <input
                      type="number"
                      value={newTask.estimatedHours}
                      onChange={(e) => setNewTask((p) => ({ ...p, estimatedHours: e.target.value }))}
                      placeholder="1"
                      min="0.5"
                      step="0.5"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddTask} className="btn-primary text-sm gap-2">
                    <Plus size={15} />
                    Add Task
                  </button>
                  <button onClick={() => setShowAddTask(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks, courts, staff..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'pending', 'in_progress', 'overdue', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                      filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-3">
              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No tasks found</p>
                </div>
              )}
              {filteredTasks.map((task) => {
                const priCfg = PRIORITY_CONFIG[task.priority];
                const stCfg = TASK_STATUS_CONFIG[task.status];
                return (
                  <div key={task.id} className="bg-card border border-border rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-foreground">{task.title}</span>
                        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`}>
                          {priCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-2xs font-semibold px-1.5 py-0.5 rounded ${stCfg.bg} ${stCfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                          {stCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Wrench size={11} />{task.courtName}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />{task.scheduledDate}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{task.estimatedHours}h est.</span>
                        <span>Assigned: <span className="font-semibold text-foreground">{task.assignedTo}</span></span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          Start
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-positive/10 text-positive border border-positive/20 hover:bg-positive/20 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {task.status === 'overdue' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-positive/10 text-positive flex items-center gap-1">
                          <CheckCircle2 size={12} /> Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: History */}
        {activeTab === 'history' && (
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Maintenance History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Recent maintenance actions and completions</p>
            </div>
            <div className="divide-y divide-border">
              {HISTORY.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{entry.courtName}</span>
                      <ArrowRight size={12} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{entry.action}</span>
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                    <p className="text-2xs text-muted-foreground mt-1">
                      By <span className="font-semibold">{entry.performedBy}</span> · {entry.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
