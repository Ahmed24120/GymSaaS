import React from 'react';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 mx-auto flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-rose-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white">403</h1>
          <h2 className="text-xl font-bold text-rose-400">وصول مرفوض</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            لا تملك الصلاحية للوصول إلى هذه الصفحة.
            <br />
            تواصل مع مشرف النظام إذا اعتقدت أن هذا خطأ.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-gym-600 hover:bg-gym-500 text-white text-sm font-bold transition-all"
          >
            العودة للوحة التحكم
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-xl bg-surface-card border border-surface-border hover:border-gym-500/50 text-gray-300 text-sm font-bold transition-all"
          >
            تسجيل الدخول بحساب آخر
          </Link>
        </div>
      </div>
    </div>
  );
}
