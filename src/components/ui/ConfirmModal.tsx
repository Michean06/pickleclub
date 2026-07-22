'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md p-6 slide-up">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X size={16} className="text-muted-foreground" />
        </button>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-negative/10' : 'bg-warning/10'}`}>
          <AlertTriangle size={24} className={variant === 'danger' ? 'text-negative' : 'text-warning'} />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${variant === 'danger' ? 'btn-danger' : 'bg-warning text-white hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}