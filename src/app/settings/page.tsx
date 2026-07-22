'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  User, Bell, Palette, Lock, Shield, ChevronRight, Check,
  Moon, Sun, Monitor, Volume2, VolumeX, Mail, MessageSquare,
  Smartphone, Globe, Eye, EyeOff, Key, LogOut, Trash2, Save
} from 'lucide-react';



type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'security';

interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      aria-label={label}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-border'}`}
    >
      <span
        className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'security', label: 'Security', icon: Lock },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@pickleclub.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [bio, setBio] = useState('Passionate pickleball player. 4.5 rating. Love doubles!');
  const [language, setLanguage] = useState('en');

  // Notification state
  const [notif, setNotif] = useState({
    emailBooking: true,
    emailPromo: false,
    pushBooking: true,
    pushQueue: true,
    pushMessages: true,
    pushMaintenance: false,
    smsReminders: true,
    soundEnabled: true,
  });

  // Appearance state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [density, setDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [accentColor, setAccentColor] = useState('#22c55e');

  // Privacy state
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showStats: true,
    showOnLeaderboard: true,
    allowMessages: true,
    shareActivity: false,
  });

  // Security state
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ACCENT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings & Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account settings and personal preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <aside className="w-52 flex-shrink-0">
            <nav className="space-y-0.5">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <TabIcon size={16} />
                    {tab.label}
                    {isActive && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">

              {/* ── PROFILE ── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-foreground">Profile Information</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full gradient-green flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      AR
                    </div>
                    <div>
                      <button className="text-sm font-medium text-primary hover:underline">Change photo</button>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or GIF · max 2 MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Display Name</label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone Number</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{bio.length}/160 characters</p>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>

                  {[
                    {
                      group: 'Email Notifications',
                      icon: Mail,
                      items: [
                        { key: 'emailBooking', label: 'Booking confirmations & reminders', desc: 'Get emailed when a booking is confirmed or upcoming' },
                        { key: 'emailPromo', label: 'Promotions & club news', desc: 'Occasional updates about events and offers' },
                      ],
                    },
                    {
                      group: 'Push Notifications',
                      icon: Smartphone,
                      items: [
                        { key: 'pushBooking', label: 'Booking updates', desc: 'Real-time alerts for booking status changes' },
                        { key: 'pushQueue', label: 'Queue position changes', desc: 'Notified when your queue position moves' },
                        { key: 'pushMessages', label: 'New messages', desc: 'Alerts for incoming player messages' },
                        { key: 'pushMaintenance', label: 'Court maintenance alerts', desc: 'When a court you booked goes into maintenance' },
                      ],
                    },
                    {
                      group: 'SMS Reminders',
                      icon: MessageSquare,
                      items: [
                        { key: 'smsReminders', label: 'Session reminders via SMS', desc: '30-minute reminder before your court session' },
                      ],
                    },
                  ].map(({ group, icon: GroupIcon, items }) => (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-3">
                        <GroupIcon size={15} className="text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{group}</span>
                      </div>
                      <div className="space-y-3 pl-5">
                        {items.map(({ key, label, desc }) => (
                          <div key={key} className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                            <Toggle
                              enabled={notif[key as keyof typeof notif]}
                              onChange={(v) => setNotif((p) => ({ ...p, [key]: v }))}
                              label={label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      {notif.soundEnabled ? <Volume2 size={15} className="text-muted-foreground" /> : <VolumeX size={15} className="text-muted-foreground" />}
                      <div>
                        <p className="text-sm text-foreground">Notification sounds</p>
                        <p className="text-xs text-muted-foreground">Play a sound for in-app alerts</p>
                      </div>
                    </div>
                    <Toggle enabled={notif.soundEnabled} onChange={(v) => setNotif((p) => ({ ...p, soundEnabled: v }))} label="Sound" />
                  </div>
                </div>
              )}

              {/* ── APPEARANCE ── */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-foreground">Appearance</h2>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ] as const).map(({ id, label, icon: ThemeIcon }) => (
                        <button
                          key={id}
                          onClick={() => setTheme(id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            theme === id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          <ThemeIcon size={20} className={theme === id ? 'text-primary' : 'text-muted-foreground'} />
                          <span className={`text-sm font-medium ${theme === id ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                          {theme === id && <Check size={12} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Accent Color</p>
                    <div className="flex gap-3 flex-wrap">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setAccentColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${accentColor === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Display Density</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['compact', 'default', 'comfortable'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                            density === d ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRIVACY ── */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-foreground">Privacy Settings</h2>

                  <div className="space-y-4">
                    {[
                      { key: 'showProfile', label: 'Public profile', desc: 'Allow other players to view your profile', icon: Globe },
                      { key: 'showStats', label: 'Show statistics', desc: 'Display your win/loss record and rating publicly', icon: Eye },
                      { key: 'showOnLeaderboard', label: 'Appear on leaderboard', desc: 'Include your name in the club leaderboard', icon: Shield },
                      { key: 'allowMessages', label: 'Allow direct messages', desc: 'Let other players send you messages', icon: MessageSquare },
                      { key: 'shareActivity', label: 'Share activity data', desc: 'Help improve the app by sharing anonymous usage data', icon: Globe },
                    ].map(({ key, label, desc, icon: ItemIcon }) => (
                      <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ItemIcon size={14} className="text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                        <Toggle
                          enabled={privacy[key as keyof typeof privacy]}
                          onChange={(v) => setPrivacy((p) => ({ ...p, [key]: v }))}
                          label={label}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <EyeOff size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Data & Privacy</p>
                        <p className="text-xs text-amber-700 mt-0.5">You can request a full export of your data or delete your account at any time. Contact support for assistance.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECURITY ── */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-foreground">Security</h2>

                  {/* Password */}
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Key size={15} className="text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Change Password</span>
                    </div>
                    {['Current password', 'New password', 'Confirm new password'].map((placeholder) => (
                      <input
                        key={placeholder}
                        type="password"
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      />
                    ))}
                    <button className="text-sm font-medium text-primary hover:underline">Update password</button>
                  </div>

                  {/* 2FA */}
                  <div className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Smartphone size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <Toggle enabled={twoFactor} onChange={setTwoFactor} label="2FA" />
                    </div>
                    {twoFactor && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Scan the QR code with your authenticator app to complete setup.</p>
                        <div className="mt-2 w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">QR Code</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session timeout */}
                  <div className="border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock size={15} className="text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Session Timeout</span>
                    </div>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="240">4 hours</option>
                      <option value="0">Never</option>
                    </select>
                  </div>

                  {/* Danger zone */}
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                    <p className="text-sm font-semibold text-red-700 mb-3">Danger Zone</p>
                    <div className="space-y-2">
                      <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium">
                        <LogOut size={14} />
                        Sign out of all devices
                      </button>
                      <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium">
                        <Trash2 size={14} />
                        Delete account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save button */}
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {saved ? <Check size={15} /> : <Save size={15} />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
