'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import StatCard from '@/components/dashboard/StatCard';
import {
  Users,
  CreditCard,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  QrCode,
  UserCheck,
  Building,
  Smartphone,
  Wallet
} from 'lucide-react';
import {
  mockDashboardMetrics,
  mockPayments,
  mockVisits,
  mockMembers
} from '@/lib/mockData';
import AddMemberModal from '@/components/members/AddMemberModal';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import CancelPaymentModal from '@/components/payments/CancelPaymentModal';
import { Member, Payment } from '@/types/database';

export default function GymOwnerDashboard() {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [cancelModalPayment, setCancelModalPayment] = useState<Payment | null>(null);

  const [membersList, setMembersList] = useState<Member[]>(mockMembers);
  const [paymentsList, setPaymentsList] = useState<Payment[]>(mockPayments);

  const handleMemberAdded = (newMember: Partial<Member>) => {
    setMembersList([newMember as Member, ...membersList]);
  };

  const handlePaymentRecorded = (newPayment: Payment) => {
    setPaymentsList([newPayment, ...paymentsList]);
  };

  const handlePaymentCancelled = (paymentId: string, reason: string) => {
    setPaymentsList(
      paymentsList.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: 'cancelled',
              cancelled_by: 'usr-admin',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: reason,
            }
          : p
      )
    );
  };

  return (
    <>
      <Header
        title="لوحة تحكم إدارة الصالة"
        subtitle="نظرة شاملة ومباشرة على المشتركين، المداخيل اليومية والشهرية، وحركات الدخول"
        onOpenAddMember={() => setIsAddMemberOpen(true)}
        onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
      />

      <main className="p-8 space-y-8 flex-1">
        {/* 1. TOP METRICS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Members */}
          <StatCard
            title="المشتركون النشطون حالياً"
            value={mockDashboardMetrics.activeMembers}
            subtitle={`من أصل ${mockDashboardMetrics.totalMembers} عضو`}
            icon={Users}
            trend={{ value: '14%', isPositive: true }}
            accentColor="gym"
          />

          {/* Expired / Expiring */}
          <StatCard
            title="منتهية وقريبة من الانتهاء"
            value={mockDashboardMetrics.expiredMembers}
            subtitle={`+${mockDashboardMetrics.expiringSoon} خلال 7 أيام`}
            icon={AlertCircle}
            trend={{ value: '3%', isPositive: false }}
            accentColor="rose"
          />

          {/* Revenue Monthly */}
          <StatCard
            title="المداخيل الشهرية (MRU)"
            value={mockDashboardMetrics.monthlyRevenueMRU.toLocaleString()}
            subtitle={`اليوم: ${mockDashboardMetrics.todayRevenueMRU.toLocaleString()} MRU`}
            icon={CreditCard}
            trend={{ value: '22%', isPositive: true }}
            accentColor="amber"
          />

          {/* Visits Today */}
          <StatCard
            title="حركات الدخول اليوم (الزيارات)"
            value={mockDashboardMetrics.todayVisits}
            subtitle="سجل مسح الـ QR والاستقبال"
            icon={CalendarCheck}
            trend={{ value: '8%', isPositive: true }}
            accentColor="blue"
          />
        </section>

        {/* 2. REVENUE SOURCES & QUICK ANALYTICS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border lg:col-span-1 space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">توزيع مصادر الدفع (هذا الشهر)</h3>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">MRU أوقية</span>
            </div>

            <div className="space-y-4">
              {[
                { name: 'بنكيلي (Bankily)', percent: 54, amount: 46710, color: 'bg-emerald-500' },
                { name: 'مصرفي (Masrvi)', percent: 28, amount: 24220, color: 'bg-blue-500' },
                { name: 'نقداً (Espèces)', percent: 12, amount: 10380, color: 'bg-gray-400' },
                { name: 'سداد (Sedad)', percent: 6, amount: 5190, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">{item.name}</span>
                    <span className="text-white font-mono">{item.amount.toLocaleString()} MRU ({item.percent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-surface-dark rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-surface-dark/70 border border-surface-border text-xs flex items-center justify-between">
              <span className="text-gray-400">الإجمالي المجمع:</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {mockDashboardMetrics.monthlyRevenueMRU.toLocaleString()} MRU
              </span>
            </div>
          </div>

          {/* Real-time Visit Feed */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-gym-400" />
                <h3 className="font-bold text-sm text-white">آخر حركات الدخول الممسوحة اليوم</h3>
              </div>
              <span className="text-xs text-gym-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gym-500 animate-ping" />
                مباشر (Live)
              </span>
            </div>

            <div className="space-y-3">
              {mockVisits.map((visit) => {
                const mem = mockMembers.find((m) => m.id === visit.member_id);
                return (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl bg-surface-dark/60 border border-surface-border flex items-center justify-between hover:border-gym-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gym-500/10 border border-gym-500/30 flex items-center justify-center text-gym-400 font-bold">
                        {mem?.full_name.charAt(0) || 'ع'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {mem?.full_name || 'عضو غير معروف'}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gym-500/20 text-gym-400 font-medium">
                            اشتراك ساري
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{mem?.phone}</span>
                          <span>•</span>
                          <span>طريقة الدخول: {visit.method === 'qr' ? 'مسح QR ديناميكي' : 'تسجيل يدوي'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs text-gray-300">
                      <div>
                        {new Date(visit.entered_at).toLocaleTimeString('ar-MR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-sans">تفرغ زينة</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. RECENT PAYMENTS AUDIT TABLE */}
        <section className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <div>
              <h3 className="font-bold text-base text-white">سجل المدفوعات الأخيرة والتحصيلات</h3>
              <p className="text-xs text-gray-400">تتبع المدفوعات المسجلة عبر موظفي الاستقبال والمالك</p>
            </div>
            <button
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-xs font-semibold text-gym-400 hover:text-gym-300 hover:underline"
            >
              + تسجيل دفعة جديدة
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">العضو المشترك</th>
                  <th className="py-3 px-4">المبلغ المستلم</th>
                  <th className="py-3 px-4">وسيلة الدفع</th>
                  <th className="py-3 px-4">المرجع البنكي</th>
                  <th className="py-3 px-4">سجل بواسطة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-gray-200">
                {paymentsList.map((payment) => {
                  const mem = mockMembers.find((m) => m.id === payment.member_id);
                  const isCancelled = payment.status === 'cancelled';

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-surface-border/20 transition-colors ${
                        isCancelled ? 'opacity-60 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        {mem?.full_name || 'عضو'}
                        <div className="text-[10px] text-gray-400 font-normal">{mem?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        {payment.amount_mru} MRU
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
                            payment.method === 'bankily'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : payment.method === 'masrvi'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : payment.method === 'sedad'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                          }`}
                        >
                          {payment.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-400">
                        {payment.transaction_ref || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {payment.recorded_by === 'usr-admin' ? 'مالك الصالة' : 'الاستقبال'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCancelled ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30"
                            title={payment.cancellation_reason || 'تم الإلغاء'}
                          >
                            ملغى (Soft-Cancelled)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gym-400 bg-gym-500/15 px-2 py-0.5 rounded border border-gym-500/30">
                            مكتمل
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                        {new Date(payment.created_at).toLocaleDateString('ar-MR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!isCancelled ? (
                          <button
                            onClick={() => setCancelModalPayment(payment)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors"
                          >
                            إلغاء محاسبي
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            سبب: {payment.cancellation_reason?.slice(0, 20)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
        onConfirm={handlePaymentCancelled}
      />
    </>
  );
}
