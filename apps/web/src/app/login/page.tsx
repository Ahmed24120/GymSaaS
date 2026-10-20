'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ShieldCheck, UserCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@elitegym.mr');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState<'gym_owner' | 'super_admin' | 'receptionist'>('gym_owner');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 600);
  };

  const handleQuickRole = (selectedRole: 'gym_owner' | 'super_admin' | 'receptionist') => {
    setRole(selectedRole);
    if (selectedRole === 'gym_owner') {
      setEmail('owner@elitegym.mr');
    } else if (selectedRole === 'super_admin') {
      setEmail('admin@gymsaas.mr');
    } else {
      setEmail('reception@elitegym.mr');
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gym-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-surface-border shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gym-600 to-gym-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-gym-600/30">
            <Dumbbell className="w-7 h-7 transform -rotate-45" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            GymSaaS <span className="text-gym-400">Nouakchott</span>
          </h1>
          <p className="text-xs text-gray-400">
            المنصة المركزية لإدارة الصالات الرياضية في موريتانيا
          </p>
        </div>

        {/* Role Quick Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-400">اختر نوع الحساب للتجربة:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gym_owner', label: 'مالك الصالة' },
              { id: 'receptionist', label: 'موظف استقبال' },
              { id: 'super_admin', label: 'سوبر أدمن' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleQuickRole(r.id as any)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                  role === r.id
                    ? 'bg-gym-500/20 border-gym-500 text-gym-400 ring-2 ring-gym-500/30'
                    : 'bg-surface-dark border-surface-border text-gray-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold text-sm shadow-xl shadow-gym-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>جاري تسجيل الدخول...</span>
            ) : (
              <>
                <span>تسجيل الدخول إلى النظام</span>
                <ArrowRight className="w-4 h-4 transform rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="pt-4 border-t border-surface-border/60 text-center text-[11px] text-gray-400">
          نظام محمي بسياسات الأمان RLS المدمجة مع Supabase
        </div>
      </div>
    </div>
  );
}
