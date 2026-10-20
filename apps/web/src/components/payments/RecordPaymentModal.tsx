'use client';

import React, { useState } from 'react';
import { X, CreditCard, User, Banknote, CheckCircle, Hash } from 'lucide-react';
import { mockMembers } from '@/lib/mockData';
import { Payment, PaymentMethod } from '@/types/database';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPayment: Payment) => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [memberId, setMemberId] = useState(mockMembers[0].id);
  const [amountMRU, setAmountMRU] = useState('1500');
  const [method, setMethod] = useState<PaymentMethod>('bankily');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const intAmount = parseInt(amountMRU, 10);
    if (isNaN(intAmount) || intAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح بالأوقية (MRU)');
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      const selectedMem = mockMembers.find((m) => m.id === memberId);
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        gym_id: 'gym-001',
        member_id: memberId,
        subscription_id: selectedMem?.active_subscription?.id || null,
        amount_mru: intAmount, // أعداد صحيحة حسب القواعد
        method: method,
        transaction_ref: transactionRef.trim() || null,
        recorded_by: 'usr-admin',
        status: 'completed',
        cancelled_by: null,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date().toISOString(),
        member: selectedMem,
      };

      onSuccess(newPayment);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-surface-dark/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تسجيل دفعة مالية جديدة</h3>
              <p className="text-xs text-gray-400">تسجيل فوري للمدفوعات النقدية وعبر التطبيقات البنكية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-surface-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              اختيار العضو المشترك <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
              >
                {mockMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.phone}) - {m.status === 'active' ? 'نشط' : 'منتهي'}
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Amount in MRU */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              المبلغ المستلم (أوقية جديدة MRU) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="مثال: 1500"
                value={amountMRU}
                onChange={(e) => setAmountMRU(e.target.value)}
                className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-base font-bold text-white focus:outline-none focus:border-gym-500 transition-colors font-mono"
              />
              <span className="absolute left-4 top-3 text-xs font-black text-gym-400">MRU</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">يُشترط تسجيل المبلغ كعدد صحيح (أوقية جديدة) دون كسور.</p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              طريقة الاستلام والدفع <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'bankily', name: 'بنكيلي (Bankily)', desc: 'تطبيق بنكيلي الشعبي' },
                { id: 'masrvi', name: 'مصرفي (Masrvi)', desc: 'تطبيق مصرفي (BPM)' },
                { id: 'sedad', name: 'سداد (Sedad)', desc: 'تطبيق سداد (BMCI)' },
                { id: 'cash', name: 'نقداً (Espèces)', desc: 'استلام في صندوق الاستقبال' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id as PaymentMethod)}
                  className={`p-3 text-right rounded-xl border transition-all ${
                    method === m.id
                      ? 'bg-amber-500/10 border-amber-500/80 ring-2 ring-amber-500/30'
                      : 'bg-surface-dark border-surface-border hover:bg-surface-border/50'
                  }`}
                >
                  <div className={`text-xs font-bold ${method === m.id ? 'text-amber-400' : 'text-gray-200'}`}>
                    {m.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{m.desc}</div>
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
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white focus:outline-none focus:border-gym-500 font-mono"
                  dir="ltr"
                />
                <Hash className="w-4 h-4 text-gray-500 absolute right-3.5 top-2.5" />
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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
      </div>
    </div>
  );
}
