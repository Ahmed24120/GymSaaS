'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Dumbbell, Plus, Clock, Tag, RefreshCw } from 'lucide-react';
import { getPlans, createPlan, togglePlanActive, PlanRecord } from '@/lib/data/plans';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/common/Toast';

export default function PlansPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [newPlanPrice, setNewPlanPrice] = useState('2000');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  const fetchPlansList = useCallback(async () => {
    setIsLoading(true);
    const res = await getPlans();
    if (res.ok) {
      setPlans(res.value);
    } else {
      showToast({ type: 'error', title: 'فشل تحميل الباقات: ' + res.error.message });
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPlansList();
  }, [fetchPlansList]);

  const handleToggle = async (planId: string, currentActive: boolean) => {
    const res = await togglePlanActive(planId, !currentActive);
    if (res.ok) {
      setPlans((prev) => prev.map((p) => (p.id === planId ? res.value : p)));
      showToast({
        type: 'success',
        title: !currentActive ? 'تم تفعيل الباقة بنجاح' : 'تم تعطيل الباقة',
      });
    } else {
      showToast({ type: 'error', title: 'فشل تعديل حالة الباقة: ' + res.error.message });
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanPrice) return;

    setIsSubmitting(true);
    const res = await createPlan({
      name: newPlanName.trim(),
      description: newPlanDesc.trim() || undefined,
      duration_days: parseInt(newPlanDays) || 30,
      price_mru: Math.round(Number(newPlanPrice)),
    });

    if (res.ok) {
      setPlans((prev) => [...prev, res.value]);
      showToast({ type: 'success', title: 'تمت إضافة باقة الاشتراك بنجاح' });
      setNewPlanName('');
      setNewPlanDesc('');
      setIsAddOpen(false);
    } else {
      showToast({ type: 'error', title: 'فشل إضافة الباقة: ' + res.error.message });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Header
        title="باقات الاشتراكات (Subscription Plans)"
        subtitle="تعريف وإدارة خطط العضوية والأسعار الرسمية بالـ MRU (الأوقية)"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        <PageHeader
          title="الباقات المتاحة للصالة"
          subtitle="جميع المبالغ بأعداد صحيحة (MRU) وتحتسب فترات الانتهاء بدقة"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPlansList}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="تحديث الباقات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold text-xs shadow-md shadow-gym-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة باقة جديدة</span>
              </button>
            </div>
          }
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="w-20 h-5" />
                  <Skeleton className="w-16 h-4" />
                </div>
                <Skeleton className="w-36 h-6" />
                <Skeleton className="w-full h-10" />
                <div className="pt-4 border-t border-surface-border flex justify-between">
                  <Skeleton className="w-20 h-8" />
                  <Skeleton className="w-24 h-6" />
                </div>
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="لا توجد باقات معرفة حالياً"
            description="قم بإضافة باقة الاشتراك الأولى لتمكين تسجيل الأعضاء وتفعيل اشتراكاتهم"
            action={{
              label: 'إضافة باقة جديدة',
              onClick: () => setIsAddOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl bg-surface-card border transition-all flex flex-col justify-between ${
                  plan.active
                    ? 'border-surface-border hover:border-gym-500/50 shadow-sm'
                    : 'border-surface-border/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        plan.active
                          ? 'bg-gym-500/20 text-gym-400 border border-gym-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {plan.active ? 'نشطة ومتاحة' : 'معطلة مؤقتاً'}
                    </span>

                    <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {plan.duration_days} يوم
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed min-h-[38px]">
                    {plan.description || 'لا يوجد وصف تفصيلي للباقة'}
                  </p>

                  <div className="mt-5 pt-4 border-t border-surface-border/60 flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] text-gray-400 font-semibold">السعر الرسمي</div>
                      <div className="text-2xl font-black text-gym-400 font-mono">
                        {plan.price_mru.toLocaleString()}
                        <span className="text-xs font-bold text-gray-300 ms-1.5">MRU</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                  <button
                    onClick={() => handleToggle(plan.id, plan.active)}
                    className={`min-h-[44px] text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-colors ${
                      plan.active
                        ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                        : 'text-gym-400 hover:bg-gym-500/10 border-gym-500/30'
                    }`}
                  >
                    {plan.active ? 'تعطيل الباقة' : 'تفعيل الباقة'}
                  </button>

                  <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                    {plan.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add New Plan */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="إضافة باقة اشتراك جديدة"
          subtitle="إنشاء خطة تسعير جديدة مرتبطة بقاعدة بيانات الصالة"
          maxWidth="md"
        >
          <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">اسم الباقة *</label>
              <input
                type="text"
                required
                placeholder="مثال: اشتراك نصف سنوي (6 أشهر)"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm focus:outline-none focus:border-gym-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">
                  المدة بالـ (أيام) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  value={newPlanDays}
                  onChange={(e) => setNewPlanDays(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm font-mono focus:outline-none focus:border-gym-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">
                  السعر (MRU أعداد صحيحة) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min="0"
                  step="1"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm font-mono focus:outline-none focus:border-gym-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">
                الوصف والمميزات
              </label>
              <textarea
                rows={3}
                placeholder="مزايا الباقة، التجميد، غرف البخار..."
                value={newPlanDesc}
                onChange={(e) => setNewPlanDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-sm focus:outline-none focus:border-gym-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-surface-border text-gray-400 hover:text-white font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold shadow-md shadow-gym-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الباقة'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
