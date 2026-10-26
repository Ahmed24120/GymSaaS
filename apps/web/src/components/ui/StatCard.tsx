'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'gym' | 'amber' | 'rose';
}

export function StatCard({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
  variant = 'default',
}: StatCardProps) {
  const borderVariants = {
    default: 'hover:border-surface-border',
    gym: 'hover:border-gym-500/40',
    amber: 'hover:border-amber-500/40',
    rose: 'hover:border-rose-500/40',
  }[variant];

  return (
    <div
      className={`p-5 rounded-2xl bg-surface-card border border-surface-border shadow-sm transition-all duration-200 ${borderVariants}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-gray-400">{title}</span>
        <div className="p-2.5 rounded-xl bg-surface-dark border border-surface-border shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
          {value}
        </div>

        {(change || subtitle) && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            {change && (
              <span
                className={`font-bold ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {change}
              </span>
            )}
            {subtitle && <span className="text-gray-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
export default StatCard;
