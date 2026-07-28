'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, LogOut, Gavel, CreditCard, UserCircle, UsersRound, Trophy, CalendarDays, CheckSquare, Wrench, ClipboardList, Shield, MessageSquare, SlidersHorizontal, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';


interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  group?: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { id: 'nav-player', label: 'Player Dashboard', href: '/', icon: LayoutDashboard, group: 'Player', roles: ['player', 'admin'] },
  { id: 'nav-profile', label: 'My Profile', href: '/player-profile', icon: UserCircle, group: 'Player', roles: ['player', 'admin'] },
  { id: 'nav-leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy, group: 'Player', roles: ['player', 'staff', 'admin'] },
  { id: 'nav-court-reservation', label: 'Court Reservation', href: '/court-reservation', icon: CalendarDays, group: 'Player', roles: ['player', 'staff', 'admin'] },
  { id: 'nav-booking-confirmation', label: 'Booking Confirmation', href: '/booking-confirmation', icon: CheckSquare, group: 'Player', roles: ['player', 'staff', 'admin'] },
  { id: 'nav-messaging', label: 'Messages', href: '/player-messaging', icon: MessageSquare, group: 'Player', roles: ['player', 'admin'] },
  { id: 'nav-notifications', label: 'Notifications', href: '/notifications', icon: Bell, group: 'Player', roles: ['player', 'staff', 'admin'] },
  { id: 'nav-buy-credits', label: 'Buy Credits', href: '/buy-credits', icon: CreditCard, group: 'Player', roles: ['player', 'admin'] },
  { id: 'nav-staff', label: 'Staff Dashboard', href: '/staff-dashboard', icon: Gavel, group: 'Staff', roles: ['staff', 'admin'] },
  { id: 'nav-staff-presence', label: 'Staff Presence', href: '/staff-presence', icon: UsersRound, group: 'Staff', roles: ['staff', 'admin'] },
  { id: 'nav-court-maintenance', label: 'Court Maintenance', href: '/court-maintenance', icon: Wrench, group: 'Staff', roles: ['staff', 'admin'] },
  { id: 'nav-staff-scheduling', label: 'Staff Scheduling', href: '/staff-scheduling', icon: ClipboardList, group: 'Staff', roles: ['staff', 'admin'] },
  { id: 'nav-audit-log', label: 'Audit Log', href: '/audit-log', icon: Shield, group: 'Admin', roles: ['admin'] },
  { id: 'nav-role-permissions', label: 'Role & Permissions', href: '/role-permissions', icon: SlidersHorizontal, group: 'Admin', roles: ['admin'] },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings, group: 'Admin', roles: ['player', 'staff', 'admin'] },
  { id: 'nav-admin', label: 'Admin Panel', href: '/admin-panel', icon: Settings, group: 'Admin', roles: ['admin'] },
];

const groups = ['Player', 'Staff', 'Admin'];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  isFixed?: boolean;
}

export default function Sidebar({ collapsed, onToggle, isMobile = false, isFixed = true }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const userRole = profile?.role || 'player';

  useEffect(() => {
    console.log('[Sidebar] Profile changed:', profile?.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!profile?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('[Sidebar] Fetching unread count for user:', user.id);

        // Get all conversations the user is part of
        const { data: participantData } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id);

        console.log('[Sidebar] Participant data:', participantData);

        if (!participantData || participantData.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Count unread messages across all conversations
        let totalUnread = 0;
        for (const participant of participantData) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', participant.conversation_id)
            .gt('created_at', participant.last_read_at || new Date(0).toISOString())
            .neq('sender_id', user.id);

          console.log(`[Sidebar] Conversation ${participant.conversation_id}: last_read_at=${participant.last_read_at}, unread=${count}`);
          totalUnread += count || 0;
        }

        console.log('[Sidebar] Total unread count:', totalUnread);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('[Sidebar] Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [profile?.id, supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.replace('/login');
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  // Dynamic nav items with badge counts
  const dynamicNavItems = navItems.map(item => {
    if (item.id === 'nav-messaging') {
      return { ...item, badge: unreadCount };
    }
    return item;
  });

  return (
    <aside
      className={`
        ${isFixed ? 'fixed left-0 top-0' : ''} h-full z-40 flex flex-col bg-card border-r border-border shadow-card
        sidebar-transition overflow-y-auto
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-border flex-shrink-0 ${collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-base text-foreground tracking-tight leading-tight">PickleClub</span>
            <span className="text-2xs text-muted-foreground font-medium">Club Management</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {groups.map((group) => {
          const groupItems = dynamicNavItems.filter(
            (item) => item.group === group && (!item.roles || item.roles.includes(userRole))
          );
          if (groupItems.length === 0) return null;
          return (
            <div key={`group-${group}`} className="mb-4">
              {!collapsed && (
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1.5">
                  {group}
                </p>
              )}
              {groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <div key={item.id} className="relative group/nav">
                    <Link
                      href={item.href}
                      className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && item.badge > 0 && (
                        <span className="ml-auto flex-shrink-0 bg-negative text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-negative rounded-full" />
                      )}
                    </Link>
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-primary-foreground text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border px-2 py-3 flex-shrink-0 relative z-50">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full gradient-green flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || 'Loading...'}</p>
              <p className="text-2xs text-muted-foreground truncate">{roleLabel} · {profile?.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        )}
        <div className="relative group/logout">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={`nav-item nav-item-inactive w-full ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>}
          </button>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-primary-foreground text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
              Sign Out
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`nav-item nav-item-inactive w-full mt-1 ${collapsed ? 'justify-center px-0' : 'justify-between'} pointer-events-auto`}
        >
          {!collapsed && <span className="text-xs">Collapse</span>}
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
