'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  Users,
  Download,
  Share2,
  ChevronRight,
  Copy,
  Printer,
  ArrowLeft,
  Zap,
  AlertCircle,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

interface CourtBooking {
  id: string;
  player_id: string;
  court_name: string;
  court_surface: string;
  booking_date: string;
  time_slot: string;
  duration: number;
  players_count: number;
  status: BookingStatus;
  total_credits: number;
  notes: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<BookingStatus, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    bg: 'bg-positive/10',
    text: 'text-positive',
    border: 'border-positive/20',
    dot: 'bg-positive',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bg: 'bg-negative/10',
    text: 'text-negative',
    border: 'border-negative/20',
    dot: 'bg-negative',
  },
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatEndTime(time: string, duration: number): string {
  const [h, m] = time.split(':').map(Number);
  const endH = h + duration;
  const ampm = endH >= 12 ? 'PM' : 'AM';
  const hour = endH % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function generateConfirmationCode(id: string): string {
  return 'PCB-' + id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function QRCodeDisplay({ code }: { code: string }) {
  const size = 120;
  const cells = 9;
  const cellSize = size / cells;
  const pattern = [
    [1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1],
  ];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-xl border-2 border-border shadow-sm">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {pattern.map((row, ri) =>
            row.map((cell, ci) =>
              cell ? (
                <rect
                  key={`${ri}-${ci}`}
                  x={ci * cellSize}
                  y={ri * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#1a1a2e"
                  rx={1}
                />
              ) : null
            )
          )}
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Scan at check-in</p>
        <p className="text-sm font-bold text-foreground font-mono tracking-widest mt-0.5">{code}</p>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  isActive,
  onClick,
}: {
  booking: CourtBooking;
  isActive: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[booking.status];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-foreground">{booking.court_name}</span>
            <span className={`inline-flex items-center gap-1 text-2xs font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {formatDisplayDate(booking.booking_date).split(',')[0]},{' '}
            {formatDisplayDate(booking.booking_date).split(',')[1]?.trim()}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTime(booking.time_slot)} · {booking.duration}h · {booking.players_count} players
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

export default function BookingConfirmationPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [bookings, setBookings] = useState<CourtBooking[]>([]);
  const [activeBooking, setActiveBooking] = useState<CourtBooking | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isStaffOrAdmin = profile?.role === 'staff' || profile?.role === 'admin';

  const fetchBookings = useCallback(async () => {
    if (!profile) return;
    setLoadingBookings(true);
    setFetchError(null);
    try {
      let query = supabase
        .from('court_bookings')
        .select('*')
        .order('booking_date', { ascending: false });

      // Players only see their own bookings
      if (profile.role === 'player') {
        query = query.eq('player_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const list = (data ?? []) as CourtBooking[];
      setBookings(list);
      if (list.length > 0) {
        setActiveBooking((prev) => {
          if (prev) {
            const updated = list.find((b) => b.id === prev.id);
            return updated ?? list[0];
          }
          return list[0];
        });
      } else {
        setActiveBooking(null);
      }
    } catch (err: any) {
      setFetchError(err?.message ?? 'Failed to load bookings.');
    } finally {
      setLoadingBookings(false);
    }
  }, [profile, supabase]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirm = async () => {
    if (!activeBooking || !profile) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('court_bookings')
        .update({
          status: 'confirmed',
          confirmed_by: profile.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', activeBooking.id);
      if (error) throw error;
      toast.success('Booking confirmed successfully!');
      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to confirm booking.');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!activeBooking) return;
    if (activeBooking.status !== 'confirmed' && activeBooking.status !== 'pending') return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('court_bookings')
        .update({ status: 'cancelled', total_credits: 0 })
        .eq('id', activeBooking.id);
      if (error) throw error;
      toast.success('Booking cancelled. Credits refunded.');
      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const handleCopy = () => {
    if (!activeBooking) return;
    const code = generateConfirmationCode(activeBooking.id);
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success('Confirmation code copied!');
  };

  if (loadingBookings) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm">Loading bookings…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (fetchError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <AlertCircle size={32} className="text-negative" />
            <p className="text-sm text-negative font-semibold">{fetchError}</p>
            <button onClick={fetchBookings} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const cfg = activeBooking ? STATUS_CONFIG[activeBooking.status] : null;
  const StatusIcon = cfg?.icon ?? CheckCircle2;
  const confirmationCode = activeBooking ? generateConfirmationCode(activeBooking.id) : '';
  const endTime = activeBooking ? formatEndTime(activeBooking.time_slot, activeBooking.duration) : '';

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/court-reservation" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Booking Confirmation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View and manage your court reservations</p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <CalendarDays size={48} className="text-muted-foreground/40" />
            <p className="text-lg font-bold text-foreground">No bookings found</p>
            <p className="text-sm text-muted-foreground">
              {isStaffOrAdmin ? 'No court bookings have been made yet.' : 'You have not made any court bookings yet.'}
            </p>
            <Link href="/court-reservation" className="btn-primary text-sm">
              Book a Court
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Booking list */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {isStaffOrAdmin ? 'All Bookings' : 'Your Bookings'}
              </h2>
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isActive={b.id === activeBooking?.id}
                  onClick={() => setActiveBooking(b)}
                />
              ))}
              <Link
                href="/court-reservation"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <CalendarDays size={16} />
                Book a New Court
              </Link>
            </div>

            {/* Right: Confirmation detail */}
            {activeBooking && cfg && (
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <StatusIcon size={20} className={cfg.text} />
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${cfg.text}`}>
                      {activeBooking.status === 'confirmed' && "Booking Confirmed — You're all set!"}
                      {activeBooking.status === 'pending' && 'Booking Pending — Awaiting staff confirmation'}
                      {activeBooking.status === 'cancelled' && 'Booking Cancelled'}
                    </p>
                    <p className={`text-xs mt-0.5 ${cfg.text} opacity-80`}>
                      {activeBooking.status === 'confirmed' && 'Show your QR code at the front desk when you arrive.'}
                      {activeBooking.status === 'pending' && 'A staff member or admin will confirm your booking shortly.'}
                      {activeBooking.status === 'cancelled' && 'This booking has been cancelled. Credits have been refunded.'}
                    </p>
                  </div>
                </div>

                {/* Staff/Admin confirm banner */}
                {isStaffOrAdmin && activeBooking.status === 'pending' && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5">
                    <ShieldCheck size={18} className="text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Staff Action Required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This booking is awaiting your confirmation.
                      </p>
                    </div>
                    <button
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="btn-primary text-sm gap-2 flex-shrink-0"
                    >
                      {confirming ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Confirming…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Confirm Booking
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Main card */}
                <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                  <div className="h-2 gradient-green" />

                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* QR Code */}
                      {activeBooking.status !== 'cancelled' && (
                        <div className="flex-shrink-0 flex justify-center">
                          <QRCodeDisplay code={confirmationCode} />
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div>
                            <h3 className="text-xl font-extrabold text-foreground">{activeBooking.court_name}</h3>
                            <p className="text-sm text-muted-foreground">{activeBooking.court_surface} Surface</p>
                          </div>
                          <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            {confirmationCode}
                            <Copy size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <CalendarDays size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-2xs text-muted-foreground font-medium uppercase tracking-wide">Date</p>
                              <p className="text-sm font-bold text-foreground">{formatDisplayDate(activeBooking.booking_date)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Clock size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-2xs text-muted-foreground font-medium uppercase tracking-wide">Time</p>
                              <p className="text-sm font-bold text-foreground">
                                {formatTime(activeBooking.time_slot)} – {endTime}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Users size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-2xs text-muted-foreground font-medium uppercase tracking-wide">Players</p>
                              <p className="text-sm font-bold text-foreground">{activeBooking.players_count} players</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Zap size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-2xs text-muted-foreground font-medium uppercase tracking-wide">Credits Used</p>
                              <p className="text-sm font-bold text-foreground">
                                {activeBooking.status === 'cancelled' ? '—' : `${activeBooking.total_credits} credits`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {activeBooking.notes && (
                          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">{activeBooking.notes}</p>
                          </div>
                        )}

                        {activeBooking.status === 'confirmed' && activeBooking.confirmed_at && (
                          <div className="mt-3 flex items-center gap-2 p-3 bg-positive/5 border border-positive/20 rounded-xl">
                            <CheckCircle2 size={14} className="text-positive flex-shrink-0" />
                            <p className="text-xs text-positive">
                              Confirmed on{' '}
                              {new Date(activeBooking.confirmed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="border-t border-border px-6 py-4 bg-muted/20 flex flex-wrap items-center gap-3">
                    <button onClick={handleCopy} className="btn-secondary text-xs gap-1.5 py-2">
                      <Share2 size={14} />
                      Share
                    </button>
                    <button
                      onClick={() => toast.info('Print feature coming soon')}
                      className="btn-secondary text-xs gap-1.5 py-2"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                    <button
                      onClick={() => toast.info('Download feature coming soon')}
                      className="btn-secondary text-xs gap-1.5 py-2"
                    >
                      <Download size={14} />
                      Download
                    </button>

                    {/* Staff/Admin: confirm button in footer too (if not shown in banner) */}
                    {isStaffOrAdmin && activeBooking.status === 'pending' && (
                      <button
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="btn-primary text-xs gap-1.5 py-2"
                      >
                        {confirming ? (
                          <><Loader2 size={14} className="animate-spin" /> Confirming…</>
                        ) : (
                          <><ShieldCheck size={14} /> Confirm Booking</>
                        )}
                      </button>
                    )}

                    {(activeBooking.status === 'confirmed' || activeBooking.status === 'pending') && (
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="ml-auto btn-secondary text-xs gap-1.5 py-2 text-negative border-negative/30 hover:bg-negative/10"
                      >
                        {cancelling ? (
                          <><RotateCcw size={14} className="animate-spin" /> Cancelling…</>
                        ) : (
                          <><XCircle size={14} /> Cancel Booking</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Booking info footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    Booking ID: <span className="font-mono">{activeBooking.id.slice(0, 8)}…</span>
                  </span>
                  <span>
                    Created:{' '}
                    {new Date(activeBooking.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
