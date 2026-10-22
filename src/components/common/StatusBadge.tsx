import React from 'react';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/appointment.types';
import { STATUS_LABELS } from '@/domain/appointmentStatus';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted/10 text-muted border-muted/20',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  info: 'bg-info/10 text-info border-info/25',
  accent: 'bg-accent/15 text-[#a5b4fc] border-accent/30',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <span className={cn('chip', TONES[tone], className)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {children}
  </span>
);

const STATUS_TONES: Record<AppointmentStatus, Tone> = {
  pending: 'warning',
  confirmed: 'info',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'neutral',
};

export const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => (
  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
);

export const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Activo' : 'Inactivo'}</Badge>
);
