'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Shield, Plus, Search, ChevronDown, ChevronUp, Check, X,
  Edit2, Trash2, Users, Lock, Eye, Settings, CreditCard,
  Calendar, MessageSquare, BarChart2, Wrench, UserCheck, Save
} from 'lucide-react';

type RoleId = 'admin' | 'staff' | 'player' | 'guest';

interface Permission {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: React.ElementType;
}

interface Role {
  id: RoleId;
  name: string;
  description: string;
  color: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
}

const ALL_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'view_dashboard', label: 'View Dashboard', description: 'Access the main player dashboard', category: 'Dashboard', icon: BarChart2 },
  { id: 'view_admin_panel', label: 'View Admin Panel', description: 'Access the admin control panel', category: 'Dashboard', icon: Settings },
  { id: 'view_staff_dashboard', label: 'View Staff Dashboard', description: 'Access the staff operations dashboard', category: 'Dashboard', icon: UserCheck },
  // Courts
  { id: 'view_courts', label: 'View Courts', description: 'See court availability and status', category: 'Courts', icon: Eye },
  { id: 'book_courts', label: 'Book Courts', description: 'Make court reservations', category: 'Courts', icon: Calendar },
  { id: 'manage_courts', label: 'Manage Courts', description: 'Edit court status and settings', category: 'Courts', icon: Wrench },
  { id: 'maintenance_courts', label: 'Court Maintenance', description: 'Create and manage maintenance tasks', category: 'Courts', icon: Wrench },
  // Players
  { id: 'view_players', label: 'View Players', description: 'Browse player profiles and stats', category: 'Players', icon: Users },
  { id: 'manage_players', label: 'Manage Players', description: 'Edit player accounts and roles', category: 'Players', icon: Users },
  { id: 'suspend_players', label: 'Suspend Players', description: 'Suspend or ban player accounts', category: 'Players', icon: Lock },
  // Credits
  { id: 'view_credits', label: 'View Credits', description: 'See own credit balance', category: 'Credits', icon: CreditCard },
  { id: 'buy_credits', label: 'Buy Credits', description: 'Purchase credit packages', category: 'Credits', icon: CreditCard },
  { id: 'manage_credits', label: 'Manage Credits', description: 'Add or deduct credits for any player', category: 'Credits', icon: CreditCard },
  // Messaging
  { id: 'send_messages', label: 'Send Messages', description: 'Send direct messages to players', category: 'Messaging', icon: MessageSquare },
  { id: 'broadcast_messages', label: 'Broadcast Messages', description: 'Send announcements to all players', category: 'Messaging', icon: MessageSquare },
  // Reports & Logs
  { id: 'view_reports', label: 'View Reports', description: 'Access analytics and reports', category: 'Reports', icon: BarChart2 },
  { id: 'view_audit_log', label: 'View Audit Log', description: 'Access the system audit log', category: 'Reports', icon: Shield },
  { id: 'export_data', label: 'Export Data', description: 'Export reports and data as CSV', category: 'Reports', icon: BarChart2 },
  // System
  { id: 'manage_roles', label: 'Manage Roles', description: 'Create and edit roles and permissions', category: 'System', icon: Shield },
  { id: 'manage_settings', label: 'Manage Settings', description: 'Change system-wide settings', category: 'System', icon: Settings },
];

const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features and settings',
    color: 'bg-red-100 text-red-700 border-red-200',
    userCount: 2,
    permissions: ALL_PERMISSIONS.map((p) => p.id),
    isSystem: true,
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Manage courts, sessions, and player check-ins',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    userCount: 6,
    permissions: [
      'view_dashboard', 'view_staff_dashboard', 'view_courts', 'book_courts',
      'manage_courts', 'maintenance_courts', 'view_players', 'manage_credits',
      'send_messages', 'view_reports',
    ],
    isSystem: true,
  },
  {
    id: 'player',
    name: 'Player',
    description: 'Standard player access — book courts, view stats',
    color: 'bg-green-100 text-green-700 border-green-200',
    userCount: 148,
    permissions: [
      'view_dashboard', 'view_courts', 'book_courts', 'view_credits',
      'buy_credits', 'send_messages', 'view_players',
    ],
    isSystem: true,
  },
  {
    id: 'guest',
    name: 'Guest',
    description: 'Limited read-only access for visitors',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    userCount: 12,
    permissions: ['view_courts', 'view_players'],
    isSystem: false,
  },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Sam Torres', email: 'sam.torres@pickleclub.com', role: 'admin' as RoleId, avatar: 'ST' },
  { id: 'u2', name: 'Alex Rivera', email: 'alex.rivera@pickleclub.com', role: 'staff' as RoleId, avatar: 'AR' },
  { id: 'u3', name: 'Jordan Lee', email: 'jordan.lee@pickleclub.com', role: 'staff' as RoleId, avatar: 'JL' },
  { id: 'u4', name: 'Maria Santos', email: 'maria.santos@pickleclub.com', role: 'player' as RoleId, avatar: 'MS' },
  { id: 'u5', name: 'Chris Park', email: 'chris.park@pickleclub.com', role: 'player' as RoleId, avatar: 'CP' },
  { id: 'u6', name: 'Dana Kim', email: 'dana.kim@pickleclub.com', role: 'guest' as RoleId, avatar: 'DK' },
];

const CATEGORIES = [...new Set(ALL_PERMISSIONS.map((p) => p.category))];

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [selectedRole, setSelectedRole] = useState<RoleId>('admin');
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const role = roles.find((r) => r.id === selectedRole)!;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePermission = (permId: string) => {
    if (role.isSystem && role.id === 'admin') return; // admin always has all
    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRole
          ? {
              ...r,
              permissions: r.permissions.includes(permId)
                ? r.permissions.filter((p) => p !== permId)
                : [...r.permissions, permId],
            }
          : r
      )
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredPerms = ALL_PERMISSIONS.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const roleUsers = filteredUsers.filter((u) => u.role === selectedRole);

  const permsByCategory = CATEGORIES.reduce<Record<string, Permission[]>>((acc, cat) => {
    acc[cat] = filteredPerms.filter((p) => p.category === cat);
    return acc;
  }, {});

  const totalPerms = ALL_PERMISSIONS.length;
  const grantedPerms = role.permissions.length;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Role & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define what each role can access and do within PickleClub</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus size={15} />
            New Role
          </button>
        </div>

        <div className="flex gap-6">
          {/* Role list */}
          <aside className="w-56 flex-shrink-0 space-y-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  selectedRole === r.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${r.color}`}>{r.name}</span>
                  {r.isSystem && (
                    <span className="text-2xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">System</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Users size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{r.userCount} users</span>
                </div>
              </button>
            ))}
          </aside>

          {/* Main panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              {/* Role header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">{role.name}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${role.color}`}>{role.id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!role.isSystem && (
                    <>
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Edit2 size={15} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  { label: 'Permissions Granted', value: `${grantedPerms} / ${totalPerms}` },
                  { label: 'Users Assigned', value: role.userCount },
                  { label: 'Coverage', value: `${Math.round((grantedPerms / totalPerms) * 100)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 py-3 text-center">
                    <p className="text-lg font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border px-6">
                {(['permissions', 'users'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* PERMISSIONS TAB */}
                {activeTab === 'permissions' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search permissions..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        />
                      </div>
                      {role.id === 'admin' && (
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">Admin has all permissions</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {CATEGORIES.map((cat) => {
                        const catPerms = permsByCategory[cat];
                        if (!catPerms || catPerms.length === 0) return null;
                        const isExpanded = expandedCategories.includes(cat);
                        const grantedInCat = catPerms.filter((p) => role.permissions.includes(p.id)).length;

                        return (
                          <div key={cat} className="border border-border rounded-xl overflow-hidden">
                            <button
                              onClick={() => toggleCategory(cat)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-foreground">{cat}</span>
                                <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
                                  {grantedInCat}/{catPerms.length}
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                            </button>

                            {isExpanded && (
                              <div className="divide-y divide-border">
                                {catPerms.map((perm) => {
                                  const PermIcon = perm.icon;
                                  const isGranted = role.permissions.includes(perm.id);
                                  const isLocked = role.id === 'admin';

                                  return (
                                    <div
                                      key={perm.id}
                                      className={`flex items-center justify-between px-4 py-3 ${!isLocked ? 'hover:bg-muted/30 cursor-pointer' : ''} transition-colors`}
                                      onClick={() => !isLocked && togglePermission(perm.id)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                          <PermIcon size={13} className="text-muted-foreground" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-foreground">{perm.label}</p>
                                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                                        </div>
                                      </div>
                                      <div
                                        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                          isGranted
                                            ? 'bg-primary border-primary' :'bg-background border-border'
                                        } ${isLocked ? 'opacity-60' : ''}`}
                                      >
                                        {isGranted && <Check size={13} className="text-white" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search users..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        />
                      </div>
                      <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                        <Plus size={14} />
                        Assign User
                      </button>
                    </div>

                    {roleUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users size={32} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No users assigned to this role</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {roleUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full gradient-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {user.avatar}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                defaultValue={user.role}
                                className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                              <button className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Save */}
                {activeTab === 'permissions' && !role.isSystem || (activeTab === 'permissions' && role.id !== 'admin') ? (
                  <div className="mt-6 pt-4 border-t border-border flex justify-end">
                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {saved ? <Check size={15} /> : <Save size={15} />}
                      {saved ? 'Saved!' : 'Save Permissions'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
