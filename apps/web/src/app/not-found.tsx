import React from 'react';
import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center">
          <SearchX className="w-10 h-10 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white">404</h1>
          <h2 className="text-xl font-bold text-amber-400">الصفحة غير موجودة</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
            <br />
            تحقق من الرابط أو ارجع إلى الصفحة الرئيسية.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm hover:bg-brand-orange/90 transition-colors min-h-[44px] flex items-center justify-center"
          >
            لوحة التحكم
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-colors min-h-[44px] flex items-center justify-center"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
