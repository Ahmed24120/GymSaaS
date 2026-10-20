'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  Dumbbell,
  Plus,
  CheckCircle,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Tag,
  DollarSign
} from 'lucide-react';
import { mockPlans, mockMembers } from '@/lib/mockData';
import { Plan } from '@/types/database';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [newPlanPrice, setNewPlanPrice] = useState('2000');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  const handleToggleActive = (planId: string) => {
    setPlans(
      plans.map((p) => (p.id === planId ? { ...p, active: !p.active } : p))
    );
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanPrice) return;

    const newPlan: Plan = {
      id: `plan-${Date.now().toString().slice(-4)}`,
      gym_id: 'gym-001',
      name: newPlanName,
      description: newPlanDesc || 'باقة اشتراك مخصصة',
      duration_days: parseInt(newPlanDays) || 30,
      price_mru: Math.round(parseInt(newPlanPrice)), // أعداد صحيحة فقط طبقاً لـ AGENTS.md
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPlans([...plans, newPlan]);
    setNewPlanName('');
    setNewPlanDesc('');
    setIsAddOpen(false);
  };

  return (
    <>
      <Header
        title="باقات الاشتراكات (Subscription Plans)"
        subtitle="تعريف وإدارة خطط العضوية والأسعار الرسمية بالـ MRU (الأوقية الجديدة)"
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Top Actions & Highlights */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">الباقات النشطة للصالة</h2>
            <p className="text-xs text-gray-400">
              جميع الأسعار بأعداد صحيحة (MRU) ويتم احتساب تواريخ الانتهاء خادمياً
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gym-500 hover:bg-gym-600 text-white font-bold text-xs shadow-lg shadow-gym-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة باقة جديدة</span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const subscribersCount = mockMembers.filter(
              (m) => m.active_subscription?.plan_id === plan.id
            ).length;

            return (
              <div
                key={plan.id}
                className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  plan.active
                    ? 'border-surface-border hover:border-gym-500/50'
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
                    {plan.description || 'لا يوجد وصف تفصيلي'}
                  </p>

                  <div className="mt-5 pt-4 border-t border-surface-border/60 flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] text-gray-400 font-semibold">السعر الرسمي</div>
                      <div className="text-2xl font-black text-gym-400 font-mono">
                        {plan.price_mru.toLocaleString()}
                        <span className="text-xs font-bold text-gray-300 mr-1.5">MRU</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-[11px] text-gray-400 font-semibold">المشتركون حالياً</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {subscribersCount} مشترك
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(plan.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                      plan.active
                        ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                        : 'text-gym-400 hover:bg-gym-500/10 border-gym-500/30'
                    }`}
                  >
                    {plan.active ? 'تعطيل الباقة' : 'تفعيل الباقة'}
                  </button>

                  <span className="text-[10px] text-gray-500 font-mono">ID: {plan.id}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Add New Plan */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-surface-border shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-gym-400" />
                  <span>إضافة باقة اشتراك جديدة</span>
                </h3>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="text-gray-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">اسم الباقة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اشتراك نصف سنوي (6 أشهر)"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white focus:outline-none focus:border-gym-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      المدة بالـ (أيام) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPlanDays}
                      onChange={(e) => setNewPlanDays(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white font-mono focus:outline-none focus:border-gym-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      السعر (MRU أعداد صحيحة) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white font-mono focus:outline-none focus:border-gym-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    الوصف والمميزات
                  </label>
                  <textarea
                    rows={3}
                    placeholder="مزايا الباقة، التجميد، غرف البخار..."
                    value={newPlanDesc}
                    onChange={(e) => setNewPlanDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-dark border border-surface-border text-white focus:outline-none focus:border-gym-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 rounded-xl border border-surface-border text-gray-400 hover:text-white font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gym-500 hover:bg-gym-600 text-white font-bold shadow-md shadow-gym-600/30"
                  >
                    حفظ الباقة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
