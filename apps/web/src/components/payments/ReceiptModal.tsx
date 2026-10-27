'use client';

import React from 'react';
import { PaymentRecord } from '@/lib/data/payments';
import { formatMRU } from '@/lib/services/currency';
import { formatDateNouakchott } from '@/lib/services/dateUtils';
import { CheckCircle2, Share2, Printer, X, Dumbbell } from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { mauritaniaWhatsAppPhone } from '@/components/common/phone';

interface ReceiptModalProps {
  payment: PaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptModal({ payment, isOpen, onClose }: ReceiptModalProps) {
  const { showToast } = useToast();
  if (!isOpen || !payment) return null;

  const member = payment.member;

  const handleShareWhatsApp = () => {
    if (!member) return;
    const targetPhone = mauritaniaWhatsAppPhone(member.phone);
    if (!targetPhone) {
      showToast({ type: 'error', title: 'رقم الهاتف غير صالح لفتح واتساب' });
      return;
    }
    const text = encodeURIComponent(
      `🧾 *إيصال دفع رسمي — GymSaaS*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *المشترك*: ${member.full_name}\n` +
      `💰 *المبلغ المستلم*: ${formatMRU(payment.amount_mru)}\n` +
      `💳 *طريقة الدفع*: ${payment.method.toUpperCase()}\n` +
      `🔢 *المرجع*: ${payment.transaction_ref || payment.id.slice(0, 8)}\n` +
      `📅 *التاريخ*: ${formatDateNouakchott(payment.created_at, true)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `شكراً لثقتكم بنا، نتمنى لكم تدريباً ممتعاً!`
    );
    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
    showToast({
      type: 'success',
      title: 'تم تجهيز الإيصال',
      message: 'تم فتح محادثة الواتساب لإرسال الإيصال الرقمي للعميل.',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="إيصال الدفع"
      className="receipt-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="receipt-paper w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface-card border border-surface-border shadow-2xl overflow-y-auto max-h-[95dvh] relative text-white text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Receipt Header */}
        <div className="p-6 bg-gradient-to-b from-surface-dark to-surface-card border-b border-surface-border text-center relative">
          <button
            onClick={onClose}
            className="receipt-action absolute left-4 top-4 p-2 rounded-full bg-surface-card text-gray-400 hover:text-white"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gym-500/20 text-gym-400 border border-gym-500/30 mx-auto flex items-center justify-center mb-2 shadow-lg">
            <Dumbbell className="w-6 h-6 transform -rotate-45" />
          </div>

          <h3 className="text-base font-black text-white">GymSaaS Nouakchott</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">نواكشوط، موريتانيا</p>
          <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-gym-500/15 text-gym-400 border border-gym-500/30 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>إيصال دفع إلكتروني معتمد</span>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="text-center py-2 bg-surface-dark/70 rounded-2xl border border-surface-border">
            <div className="text-[11px] text-gray-400">المبلغ المدفوع</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {formatMRU(payment.amount_mru)}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">أوقية جديدة (MRU)</div>
          </div>

          <div className="space-y-2 border-t border-surface-border/60 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-400">اسم العضو:</span>
              <span className="font-bold text-white">{member?.full_name || 'عضو الصالة'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">رقم الهاتف:</span>
              <span className="font-mono text-gray-300" dir="ltr">{member?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">طريقة الدفع:</span>
              <span className="font-bold text-gym-400 uppercase">{payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">رقم المرجع:</span>
              <span className="font-mono text-gray-300">
                {payment.transaction_ref || payment.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">تاريخ المعاملة:</span>
              <span className="font-mono text-gray-300">{formatDateNouakchott(payment.created_at, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">الموظف المحصّل:</span>
              <span className="text-gray-300">{payment.recorder?.full_name || 'موظف الاستقبال'}</span>
            </div>
            {payment.status === 'cancelled' && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] space-y-1">
                <div className="font-bold">حالة الدفعة: ملغاة (Soft-Cancelled)</div>
                {payment.cancellation_reason && (
                  <div>السبب: {payment.cancellation_reason}</div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-surface-border pt-3 text-[10px] text-gray-500 text-center leading-relaxed">
            وفق ضوابط المنصة: هذه الوثيقة مسجلة محاسبياً في سجل التدقيق المالي ولا يمكن حذفها نهائياً.
          </div>
        </div>

        {/* Receipt Actions */}
        <div className="receipt-action p-4 bg-surface-dark border-t border-surface-border flex gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>إرسال بالواتساب</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الإيصال</span>
          </button>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .receipt-overlay, .receipt-overlay * { visibility: visible !important; }
          .receipt-overlay { position: absolute !important; inset: 0 !important; display: block !important; padding: 0 !important; background: white !important; backdrop-filter: none !important; }
          .receipt-paper { max-height: none !important; overflow: visible !important; max-width: none !important; box-shadow: none !important; }
          .receipt-paper, .receipt-paper * { color: black !important; background: white !important; }
          .receipt-action { display: none !important; }
        }
      `}</style>
    </div>
  );
}
