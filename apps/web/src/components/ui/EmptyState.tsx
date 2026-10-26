'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-16 px-6 text-center rounded-2xl bg-surface-card border border-surface-border" dir="rtl">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-dark border border-surface-border flex items-center justify-center text-gym-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-md shadow-gym-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
export default EmptyState;
