'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Plus, CreditCard, MapPin, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getBranches, BranchRecord } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/common/Toast';

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
  onOpenRecordPayment,
}: HeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [time, setTime] = useState<string>('');
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    getBranches().then((res) => {
      if (res.ok && res.value.length > 0) {
        setBranches(res.value);
        setSelectedBranch(res.value[0].id);
      }
    });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('ar-MR', {
        timeZone: 'Africa/Nouakchott',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      setTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
      showToast({ type: 'error', title: 'فشل تسجيل الخروج. حاول مجدداً.' });
        setIsSigningOut(false);
        return;
      }
      showToast({ type: 'success', title: 'تم تسجيل الخروج بنجاح.' });
      router.replace('/login');
    } catch {
      showToast({ type: 'error', title: 'فشل تسجيل الخروج. حاول مجدداً.' });
      setIsSigningOut(false);
    }
  };

  return (
    <header className="h-20 bg-surface-card/80 backdrop-blur-md border-b border-surface-border px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title, Hamburger & Branch */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Hamburger Menu for Mobile & Tablet */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white"
          title="القائمة"
          aria-label="فتح القائمة الرئيسية"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>

        {/* اختيار الفرع */}
        <div className="hidden lg:flex items-center gap-2 bg-surface-dark px-3 py-1.5 rounded-xl border border-surface-border">
          <MapPin className="w-3.5 h-3.5 text-gym-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            aria-label="اختيار الفرع"
            className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer font-medium"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="bg-surface-card text-white">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* الأدوات على اليمين */}
      <div className="flex items-center gap-3">
        {/* الوقت الحي نواكشوط */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-gray-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-medium">{time || 'نواكشوط (GMT)'}</span>
        </div>

        {/* تسجيل دفعة */}
        {onOpenRecordPayment && (
          <button
            onClick={onOpenRecordPayment}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-surface-border border border-surface-border text-gray-200 text-xs font-semibold transition-all hover:border-gym-500/50"
          >
            <CreditCard className="w-3.5 h-3.5 text-gym-400" />
            <span>تسجيل دفعة</span>
          </button>
        )}

        {/* عضو جديد */}
        {onOpenAddMember && (
          <button
            onClick={onOpenAddMember}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-md shadow-gym-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>عضو جديد</span>
          </button>
        )}

        {/* الإشعارات */}
        <button
          title="الإشعارات"
          className="relative p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-400 hover:text-white hover:border-gray-600 transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gym-500 ring-4 ring-surface-dark" />
        </button>

        {/* تسجيل الخروج */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          title="تسجيل الخروج"
          className="p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
