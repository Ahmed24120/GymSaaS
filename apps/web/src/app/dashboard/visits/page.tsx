'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import {
  CalendarCheck,
  Search,
  QrCode,
  UserCheck,
  Wifi,
  CheckCircle2,
  RefreshCw,
  Clock,
  Building
} from 'lucide-react';
import { getVisits, VisitRecord } from '@/lib/data/visits';
import { DataTable, Column } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'all' | 'qr' | 'manual'>('all');

  const fetchVisits = async () => {
    setLoading(true);
    setError(null);
    const res = await getVisits();
    if (res.ok) {
      setVisits(res.value);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const filteredVisits = visits.filter((v) => {
    if (methodFilter !== 'all' && v.method !== methodFilter) return false;
    return true;
  });

  const totalQr = visits.filter((v) => v.method === 'qr').length;
  const totalManual = visits.filter((v) => v.method === 'manual').length;

  const columns: Column<VisitRecord>[] = [
    {
      key: 'member',
      header: 'العضو المشترك',
      render: (v) => (
        <div className="flex items-center gap-2.5">
          {v.member?.photo_path ? (
            <Image
              src={v.member.photo_path}
              alt={v.member.full_name || 'عضو'}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover border border-surface-border"
              unoptimized={true}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gym-500/20 text-gym-400 flex items-center justify-center font-bold text-[11px]">
              {v.member?.full_name?.charAt(0) || 'ع'}
            </div>
          )}
          <div>
            <div className="font-bold text-white text-xs">{v.member?.full_name || 'عضو غير معروف'}</div>
            <div className="text-[10px] text-gray-400 font-mono" dir="ltr">
              {v.member?.phone || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'الفرع',
      render: (v) => (
        <span className="text-gray-300 text-xs">
          {v.branch?.name || 'الفرع الرئيسي'}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'طريقة الدخول',
      render: (v) => {
        const isQR = v.method === 'qr';
        return (
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
        );
      },
    },
    {
      key: 'entered_at',
      header: 'توقيت الدخول',
      render: (v) => (
        <span className="font-mono text-[11px] text-gray-300">
          {new Date(v.entered_at).toLocaleDateString('ar-MR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'المصدر',
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-300">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>{v.source === 'offline_sync' ? 'مزامنة أوفلاين' : 'سحابي مباشر'}</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <Header
        title="سجل حركات الدخول (Visits Log)"
        subtitle="توثيق زيارات الأعضاء عبر الـ QR Code الديناميكي أو البحث اليدوي في مكتب الاستقبال"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Quick Highlights */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي الزيارات"
            value={`${visits.length} زيارة`}
            change="محدث لحظياً"
            isPositive={true}
            icon={<CalendarCheck className="w-5 h-5 text-gym-400" />}
          />
          <StatCard
            title="دخول بـ QR الديناميكي"
            value={totalQr}
            change={`${Math.round((totalQr / (visits.length || 1)) * 100)}% من الزيارات`}
            isPositive={true}
            icon={<QrCode className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="دخول يدوي (استقبال)"
            value={totalManual}
            change="تسجيل بديل"
            isPositive={true}
            icon={<UserCheck className="w-5 h-5 text-blue-400" />}
          />
          <StatCard
            title="مزامنة الاتصال"
            value="100% Online"
            change="سحابي مباشر"
            isPositive={true}
            icon={<Wifi className="w-5 h-5 text-gym-400" />}
          />
        </section>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'كافة الوسائل' },
              { id: 'qr', label: '📱 ماسح QR' },
              { id: 'manual', label: '🔍 تسجيل يدوي' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMethodFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                  methodFilter === tab.id
                    ? 'bg-gym-500 text-white shadow-sm shadow-gym-600/30 font-bold'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchVisits}
            className="p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white hover:border-gym-500/50 transition-colors flex items-center gap-1.5 text-xs min-h-[44px]"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>

        {/* Table / Skeleton / Empty */}
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-center space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchVisits}
              className="px-4 py-2 bg-gym-500 text-white rounded-xl text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : visits.length === 0 ? (
          <EmptyState
            title="لا توجد حركات دخول مسجلة"
            description="سجل الدخول فارغ حالياً. سيبدأ بالامتلاء تلقائياً عند مسح رموز QR أو تسجيل الدخول اليدوي من شاشة الاستقبال."
            icon={CalendarCheck}
          />
        ) : (
          <DataTable<VisitRecord>
            data={filteredVisits}
            columns={columns}
            keyExtractor={(v) => v.id}
            searchPlaceholder="بحث في حركات الدخول باسم العضو أو الهاتف..."
            searchFilter={(v, q) =>
              (v.member?.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
              (v.member?.phone || '').includes(q) ||
              v.id.toLowerCase().includes(q.toLowerCase())
            }
          />
        )}
      </main>
    </>
  );
}
