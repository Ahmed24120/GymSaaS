'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { UserPlus, RefreshCw, Phone } from 'lucide-react';
import AddMemberModal from '@/components/members/AddMemberModal';
import { getMembers, MemberRecord } from '@/lib/data/members';
import { DataTable, Column } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/common/Toast';

export default function MembersPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const fetchMembersList = useCallback(async () => {
    setIsLoading(true);
    const res = await getMembers();
    if (res.ok) {
      setMembers(res.value);
    } else {
      showToast({ type: 'error', title: 'فشل تحميل بيانات الأعضاء: ' + res.error.message });
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchMembersList();
  }, [fetchMembersList]);

  const handleMemberAdded = (newMember: MemberRecord) => {
    setMembers((prev) => [newMember, ...prev]);
  };

  const filteredMembers = members.filter((member) => {
    if (statusFilter === 'all') return true;
    return member.status === statusFilter;
  });

  const columns: Column<MemberRecord>[] = [
    {
      key: 'full_name',
      header: 'العضو المشترك',
      render: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gym-600 to-gym-400 text-white font-bold flex items-center justify-center text-xs shadow shrink-0">
            {m.full_name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-white text-sm">{m.full_name}</div>
            <div className="text-[10px] text-gray-400 font-mono">
              {m.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'الفرع',
      render: (m) => (
        <span className="text-gray-300 text-xs">
          {m.branch?.name || 'الفرع الرئيسي'}
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'الباقة الحالية',
      render: (m) => (
        m.active_subscription?.plan ? (
          <span className="font-semibold text-gray-200 text-xs">
            {m.active_subscription.plan.name}
          </span>
        ) : (
          <span className="text-gray-500 italic text-xs">بدون باقة حالية</span>
        )
      ),
    },
    {
      key: 'end_date',
      header: 'نهاية الاشتراك',
      render: (m) => {
        const sub = m.active_subscription;
        if (!sub?.end_date) return <span className="text-gray-500 text-xs">—</span>;
        const isExpired = new Date(sub.end_date) < new Date();
        return (
          <div className="text-xs">
            <div className="font-mono text-white font-medium">
              {new Date(sub.end_date).toLocaleDateString('ar-MR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className={`text-[10px] ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isExpired ? 'منتهي الصلاحية' : 'ساري المفعول'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (m) => {
        const statusMap = {
          active: { label: 'نشط', class: 'bg-gym-500/15 text-gym-400 border-gym-500/30' },
          expired: { label: 'منتهي', class: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
          inactive: { label: 'غير نشط', class: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
        }[m.status] || { label: m.status, class: 'bg-gray-500/15 text-gray-400' };

        return (
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${statusMap.class}`}>
            {statusMap.label}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <Header
        title="إدارة أعضاء الصالة"
        subtitle="تسجيل وتجديد الاشتراكات والبحث عن الأعضاء بالاسم أو الهاتف"
        onOpenAddMember={() => setIsAddMemberOpen(true)}
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        <PageHeader
          title="قائمة المشتركين"
          subtitle={`إجمالي الأعضاء: ${members.length} مشترك`}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchMembersList}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-gym-600 to-gym-500 hover:from-gym-500 hover:to-gym-400 text-white text-xs font-bold shadow-md shadow-gym-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span>عضو جديد</span>
              </button>
            </div>
          }
        />

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <DataTable
            data={filteredMembers}
            columns={columns}
            keyExtractor={(m) => m.id}
            searchPlaceholder="ابحث بالاسم الكامل أو رقم الهاتف..."
            searchFilter={(m, q) =>
              m.full_name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q)
            }
            filterOptions={[
              { label: `الجميع (${members.length})`, value: 'all' },
              {
                label: `النشطون (${members.filter((m) => m.status === 'active').length})`,
                value: 'active',
              },
              {
                label: `المنتهية (${members.filter((m) => m.status === 'expired').length})`,
                value: 'expired',
              },
              {
                label: `غير نشط (${members.filter((m) => m.status === 'inactive').length})`,
                value: 'inactive',
              },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            emptyTitle="لا يوجد أعضاء حالياً"
            emptyDescription="يمكنك البدء بإضافة أول عضو مشترك في الصالة بالنقر على زر 'عضو جديد'"
          />
        )}
      </main>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleMemberAdded}
      />
    </>
  );
}
