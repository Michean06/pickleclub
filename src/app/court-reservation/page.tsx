'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2, MapPin, Users, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Court {
  id: string;
  name: string;
  surface: string;
  status: string;
}

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
  reserved?: boolean;
}

interface Reservation {
  id: string;
  court_id: string;
  court_name: string;
  date: string;
  time_slot: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  players: number;
}

const MOCK_COURTS: Court[] = [
  { id: 'court-1', name: 'Court 1', surface: 'Hardcourt', status: 'active' },
  { id: 'court-2', name: 'Court 2', surface: 'Hardcourt', status: 'active' },
  { id: 'court-3', name: 'Court 3', surface: 'Cushioned', status: 'active' },
  { id: 'court-4', name: 'Court 4', surface: 'Cushioned', status: 'active' },
  { id: 'court-5', name: 'Court 5', surface: 'Hardcourt', status: 'active' },
  { id: 'court-6', name: 'Court 6', surface: 'Hardcourt', status: 'maintenance' },
];

const TIME_SLOTS: TimeSlot[] = [
  { time: '06:00', label: '6:00 AM', available: true },
  { time: '07:00', label: '7:00 AM', available: true },
  { time: '08:00', label: '8:00 AM', available: false, reserved: true },
  { time: '09:00', label: '9:00 AM', available: false, reserved: true },
  { time: '10:00', label: '10:00 AM', available: true },
  { time: '11:00', label: '11:00 AM', available: true },
  { time: '12:00', label: '12:00 PM', available: false, reserved: true },
  { time: '13:00', label: '1:00 PM', available: true },
  { time: '14:00', label: '2:00 PM', available: true },
  { time: '15:00', label: '3:00 PM', available: false, reserved: true },
  { time: '16:00', label: '4:00 PM', available: true },
  { time: '17:00', label: '5:00 PM', available: true },
  { time: '18:00', label: '6:00 PM', available: true },
  { time: '19:00', label: '7:00 PM', available: false, reserved: true },
  { time: '20:00', label: '8:00 PM', available: true },
  { time: '21:00', label: '9:00 PM', available: true },
];

const MOCK_MY_RESERVATIONS: Reservation[] = [
  { id: 'res-1', court_id: 'court-2', court_name: 'Court 2', date: '2026-07-23', time_slot: '10:00', duration: 1, status: 'confirmed', players: 4 },
  { id: 'res-2', court_id: 'court-4', court_name: 'Court 4', date: '2026-07-25', time_slot: '16:00', duration: 2, status: 'pending', players: 2 },
];

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-positive/10 text-positive border-positive/20',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-negative/10 text-negative border-negative/20',
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CourtReservationPage() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [players, setPlayers] = useState<number>(2);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>(MOCK_MY_RESERVATIONS);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i + weekOffset * 7));

  const handleCourtSelect = (court: Court) => {
    if (court.status === 'maintenance') return;
    setSelectedCourt(court);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot.time);
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!selectedCourt || !selectedSlot) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      court_id: selectedCourt.id,
      court_name: selectedCourt.name,
      date: selectedDate,
      time_slot: selectedSlot,
      duration,
      status: 'confirmed',
      players,
    };
    setMyReservations((prev) => [newRes, ...prev]);
    toast.success(`Court reserved! ${selectedCourt.name} on ${formatDisplayDate(selectedDate)} at ${TIME_SLOTS.find(s => s.time === selectedSlot)?.label}`);
    setSubmitting(false);
    setStep(1);
    setSelectedCourt(null);
    setSelectedSlot(null);
    setDuration(1);
    setPlayers(2);
  };

  const handleCancel = (resId: string) => {
    setMyReservations((prev) => prev.map((r) => r.id === resId ? { ...r, status: 'cancelled' } : r));
    toast.success('Reservation cancelled');
  };

  const selectedSlotLabel = TIME_SLOTS.find((s) => s.time === selectedSlot)?.label;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <CalendarDays size={24} className="text-primary" />
              Court Reservation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Book a court in advance · Slots are 1–2 hours
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Select Court' },
            { n: 2, label: 'Pick Time' },
            { n: 3, label: 'Confirm' },
          ].map(({ n, label }, idx) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    step > n
                      ? 'bg-positive text-white'
                      : step === n
                      ? 'bg-primary text-white' :'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > n ? <CheckCircle2 size={14} /> : n}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${step === n ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {idx < 2 && <div className={`flex-1 h-0.5 rounded-full max-w-[60px] ${step > n ? 'bg-positive' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: booking flow */}
          <div className="xl:col-span-2 flex flex-col gap-5">

            {/* Date picker */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" />
                  Select Date
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
                    disabled={weekOffset === 0}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setWeekOffset((p) => p + 1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const ds = formatDate(day);
                  const isSelected = ds === selectedDate;
                  const isToday = ds === formatDate(today);
                  return (
                    <button
                      key={ds}
                      onClick={() => { setSelectedDate(ds); setSelectedSlot(null); if (step > 1) setStep(2); }}
                      className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : isToday
                          ? 'bg-primary/10 text-primary border border-primary/20' :'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="text-2xs opacity-70">
                        {day.toLocaleDateString('en-PH', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-bold">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Court selection */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-primary" />
                Select Court
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOCK_COURTS.map((court) => {
                  const isMaintenance = court.status === 'maintenance';
                  const isSelected = selectedCourt?.id === court.id;
                  return (
                    <button
                      key={court.id}
                      onClick={() => handleCourtSelect(court)}
                      disabled={isMaintenance}
                      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                        isMaintenance
                          ? 'border-border bg-muted/40 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm text-foreground">{court.name}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-primary" />}
                        {isMaintenance && <span className="text-2xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded">Maint.</span>}
                      </div>
                      <span className="text-2xs text-muted-foreground">{court.surface}</span>
                      {!isMaintenance && (
                        <span className="text-2xs font-semibold text-positive flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
                          Available
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Time slot */}
            {selectedCourt && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                  <Clock size={16} className="text-primary" />
                  Select Time Slot
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {selectedCourt.name} · {formatDisplayDate(selectedDate)}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.available}
                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                          !slot.available
                            ? 'bg-muted/60 text-muted-foreground/50 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-muted/40 text-foreground hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-primary inline-block" />
                    Selected
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-muted/60 inline-block" />
                    Reserved
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-muted/40 border border-border inline-block" />
                    Available
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {selectedCourt && selectedSlot && (
              <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 shadow-card fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <CheckCircle2 size={16} className="text-primary" />
                  Confirm Reservation
                </h2>

                <div className="bg-primary/5 rounded-xl p-4 mb-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Court</span>
                    <span className="font-bold text-foreground">{selectedCourt.name} · {selectedCourt.surface}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Date</span>
                    <span className="font-bold text-foreground">{formatDisplayDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Time</span>
                    <span className="font-bold text-foreground">{selectedSlotLabel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">Duration</label>
                    <div className="flex gap-2">
                      {[1, 2].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            duration === d ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {d}h
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">Players</label>
                    <div className="flex gap-2">
                      {[2, 4].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPlayers(p)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            players === p ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <Users size={12} className="inline mr-1" />
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedSlot(null); setStep(2); }}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="btn-primary flex-1 gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {submitting ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: My reservations */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Zap size={16} className="text-primary" />
                My Reservations
              </h2>

              {myReservations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CalendarDays size={32} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No reservations yet</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {myReservations.map((res) => (
                  <div
                    key={res.id}
                    className={`rounded-xl border p-4 ${STATUS_STYLES[res.status] || 'bg-muted/30 border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-sm text-foreground">{res.court_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDisplayDate(res.date)}</p>
                      </div>
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full capitalize border ${STATUS_STYLES[res.status]}`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {TIME_SLOTS.find((s) => s.time === res.time_slot)?.label || res.time_slot}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {res.players} players
                      </span>
                      <span>{res.duration}h</span>
                    </div>
                    {res.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancel(res.id)}
                        className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-negative hover:bg-negative/10 transition-colors border border-negative/20"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick tips */}
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
              <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                <AlertCircle size={13} />
                Booking Rules
              </p>
              <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <li>• Book up to 7 days in advance</li>
                <li>• Max 2 hours per booking</li>
                <li>• Cancel at least 2 hours before</li>
                <li>• Court 6 is under maintenance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
