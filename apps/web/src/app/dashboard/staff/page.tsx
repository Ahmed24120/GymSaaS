'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { getStaff, StaffRecord } from '@/lib/data/staff';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/common/Toast';

export default function StaffPage() {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaffList = useCallback(async () => {
    setIsLoading(true);
    const res = await getStaff();
    if (res.ok) {
      setStaffList(res.value);
    } else {
      showToast({ type: 'error', title: 'فشل تحميل بيانات طاقم الصالة: ' + res.error.message });
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  return (
    <>
      <Header
        title="إدارة الموظفين والصلاحيات (Staff & Permissions)"
        subtitle="تحديد الأدوار، حسابات الاستقبال، وضبط الصلاحيات الصارمة المطبقة عبر قواعد RLS"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        {/* Security Alert Banner */}
        <div className="p-5 rounded-2xl border border-gym-500/30 bg-gradient-to-r from-gym-950/40 via-surface-card to-surface-card flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-gym-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <h4 className="font-bold text-white text-sm">
              الحماية الأمنية المتقدمة عبر خادم قاعدة البيانات (RLS)
            </h4>
            <p className="text-gray-300 mt-1">
              تُطبّق صلاحيات الطاقم مباشرة عبر سياسات Row Level Security في PostgreSQL.
              لا يمتلك موظف الاستقبال صلاحية إلغاء أو حذف المدفوعات أو تعديل أسعار الباقات.
            </p>
          </div>
        </div>

        <PageHeader
          title="فريق العمل والموظفون المسجلون"
          subtitle={`الموظفون المسجلون في قاعدة البيانات: ${staffList.length}`}
          action={
            <button
              onClick={fetchStaffList}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          }
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-36 h-6" />
                <Skeleton className="w-full h-24" />
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا يوجد طاقم عمل مسجل بعد"
            description="يتم ربط الموظفين وحساباتهم عبر سكربت dev_users.sql أو عبر لوحة Super Admin"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((staff) => {
              const isOwner = staff.role === 'gym_owner';

              return (
                <div
                  key={staff.id}
                  className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between space-y-5 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isOwner
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {isOwner ? 'المدير العام (مالك الصالة)' : 'موظف استقبال (Receptionist)'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400" dir="ltr">
                        {staff.profile?.phone || '—'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">
                      {staff.profile?.full_name || 'موظف بدون اسم'}
                    </h4>

                    {staff.branch?.name && (
                      <div className="text-xs text-gray-400 mt-1">
                        الفرع: {staff.branch.name}
                      </div>
                    )}

                    {/* Role permissions display */}
                    <div className="mt-5 space-y-2 border-t border-surface-border/60 pt-4">
                      <span className="text-[11px] font-bold text-gray-400 block mb-2">
                        الصلاحيات المقررة حسب الدور:
                      </span>
                      <div className="space-y-1.5 text-xs text-gray-300">
                        <div className="flex justify-between items-center p-2 rounded-xl bg-surface-dark/60">
                          <span>تسجيل الأعضاء ومسح QR</span>
                          <span className="text-gym-400 font-bold text-[10px]">ممنوح</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-surface-dark/60">
                          <span>تسجيل المدفوعات</span>
                          <span className="text-gym-400 font-bold text-[10px]">ممنوح</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-surface-dark/60">
                          <span>إلغاء المعاملات (Soft-Cancel)</span>
                          <span className={`font-bold text-[10px] ${isOwner ? 'text-gym-400' : 'text-gray-500'}`}>
                            {isOwner ? 'ممنوح' : 'محجوب (المالك فقط)'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-xl bg-surface-dark/60">
                          <span>تعديل الباقات والأسعار</span>
                          <span className={`font-bold text-[10px] ${isOwner ? 'text-gym-400' : 'text-gray-500'}`}>
                            {isOwner ? 'ممنوح' : 'محجوب (المالك فقط)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span className="truncate max-w-[120px]">{staff.id.slice(0, 8)}...</span>
                    <span className={staff.is_active ? 'text-gym-400 font-bold' : 'text-rose-400 font-bold'}>
                      {staff.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
