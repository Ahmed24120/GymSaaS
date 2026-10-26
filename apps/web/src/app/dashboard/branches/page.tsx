'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Building2, Plus, MapPin, Phone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getBranches, createBranch, BranchRecord } from '@/lib/data/branches';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/common/Toast';

export default function BranchesPage() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBranchesList = useCallback(async () => {
    setIsLoading(true);
    const res = await getBranches();
    if (res.ok) {
      setBranches(res.value);
    } else {
      showToast({ type: 'error', title: 'فشل تحميل الفروع: ' + res.error.message });
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchBranchesList();
  }, [fetchBranchesList]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const res = await createBranch({
      name: name.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      is_main: branches.length === 0,
    });

    if (res.ok) {
      setBranches((prev) => [...prev, res.value]);
      showToast({ type: 'success', title: 'تمت إضافة الفرع بنجاح' });
      setName('');
      setAddress('');
      setPhone('');
      setIsAddOpen(false);
    } else {
      showToast({ type: 'error', title: 'فشل إضافة الفرع: ' + res.error.message });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Header
        title="إدارة الفروع (Branch Management)"
        subtitle="إنشاء وتعديل فروع الصالة الرياضية وتوزيع الأعضاء وموظفي الاستقبال"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        <PageHeader
          title="فروع الصالة الحالية"
          subtitle="يمكن لكل فرع امتلاك أجهزة استقبال وفحص QR مستقلة"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBranchesList}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="تحديث الفروع"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold text-xs shadow-md shadow-gym-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرع جديد</span>
              </button>
            </div>
          }
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-36 h-6" />
                <Skeleton className="w-full h-8" />
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="لا توجد فروع مضافة حالياً"
            description="قم بإضافة فرعك الأول لبدء توزيع الأعضاء والأجهزة"
            action={{
              label: 'إضافة فرع جديد',
              onClick: () => setIsAddOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        b.is_main
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-gym-500/20 text-gym-400 border-gym-500/30'
                      }`}
                    >
                      {b.is_main ? 'الفرع الرئيسي' : 'فرع إضافي'}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500 truncate max-w-[120px]">
                      {b.id.slice(0, 8)}...
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{b.name}</h3>

                  <div className="mt-4 space-y-2 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gym-400 shrink-0" />
                      <span className="truncate">{b.address || 'العنوان غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gym-400 shrink-0" />
                      <span className="font-mono" dir="ltr">{b.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[11px] text-gym-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>نشط في قاعدة البيانات</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add New Branch */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="إضافة فرع جديد للصالة"
          subtitle="تسجيل فرع جديد وربطه بقاعدة بيانات الصالة"
          maxWidth="md"
        >
          <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">اسم الفرع *</label>
              <input
                type="text"
                required
                placeholder="مثال: فرع دار النعيم (Dar Naim)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm focus:outline-none focus:border-gym-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">العنوان والموقع</label>
              <input
                type="text"
                placeholder="مثال: شارع الأمل، قرب كارفور سانتر"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm focus:outline-none focus:border-gym-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">رقم هاتف الفرع</label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="مثال: +222 45 20 30 40"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-sm focus:outline-none focus:border-gym-500 font-mono"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white font-bold shadow-lg shadow-gym-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفرع'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
