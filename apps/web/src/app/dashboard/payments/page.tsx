'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  Wallet,
  ArrowDownLeft,
  FileText
} from 'lucide-react';
import { mockPayments, mockMembers, mockDashboardMetrics } from '@/lib/mockData';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import CancelPaymentModal from '@/components/payments/CancelPaymentModal';
import { Payment } from '@/types/database';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);

  const filteredPayments = payments.filter((p) => {
    const mem = mockMembers.find((m) => m.id === p.member_id);
    const matchesSearch =
      (mem?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transaction_ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem?.phone || '').includes(searchQuery);

    const matchesMethod = methodFilter === 'all' ? true : p.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const handlePaymentRecorded = (newPayment: Payment) => {
    setPayments([newPayment, ...payments]);
  };

  const handlePaymentCancelled = (paymentId: string, reason: string) => {
    setPayments(
      payments.map((p) =>
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
        title="إدارة المدفوعات والمداخيل"
        subtitle="توثيق الإيرادات المالية بالـ MRU، إيصالات الدفع، وإلغاء العمليات بنزاهة وتدقيق"
        onOpenRecordPayment={() => setIsRecordOpen(true)}
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Financial Highlights Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/30">
            <div className="text-xs font-semibold text-gray-400">إجمالي مدخول الشهر (MRU)</div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {mockDashboardMetrics.monthlyRevenueMRU.toLocaleString()} MRU
            </div>
            <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <span className="text-gym-400 font-bold">100%</span>
              <span>أوقية جديدة (أعداد صحيحة)</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30">
            <div className="text-xs font-semibold text-gray-400">تحصيلات بنكيلي (Bankily)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              46,710 MRU
            </div>
            <div className="text-[11px] text-gray-400 mt-2">الحصة الأكبر: 54% من الاشتراكات</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-blue-500/30">
            <div className="text-xs font-semibold text-gray-400">تحصيلات مصرفي (Masrvi)</div>
            <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
              24,220 MRU
            </div>
            <div className="text-[11px] text-gray-400 mt-2">تطبيق مصرفي (BPM): 28%</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-surface-border">
            <div className="text-xs font-semibold text-gray-400">النقد وسداد (Cash & Sedad)</div>
            <div className="text-2xl font-black text-gray-200 mt-1 font-mono">
              15,570 MRU
            </div>
            <div className="text-[11px] text-gray-400 mt-2">صندوق الاستقبال وتطبيق سداد</div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ابحث بالعضو، الهاتف، أو رقم التحويل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'كافة الطرق' },
              { id: 'bankily', label: 'بنكيلي' },
              { id: 'masrvi', label: 'مصرفي' },
              { id: 'sedad', label: 'سداد' },
              { id: 'cash', label: 'نقداً' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMethodFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  methodFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-600/30 font-bold'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-5">رقم الوصل</th>
                  <th className="py-3.5 px-5">العضو المشترك</th>
                  <th className="py-3.5 px-5">المبلغ (MRU)</th>
                  <th className="py-3.5 px-5">وسيلة الدفع</th>
                  <th className="py-3.5 px-5">مرجع المعاملة</th>
                  <th className="py-3.5 px-5">الموظف المسجل</th>
                  <th className="py-3.5 px-5">الحالة</th>
                  <th className="py-3.5 px-5">التاريخ</th>
                  <th className="py-3.5 px-5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-gray-200">
                {filteredPayments.map((payment) => {
                  const mem = mockMembers.find((m) => m.id === payment.member_id);
                  const isCancelled = payment.status === 'cancelled';

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-surface-border/20 transition-colors ${
                        isCancelled ? 'opacity-60 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400">
                        {payment.id}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-white">
                        {mem?.full_name || 'عضو'}
                        <div className="text-[10px] text-gray-400 font-mono font-normal">{mem?.phone}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-white text-sm">
                        {payment.amount_mru} MRU
                      </td>
                      <td className="py-3.5 px-5">
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
                      <td className="py-3.5 px-5 font-mono text-gray-400">
                        {payment.transaction_ref || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-gray-300">
                        {payment.recorded_by === 'usr-admin' ? 'المدير العام' : 'موظف الاستقبال'}
                      </td>
                      <td className="py-3.5 px-5">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
                            ملغي محاسبياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gym-400 bg-gym-500/15 px-2 py-0.5 rounded border border-gym-500/30">
                            مقبول
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400">
                        {new Date(payment.created_at).toLocaleDateString('ar-MR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {!isCancelled ? (
                          <button
                            onClick={() => setCancelTarget(payment)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold text-red-400 hover:bg-red-500/15 border border-red-500/30 transition-colors"
                          >
                            إلغاء محاسبي
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            سبب: {payment.cancellation_reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onSuccess={handlePaymentRecorded}
      />

      <CancelPaymentModal
        payment={cancelTarget}
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handlePaymentCancelled}
      />
    </>
  );
}
