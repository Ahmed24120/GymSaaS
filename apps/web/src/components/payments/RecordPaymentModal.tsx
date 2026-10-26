'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, User, Dumbbell, Hash, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { recordPayment, PaymentRecord } from '@/lib/data/payments';
import { getMembers, MemberRecord } from '@/lib/data/members';
import { getPlans, PlanRecord } from '@/lib/data/plans';
import { useToast } from '@/components/common/Toast';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPayment: PaymentRecord) => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const { showToast } = useToast();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);

  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [amountMRU, setAmountMRU] = useState('');
  const [method, setMethod] = useState<'bankily' | 'masrvi' | 'sedad' | 'cash'>('bankily');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getMembers().then((res) => {
        if (res.ok && res.value.length > 0) {
          setMembers(res.value);
          setMemberId(res.value[0].id);
        }
      });
      getPlans().then((res) => {
        if (res.ok && res.value.length > 0) {
          const activePlans = res.value.filter((p) => p.active);
          setPlans(activePlans);
          if (activePlans.length > 0) {
            setPlanId(activePlans[0].id);
            setAmountMRU(activePlans[0].price_mru.toString());
          }
        }
      });
    }
  }, [isOpen]);

  const handlePlanChange = (selectedPlanId: string) => {
    setPlanId(selectedPlanId);
    const p = plans.find((x) => x.id === selectedPlanId);
    if (p) setAmountMRU(p.price_mru.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const intAmount = Math.round(Number(amountMRU));
    if (isNaN(intAmount) || intAmount <= 0) {
      showToast({ type: 'warning', title: 'يرجى إدخال مبلغ صحيح بالأوقية (MRU)' });
      return;
    }

    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan || !memberId) {
      showToast({ type: 'warning', title: 'يرجى اختيار العضو وباقة الاشتراك' });
      return;
    }

    setIsSubmitting(true);
    const res = await recordPayment({
      member_id: memberId,
      plan_id: selectedPlan.id,
      duration_days: selectedPlan.duration_days,
      amount_mru: intAmount,
      method,
      transaction_ref: transactionRef.trim() || undefined,
    });

    if (res.ok) {
      showToast({ type: 'success', title: 'تم تسجيل الدفعة وتجديد الاشتراك بنجاح' });
      onSuccess(res.value);
      setIsSubmitting(false);
      onClose();
    } else {
      showToast({ type: 'error', title: 'فشل تسجيل الدفعة: ' + res.error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل دفعة مالية جديدة"
      subtitle="تسجيل فوري للمدفوعات النقدية وعبر التطبيقات البنكية وتجديد الاشتراك"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            اختيار العضو المشترك <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.phone})
                </option>
              ))}
            </select>
            <User className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            باقة الاشتراك المرتبطة <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price_mru} MRU - {p.duration_days} يوم)
                </option>
              ))}
            </select>
            <Dumbbell className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Amount in MRU */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            المبلغ المستلم (MRU أعداد صحيحة) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              required
              placeholder="مثال: 1500"
              value={amountMRU}
              onChange={(e) => setAmountMRU(e.target.value)}
              className="w-full min-h-[44px] ps-4 pe-16 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-base font-bold text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
            />
            <span className="absolute end-4 top-3 text-xs font-black text-gym-400">MRU</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-2">
            طريقة الاستلام والدفع <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'bankily', name: 'بنكيلي (Bankily)' },
              { id: 'masrvi', name: 'مصرفي (Masrvi)' },
              { id: 'sedad', name: 'سداد (Sedad)' },
              { id: 'cash', name: 'نقداً (Espèces)' },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id as any)}
                className={`min-h-[44px] p-2.5 text-center rounded-xl border text-xs font-semibold transition-all ${
                  method === m.id
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/30 font-bold'
                    : 'bg-surface-dark border-surface-border text-gray-300 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Reference Ref */}
        {method !== 'cash' && (
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              رقم الحوالة أو مرجع المعاملة البنكية
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: TRX-8841920"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full min-h-[44px] ps-3.5 pe-10 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white focus:outline-none focus:border-gym-500 font-mono"
                dir="ltr"
              />
              <Hash className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white transition-all"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>تأكيد تسجيل الدفعة وحفظ السجل</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
