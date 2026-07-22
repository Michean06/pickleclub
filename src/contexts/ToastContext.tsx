'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ToastContextType {
  notifySuccess: (message: string, description?: string) => void;
  notifyError: (message: string, description?: string) => void;
  notifyInfo: (message: string, description?: string) => void;
  notifyWarning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType>({} as ToastContextType);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const supabase = createClient();
  const channelsRef = useRef<any[]>([]);

  const notifySuccess = useCallback((message: string, description?: string) => {
    toast.success(message, { description });
  }, []);

  const notifyError = useCallback((message: string, description?: string) => {
    toast.error(message, { description });
  }, []);

  const notifyInfo = useCallback((message: string, description?: string) => {
    toast.info(message, { description });
  }, []);

  const notifyWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, { description });
  }, []);

  useEffect(() => {
    if (!profile) return;

    // Clean up previous channels
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    // ── 1. Queue changes ──────────────────────────────────────────────────
    const queueChannel = supabase
      .channel('rt-queue-toasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queue_entries' },
        (payload: any) => {
          if (profile.role === 'staff' || profile.role === 'admin') {
            toast.info('New player joined the queue', {
              description: `Queue entry #${payload.new?.queue_number ?? '—'} added`,
              duration: 4000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_entries' },
        (payload: any) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          if (newStatus === 'playing' && oldStatus === 'waiting') {
            if (profile.role === 'staff' || profile.role === 'admin') {
              toast.success('Player moved to court', {
                description: `Queue #${payload.new?.queue_number ?? '—'} is now playing`,
                duration: 4000,
              });
            }
          }
          if (newStatus === 'cancelled') {
            if (profile.role === 'staff' || profile.role === 'admin') {
              toast.warning('Player left the queue', {
                description: `Queue #${payload.new?.queue_number ?? '—'} was cancelled`,
                duration: 4000,
              });
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(queueChannel);

    // ── 2. Match start / end ──────────────────────────────────────────────
    const matchChannel = supabase
      .channel('rt-match-toasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'active_matches' },
        () => {
          if (profile.role === 'staff' || profile.role === 'admin') {
            toast.success('New match started', {
              description: 'A court session has begun',
              duration: 4000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'active_matches' },
        () => {
          if (profile.role === 'staff' || profile.role === 'admin') {
            toast.info('Match ended', {
              description: 'A court session has been completed',
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    channelsRef.current.push(matchChannel);

    // ── 3. Credit transactions for the current player ─────────────────────
    const creditChannel = supabase
      .channel(`rt-credits-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `player_id=eq.${profile.id}`,
        },
        (payload: any) => {
          const delta = payload.new?.credits_delta ?? 0;
          const reason = payload.new?.reason || 'Credit update';
          if (delta > 0) {
            toast.success(`+${delta} credits added`, { description: reason, duration: 5000 });
          } else if (delta < 0) {
            toast.warning(`${delta} credits deducted`, { description: reason, duration: 5000 });
          }
        }
      )
      .subscribe();

    channelsRef.current.push(creditChannel);

    // ── 4. Court status changes ───────────────────────────────────────────
    const courtChannel = supabase
      .channel('rt-court-toasts')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'courts' },
        (payload: any) => {
          if (profile.role === 'staff' || profile.role === 'admin') {
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            const courtName = payload.new?.name ?? 'Court';
            if (newStatus === 'maintenance' && oldStatus !== 'maintenance') {
              toast.warning(`${courtName} set to maintenance`, {
                description: 'Court is temporarily unavailable',
                duration: 5000,
              });
            } else if (newStatus === 'available' && oldStatus === 'maintenance') {
              toast.success(`${courtName} is back online`, {
                description: 'Court is now available for play',
                duration: 4000,
              });
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(courtChannel);

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [profile, supabase]);

  return (
    <ToastContext.Provider value={{ notifySuccess, notifyError, notifyInfo, notifyWarning }}>
      {children}
    </ToastContext.Provider>
  );
};
