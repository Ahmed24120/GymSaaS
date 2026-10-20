'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  Users,
  Search,
  UserPlus,
  RefreshCw,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  MoreVertical,
  Dumbbell
} from 'lucide-react';
import { mockMembers, mockBranches, mockPlans } from '@/lib/mockData';
import AddMemberModal from '@/components/members/AddMemberModal';
import { Member, MemberStatus } from '@/types/database';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ? true : member.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleMemberAdded = (newMember: Partial<Member>) => {
    setMembers([newMember as Member, ...members]);
  };

  const handleRenewSubscription = (memberId: string) => {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days renewal

    setMembers(
      members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: 'active',
              active_subscription: {
                id: `sub-${Date.now()}`,
                gym_id: 'gym-001',
                member_id: memberId,
                plan_id: 'plan-001',
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                plan: mockPlans[0],
              },
            }
          : m
      )
    );
    alert('تم تجديد الاشتراك بنجاح لمدة 30 يوماً!');
  };

  return (
    <>
      <Header
        title="إدارة أعضاء الصالة"
        subtitle="تسجيل، تجديد الاشتراكات، والبحث عن الأعضاء بالاسم أو الهاتف"
        onOpenAddMember={() => setIsAddMemberOpen(true)}
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Top Control Bar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ابحث بالاسم الكامل أو رقم الهاتف (مثال: 46 80...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'الجميع', count: members.length },
              { id: 'active', label: 'النشطون', count: members.filter((m) => m.status === 'active').length },
              { id: 'expired', label: 'المنتهية', count: members.filter((m) => m.status === 'expired').length },
              { id: 'inactive', label: 'غير نشط', count: members.filter((m) => m.status === 'inactive').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-gym-500 text-white shadow-sm shadow-gym-600/30'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-card text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Members Table */}
        <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-5">العضو المشترك</th>
                  <th className="py-3.5 px-5">رقم الهاتف</th>
                  <th className="py-3.5 px-5">الفرع التابع</th>
                  <th className="py-3.5 px-5">الباقة الحالية</th>
                  <th className="py-3.5 px-5">تاريخ نهاية الاشتراك</th>
                  <th className="py-3.5 px-5">الحالة</th>
                  <th className="py-3.5 px-5 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-gray-200">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      لم يتم العثور على أي عضو يطابق شروط البحث.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const branch = mockBranches.find((b) => b.id === member.branch_id);
                    const sub = member.active_subscription;

                    return (
                      <tr key={member.id} className="hover:bg-surface-border/20 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gym-600 to-gym-400 text-white font-bold flex items-center justify-center text-xs shadow">
                              {member.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{member.full_name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {member.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-5 font-mono text-gray-300" dir="ltr">
                          {member.phone}
                        </td>

                        {/* Branch */}
                        <td className="py-3.5 px-5 text-gray-300">
                          {branch?.name || 'الفرع الرئيسي'}
                        </td>

                        {/* Plan */}
                        <td className="py-3.5 px-5">
                          {sub?.plan ? (
                            <span className="font-semibold text-gray-200">
                              {sub.plan.name}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">بدون باقة حالية</span>
                          )}
                        </td>

                        {/* End Date */}
                        <td className="py-3.5 px-5 font-mono">
                          {sub?.end_date ? (
                            <div>
                              <div className="font-semibold text-white">
                                {new Date(sub.end_date).toLocaleDateString('ar-MR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {new Date(sub.end_date) > new Date() ? 'ساري المفعول' : 'منتهي الصلاحية'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                              member.status === 'active'
                                ? 'bg-gym-500/15 text-gym-400 border border-gym-500/30'
                                : member.status === 'expired'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'active' ? 'bg-gym-400' : member.status === 'expired' ? 'bg-rose-400' : 'bg-gray-400'
                            }`} />
                            {member.status === 'active' ? 'نشط' : member.status === 'expired' ? 'منتهي' : 'غير نشط'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleRenewSubscription(member.id)}
                              className="px-3 py-1.5 rounded-lg bg-gym-500/15 hover:bg-gym-500/25 text-gym-400 border border-gym-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="تجديد الاشتراك"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>تجديد</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleMemberAdded}
      />
    </>
  );
}
