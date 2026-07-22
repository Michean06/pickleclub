'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Download, QrCode, Shield, Star, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerQRCardProps {
  onClose?: () => void;
}

const MAX_QR_RETRIES = 3;

export default function PlayerQRCard({ onClose }: PlayerQRCardProps) {
  const { profile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generating, setGenerating] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const retryCountRef = useRef(0);

  const generateQR = useCallback(async () => {
    if (!profile?.player_id) return;

    setGenerating(true);
    setQrError(null);

    try {
      const QRCode = (await import('qrcode')).default;
      const qrData = JSON.stringify({
        id: profile.id,
        player_id: profile.player_id,
        name: profile.full_name,
        role: profile.role,
      });
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: { dark: '#1a2e1a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
      retryCountRef.current = 0;
    } catch (err: any) {
      console.error('[PlayerQRCard] QR generation error:', err?.message);
      if (retryCountRef.current < MAX_QR_RETRIES) {
        retryCountRef.current += 1;
        const delay = retryCountRef.current * 800;
        setTimeout(() => generateQR(), delay);
        return;
      }
      setQrError('Failed to generate QR code. Please try again.');
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  }, [profile?.player_id, profile?.id, profile?.full_name, profile?.role]);

  useEffect(() => {
    retryCountRef.current = 0;
    generateQR();
  }, [generateQR]);

  const handleDownload = async () => {
    if (!qrDataUrl) {
      toast.error('QR code not ready. Please wait.');
      return;
    }

    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = 360 * scale;
      canvas.height = 220 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Canvas not supported in this browser.');
        return;
      }

      ctx.scale(scale, scale);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 360, 220);
      grad.addColorStop(0, '#1a3a1a');
      grad.addColorStop(1, '#0f2a0f');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, 360, 220, 16);
      ctx.fill();

      // Decorative circle
      ctx.beginPath();
      ctx.arc(300, -20, 100, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
      ctx.fill();

      // Club name
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('PICKLECLUB', 24, 32);

      // Player name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(profile?.full_name || '', 24, 60);

      // Player ID
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px monospace';
      ctx.fillText(profile?.player_id || '', 24, 80);

      // Skill level
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 11px sans-serif';
      const skill = (profile?.skill_level || 'beginner').toUpperCase();
      ctx.fillText(skill, 24, 100);

      // Credits
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Credits: ${profile?.credits ?? 0}`, 24, 120);

      // Rating
      ctx.fillText(`Rating: ${profile?.rating ?? 1200}`, 24, 138);

      await new Promise<void>((resolve, reject) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          try {
            ctx.fillStyle = '#ffffff';
            ctx.roundRect(240, 30, 100, 100, 8);
            ctx.fill();
            ctx.drawImage(qrImg, 244, 34, 92, 92);

            // Footer
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '9px sans-serif';
            ctx.fillText('Scan to verify player identity', 24, 195);

            const link = document.createElement('a');
            link.download = `${profile?.player_id || 'player'}-card.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Player card downloaded!');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        qrImg.onerror = () => reject(new Error('QR image load failed'));
        qrImg.src = qrDataUrl;
      });
    } catch (err: any) {
      console.error('[PlayerQRCard] Download error:', err?.message);
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const skillColor =
    profile?.skill_level === 'pro' ? 'text-yellow-400'
      : profile?.skill_level === 'advanced' ? 'text-green-400'
      : profile?.skill_level === 'intermediate' ? 'text-blue-400' : 'text-gray-400';

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Digital Player Card */}
      <div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden shadow-card-md"
        style={{
          background: 'linear-gradient(135deg, #1a3a1a 0%, #0f2a0f 100%)',
          minHeight: '200px',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-green-400/10 pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 rounded-full bg-green-400/5 pointer-events-none" />

        <div className="relative p-5 flex gap-4">
          {/* Left: Player info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-green-400/70 text-2xs font-bold uppercase tracking-widest mb-1">PickleClub</p>
              <h3 className="text-white font-extrabold text-lg leading-tight">{profile.full_name}</h3>
              <p className="text-white/50 text-xs font-mono mt-0.5">{profile.player_id}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-bold uppercase ${skillColor}`}>
                  {profile.skill_level}
                </span>
                <span className="text-white/30 text-xs">·</span>
                <span className="text-white/60 text-xs flex items-center gap-1">
                  <Star size={10} className="text-yellow-400" />
                  {profile.rating}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-white/50 text-2xs">Credits</p>
                <p className="text-white font-bold text-sm">{profile.credits}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-white/50 text-2xs">Games</p>
                <p className="text-white font-bold text-sm">{profile.games_played}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <Shield size={11} className="text-green-400/70" />
              <p className="text-white/40 text-2xs">Scan to verify identity</p>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
            <div className="bg-white rounded-xl p-2 shadow-lg">
              {generating ? (
                <div className="w-[100px] h-[100px] flex flex-col items-center justify-center gap-2">
                  <QrCode size={32} className="text-gray-300 animate-pulse" />
                  <p className="text-2xs text-gray-400">Generating...</p>
                </div>
              ) : qrError ? (
                <div className="w-[100px] h-[100px] flex flex-col items-center justify-center gap-2 p-2">
                  <AlertCircle size={24} className="text-red-400" />
                  <p className="text-2xs text-red-500 text-center leading-tight">QR failed</p>
                  <button
                    onClick={() => { retryCountRef.current = 0; generateQR(); }}
                    className="text-2xs text-blue-500 underline flex items-center gap-0.5"
                  >
                    <RefreshCw size={9} />
                    Retry
                  </button>
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Player QR Code" width={100} height={100} className="rounded-lg" />
              ) : (
                <div className="w-[100px] h-[100px] flex items-center justify-center">
                  <QrCode size={40} className="text-gray-300" />
                </div>
              )}
            </div>
            <p className="text-white/40 text-2xs text-center">Player ID</p>
          </div>
        </div>

        {/* Member since strip */}
        <div className="bg-black/20 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-white/40" />
            <span className="text-white/40 text-2xs">
              Member since {new Date(profile.member_since).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="text-green-400/70 text-2xs font-bold">ACTIVE</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={generating || !!qrError || downloading}
          className="btn-primary flex-1 gap-2 text-sm disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download size={15} />
              Download Card
            </>
          )}
        </button>
        {onClose && (
          <button onClick={onClose} className="btn-secondary px-4">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
