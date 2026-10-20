'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Plus, CreditCard, Sparkles, MapPin } from 'lucide-react';
import { mockBranches } from '@/lib/mockData';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenAddMember?: () => void;
  onOpenRecordPayment?: () => void;
}

export default function Header({
  title,
  subtitle,
  onOpenAddMember,
  onOpenRecordPayment
}: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(mockBranches[0].id);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Africa/Nouakchott timezone formatting
      const formatted = new Intl.DateTimeFormat('ar-MR', {
        timeZone: 'Africa/Nouakchott',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      setTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-20 bg-surface-card/80 backdrop-blur-md border-b border-surface-border px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Branch */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Branch Selector */}
        <div className="hidden lg:flex items-center gap-2 bg-surface-dark px-3 py-1.5 rounded-xl border border-surface-border">
          <MapPin className="w-3.5 h-3.5 text-gym-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            aria-label="اختيار الفرع"
            className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer font-medium"
          >
            {mockBranches.map((b) => (
              <option key={b.id} value={b.id} className="bg-surface-card text-white">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Live Nouakchott Time */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-gray-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-medium">{time || 'نواكشوط (GMT)'}</span>
        </div>

        {/* Action Buttons */}
        {onOpenRecordPayment && (
          <button
            onClick={onOpenRecordPayment}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-surface-border border border-surface-border text-gray-200 text-xs font-semibold transition-all hover:border-gym-500/50"
          >
            <CreditCard className="w-3.5 h-3.5 text-gym-400" />
            <span>تسجيل دفعة</span>
          </button>
        )}

        {onOpenAddMember && (
          <button
            onClick={onOpenAddMember}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-md shadow-gym-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>عضو جديد</span>
          </button>
        )}

        {/* Notifications */}
        <button
          title="الإشعارات"
          className="relative p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-400 hover:text-white hover:border-gray-600 transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gym-500 ring-4 ring-surface-dark"></span>
        </button>
      </div>
    </header>
  );
}
