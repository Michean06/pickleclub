'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Zap, QrCode, X, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface CreditPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  popular?: boolean;
}

interface PlayerWalletCardProps {
  credits: number;
  playerId: string;
  playerName: string;
}

export default function PlayerWalletCard({ credits, playerId, playerName }: PlayerWalletCardProps) {
  const supabase = createClient();
  const [showPurchase, setShowPurchase] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoadingPkgs(true);
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('id, name, price_php, credits')
        .eq('is_active', true)
        .order('credits', { ascending: true });

      if (error) throw error;

      const mapped: CreditPackage[] = (data || []).map((p: any, idx: number) => ({
        id: p.id,
        name: p.name,
        price: p.price_php,
        credits: p.credits,
        popular: idx === 1, // middle package is popular
      }));
      setPackages(mapped);
      if (mapped.length > 0 && !selectedPkg) {
        setSelectedPkg(mapped[Math.min(1, mapped.length - 1)].id);
      }
    } catch (err: any) {
      console.error('[PlayerWalletCard] fetchPackages error:', err?.message);
    } finally {
      setLoadingPkgs(false);
    }
  }, [supabase, selectedPkg]);

  useEffect(() => {
    if (showPurchase) {
      fetchPackages();
    }
  }, [showPurchase, fetchPackages]);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const pkg = packages.find((p) => p.id === selectedPkg);
      if (!pkg) throw new Error('Package not found');

      // Record a pending credit transaction (staff will approve at cashier)
      const { error } = await supabase.from('credit_transactions').insert({
        player_id: playerId,
        package_id: pkg.id,
        credits_delta: pkg.credits,
        reason: `Purchase request: ${pkg.name} package (₱${pkg.price}) — pending cashier approval`,
      });

      if (error) throw error;

      setShowPurchase(false);
      toast.success(`Credit request submitted! Visit the cashier to pay ₱${pkg.price} for ${pkg.credits} credits.`, { duration: 5000 });
    } catch (err: any) {
      console.error('[PlayerWalletCard] handlePurchase error:', err?.message);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(playerId).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Player ID copied to clipboard');
  };

  const lowCredits = credits <= 2;

  return (
    <>
      <div className={`rounded-2xl p-6 flex flex-col gap-4 shadow-card-md border ${lowCredits ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50' : 'gradient-green border-transparent'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${lowCredits ? 'text-orange-600' : 'text-white/70'}`}>
              {lowCredits ? '⚠ Low Credits' : 'Credit Wallet'}
            </p>
            <div className={`tabular-nums font-extrabold leading-none ${lowCredits ? 'text-orange-700' : 'text-white'}`} style={{ fontSize: '3rem' }}>
              {credits}
            </div>
            <p className={`text-sm font-medium mt-1 ${lowCredits ? 'text-orange-600' : 'text-white/80'}`}>
              credits remaining · 1 credit per game
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowCredits ? 'bg-orange-100' : 'bg-white/20'}`}>
            <CreditCard size={24} className={lowCredits ? 'text-orange-600' : 'text-white'} />
          </div>
        </div>

        <div className={`flex items-center gap-2 text-xs font-mono rounded-lg px-3 py-2 ${lowCredits ? 'bg-orange-100/80 text-orange-700' : 'bg-white/15 text-white/80'}`}>
          <span>ID:</span>
          <span className="font-semibold">{playerId}</span>
          <button onClick={handleCopyId} className="ml-auto hover:opacity-80 transition-opacity">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPurchase(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${lowCredits ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-primary hover:bg-white/90'}`}
          >
            <Plus size={16} />
            Buy Credits
          </button>
          <button
            onClick={() => setShowQR(true)}
            className={`px-3.5 py-2.5 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${lowCredits ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            <QrCode size={18} />
          </button>
        </div>
      </div>

      {/* Purchase modal */}
      {showPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPurchase(false)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-6 slide-up">
            <button onClick={() => setShowPurchase(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Buy Credits</h3>
                <p className="text-xs text-muted-foreground">Pay at the cashier after selecting</p>
              </div>
            </div>

            {loadingPkgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-5">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-150 ${selectedPkg === pkg.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 left-4 bg-accent text-white text-2xs font-bold px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.credits} credits</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground tabular-nums">₱{pkg.price}</p>
                      <p className="text-xs text-muted-foreground">₱{(pkg.price / pkg.credits).toFixed(0)}/credit</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={purchasing || loadingPkgs || !selectedPkg}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {purchasing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Request ${packages.find((p) => p.id === selectedPkg)?.credits ?? 0} Credits`
              )}
            </button>
          </div>
        </div>
      )}

      {/* QR Code modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowQR(false)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-xs p-6 slide-up text-center">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground mb-1">Check-In QR Code</h3>
            <p className="text-xs text-muted-foreground mb-4">Show this to staff at the check-in counter</p>
            <div className="w-48 h-48 mx-auto bg-foreground rounded-xl flex items-center justify-center mb-4">
              <div className="grid grid-cols-7 gap-0.5 p-3">
                {Array.from({ length: 49 }).map((_, i) => (
                  <div
                    key={`qr-cell-${i}`}
                    className={`w-4 h-4 rounded-sm ${
                      [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,47,48,8,15,22,29,36].includes(i)
                        ? 'bg-white' : 'bg-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="font-mono text-sm font-semibold text-foreground">{playerId}</p>
            <p className="text-xs text-muted-foreground mt-1">{playerName}</p>
          </div>
        </div>
      )}
    </>
  );
}