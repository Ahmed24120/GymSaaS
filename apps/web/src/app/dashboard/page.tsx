'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import {
  Users,
  AlertCircle,
  CreditCard,
  CalendarCheck,
  QrCode,
  TrendingUp,
  FileSpreadsheet,
  ChevronLeft,
  Wallet,
  Clock,
  RefreshCw,
  UserX,
  Flame
} from 'lucide-react';
import {
  getDashboardMetrics,
  DashboardMetrics,
  MemberRecord,
  PaymentRecord,
} from '@/lib/data';
import { StatCard } from '@/components/ui/StatCard';
import { StatSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import AddMemberModal from '@/components/members/AddMemberModal';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import CancelPaymentModal from '@/components/payments/CancelPaymentModal';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [cancelModalPayment, setCancelModalPayment] = useState<PaymentRecord | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    const res = await getDashboardMetrics();
    if (res.ok) {
      setMetrics(res.value);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleMemberAdded = (_newMember: MemberRecord) => {
    fetchMetrics();
  };

  const handlePaymentRecorded = (_newPayment: PaymentRecord) => {
    fetchMetrics();
  };

  const handlePaymentCancelled = (_updatedPayment: PaymentRecord) => {
    fetchMetrics();
  };

  return (
    <>
      <Header
        title="لوحة تحكم إدارة الصالة"
        subtitle="نظرة شاملة ومباشرة على المشتركين، المداخيل اليومية والشهرية، وحركات الدخول"
        onOpenAddMember={() => setIsAddMemberOpen(true)}
        onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1 max-w-7xl w-full mx-auto">
        {/* Top bar with refresh */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            توقيت نواكشوط (GMT) • بيانات حية ومباشرة من قاعدة البيانات
          </div>
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white hover:border-gym-500/50 transition-colors flex items-center gap-1.5 text-xs min-h-[44px]"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث اللوحة</span>
          </button>
        </div>

        {/* 1. TOP METRICS GRID */}
        {loading && !metrics ? (
          <StatSkeleton />
        ) : error ? (
          <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-center space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-gym-500 text-white rounded-xl text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="المشتركون النشطون حالياً"
              value={metrics?.activeMembers || 0}
              subtitle={`من أصل ${metrics?.totalMembers || 0} عضو مسجل`}
              icon={<Users className="w-5 h-5 text-gym-400" />}
              isPositive={true}
              variant="gym"
            />

            <StatCard
              title="منتهية وقريبة من الانتهاء"
              value={metrics?.expiredMembers || 0}
              subtitle={`+${metrics?.expiringIn7Days || 0} ينتهي خلال 7 أيام`}
              icon={<AlertCircle className="w-5 h-5 text-rose-400" />}
              isPositive={false}
              variant="rose"
            />

            <StatCard
              title="المداخيل الشهرية (MRU)"
              value={(metrics?.monthlyRevenueMRU || 0).toLocaleString()}
              subtitle={`اليوم: ${(metrics?.todayRevenueMRU || 0).toLocaleString()} MRU`}
              icon={<CreditCard className="w-5 h-5 text-amber-400" />}
              isPositive={true}
              variant="amber"
            />

            <StatCard
              title="حركات الدخول اليوم (الزيارات)"
              value={metrics?.todayVisits || 0}
              subtitle="سجل مسح الـ QR والاستقبال"
              icon={<CalendarCheck className="w-5 h-5 text-blue-400" />}
              isPositive={true}
            />
          </section>
        )}

        {/* QUICK OPERATIONAL WORKFLOWS BANNER */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/reception"
            className="p-5 rounded-2xl glass-panel border border-gym-500/40 hover:border-gym-500 bg-gradient-to-br from-gym-950/20 to-surface-card flex items-center justify-between group transition-all shadow-lg hover:shadow-gym-950/30 min-h-[70px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gym-500/20 text-gym-400 border border-gym-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">محطة الاستقبال (الكاونتر)</h4>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                  الماسح السريع، التحقق الفوري، والدخول
                </p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-gym-400 group-hover:-translate-x-1 transition-transform shrink-0" />
          </Link>

          <Link
            href="/dashboard/reports"
            className="p-5 rounded-2xl glass-panel border border-amber-500/40 hover:border-amber-500 bg-gradient-to-br from-amber-950/20 to-surface-card flex items-center justify-between group transition-all shadow-lg hover:shadow-amber-950/30 min-h-[70px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">التقارير وساعات الذروة</h4>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                  تنبؤ تسرب الأعضاء (Churn) وخريطة الازدحام
                </p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform shrink-0" />
          </Link>

          <Link
            href="/dashboard/import-excel"
            className="p-5 rounded-2xl glass-panel border border-blue-500/40 hover:border-blue-500 bg-gradient-to-br from-blue-950/20 to-surface-card flex items-center justify-between group transition-all shadow-lg hover:shadow-blue-950/30 min-h-[70px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">استيراد الأعضاء عبر Excel</h4>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                  رفع جماعي لقوائم المشتركين مع التدقيق
                </p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform shrink-0" />
          </Link>
        </section>

        {/* 2. REVENUE SOURCES & QUICK ANALYTICS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Breakdown */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border lg:col-span-1 space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">توزيع مصادر الدفع (هذا الشهر)</h3>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">MRU أوقية</span>
            </div>

            <div className="space-y-4">
              {(metrics?.paymentMethodBreakdown || []).map((item) => (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">{item.name}</span>
                    <span className="text-white font-mono">
                      {item.amount.toLocaleString()} MRU ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-surface-dark/70 border border-surface-border text-xs flex items-center justify-between">
              <span className="text-gray-400">إجمالي الشهر:</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {(metrics?.monthlyRevenueMRU || 0).toLocaleString()} MRU
              </span>
            </div>
          </div>

          {/* Real-time Visit Feed */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-gym-400" />
                <h3 className="font-bold text-sm text-white">آخر حركات الدخول الممسوحة</h3>
              </div>
              <span className="text-xs text-gym-400 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-gym-500 animate-ping" />
                مباشر (Live)
              </span>
            </div>

            <div className="space-y-2.5">
              {(metrics?.recentVisits || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  لا توجد حركات دخول مسجلة مؤخراً
                </div>
              ) : (
                (metrics?.recentVisits || []).map((visit) => (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl bg-surface-dark/60 border border-surface-border flex items-center justify-between hover:border-gym-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gym-500/10 border border-gym-500/30 flex items-center justify-center text-gym-400 font-bold text-xs shrink-0">
                        {visit.member?.full_name?.charAt(0) || 'ع'}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          {visit.member?.full_name || 'عضو غير معروف'}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gym-500/20 text-gym-400 font-medium">
                            ساري
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span dir="ltr">{visit.member?.phone}</span>
                          <span>•</span>
                          <span>{visit.method === 'qr' ? 'مسح QR ديناميكي' : 'تسجيل يدوي'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs text-gray-300 shrink-0">
                      <div>
                        {new Date(visit.entered_at).toLocaleTimeString('ar-MR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-sans">
                        {visit.branch?.name || 'الفرع الرئيسي'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3. CHURN RISK & PEAK HOURS (Phase D Deliverables) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Churn Risk Alert Box */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-rose-300">
                  خطر تسرب الأعضاء (Churn Risk: غياب 7+ و 14+ يوماً)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">
                {metrics?.churnRiskMembers.length || 0} أعضاء
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {(metrics?.churnRiskMembers || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  رائع! لا يوجد أعضاء منقطعون لأكثر من 7 أيام. معدل الالتزام مرتفع.
                </div>
              ) : (
                (metrics?.churnRiskMembers || []).map((crm) => (
                  <div
                    key={crm.id}
                    className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{crm.full_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono" dir="ltr">
                        {crm.phone}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          crm.riskLevel === 'high'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        غائب منذ {crm.daysInactive} يوماً
                      </span>
                      <a
                        href={`https://wa.me/222${crm.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `مرحباً ${crm.full_name}، لاحظنا غيابك عن الصالة منذ فترة! هل تحتاج إلى مساعدة أو تعديل جدول التمارين؟`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-600/50 transition-colors"
                      >
                        واتساب
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Peak Hours Heatmap / Hours Distribution */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-gym-400" />
                <h3 className="font-bold text-sm text-white">
                  توزيع أوقات الذروة حسب حركات الدخول (Peak Hours)
                </h3>
              </div>
              <span className="text-xs text-gray-400">من 06:00 إلى 23:00</span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 pt-2">
                {(metrics?.peakHours || []).map((ph) => {
                  const maxCount = Math.max(1, ...(metrics?.peakHours || []).map((p) => p.count));
                  const intensity = Math.round((ph.count / maxCount) * 100);
                  const bgClass =
                    ph.count === 0
                      ? 'bg-surface-dark text-gray-500 border-surface-border'
                      : intensity > 60
                      ? 'bg-gym-500 text-white font-bold border-gym-400'
                      : intensity > 30
                      ? 'bg-gym-500/40 text-gym-200 border-gym-500/50'
                      : 'bg-gym-500/20 text-gym-400 border-gym-500/30';

                  return (
                    <div
                      key={ph.hour}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between h-14 ${bgClass}`}
                    >
                      <div className="text-[10px] font-mono">{ph.hour}:00</div>
                      <div className="text-xs font-black font-mono">{ph.count}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                الأرقام توضح عدد الزيارات الموثقة لكل ساعة لمساعدة الإدارة في تنظيم حصص المدربين وسعة الصالة.
              </p>
            </div>
          </div>
        </section>

        {/* 4. RECENT PAYMENTS AUDIT TABLE */}
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">سجل المدفوعات الأخيرة والتحصيلات</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                مبالغ أعداد صحيحة بالأوقية MRU مع خيار الإلغاء الآمن (Soft-Cancel) الموثق
              </p>
            </div>
            <Link
              href="/dashboard/payments"
              className="text-xs text-gym-400 hover:text-gym-300 font-bold flex items-center gap-1"
            >
              <span>عرض كل المدفوعات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {(metrics?.recentPayments || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                لا توجد مدفوعات مسجلة حتى الآن
              </div>
            ) : (
              (metrics?.recentPayments || []).map((pay) => (
                <div
                  key={pay.id}
                  className="p-3.5 rounded-xl bg-surface-dark border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                      MRU
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{pay.member?.full_name || 'عضو غير معروف'}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            pay.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {pay.status === 'completed' ? 'ناجحة' : 'ملغاة'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 font-mono">
                        <span>{pay.method.toUpperCase()}</span>
                        {pay.transaction_ref && <span>• Ref: {pay.transaction_ref}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-black text-white font-mono text-sm">
                      {Math.round(pay.amount_mru).toLocaleString()} MRU
                    </span>
                    {pay.status === 'completed' && (
                      <button
                        onClick={() => setCancelModalPayment(pay)}
                        className="px-2.5 py-1 rounded-lg bg-surface-card border border-red-500/30 text-red-400 hover:bg-red-500/15 text-[11px] font-bold min-h-[36px]"
                      >
                        إلغاء أمني
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleMemberAdded}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={handlePaymentRecorded}
      />

      <CancelPaymentModal
        payment={cancelModalPayment}
        isOpen={!!cancelModalPayment}
        onClose={() => setCancelModalPayment(null)}
        onSuccess={handlePaymentCancelled}
      />
    </>
  );
}
