'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  Calendar,
  MessageCircle,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  BarChart2,
  RefreshCw,
  Flame,
  UserX
} from 'lucide-react';
import {
  getDashboardMetrics,
  DashboardMetrics,
} from '@/lib/data';
import { formatMRU } from '@/lib/services/currency';
import { analyzeMemberChurn, ChurnRiskAnalysis } from '@/lib/services/analytics';
import { useToast } from '@/components/common/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { StatSkeleton } from '@/components/ui/Skeleton';

export default function ReportsPage() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetricsData = async () => {
    setLoading(true);
    const res = await getDashboardMetrics();
    if (res.ok) {
      setMetrics(res.value);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetricsData();
  }, []);

  const churnList: ChurnRiskAnalysis[] = (metrics?.churnRiskMembers || []).map((m) =>
    analyzeMemberChurn(
      m.id,
      m.full_name,
      m.phone,
      new Date(Date.now() - m.daysInactive * 86400000).toISOString()
    )
  );

  return (
    <>
      <Header
        title="التقارير والتحليلات المالية والتشغيلية (Reports & Analytics)"
        subtitle="خريطة أوقات الذروة، تنبؤ تسرب المشتركين (Churn Risk)، وتحليل مصادر الدخل الرقمية"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto" dir="rtl">
        {/* Top Refresh */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>بيانات إحصائية وتحليلات مستندة لسجلات الصالة الحقيقية</span>
          <button
            onClick={fetchMetricsData}
            className="p-2 rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {/* 1. TOP METRICS */}
        {loading || !metrics ? (
          <StatSkeleton />
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي الدخل الشهري"
              value={`${metrics.monthlyRevenueMRU.toLocaleString()} MRU`}
              subtitle={`اليوم: ${metrics.todayRevenueMRU.toLocaleString()} MRU`}
              icon={<DollarSign className="w-5 h-5 text-amber-400" />}
              isPositive={true}
              variant="amber"
            />
            <StatCard
              title="المشتركون النشطون"
              value={metrics.activeMembers}
              subtitle={`من أصل ${metrics.totalMembers} مشترك`}
              icon={<Users className="w-5 h-5 text-gym-400" />}
              isPositive={true}
              variant="gym"
            />
            <StatCard
              title="زيارات اليوم الموثقة"
              value={metrics.todayVisits}
              subtitle="حركات دخول عبر QR والاستقبال"
              icon={<Calendar className="w-5 h-5 text-blue-400" />}
              isPositive={true}
            />
            <StatCard
              title="أعضاء معرضون للتسرب"
              value={churnList.length}
              subtitle="غياب متواصل أكثر من 7 أيام"
              icon={<UserX className="w-5 h-5 text-rose-400" />}
              isPositive={false}
              variant="rose"
            />
          </section>
        )}

        {/* 2. PEAK HOURS & REVENUE BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Hours Heatmap */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-gym-400" />
                <h3 className="font-bold text-sm text-white">خريطة أوقات الذروة (Peak Hours)</h3>
              </div>
              <span className="text-xs text-gray-400">ساعات الدخول الفعلية</span>
            </div>

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
            <p className="text-[11px] text-gray-400 leading-relaxed">
              تساعد هذه الخريطة إدارة الصالة على توزيع المدربين وتحديد ساعات الازدحام المسائية لتنظيم الحصص الرياضية.
            </p>
          </div>

          {/* Revenue Breakdown */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">توزيع وسائل الدفع الموريتانية</h3>
              </div>
              <span className="text-xs text-gray-400">هذا الشهر</span>
            </div>

            <div className="space-y-3.5">
              {(metrics?.paymentMethodBreakdown || []).map((m) => (
                <div key={m.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-300">{m.name}</span>
                    <span className="font-mono text-white">
                      {m.amount.toLocaleString()} MRU ({m.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, m.percent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs">
              <span className="text-gray-400">إجمالي المداخيل الموثقة:</span>
              <span className="font-black text-amber-400 font-mono text-sm">
                {(metrics?.monthlyRevenueMRU || 0).toLocaleString()} MRU
              </span>
            </div>
          </div>
        </div>

        {/* 3. CHURN RISK PREDICTION (التنبؤ بالتسرب) */}
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                <span>نظام التنبؤ بتسرب الأعضاء والغياب (Churn Detection)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                تحديد المشتركين المنقطعين لأكثر من 7 أيام وتوفير رسائل واتساب تحفيزية مباشرة
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold font-mono">
              {churnList.length} أعضاء بحاجة للمتابعة
            </span>
          </div>

          {churnList.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              رائع! جميع الأعضاء المشتركين مواظبون على الحضور خلال الأسبوع الأخير.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {churnList.map((c) => (
                <div
                  key={c.memberId}
                  className="p-4 rounded-xl bg-surface-dark border border-surface-border flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{c.memberName}</div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5" dir="ltr">
                        {c.phone}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.riskLevel === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : c.riskLevel === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      غائب منذ {c.daysSinceLastVisit} يوماً
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed bg-surface-card p-2.5 rounded-lg border border-surface-border/50">
                    💡 <span className="text-gray-300 font-medium">{c.recommendation}</span>
                  </p>

                  <div className="flex justify-end pt-1">
                    <a
                      href={c.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[40px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>إرسال رسالة تحفيزية عبر واتساب</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
