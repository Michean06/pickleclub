'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { CreditCard, Zap, Star, Check, ChevronRight, Loader2, AlertCircle, Tag, ShoppingCart, X, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface CreditPackage {
  id: string;
  name: string;
  price_php: number;
  credits: number;
  is_active: boolean;
  popular?: boolean;
}

const PACKAGE_ICONS = ['🌱', '⚡', '🏆', '🎯'];
const PACKAGE_GRADIENTS = [
  'from-slate-600 to-slate-800',
  'from-primary/80 to-primary',
  'from-purple-600 to-purple-800',
  'from-amber-500 to-orange-600',
];

export default function BuyCreditsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<CreditPackage | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPkgs(true);
      try {
        const { data, error } = await supabase
          .from('credit_packages')
          .select('*')
          .eq('is_active', true)
          .order('price_php', { ascending: true });

        if (error || !data?.length) {
          setPackages([]);
        } else {
          // Mark the middle package as popular if none is marked
          const pkgs = data as CreditPackage[];
          const midIdx = Math.floor(pkgs.length / 2);
          pkgs[midIdx] = { ...pkgs[midIdx], popular: true };
          setPackages(pkgs);
        }
      } catch {
        setPackages([]);
      } finally {
        setLoadingPkgs(false);
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (packages.length > 0 && !selectedId) {
      const popular = packages.find((p) => p.popular) || packages[1] || packages[0];
      setSelectedId(popular?.id || '');
    }
  }, [packages, selectedId]);

  const selectedPkg = packages.find((p) => p.id === selectedId);

  const handlePurchase = async () => {
    if (!selectedPkg || !profile) return;
    setPurchasing(true);
    try {
      // Record the credit transaction
      const { error } = await supabase.from('credit_transactions').insert({
        player_id: profile.id,
        package_id: selectedPkg.id,
        credits_delta: selectedPkg.credits,
        reason: `Purchased ${selectedPkg.name} package`,
        created_by: profile.id,
      });

      if (error) throw error;

      setLastPurchase(selectedPkg);
      setShowConfirm(false);
      toast.success(`${selectedPkg.credits} credits requested! Please pay ₱${selectedPkg.price_php} at the cashier.`);
    } catch (err: any) {
      toast.error(err?.message || 'Purchase request failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-foreground">Buy Credits</h1>
          <p className="text-sm text-muted-foreground">
            Select a package and pay at the cashier counter to top up your wallet.
          </p>
        </div>

        {/* Current balance */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-card">
          <div className="w-12 h-12 rounded-xl gradient-green flex items-center justify-center flex-shrink-0">
            <CreditCard size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Balance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">{profile?.credits ?? 0}</span>
              <span className="text-sm text-muted-foreground font-medium">credits</span>
            </div>
          </div>
          {(profile?.credits ?? 0) <= 2 && (
            <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="text-warning flex-shrink-0" />
              <span className="text-xs font-semibold text-warning">Low balance</span>
            </div>
          )}
        </div>

        {/* Success banner */}
        {lastPurchase && (
          <div className="bg-positive/10 border border-positive/20 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-positive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={15} className="text-positive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-positive">Purchase Request Submitted!</p>
              <p className="text-xs text-positive/80 mt-0.5">
                {lastPurchase.credits} credits · ₱{lastPurchase.price_php} — Please proceed to the cashier to complete payment.
              </p>
            </div>
            <button onClick={() => setLastPurchase(null)} className="text-positive/60 hover:text-positive transition-colors mt-0.5">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Packages */}
        {loadingPkgs ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading packages...</p>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
            <ShoppingCart size={32} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No credit packages available</p>
            <p className="text-xs text-muted-foreground">Please contact staff to purchase credits</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Available Packages</p>
              {packages.map((pkg, idx) => {
                const isSelected = selectedId === pkg.id;
                const gradient = PACKAGE_GRADIENTS[idx % PACKAGE_GRADIENTS.length];
                const icon = PACKAGE_ICONS[idx % PACKAGE_ICONS.length];
                const ratePerCredit = (pkg.price_php / pkg.credits).toFixed(0);

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedId(pkg.id)}
                    className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-card-md'
                        : 'border-border bg-card hover:border-primary/30 shadow-card'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-5">
                        <span className="gradient-amber text-white text-2xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Star size={9} />
                          BEST VALUE
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 text-xl shadow-sm`}>
                        {icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">{pkg.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            ₱{ratePerCredit}/credit
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Zap size={12} className="text-primary" />
                          <span className="text-sm font-semibold text-foreground">{pkg.credits} credits</span>
                        </div>
                      </div>

                      {/* Price + selector */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-extrabold tabular-nums text-foreground">₱{pkg.price_php}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                          isSelected ? 'border-primary bg-primary' : 'border-border'
                        }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* How it works */}
            <div className="bg-muted/40 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Receipt size={13} className="text-muted-foreground" />
                How it works
              </p>
              <div className="flex flex-col gap-2">
                {[
                  'Select your preferred credit package above',
                  'Tap "Request Purchase" to submit your order',
                  'Proceed to the cashier counter and pay in cash',
                  'Credits will be added to your wallet after payment',
                ].map((step, i) => (
                  <div key={`how-${i}`} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-2xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedPkg}
              className="btn-primary w-full py-3.5 gap-2 text-sm"
            >
              <ShoppingCart size={17} />
              Request Purchase — {selectedPkg ? `${selectedPkg.credits} credits for ₱${selectedPkg.price_php}` : 'Select a package'}
              <ChevronRight size={16} className="ml-auto" />
            </button>
          </>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-sm p-6 slide-up">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={16} className="text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl gradient-green flex items-center justify-center">
                <Tag size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Confirm Purchase</h3>
                <p className="text-xs text-muted-foreground">Review your order before submitting</p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 mb-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Package</span>
                <span className="text-sm font-semibold text-foreground">{selectedPkg.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credits</span>
                <span className="text-sm font-semibold text-primary">+{selectedPkg.credits} credits</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Total to Pay</span>
                <span className="text-xl font-extrabold tabular-nums text-foreground">₱{selectedPkg.price_php}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
              After submitting, please go to the <strong className="text-foreground">cashier counter</strong> to complete your cash payment.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
                disabled={purchasing}
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="btn-primary flex-1 gap-2"
              >
                {purchasing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
