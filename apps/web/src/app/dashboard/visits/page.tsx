'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  CalendarCheck,
  Search,
  Filter,
  QrCode,
  UserCheck,
  Building,
  Clock,
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle2
} from 'lucide-react';
import { mockVisits, mockMembers, mockBranches } from '@/lib/mockData';
import { Visit } from '@/types/database';

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>(mockVisits);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'qr' | 'manual'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'offline_sync'>('all');

  const filteredVisits = visits.filter((v) => {
    const mem = mockMembers.find((m) => m.id === v.member_id);
    const matchesSearch =
      (mem?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mem?.phone || '').includes(searchQuery) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'all' ? true : v.method === methodFilter;
    const matchesSource = sourceFilter === 'all' ? true : v.source === sourceFilter;

    return matchesSearch && matchesMethod && matchesSource;
  });

  const totalQr = visits.filter((v) => v.method === 'qr').length;
  const totalManual = visits.filter((v) => v.method === 'manual').length;

  return (
    <>
      <Header
        title="سجل حركات الدخول (Visits Log)"
        subtitle="توثيق زيارات الأعضاء عبر الـ QR Code الديناميكي أو البحث اليدوي في مكتب الاستقبال"
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Quick Highlights */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-gym-500/30">
            <div className="text-xs font-semibold text-gray-400">إجمالي الزيارات المسجلة</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {visits.length} زيارة
            </div>
            <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-gym-400" />
              <span>محدث لحظياً وموثق بالسيرفر</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30">
            <div className="text-xs font-semibold text-gray-400">دخول بـ QR الديناميكي</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {totalQr} ({Math.round((totalQr / (visits.length || 1)) * 100)}%)
            </div>
            <div className="text-[11px] text-gray-400 mt-2">مسح ذاتي ضد لقطات الشاشة</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-blue-500/30">
            <div className="text-xs font-semibold text-gray-400">دخول يدوي (استقبال)</div>
            <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {totalManual}
            </div>
            <div className="text-[11px] text-gray-400 mt-2">تسجيل بديل بالاسم أو الهاتف</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-surface-border">
            <div className="text-xs font-semibold text-gray-400">مزامنة الاتصال (Online Sync)</div>
            <div className="text-2xl font-black text-gray-200 mt-1 font-mono">
              100% Online
            </div>
            <div className="text-[11px] text-gray-400 mt-2">عبر فرع تفرغ زينة الرئيسي</div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ابحث باسم العضو، الهاتف، أو رقم الحركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'كافة الوسائل' },
              { id: 'qr', label: '📱 ماسح QR' },
              { id: 'manual', label: '🔍 تسجيل يدوي' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMethodFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  methodFilter === tab.id
                    ? 'bg-gym-500 text-white shadow-sm shadow-gym-600/30 font-bold'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visits Table */}
        <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-5">معرف الزيارة</th>
                  <th className="py-3.5 px-5">العضو المشترك</th>
                  <th className="py-3.5 px-5">الفرع</th>
                  <th className="py-3.5 px-5">طريقة الدخول</th>
                  <th className="py-3.5 px-5">المصدر</th>
                  <th className="py-3.5 px-5">الموظف الماسح</th>
                  <th className="py-3.5 px-5">توقيت الدخول</th>
                  <th className="py-3.5 px-5 text-center">حالة الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-gray-200">
                {filteredVisits.map((visit) => {
                  const mem = mockMembers.find((m) => m.id === visit.member_id);
                  const branch = mockBranches.find((b) => b.id === visit.branch_id);
                  const isQR = visit.method === 'qr';

                  return (
                    <tr key={visit.id} className="hover:bg-surface-border/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400">
                        {visit.id}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          {mem?.photo_path ? (
                            <img
                              src={mem.photo_path}
                              alt={mem.full_name}
                              className="w-7 h-7 rounded-full object-cover border border-surface-border"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gym-500/20 text-gym-400 flex items-center justify-center font-bold text-[11px]">
                              {mem?.full_name?.charAt(0) || 'ع'}
                            </div>
                          )}
                          <div>
                            <div>{mem?.full_name || 'عضو غير معروف'}</div>
                            <div className="text-[10px] text-gray-400 font-mono font-normal">
                              {mem?.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-gray-300">
                        {branch?.name || 'الفرع الرئيسي'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isQR
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {isQR ? <QrCode className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {isQR ? 'QR ديناميكي' : 'يدوي (استقبال)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-300">
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          <span>سحابي مباشر</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-gray-300">
                        {visit.scanned_by === 'usr-admin' ? 'المدير العام' : 'موظف الاستقبال'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-300">
                        {new Date(visit.entered_at).toLocaleDateString('ar-MR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gym-400 bg-gym-500/15 px-2.5 py-0.5 rounded-full border border-gym-500/30">
                          ساري ومصرّح
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
