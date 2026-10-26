'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, QrCode, Users, CreditCard, Smartphone } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/dashboard/reception', label: 'الاستقبال', icon: QrCode },
    { href: '/dashboard/members', label: 'الأعضاء', icon: Users },
    { href: '/dashboard/payments', label: 'المالية', icon: CreditCard },
    { href: '/mobile', label: 'تطبيق الزبون', icon: Smartphone },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 start-0 end-0 z-40 bg-surface-card/95 backdrop-blur-md border-t border-surface-border px-2 py-1.5 flex items-center justify-around select-none"
      dir="rtl"
      aria-label="التنقل السريع للهاتف"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-1 rounded-xl transition-all ${
              isActive
                ? 'text-gym-400 font-bold bg-gym-500/10'
                : 'text-gray-400 hover:text-white font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-gym-400' : 'text-gray-400'}`} />
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
export default BottomNav;
