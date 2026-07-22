'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, UserPlus, Loader2, ChevronRight, Check, User, Mail, Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

const SKILL_LEVELS: { value: SkillLevel; label: string; desc: string; color: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to pickleball', color: 'text-gray-500' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–2 years playing', color: 'text-blue-500' },
  { value: 'advanced', label: 'Advanced', desc: 'Competitive player', color: 'text-green-500' },
  { value: 'pro', label: 'Pro', desc: 'Tournament-level', color: 'text-yellow-500' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signUp(email, password, { fullName, skillLevel, role: 'player' });
      toast.success('Account created! Please check your email to verify your account.');
      router.replace('/login');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AppLogo size={40} />
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">PickleClub</h1>
              <p className="text-xs text-muted-foreground font-medium">Club Management System</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Create your player account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <React.Fragment key={`step-${s}`}>
              <div className={`flex items-center gap-2 ${s <= step ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 ${
                  s < step ? 'bg-primary border-primary text-white' :
                  s === step ? 'border-primary text-primary bg-primary/5': 'border-border text-muted-foreground'
                }`}>
                  {s < step ? <Check size={12} /> : s}
                </div>
                <span className="text-xs font-semibold hidden sm:block">
                  {s === 1 ? 'Your Info' : 'Set Password'}
                </span>
              </div>
              {s < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card p-6">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan dela Cruz"
                    className="input-field pl-9"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Skill Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setSkillLevel(lvl.value)}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                        skillLevel === lvl.value
                          ? 'border-primary bg-primary/5' :'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Zap size={12} className={lvl.color} />
                        <span className="text-xs font-bold text-foreground">{lvl.label}</span>
                        {skillLevel === lvl.value && (
                          <Check size={11} className="text-primary ml-auto" />
                        )}
                      </div>
                      <span className="text-2xs text-muted-foreground">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-negative/10 border border-negative/20 rounded-lg px-3 py-2 text-xs text-negative font-medium">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full mt-1 gap-2">
                Continue
                <ChevronRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full gradient-green flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="text-xs text-primary font-semibold ml-auto flex-shrink-0 hover:underline"
                >
                  Edit
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="input-field pl-9 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field pl-9 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-2xs text-negative mt-1 font-medium">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && password.length >= 6 && (
                  <p className="text-2xs text-positive mt-1 font-medium flex items-center gap-1">
                    <Check size={10} /> Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-negative/10 border border-negative/20 rounded-lg px-3 py-2 text-xs text-negative font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-1 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Create Account
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-2xs text-muted-foreground mt-3">
          PickleClub © 2026 · Pickleball Club Management System
        </p>
      </div>
    </div>
  );
}
