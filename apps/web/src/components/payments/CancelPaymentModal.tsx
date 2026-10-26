'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PaymentRecord, cancelPayment } from '@/lib/data/payments';
import { useToast } from '@/components/common/Toast';

interface CancelPaymentModalProps {
  payment: PaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPayment: PaymentRecord) => void;
}

export default function CancelPaymentModal({
  payment,
  isOpen,
  onClose,
  onSuccess,
}: CancelPaymentModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!payment) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      showToast({ type: 'warning', title: 'يرجى كتابة سبب الإلغاء بشكل مفصل' });
      return;
    }

    setIsSubmitting(true);
    const res = await cancelPayment(payment.id, reason.trim());

    if (res.ok) {
      showToast({ type: 'success', title: 'تم توثيق إلغاء الدفعة في سجل التدقيق الأمني' });
      onSuccess(res.value);
      setReason('');
      setIsSubmitting(false);
      onClose();
    } else {
      showToast({ type: 'error', title: 'فشل إلغاء الدفعة: ' + res.error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إلغاء دفعة مالية (Soft-Cancel)"
      subtitle="توثيق الإلغاء محاسبياً دون حذف السجل الفيزيائي"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 bg-rose-950/30 border border-rose-900/40 rounded-2xl text-xs text-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            وفقاً لضوابط المنصة وسياسات الأمان RLS، <strong>لا يمكن حذف المدفوعات نهائياً</strong>.
            سيتم وسم المعاملة كـ «ملغاة» مع تدوين هوية الموظف والسبب في سجل التدقيق (Audit Logs).
          </p>
        </div>

        <form onSubmit={handleCancel} className="space-y-4">
          <div className="bg-surface-dark p-3.5 rounded-xl border border-surface-border text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-gray-400">
              <span>المبلغ:</span>
              <span className="font-bold text-white">{payment.amount_mru} MRU</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>طريقة الدفع:</span>
              <span className="font-semibold text-gray-200 uppercase">{payment.method}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>رقم المعاملة:</span>
              <span className="text-gray-300 truncate max-w-[180px]">{payment.id}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              سبب الإلغاء المحاسبي <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="مثال: تم إرجاع المبلغ للعميل بسبب خطأ في تكرار العملية البنكية..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-white focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white transition-all"
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'جاري التوثيق...' : 'تأكيد تسجيل الإلغاء'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
