'use client';

import React from 'react';
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
  Smartphone
} from 'lucide-react';
import { mockGym } from '@/lib/mockData';

const navItems = [
  { name: 'لوحة المؤشرات', href: '/dashboard', icon: LayoutDashboard },
  { name: 'إدارة الأعضاء', href: '/dashboard/members', icon: Users },
  { name: 'المدفوعات والمداخيل', href: '/dashboard/payments', icon: CreditCard },
  { name: 'سجل حركات الدخول', href: '/dashboard/visits', icon: CalendarCheck },
  { name: 'باقات الاشتراكات', href: '/dashboard/plans', icon: Dumbbell },
  { name: 'سجل التدقيق والأمان', href: '/dashboard/audit', icon: ShieldAlert },
  { name: 'تجربة تطبيق الجوال 📱', href: '/mobile', icon: Smartphone },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-surface-card border-l border-surface-border flex flex-col h-screen sticky top-0 z-40 transition-all select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-gym-600 to-gym-400 flex items-center justify-center text-white shadow-lg shadow-gym-900/40">
            <Dumbbell className="w-6 h-6 transform -rotate-45" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
              GymSaaS
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-gym-500/20 text-gym-400 border border-gym-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-medium truncate max-w-[170px]" title={mockGym.name}>
              {mockGym.name}
            </p>
          </div>
        </div>

        {/* Location Tag */}
        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border text-xs text-gray-300">
          <Building2 className="w-3.5 h-3.5 text-gym-400" />
          <span className="truncate">{mockGym.city}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gym-500 text-white shadow-md shadow-gym-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-surface-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gym-400'}`} />
                <span>{item.name}</span>
              </div>
              <ChevronLeft className={`w-4 h-4 transition-transform ${isActive ? 'text-white' : 'text-gray-600 group-hover:translate-x-1'}`} />
            </Link>
          );
        })}
      </nav>

      {/* User / Gym Owner Profile Box */}
      <div className="p-4 border-t border-surface-border bg-surface-dark/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-card border border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow">
              أ
            </div>
            <div>
              <div className="text-xs font-bold text-white">المدير العام (مالك الصالة)</div>
              <div className="text-[11px] text-gray-400">admin@elitegym.mr</div>
            </div>
          </div>
          <button
            title="تسجيل الخروج"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
