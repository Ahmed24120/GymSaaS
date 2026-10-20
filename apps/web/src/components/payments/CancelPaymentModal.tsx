'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle } from 'lucide-react';
import { Payment } from '@/types/database';

interface CancelPaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentId: string, reason: string) => void;
}

export default function CancelPaymentModal({
  payment,
  isOpen,
  onClose,
  onConfirm,
}: CancelPaymentModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !payment) return null;

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('يرجى تحديد سبب الإلغاء بدقة لأغراض التدقيق المحاسبي');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm(payment.id, reason.trim());
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-card border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إلغاء دفعة مالية (Soft-Cancel)</h3>
              <p className="text-[11px] text-gray-400">تسجيل الإلغاء محاسبياً دون الحذف الفيزيائي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-red-950/30 border-b border-red-900/30 text-xs text-red-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            وفقاً لضوابط المنصة المحاسبية (المادة 5.2)، <strong>لا يمكن حذف المدفوعات نهائياً</strong>. سيتم وسم المعاملة كـ «ملغاة» مع تدوين هوية الموظف والسبب في سجل التدقيق الأمني (Audit Log).
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleCancel} className="p-6 space-y-4">
          <div className="bg-surface-dark p-3.5 rounded-xl border border-surface-border text-xs space-y-1.5">
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
              <span className="font-mono text-gray-300">{payment.id}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              سبب الإلغاء المحاسبي <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="مثال: تم إرجاع المبلغ نقداً للعميل بسبب خطأ في تكرار العملية البنكية..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white transition-all"
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <span>جاري التوثيق...</span> : <span>تأكيد تسجيل الإلغاء</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
