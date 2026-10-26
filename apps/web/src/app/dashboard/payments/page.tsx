'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { CreditCard, Plus, RefreshCw } from 'lucide-react';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import CancelPaymentModal from '@/components/payments/CancelPaymentModal';
import ReceiptModal from '@/components/payments/ReceiptModal';
import { getPayments, PaymentRecord } from '@/lib/data/payments';
import { DataTable, Column } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/common/Toast';

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PaymentRecord | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<PaymentRecord | null>(null);

  const fetchPaymentsList = useCallback(async () => {
    setIsLoading(true);
    const res = await getPayments();
    if (res.ok) {
      setPayments(res.value);
    } else {
      showToast({ type: 'error', title: 'فشل تحميل المدفوعات: ' + res.error.message });
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPaymentsList();
  }, [fetchPaymentsList]);

  const handlePaymentRecorded = (newPayment: PaymentRecord) => {
    setPayments((prev) => [newPayment, ...prev]);
  };

  const handlePaymentCancelled = (updatedPayment: PaymentRecord) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
    );
  };

  // Real KPI calculations from payments
  const metrics = useMemo(() => {
    const valid = payments.filter((p) => p.status === 'completed');
    const totalRevenue = valid.reduce((acc, p) => acc + p.amount_mru, 0);
    const bankilyTotal = valid.filter((p) => p.method === 'bankily').reduce((acc, p) => acc + p.amount_mru, 0);
    const masrviTotal = valid.filter((p) => p.method === 'masrvi').reduce((acc, p) => acc + p.amount_mru, 0);
    const cashSedadTotal = valid.filter((p) => p.method === 'cash' || p.method === 'sedad').reduce((acc, p) => acc + p.amount_mru, 0);

    return { totalRevenue, bankilyTotal, masrviTotal, cashSedadTotal };
  }, [payments]);

  const filteredPayments = payments.filter((p) => {
    if (methodFilter === 'all') return true;
    return p.method === methodFilter;
  });

  const columns: Column<PaymentRecord>[] = [
    {
      key: 'id',
      header: 'رقم الوصل',
      render: (p) => (
        <span className="font-mono text-xs text-gray-400">
          {p.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'member',
      header: 'العضو المشترك',
      render: (p) => (
        <div>
          <div className="font-bold text-white text-sm">{p.member?.full_name || 'عضو الصالة'}</div>
          <div className="text-[10px] text-gray-400 font-mono" dir="ltr">{p.member?.phone}</div>
        </div>
      ),
    },
    {
      key: 'amount_mru',
      header: 'المبلغ (MRU)',
      render: (p) => (
        <span className="font-mono font-bold text-white text-sm">
          {p.amount_mru.toLocaleString()} MRU
        </span>
      ),
    },
    {
      key: 'method',
      header: 'وسيلة الدفع',
      render: (p) => {
        const methodBadges = {
          bankily: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          masrvi: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          sedad: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          cash: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
        }[p.method] || 'bg-gray-500/15 text-gray-300';

        return (
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase border ${methodBadges}`}>
            {p.method}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (p) => (
        p.status === 'cancelled' ? (
          <span className="inline-flex items-center text-[11px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
            ملغاة محاسبياً
          </span>
        ) : (
          <span className="inline-flex items-center text-[11px] font-bold text-gym-400 bg-gym-500/15 px-2 py-0.5 rounded border border-gym-500/30">
            مقبولة ومؤكدة
          </span>
        )
      ),
    },
    {
      key: 'created_at',
      header: 'التاريخ',
      render: (p) => (
        <span className="font-mono text-xs text-gray-400">
          {new Date(p.created_at).toLocaleDateString('ar-MR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (p) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReceiptTarget(p)}
            className="min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold text-gym-400 hover:bg-gym-500/15 border border-gym-500/30 transition-colors"
            title="عرض الإيصال الرقمي"
          >
            الإيصال 🧾
          </button>
          {p.status !== 'cancelled' ? (
            <button
              onClick={() => setCancelTarget(p)}
              className="min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-colors"
            >
              إلغاء محاسبي
            </button>
          ) : (
            <span className="text-[10px] text-gray-500 italic max-w-[120px] truncate" title={p.cancellation_reason || ''}>
              {p.cancellation_reason || 'ملغي'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Header
        title="إدارة المدفوعات والمداخيل"
        subtitle="توثيق الإيرادات المالية بالـ MRU، إيصالات الدفع، وإلغاء العمليات بنزاهة وتدقيق"
        onOpenRecordPayment={() => setIsRecordOpen(true)}
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        {/* Real Financial Highlights from Payments DB */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي التحصيلات (MRU)"
            value={`${metrics.totalRevenue.toLocaleString()} MRU`}
            icon={<CreditCard className="w-5 h-5 text-amber-400" />}
            subtitle="أوقية جديدة (أعداد صحيحة)"
            variant="amber"
          />
          <StatCard
            title="تحصيلات بنكيلي (Bankily)"
            value={`${metrics.bankilyTotal.toLocaleString()} MRU`}
            icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
            subtitle="تطبيق بنكيلي"
            variant="gym"
          />
          <StatCard
            title="تحصيلات مصرفي (Masrvi)"
            value={`${metrics.masrviTotal.toLocaleString()} MRU`}
            icon={<CreditCard className="w-5 h-5 text-blue-400" />}
            subtitle="تطبيق مصرفي (BPM)"
          />
          <StatCard
            title="النقد وسداد (Cash & Sedad)"
            value={`${metrics.cashSedadTotal.toLocaleString()} MRU`}
            icon={<CreditCard className="w-5 h-5 text-gray-400" />}
            subtitle="صندوق الاستقبال وتطبيق سداد"
          />
        </section>

        <PageHeader
          title="سجل العمليات المالية"
          subtitle={`إجمالي العمليات المسجلة: ${payments.length}`}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPaymentsList}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="تحديث السجلات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                onClick={() => setIsRecordOpen(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل دفعة</span>
              </button>
            </div>
          }
        />

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <DataTable
            data={filteredPayments}
            columns={columns}
            keyExtractor={(p) => p.id}
            searchPlaceholder="ابحث بالعضو، الهاتف، أو رقم الحوالة..."
            searchFilter={(p, q) =>
              (p.member?.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
              (p.member?.phone || '').includes(q) ||
              (p.transaction_ref || '').toLowerCase().includes(q.toLowerCase()) ||
              p.id.toLowerCase().includes(q.toLowerCase())
            }
            filterOptions={[
              { label: `كافة الطرق (${payments.length})`, value: 'all' },
              {
                label: `بنكيلي (${payments.filter((p) => p.method === 'bankily').length})`,
                value: 'bankily',
              },
              {
                label: `مصرفي (${payments.filter((p) => p.method === 'masrvi').length})`,
                value: 'masrvi',
              },
              {
                label: `سداد (${payments.filter((p) => p.method === 'sedad').length})`,
                value: 'sedad',
              },
              {
                label: `نقداً (${payments.filter((p) => p.method === 'cash').length})`,
                value: 'cash',
              },
            ]}
            activeFilter={methodFilter}
            onFilterChange={setMethodFilter}
            emptyTitle="لا توجد مدفوعات مسجلة"
            emptyDescription="يمكنك تسجيل الدفعة الأولى بالنقر على زر 'تسجيل دفعة' أعلاه"
          />
        )}
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
        onSuccess={handlePaymentCancelled}
      />

      <ReceiptModal
        payment={receiptTarget}
        isOpen={!!receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />
    </>
  );
}
