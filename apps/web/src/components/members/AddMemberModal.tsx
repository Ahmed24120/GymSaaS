'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Phone, Dumbbell, MapPin, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { createMember, MemberRecord } from '@/lib/data/members';
import { recordPayment } from '@/lib/data/payments';
import { getPlans, PlanRecord } from '@/lib/data/plans';
import { getBranches, BranchRecord } from '@/lib/data/branches';
import { useToast } from '@/components/common/Toast';
import ReceiptModal from '@/components/payments/ReceiptModal';
import type { PaymentRecord } from '@/lib/data/payments';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: MemberRecord) => void;
}

export default function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bankily' | 'masrvi' | 'sedad' | 'cash'>('bankily');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [receipt, setReceipt] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      getBranches().then((res) => {
        if (res.ok && res.value.length > 0) {
          setBranches(res.value);
          setBranchId(res.value[0].id);
        }
      });
      getPlans().then((res) => {
        if (res.ok && res.value.length > 0) {
          const activePlans = res.value.filter((p) => p.active);
          setPlans(activePlans);
          if (activePlans.length > 0) setPlanId(activePlans[0].id);
        }
      });
    }
  }, [isOpen]);

  const selectedPlan = plans.find((p) => p.id === planId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !planId || !selectedPlan) {
      showToast({ type: 'warning', title: 'يرجى ملء جميع الحقول الإلزامية' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create real member in public.members
      const memRes = await createMember({
        full_name: fullName.trim(),
        phone: phone.trim().startsWith('+222') ? phone.trim() : `+222 ${phone.trim()}`,
        branch_id: branchId || null,
      });

      if (!memRes.ok) {
        showToast({ type: 'error', title: memRes.error.message });
        setIsSubmitting(false);
        return;
      }

      const createdMember = memRes.value;

      // 2. Record initial payment & create subscription
      const payRes = await recordPayment({
        member_id: createdMember.id,
        plan_id: selectedPlan.id,
        duration_days: selectedPlan.duration_days,
        amount_mru: selectedPlan.price_mru,
        method: paymentMethod,
        transaction_ref: transactionRef.trim() || undefined,
      });

      if (!payRes.ok) {
        showToast({ type: 'error', title: 'تم تسجيل العضو لكن فشل تسجيل الدفعة: ' + payRes.error.message });
      } else {
        showToast({ type: 'success', title: 'تم تسجيل العضو وتفعيل الاشتراك بنجاح' });
        setReceipt(payRes.value);
      }

      onSuccess({
        ...createdMember,
        status: payRes.ok ? 'active' : createdMember.status,
        active_subscription: payRes.ok && payRes.value.subscription ? {
          id: payRes.value.subscription.id,
          start_date: payRes.value.subscription.start_date,
          end_date: payRes.value.subscription.end_date,
          status: 'active',
          plan: selectedPlan ? { id: selectedPlan.id, name: selectedPlan.name, price_mru: selectedPlan.price_mru } : null,
        } : null,
      });

      // Reset form
      setFullName('');
      setPhone('');
      setTransactionRef('');
      setIsSubmitting(false);
      onClose();
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ غير متوقع أثناء الحفظ' });
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل عضو جديد"
      subtitle="إدخال بيانات المشترك وتفعيل خطته الرياضية فورياً في قاعدة البيانات"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              الاسم الكامل <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: سيدي محمد ولد محمد"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              رقم الهاتف (موريتانيا) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                required
                placeholder="2x / 3x / 4x xx xx xx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] ps-3.5 pe-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
                dir="ltr"
              />
              <Phone className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">الفرع</label>
            <div className="relative">
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <MapPin className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              نوع باقة الاشتراك <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price_mru} MRU)
                  </option>
                ))}
              </select>
              <Dumbbell className="w-4 h-4 text-gray-500 absolute end-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Payment Method Details */}
        <div className="p-4 rounded-xl bg-surface-dark/70 border border-surface-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-gray-200">طريقة الدفع (مطلوبة)</span>
            {selectedPlan && (
              <span className="text-xs font-extrabold text-gym-400 bg-gym-500/10 px-2 py-0.5 rounded border border-gym-500/20 font-mono">
                المبلغ: {selectedPlan.price_mru} MRU
              </span>
            )}
          </div>

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
                onClick={() => setPaymentMethod(m.id as any)}
                className={`min-h-[44px] py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all ${
                  paymentMethod === m.id
                    ? 'bg-gym-500/20 border-gym-500 text-gym-400 ring-2 ring-gym-500/30 font-bold'
                    : 'bg-surface-card border-surface-border text-gray-400 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                رقم إشعار أو مرجع العملية البنكية (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: BNK-829141"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-gym-500 font-mono"
                dir="ltr"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white hover:bg-surface-border transition-all"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-lg shadow-gym-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>جاري الحفظ والتفعيل...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>تأكيد التسجيل وتفعيل الاشتراك</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
    <ReceiptModal payment={receipt} isOpen={!!receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
