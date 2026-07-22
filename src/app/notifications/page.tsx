'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

import { useAuth } from '@/contexts/AuthContext';
import { Bell, Trophy, Calendar, CreditCard, MessageSquare, AlertTriangle, CheckCircle2, Info, X, Check, CheckCheck, Filter, Trash2, Activity } from 'lucide-react';

type NotifCategory = 'all' | 'match' | 'booking' | 'payment' | 'message' | 'system' | 'alert';
type NotifPriority = 'high' | 'medium' | 'low';

interface Notification {
  id: string;
  category: Exclude<NotifCategory, 'all'>;
  priority: NotifPriority;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  actionLabel?: string;
  actionHref?: string;
}

const CATEGORY_META: Record<Exclude<NotifCategory, 'all'>, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  match:   { icon: Trophy,        color: 'text-accent',    bg: 'bg-accent/10',    label: 'Match' },
  booking: { icon: Calendar,      color: 'text-info',      bg: 'bg-info/10',      label: 'Booking' },
  payment: { icon: CreditCard,    color: 'text-positive',  bg: 'bg-positive/10',  label: 'Payment' },
  message: { icon: MessageSquare, color: 'text-primary',   bg: 'bg-primary/10',   label: 'Message' },
  system:  { icon: Info,          color: 'text-muted-foreground', bg: 'bg-muted', label: 'System' },
  alert:   { icon: AlertTriangle, color: 'text-negative',  bg: 'bg-negative/10',  label: 'Alert' },
};

const PRIORITY_DOT: Record<NotifPriority, string> = {
  high:   'bg-negative',
  medium: 'bg-warning',
  low:    'bg-muted-foreground',
};

// Mock notifications — in production these would come from a notifications table
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', category: 'match', priority: 'high', isRead: false,
    title: 'Match Result Posted',
    body: 'Your match on Court A ended 11–7. Rating +18 pts. Great win!',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    actionLabel: 'View Match', actionHref: '/',
  },
  {
    id: 'n2', category: 'match', priority: 'medium', isRead: false,
    title: 'Live Match Started',
    body: 'A match you are following just started on Court B. Score: 0–0.',
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    actionLabel: 'Watch Live', actionHref: '/',
  },
  {
    id: 'n3', category: 'booking', priority: 'high', isRead: false,
    title: 'Court Reservation Confirmed',
    body: 'Court C is reserved for you tomorrow at 9:00 AM for 60 minutes.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    actionLabel: 'View Booking', actionHref: '/booking-confirmation',
  },
  {
    id: 'n4', category: 'payment', priority: 'medium', isRead: true,
    title: 'Credits Purchased',
    body: 'You successfully purchased 50 credits. New balance: 120 credits.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    actionLabel: 'View Wallet', actionHref: '/buy-credits',
  },
  {
    id: 'n5', category: 'message', priority: 'medium', isRead: false,
    title: 'New Message from Alex Reyes',
    body: '"Hey, are you up for a doubles match this Saturday?"',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    actionLabel: 'Reply', actionHref: '/player-messaging',
  },
  {
    id: 'n6', category: 'alert', priority: 'high', isRead: false,
    title: 'Court D Under Maintenance',
    body: 'Court D is temporarily closed for net replacement. Expected back by 3 PM.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'n7', category: 'match', priority: 'low', isRead: true,
    title: 'Weekly Match Summary',
    body: 'This week: 3 wins, 1 loss. Win rate 75%. Rating up by 42 pts.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    actionLabel: 'View Stats', actionHref: '/',
  },
  {
    id: 'n8', category: 'booking', priority: 'medium', isRead: true,
    title: 'Booking Reminder',
    body: 'Your court reservation on Court A starts in 1 hour. Don\'t forget to check in!',
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    actionLabel: 'Check In', actionHref: '/booking-confirmation',
  },
  {
    id: 'n9', category: 'system', priority: 'low', isRead: true,
    title: 'App Updated to v2.4',
    body: 'New features: Live match results, notification center, and improved leaderboard.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'n10', category: 'payment', priority: 'high', isRead: false,
    title: 'Low Credit Balance',
    body: 'You have only 5 credits remaining. Top up to keep booking courts.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    actionLabel: 'Buy Credits', actionHref: '/buy-credits',
  },
  {
    id: 'n11', category: 'message', priority: 'low', isRead: true,
    title: 'Group Chat: Weekend Warriors',
    body: 'Maria Santos: "Who\'s in for Sunday morning open play?"',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    actionLabel: 'Open Chat', actionHref: '/player-messaging',
  },
  {
    id: 'n12', category: 'alert', priority: 'medium', isRead: true,
    title: 'Queue Position Update',
    body: 'You moved up to position #2 in the waiting queue. Estimated wait: 8 minutes.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenterPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.isRead) return false;
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;
    return true;
  });

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
  };

  const categories: NotifCategory[] = ['all', 'match', 'booking', 'payment', 'message', 'alert', 'system'];

  const categoryCount = (cat: NotifCategory) => {
    if (cat === 'all') return notifications.filter((n) => !n.isRead).length;
    return notifications.filter((n) => n.category === cat && !n.isRead).length;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <Bell size={20} className="text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-negative text-white text-2xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Notification Center</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowUnreadOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border ${
                showUnreadOnly
                  ? 'bg-primary/10 text-primary border-primary/20' :'bg-secondary text-secondary-foreground border-border hover:bg-muted'
              }`}
            >
              <Filter size={12} />
              Unread only
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-negative hover:bg-negative/10 border border-transparent transition-colors"
            >
              <Trash2 size={12} />
              Clear read
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: notifications.length, icon: Bell, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Unread', value: unreadCount, icon: Activity, color: 'text-negative', bg: 'bg-negative/10' },
            { label: 'High Priority', value: notifications.filter((n) => n.priority === 'high' && !n.isRead).length, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Match Alerts', value: notifications.filter((n) => n.category === 'match' && !n.isRead).length, icon: Trophy, color: 'text-accent', bg: 'bg-accent/10' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground tabular-nums">{kpi.value}</p>
                <p className="text-2xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {categories.map((cat) => {
            const count = categoryCount(cat);
            const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted border border-border'
                }`}
              >
                {meta && <meta.icon size={12} />}
                {cat === 'all' ? 'All' : meta?.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-2xs font-bold min-w-[18px] text-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-negative/10 text-negative'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 size={36} className="mb-3 opacity-20" />
              <p className="text-sm font-semibold">
                {showUnreadOnly ? 'No unread notifications' : 'No notifications here'}
              </p>
              <p className="text-xs mt-1">
                {showUnreadOnly ? 'Toggle off "Unread only" to see all' : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((notif) => {
                const meta = CATEGORY_META[notif.category];
                const IconComp = meta.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-4 px-5 py-4 transition-colors duration-150 hover:bg-muted/30 cursor-pointer ${
                      !notif.isRead ? 'bg-primary/[0.02]' : ''
                    }`}
                    onClick={() => markRead(notif.id)}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <IconComp size={16} className={meta.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${notif.isRead ? 'text-foreground' : 'text-foreground'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[notif.priority]}`} title={`${notif.priority} priority`} />
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-2xs text-muted-foreground whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        {notif.actionLabel && notif.actionHref && (
                          <a
                            href={notif.actionHref}
                            onClick={(e) => e.stopPropagation()}
                            className="text-2xs font-semibold text-primary hover:underline"
                          >
                            {notif.actionLabel} →
                          </a>
                        )}
                        {!notif.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                            className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Check size={10} /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-2xs text-muted-foreground pb-2">
          Notifications are retained for 30 days · High-priority alerts are also sent via email
        </p>
      </div>
    </AppLayout>
  );
}
