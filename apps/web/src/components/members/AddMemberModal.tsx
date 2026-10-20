'use client';

import React, { useState } from 'react';
import { X, UserPlus, Phone, Calendar, CreditCard, Dumbbell, MapPin, CheckCircle } from 'lucide-react';
import { mockBranches, mockPlans } from '@/lib/mockData';
import { Member, PaymentMethod } from '@/types/database';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: Partial<Member>) => void;
}

export default function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(mockBranches[0].id);
  const [planId, setPlanId] = useState(mockPlans[0].id);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bankily');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedPlan = mockPlans.find((p) => p.id === planId) || mockPlans[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const now = new Date();
      const endDate = new Date(now.getTime() + selectedPlan.duration_days * 24 * 60 * 60 * 1000);

      const createdMember: Partial<Member> = {
        id: `mem-${Date.now()}`,
        full_name: fullName,
        phone: phone.startsWith('+222') ? phone : `+222 ${phone}`,
        branch_id: branchId,
        status: 'active',
        created_at: now.toISOString(),
        active_subscription: {
          id: `sub-${Date.now()}`,
          gym_id: 'gym-001',
          member_id: `mem-${Date.now()}`,
          plan_id: planId,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          plan: selectedPlan,
        },
      };

      onSuccess(createdMember);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-surface-dark/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gym-500/10 border border-gym-500/30 flex items-center justify-center text-gym-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تسجيل عضو جديد</h3>
              <p className="text-xs text-gray-400">إدخال بيانات المشترك وتفعيل خطته الرياضية فورياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-surface-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                رقم الهاتف (موريتانيا) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="2x / 3x / 4x xx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors text-left font-mono"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                الفرع <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
                >
                  {mockBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-gray-500 absolute left-3.5 top-3 pointer-events-none" />
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors cursor-pointer"
                >
                  {mockPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.price_mru} MRU)
                    </option>
                  ))}
                </select>
                <Dumbbell className="w-4 h-4 text-gray-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="p-4 rounded-xl bg-surface-dark/70 border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200">طريقة الدفع (مطلوبة)</span>
              <span className="text-xs font-extrabold text-gym-400 bg-gym-500/10 px-2 py-0.5 rounded border border-gym-500/20">
                المبلغ المستحق: {selectedPlan.price_mru} أوقية (MRU)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'bankily', name: 'بنكيلي (Bankily)', color: 'border-emerald-500/40 text-emerald-300' },
                { id: 'masrvi', name: 'مصرفي (Masrvi)', color: 'border-blue-500/40 text-blue-300' },
                { id: 'sedad', name: 'سداد (Sedad)', color: 'border-amber-500/40 text-amber-300' },
                { id: 'cash', name: 'نقداً (Espèces)', color: 'border-gray-500/40 text-gray-300' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all ${
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
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-gym-500 font-mono"
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
              className="px-4 py-2.5 rounded-xl border border-surface-border text-xs font-semibold text-gray-400 hover:text-white hover:bg-surface-border transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-lg shadow-gym-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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
      </div>
    </div>
  );
}
