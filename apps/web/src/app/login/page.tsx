'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dumbbell, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/types/auth';
import { canAccessPath, homeForRole, resolveUserRole } from '@/lib/supabase/access';
import { useToast } from '@/components/common/Toast';

// ─── أنواع الأدوار (من migration: public.gym_staff.role enum) ────────────────

// ─── المكوّن الداخلي الذي يستخدم useSearchParams (يجب أن يكون داخل Suspense) ─
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        showToast({ type: 'error', title: toAppError(signInError ?? new Error('unknown')).message });
        setIsLoading(false);
        return;
      }

      const role = await resolveUserRole(supabase, data.user.id);
      if (!role) {
        showToast({ type: 'error', title: 'تعذر التحقق من صلاحيات الحساب. تواصل مع المشرف.' });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      const next = searchParams.get('next') ?? '';
      const safeNext = /^\/(dashboard|super-admin|mobile)(?:\/|$)/.test(next)
        && !next.includes('\\') && canAccessPath(role, next);
      router.replace(safeNext ? next : homeForRole(role));
      router.refresh();
    } catch (err) {
      showToast({ type: 'error', title: toAppError(err).message });
      setIsLoading(false);
    }
  };

  const devRoles = isDev
    ? [
        { email: 'owner@elitegym.mr',     label: 'مالك (dev)' },
        { email: 'reception@elitegym.mr', label: 'استقبال (dev)' },
        { email: 'admin@gymsaas.mr',      label: 'سوبر أدمن (dev)' },
      ]
    : [];

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-surface-border shadow-2xl relative z-10 space-y-6">
      {/* رأس الصفحة */}
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

      {/* أزرار التجربة السريعة — development فقط */}
      {isDev && devRoles.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            وضع التطوير — تعبئة سريعة
          </label>
          <div className="grid grid-cols-3 gap-2">
            {devRoles.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => setEmail(r.email)}
                className="py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* نموذج الدخول */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-gray-300 mb-1.5">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
              dir="ltr"
            />
            <Mail className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-semibold text-gray-300 mb-1.5">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold text-sm shadow-xl shadow-gym-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* تذييل */}
      <div className="pt-4 border-t border-surface-border/60 text-center text-[11px] text-gray-400">
        حسابك الشخصي لإدارة الصالة والاشتراك
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية — تلفّ LoginForm بـ Suspense لدعم useSearchParams ──────
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gym-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <Suspense fallback={
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-surface-border text-center text-gray-400 text-sm">
          جاري التحميل...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
