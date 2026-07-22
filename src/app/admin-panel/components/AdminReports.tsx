'use client';

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Download, TrendingUp, CreditCard, Users, Trophy, ChevronDown, FileText, Table2, X } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const weeklyRevenue = [
  { week: 'Jun 23', revenue: 18420, credits: 409, players: 58 },
  { week: 'Jun 30', revenue: 21050, credits: 468, players: 64 },
  { week: 'Jul 7', revenue: 19800, credits: 440, players: 61 },
  { week: 'Jul 14', revenue: 24600, credits: 547, players: 72 },
  { week: 'Jul 21', revenue: 22410, credits: 498, players: 68 },
];

const peakHoursData = [
  { hour: '7 AM', mon: 12, tue: 8, wed: 15, thu: 10, fri: 18, sat: 42, sun: 38 },
  { hour: '8 AM', mon: 45, tue: 52, wed: 48, thu: 55, fri: 62, sat: 78, sun: 72 },
  { hour: '9 AM', mon: 88, tue: 92, wed: 85, thu: 90, fri: 95, sat: 100, sun: 98 },
  { hour: '10 AM', mon: 95, tue: 98, wed: 100, thu: 96, fri: 100, sat: 100, sun: 100 },
  { hour: '11 AM', mon: 78, tue: 82, wed: 80, thu: 85, fri: 90, sat: 92, sun: 88 },
  { hour: '12 PM', mon: 55, tue: 48, wed: 52, thu: 50, fri: 65, sat: 75, sun: 70 },
  { hour: '1 PM', mon: 35, tue: 30, wed: 38, thu: 32, fri: 45, sat: 60, sun: 55 },
  { hour: '2 PM', mon: 68, tue: 72, wed: 65, thu: 70, fri: 78, sat: 88, sun: 82 },
  { hour: '3 PM', mon: 90, tue: 95, wed: 92, thu: 88, fri: 98, sat: 100, sun: 95 },
  { hour: '4 PM', mon: 98, tue: 100, wed: 95, thu: 100, fri: 100, sat: 98, sun: 92 },
  { hour: '5 PM', mon: 72, tue: 68, wed: 75, thu: 70, fri: 80, sat: 70, sun: 65 },
  { hour: '6 PM', mon: 35, tue: 28, wed: 40, thu: 32, fri: 48, sat: 42, sun: 38 },
];

const matchStats = [
  { day: 'Mon', matches: 18, avgDuration: 19, completionRate: 98 },
  { day: 'Tue', matches: 22, avgDuration: 17, completionRate: 100 },
  { day: 'Wed', matches: 20, avgDuration: 21, completionRate: 95 },
  { day: 'Thu', matches: 25, avgDuration: 18, completionRate: 100 },
  { day: 'Fri', matches: 30, avgDuration: 16, completionRate: 97 },
  { day: 'Sat', matches: 42, avgDuration: 20, completionRate: 99 },
  { day: 'Sun', matches: 38, avgDuration: 19, completionRate: 98 },
];

const reportSummary = [
  { id: 'rep-rev', label: 'Weekly Revenue', value: '₱22,410', sub: '+14.8% vs prior week', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  { id: 'rep-credits', label: 'Credits Sold', value: '498', sub: '87 today alone', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'rep-players', label: 'Active Members', value: '68', sub: 'This week', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'rep-matches', label: 'Matches This Week', value: '195', sub: '28/day avg', icon: Trophy, color: 'text-positive', bg: 'bg-positive/10' },
];

// ── CSV helpers ──────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ExportType = 'revenue' | 'matches' | 'peak_hours' | 'full';

const exportOptions: { id: ExportType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'revenue', label: 'Revenue Report', desc: 'Weekly revenue, credits & players', icon: TrendingUp },
  { id: 'matches', label: 'Match Stats', desc: 'Daily matches & completion rates', icon: Trophy },
  { id: 'peak_hours', label: 'Peak Hours', desc: 'Court occupancy by hour & day', icon: Table2 },
  { id: 'full', label: 'Full Report', desc: 'All data combined in one file', icon: FileText },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card-md px-3 py-2.5 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={`rep-tt-${entry.name}`} style={{ color: entry.color }} className="font-medium">
            {entry.name}: <span className="font-bold">{entry.name === 'revenue' ? `₱${entry.value.toLocaleString()}` : entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminReports() {
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'previous'>('current');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const handleExport = (type: ExportType) => {
    setExporting(type);
    setShowExportMenu(false);

    setTimeout(() => {
      try {
        const weekLabel = selectedWeek === 'current' ? 'this-week' : 'last-week';
        const dateStr = new Date().toISOString().slice(0, 10);

        if (type === 'revenue' || type === 'full') {
          const csv = toCSV(
            ['Week', 'Revenue (PHP)', 'Credits Sold', 'Active Players'],
            weeklyRevenue.map((r) => [r.week, r.revenue, r.credits, r.players]),
          );
          if (type === 'revenue') {
            downloadCSV(`pickleclub-revenue-${weekLabel}-${dateStr}.csv`, csv);
          } else {
            // For full, we'll combine below
          }
        }

        if (type === 'matches' || type === 'full') {
          const csv = toCSV(
            ['Day', 'Matches', 'Avg Duration (min)', 'Completion Rate (%)'],
            matchStats.map((r) => [r.day, r.matches, r.avgDuration, r.completionRate]),
          );
          if (type === 'matches') {
            downloadCSV(`pickleclub-match-stats-${weekLabel}-${dateStr}.csv`, csv);
          }
        }

        if (type === 'peak_hours' || type === 'full') {
          const csv = toCSV(
            ['Hour', 'Mon (%)', 'Tue (%)', 'Wed (%)', 'Thu (%)', 'Fri (%)', 'Sat (%)', 'Sun (%)'],
            peakHoursData.map((r) => [r.hour, r.mon, r.tue, r.wed, r.thu, r.fri, r.sat, r.sun]),
          );
          if (type === 'peak_hours') {
            downloadCSV(`pickleclub-peak-hours-${weekLabel}-${dateStr}.csv`, csv);
          }
        }

        if (type === 'full') {
          const revCSV = toCSV(
            ['Week', 'Revenue (PHP)', 'Credits Sold', 'Active Players'],
            weeklyRevenue.map((r) => [r.week, r.revenue, r.credits, r.players]),
          );
          const matchCSV = toCSV(
            ['Day', 'Matches', 'Avg Duration (min)', 'Completion Rate (%)'],
            matchStats.map((r) => [r.day, r.matches, r.avgDuration, r.completionRate]),
          );
          const peakCSV = toCSV(
            ['Hour', 'Mon (%)', 'Tue (%)', 'Wed (%)', 'Thu (%)', 'Fri (%)', 'Sat (%)', 'Sun (%)'],
            peakHoursData.map((r) => [r.hour, r.mon, r.tue, r.wed, r.thu, r.fri, r.sat, r.sun]),
          );
          const combined = `PICKLECLUB FULL REPORT — ${dateStr}\n\n=== WEEKLY REVENUE ===\n${revCSV}\n\n=== MATCH STATS ===\n${matchCSV}\n\n=== PEAK HOURS ===\n${peakCSV}`;
          downloadCSV(`pickleclub-full-report-${weekLabel}-${dateStr}.csv`, combined);
        }
      } catch (err) {
        console.error('[AdminReports] export error:', err);
      } finally {
        setExporting(null);
      }
    }, 300);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Report controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['current', 'previous'] as const).map((w) => (
            <button
              key={`week-${w}`}
              onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedWeek === w ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
            >
              {w === 'current' ? 'This Week' : 'Last Week'}
            </button>
          ))}
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="btn-secondary text-xs gap-1.5 py-2 flex items-center"
          >
            {exporting ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <Download size={14} />
            )}
            {exporting ? 'Exporting…' : 'Export Report'}
            <ChevronDown size={12} className={`transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-64 bg-card border border-border rounded-xl shadow-card-lg overflow-hidden fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">Export as CSV</p>
                  <button onClick={() => setShowExportMenu(false)} className="p-1 rounded-lg hover:bg-muted">
                    <X size={13} className="text-muted-foreground" />
                  </button>
                </div>
                {exportOptions.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={`export-${opt.id}`}
                      onClick={() => handleExport(opt.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border last:border-0"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <OptIcon size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                        <p className="text-2xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {reportSummary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="stat-card shadow-card">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg}`}>
                <Icon size={18} className={item.color} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold tabular-nums ${item.color}`}>{item.value}</div>
                <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                <p className="text-2xs text-positive mt-0.5">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Weekly revenue trend */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">Weekly Revenue Trend</h3>
            <button
              onClick={() => handleExport('revenue')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Export revenue CSV"
            >
              <Download size={13} className="text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Last 5 weeks · Credit package sales</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="weekRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="var(--primary)" fill="url(#weekRevGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Match stats */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">Matches Per Day — This Week</h3>
            <button
              onClick={() => handleExport('matches')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Export match stats CSV"
            >
              <Download size={13} className="text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Total: 195 matches · 28.4 avg per day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={matchStats} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="matches" name="matches" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak hours heatmap-style table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">Peak Hours Heatmap</h3>
          <button
            onClick={() => handleExport('peak_hours')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Export peak hours CSV"
          >
            <Download size={13} className="text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Court occupancy % by hour and day — darker = busier</p>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-muted-foreground font-semibold w-16">Hour</th>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <th key={`hm-${d}`} className="text-center py-2 px-1 text-muted-foreground font-semibold min-w-[52px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peakHoursData.map((row) => (
                <tr key={`hm-row-${row.hour}`}>
                  <td className="py-1 pr-4 text-muted-foreground font-medium whitespace-nowrap">{row.hour}</td>
                  {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                    const val = row[day];
                    const opacity = val / 100;
                    return (
                      <td key={`hm-cell-${row.hour}-${day}`} className="py-1 px-1 text-center">
                        <div
                          className="w-full h-8 rounded flex items-center justify-center text-2xs font-bold transition-all"
                          style={{
                            backgroundColor: `rgba(22, 163, 74, ${opacity * 0.85})`,
                            color: opacity > 0.5 ? 'white' : 'var(--muted-foreground)',
                          }}
                        >
                          {val}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}