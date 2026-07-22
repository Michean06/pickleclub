'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  QrCode, Camera, X, CheckCircle2, AlertCircle, User,
  Zap, Star, RefreshCw, Loader2, ScanLine, CameraOff
} from 'lucide-react';
import { toast } from 'sonner';

interface ScannedPlayer {
  id: string;
  player_id: string;
  full_name: string;
  skill_level: string;
  credits: number;
  rating: number;
  games_played: number;
  is_active: boolean;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function QRCheckin() {
  const supabase = createClient();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [manualId, setManualId] = useState('');
  const [scannedPlayer, setScannedPlayer] = useState<ScannedPlayer | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const scannerDivId = 'qr-reader-staff';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleLookupById = useCallback(async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!id) return;

    setLookingUp(true);
    setErrorMsg('');
    setScannedPlayer(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, player_id, full_name, skill_level, credits, rating, games_played, is_active')
        .eq('player_id', id)
        .single();

      if (error || !data) {
        setScanState('error');
        setErrorMsg(`Player ID "${id}" not found. Please check and try again.`);
        return;
      }

      setScannedPlayer(data as ScannedPlayer);
      setScanState('success');
    } catch {
      setScanState('error');
      setErrorMsg('Lookup failed. Please try again.');
    } finally {
      setLookingUp(false);
    }
  }, [supabase]);

  const startCameraScanner = useCallback(async () => {
    setCameraError('');
    setCameraActive(false);

    try {
      // Dynamically import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');

      // Ensure the div exists
      const el = document.getElementById(scannerDivId);
      if (!el) {
        setCameraError('Scanner element not found. Please try again.');
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          // QR code successfully scanned
          await stopScanner();
          setScanState('scanning');
          // Extract player_id — QR may contain just the ID or a JSON payload
          let playerId = decodedText.trim();
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed?.player_id) playerId = parsed.player_id;
            else if (parsed?.id) playerId = parsed.id;
          } catch {
            // not JSON, use raw text as player_id
          }
          handleLookupById(playerId);
        },
        () => {
          // QR not detected yet — this fires continuously, ignore
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraError('No camera found on this device. Use manual entry below.');
      } else {
        setCameraError('Could not start camera. Use manual entry below.');
      }
      setCameraActive(false);
      scannerRef.current = null;
    }
  }, [handleLookupById, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleOpenScanner = async () => {
    setScanState('scanning');
    setScannedPlayer(null);
    setErrorMsg('');
    setShowManual(false);
    setCameraError('');
    // Small delay to let the DOM render the scanner div
    setTimeout(() => {
      startCameraScanner();
    }, 150);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    setScanState('scanning');
    handleLookupById(manualId);
  };

  const handleAddToQueue = async () => {
    if (!scannedPlayer) return;
    setAddingToQueue(true);
    try {
      const { data: queueData } = await supabase
        .from('queue_entries')
        .select('queue_number')
        .eq('status', 'waiting')
        .order('queue_number', { ascending: false })
        .limit(1);

      const nextNumber = (queueData?.[0]?.queue_number ?? 0) + 1;

      const { error } = await supabase.from('queue_entries').insert({
        player_id: scannedPlayer.id,
        queue_number: nextNumber,
        session_name: 'Open Play',
        status: 'waiting',
      });

      if (error) throw error;

      toast.success(`${scannedPlayer.full_name} added to queue as #${nextNumber}`);
      handleReset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add to queue.');
    } finally {
      setAddingToQueue(false);
    }
  };

  const handleReset = async () => {
    await stopScanner();
    setScanState('idle');
    setScannedPlayer(null);
    setErrorMsg('');
    setManualId('');
    setShowManual(false);
    setCameraError('');
  };

  const skillColor =
    scannedPlayer?.skill_level === 'pro' ? 'text-yellow-500' :
    scannedPlayer?.skill_level === 'advanced' ? 'text-green-500' :
    scannedPlayer?.skill_level === 'intermediate' ? 'text-blue-500' : 'text-gray-500';

  const initials = scannedPlayer?.full_name
    ? scannedPlayer.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <QrCode size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">QR Check-in</h3>
            <p className="text-2xs text-muted-foreground">Scan or enter player ID</p>
          </div>
        </div>
        {scanState !== 'idle' && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="p-5">
        {/* IDLE state */}
        {scanState === 'idle' && (
          <div className="flex flex-col gap-3">
            {/* Scan button */}
            <button
              onClick={handleOpenScanner}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Camera size={26} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Scan QR Code</p>
                <p className="text-xs text-muted-foreground mt-0.5">Point camera at player's QR card</p>
              </div>
            </button>

            {/* Manual entry toggle */}
            <button
              onClick={() => { setShowManual(!showManual); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="text-xs text-primary font-semibold text-center hover:underline"
            >
              {showManual ? 'Hide manual entry' : 'Enter Player ID manually'}
            </button>

            {showManual && (
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  placeholder="PKL-2026-0001"
                  className="input-field flex-1 font-mono text-sm uppercase"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!manualId.trim()}
                  className="btn-primary px-4 text-xs gap-1.5 flex-shrink-0"
                >
                  <ScanLine size={14} />
                  Look Up
                </button>
              </form>
            )}
          </div>
        )}

        {/* SCANNING state — camera view or lookup spinner */}
        {scanState === 'scanning' && (
          <div className="flex flex-col gap-3">
            {/* Camera viewport */}
            {!lookingUp && (
              <>
                <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 240 }}>
                  {/* html5-qrcode mounts into this div */}
                  <div id={scannerDivId} className="w-full" />

                  {/* Overlay corners */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-md" />
                        <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-md" />
                        <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
                        <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-md" />
                        {/* Scan line animation */}
                        <span className="absolute left-0 right-0 h-0.5 bg-primary/70 animate-scan-line" style={{ top: '50%' }} />
                      </div>
                    </div>
                  )}

                  {/* Loading state before camera starts */}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <p className="text-xs text-white/70">Starting camera...</p>
                    </div>
                  )}

                  {/* Camera error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-4">
                      <CameraOff size={24} className="text-negative" />
                      <p className="text-xs text-white/80 text-center leading-relaxed">{cameraError}</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {cameraActive ? 'Align QR code within the frame' : cameraError ? 'Camera unavailable' : 'Initialising camera…'}
                </p>

                {/* Manual fallback always available during scanning */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground text-center mb-2">Or enter Player ID manually</p>
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value.toUpperCase())}
                      placeholder="PKL-2026-0001"
                      className="input-field flex-1 font-mono text-sm uppercase"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      disabled={!manualId.trim()}
                      className="btn-primary px-4 text-xs gap-1.5 flex-shrink-0"
                    >
                      <ScanLine size={14} />
                      Look Up
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Lookup spinner */}
            {lookingUp && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative w-16 h-16">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <QrCode size={28} className="text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Looking up player...</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Please wait</p>
                </div>
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {/* SUCCESS state */}
        {scanState === 'success' && scannedPlayer && (
          <div className="flex flex-col gap-4">
            {/* Player card */}
            <div className="bg-positive/5 border border-positive/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground truncate">{scannedPlayer.full_name}</p>
                    <CheckCircle2 size={14} className="text-positive flex-shrink-0" />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{scannedPlayer.player_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card rounded-lg p-2.5 text-center">
                  <Zap size={12} className="text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold tabular-nums text-foreground">{scannedPlayer.credits}</p>
                  <p className="text-2xs text-muted-foreground">Credits</p>
                </div>
                <div className="bg-card rounded-lg p-2.5 text-center">
                  <Star size={12} className="text-yellow-500 mx-auto mb-1" />
                  <p className="text-sm font-bold tabular-nums text-foreground">{scannedPlayer.rating}</p>
                  <p className="text-2xs text-muted-foreground">Rating</p>
                </div>
                <div className="bg-card rounded-lg p-2.5 text-center">
                  <User size={12} className="text-blue-500 mx-auto mb-1" />
                  <p className={`text-xs font-bold capitalize ${skillColor}`}>{scannedPlayer.skill_level}</p>
                  <p className="text-2xs text-muted-foreground">Level</p>
                </div>
              </div>

              {scannedPlayer.credits <= 0 && (
                <div className="mt-3 flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-warning flex-shrink-0" />
                  <p className="text-xs text-warning font-semibold">No credits — player must purchase before playing</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="btn-secondary flex-1 text-xs gap-1.5"
              >
                <RefreshCw size={13} />
                Scan Another
              </button>
              <button
                onClick={handleAddToQueue}
                disabled={addingToQueue || scannedPlayer.credits <= 0}
                className="btn-primary flex-1 text-xs gap-1.5"
              >
                {addingToQueue ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    Add to Queue
                  </>
                )}
              </button>
            </div>
            {scannedPlayer.credits <= 0 && (
              <p className="text-2xs text-muted-foreground text-center -mt-1">
                Player must buy credits before joining the queue
              </p>
            )}
          </div>
        )}

        {/* ERROR state */}
        {scanState === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-2xl bg-negative/10 flex items-center justify-center">
              <AlertCircle size={26} className="text-negative" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Check-in Failed</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary text-xs gap-1.5">
              <RefreshCw size={13} />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
