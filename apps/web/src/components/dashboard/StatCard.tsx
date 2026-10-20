import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'gym' | 'amber' | 'blue' | 'rose';
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'gym',
}: StatCardProps) {
  const colorStyles = {
    gym: {
      bg: 'bg-gym-500/10',
      text: 'text-gym-400',
      border: 'border-gym-500/20',
      glow: 'group-hover:border-gym-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      glow: 'group-hover:border-blue-500/40',
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      glow: 'group-hover:border-rose-500/40',
    },
  }[accentColor];

  return (
    <div
      className={`glass-panel p-6 rounded-2xl border transition-all duration-300 group hover:-translate-y-1 ${colorStyles.border} ${colorStyles.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1.5">
            {value}
            {subtitle && (
              <span className="text-xs font-normal text-gray-400">{subtitle}</span>
            )}
          </h3>
        </div>

        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorStyles.bg} ${colorStyles.text}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs">
          <span
            className={`font-bold flex items-center gap-1 ${
              trend.isPositive ? 'text-gym-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-gray-400">مقارنة بالشهر السابق</span>
        </div>
      )}
    </div>
  );
}
