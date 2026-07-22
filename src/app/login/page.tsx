'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@pickleclub.ph', password: 'admin123', role: 'admin' },
  { label: 'Staff', email: 'staff@pickleclub.ph', password: 'staff123', role: 'staff' },
  { label: 'Player', email: 'juan@pickleclub.ph', password: 'player123', role: 'player' },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signIn(email, password);
      const role = data?.user?.user_metadata?.role || 'player';
      toast.success('Welcome back!');
      if (role === 'admin') {
        router.replace('/admin-panel');
      } else if (role === 'staff') {
        router.replace('/staff-dashboard');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
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
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {/* Demo accounts */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-foreground mb-3">Demo Accounts</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => fillDemo(acc)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  acc.role === 'admin' ? 'bg-purple-500' :
                  acc.role === 'staff' ? 'bg-blue-500' : 'gradient-green'
                }`}>
                  {acc.label[0]}
                </div>
                <span className="text-2xs font-semibold text-foreground">{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="text-2xs text-muted-foreground mt-2 text-center">Click a role to auto-fill credentials</p>
        </div>

        {/* Login form */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pickleclub.ph"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  required
                  autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          New player?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>

        <p className="text-center text-2xs text-muted-foreground mt-3">
          PickleClub © 2026 · Pickleball Club Management System
        </p>
      </div>
    </div>
  );
}
