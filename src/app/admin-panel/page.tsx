'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminOverview from '@/app/admin-panel/components/AdminOverview';
import AdminPlayers from '@/app/admin-panel/components/AdminPlayers';
import AdminCourts from '@/app/admin-panel/components/AdminCourts';
import AdminPackages from '@/app/admin-panel/components/AdminPackages';
import AdminReports from '@/app/admin-panel/components/AdminReports';
import AdminActivityFeed from '@/app/admin-panel/components/AdminActivityFeed';
import { LayoutDashboard, Users, Layers, Tag, BarChart3, Activity } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type AdminTab = 'overview' | 'players' | 'courts' | 'packages' | 'reports' | 'activity';

const tabs: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'courts', label: 'Courts', icon: Layers },
  { id: 'packages', label: 'Packages', icon: Tag },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity', label: 'Activity Feed', icon: Activity },
];

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              PickleClub Management · Wednesday, July 22, 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-positive/10 text-positive px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-positive" />
              System Operational
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-card text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.badge && (
                  <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="fade-in" key={activeTab}>
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'players' && <AdminPlayers />}
          {activeTab === 'courts' && <AdminCourts />}
          {activeTab === 'packages' && <AdminPackages />}
          {activeTab === 'reports' && <AdminReports />}
          {activeTab === 'activity' && <AdminActivityFeed />}
        </div>
      </div>
    </AppLayout>
  );
}