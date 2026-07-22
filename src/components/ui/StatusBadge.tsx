import React from 'react';

type StatusVariant =
  | 'active' | 'playing' | 'waiting' | 'available' | 'maintenance' |'win'| 'loss' | 'beginner' | 'intermediate' | 'advanced' | 'pro' |'suspended' | 'pending' | 'completed' | 'checked-in';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  size?: 'sm' | 'md';
}

const variantMap: Record<StatusVariant, string> = {
  active: 'bg-positive/10 text-positive',
  playing: 'bg-primary/10 text-primary',
  waiting: 'bg-amber-50 text-amber-700',
  available: 'bg-slate-100 text-slate-600',
  maintenance: 'bg-orange-50 text-orange-700',
  win: 'bg-positive/10 text-positive',
  loss: 'bg-negative/10 text-negative',
  beginner: 'badge-skill-beginner',
  intermediate: 'badge-skill-intermediate',
  advanced: 'badge-skill-advanced',
  pro: 'badge-skill-pro',
  suspended: 'bg-negative/10 text-negative',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  'checked-in': 'bg-primary/10 text-primary',
};

const dotMap: Record<StatusVariant, string> = {
  active: 'bg-positive',
  playing: 'bg-primary',
  waiting: 'bg-amber-500',
  available: 'bg-slate-400',
  maintenance: 'bg-orange-500',
  win: 'bg-positive',
  loss: 'bg-negative',
  beginner: 'bg-blue-500',
  intermediate: 'bg-primary',
  advanced: 'bg-purple-500',
  pro: 'bg-orange-500',
  suspended: 'bg-negative',
  pending: 'bg-amber-500',
  completed: 'bg-slate-400',
  'checked-in': 'bg-primary',
};

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  return (
    <span className={`status-badge ${variantMap[status]} ${size === 'sm' ? 'text-2xs px-1.5' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotMap[status]}`} />
      {displayLabel}
    </span>
  );
}