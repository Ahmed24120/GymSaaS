'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  CalendarCheck,
  ShieldAlert,
  Dumbbell,
  LogOut,
  Building2,
  ChevronLeft,
  Smartphone,
  TrendingUp,
  FileSpreadsheet,
  Crown,
  X,
} from 'lucide-react';

const gymInfo = {
  name: 'صالة النخبة للرياضة (Elite Gym)',
  city: 'نواكشوط (تفرغ زينة)',
};

const navItems = [
  { name: 'لوحة المؤشرات', href: '/dashboard', icon: LayoutDashboard },
  { name: 'محطة الاستقبال (الكاونتر)', href: '/dashboard/reception', icon: QrCode },
  { name: 'إدارة الأعضاء', href: '/dashboard/members', icon: Users },
  { name: 'المدفوعات والمداخيل', href: '/dashboard/payments', icon: CreditCard },
  { name: 'التقارير وساعات الذروة', href: '/dashboard/reports', icon: TrendingUp },
  { name: 'سجل حركات الدخول', href: '/dashboard/visits', icon: CalendarCheck },
  { name: 'باقات الاشتراكات', href: '/dashboard/plans', icon: Dumbbell },
  { name: 'إدارة الفروع', href: '/dashboard/branches', icon: Building2 },
  { name: 'الموظفون والصلاحيات', href: '/dashboard/staff', icon: ShieldAlert },
  { name: 'استيراد Excel', href: '/dashboard/import-excel', icon: FileSpreadsheet },
  { name: 'سجل التدقيق والأمان', href: '/dashboard/audit', icon: ShieldAlert },
  { name: 'تطبيق هاتف العضو 📱', href: '/mobile', icon: Smartphone },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener('toggle-sidebar', handleToggle);
    window.addEventListener('close-sidebar', handleClose);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
      window.removeEventListener('close-sidebar', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-card select-none" dir="rtl">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-gym-600 to-gym-400 flex items-center justify-center text-white shadow-lg shadow-gym-900/40 shrink-0">
              <Dumbbell className="w-6 h-6 transform -rotate-45" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
                GymSaaS
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-gym-500/20 text-gym-400 border border-gym-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]" title={gymInfo.name}>
                {gymInfo.name}
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden w-9 h-9 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-center text-gray-400 hover:text-white"
            aria-label="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location Tag */}
        <div className="mt-3.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border text-xs text-gray-300">
          <Building2 className="w-3.5 h-3.5 text-gym-400 shrink-0" />
          <span className="truncate">{gymInfo.city}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          القائمة الرئيسية
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group min-h-[44px] ${
                isActive
                  ? 'bg-gym-500 text-white shadow-md shadow-gym-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-surface-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gym-400'}`} />
                <span>{item.name}</span>
              </div>
              <ChevronLeft className={`w-4 h-4 transition-transform shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:-translate-x-1'}`} />
            </Link>
          );
        })}
      </nav>

      {/* Super Admin Switcher Link */}
      <div className="px-3 pb-2">
        <Link
          href="/super-admin"
          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all group min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>لوحة صاحب المنصة (Super Admin)</span>
          </div>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
        </Link>
      </div>

      {/* User / Gym Owner Profile Box */}
      <div className="p-3 border-t border-surface-border bg-surface-dark/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-card border border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-xs shadow shrink-0">
              أ
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">مالك الصالة</div>
              <div className="text-[10px] text-gray-400 truncate">owner@elitegym.mr</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (lg+) */}
      <aside className="hidden lg:flex w-72 bg-surface-card border-e border-surface-border flex-col h-screen sticky top-0 z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet Drawer (< lg) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="fixed inset-y-0 start-0 w-72 max-w-[85vw] h-full shadow-2xl z-50 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
