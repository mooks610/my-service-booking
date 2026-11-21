import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Users, Wrench } from 'lucide-react';
import { LiveAvailabilityState } from '../types/resource';

interface StatusBadgeProps {
  state: LiveAvailabilityState;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, compact = false }) => {
  const config: Record<
    LiveAvailabilityState,
    {
      label: string;
      bg: string;
      text: string;
      border: string;
      Icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    available: {
      label: '예약 가능',
      bg: 'bg-[#ECFDF5]',
      text: 'text-[#047857]',
      border: 'border-[#A7F3D0]',
      Icon: CheckCircle2,
    },
    occupied: {
      label: '사용 중',
      bg: 'bg-[#F1F5F9]',
      text: 'text-[#475569]',
      border: 'border-[#CBD5E1]',
      Icon: Users,
    },
    imminent_end: {
      label: '종료 임박',
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#B45309]',
      border: 'border-[#FDE68A]',
      Icon: Clock,
    },
    imminent_start: {
      label: '곧 시작',
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#B45309]',
      border: 'border-[#FDE68A]',
      Icon: AlertTriangle,
    },
    maintenance: {
      label: '점검 중',
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]',
      Icon: Wrench,
    },
  };

  const { label, bg, text, border, Icon } = config[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap shrink-0 ${bg} ${text} ${border}`}
    >
      <Icon className={compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{label}</span>
    </span>
  );
};
