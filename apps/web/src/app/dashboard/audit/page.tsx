'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import {
  ShieldAlert,
  Lock,
  User,
  Clock,
  ArrowRight,
  FileCheck2,
  AlertCircle,
  Database,
  RefreshCw,
  Eye
} from 'lucide-react';
import { getAuditLogs, AuditRecord } from '@/lib/data/audit';
import { DataTable, Column } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const res = await getAuditLogs();
    if (res.ok) {
      setLogs(res.value);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CANCEL_PAYMENT':
      case 'DELETE':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'RECORD_PAYMENT':
      case 'INSERT':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'UPDATE_PLAN_PRICE':
      case 'UPDATE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  const columns: Column<AuditRecord>[] = [
    {
      key: 'action',
      header: 'نوع الإجراء',
      render: (log) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getActionBadgeColor(
            log.action
          )}`}
        >
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'الكيان المتأثر',
      render: (log) => (
        <div>
          <span className="font-mono text-xs text-white bg-surface-dark px-2 py-0.5 rounded border border-surface-border">
            {log.entity}
          </span>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[120px]">
            {log.entity_id}
          </div>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'المنفّذ (Actor)',
      render: (log) => (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-surface-dark border border-surface-border flex items-center justify-center text-[10px] text-gray-400 font-bold">
            {log.actor?.full_name?.charAt(0) || <User className="w-3 h-3" />}
          </div>
          <span className="text-xs text-gray-300">
            {log.actor?.full_name || 'نظام آلي (System)'}
          </span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'التاريخ والتوقيت',
      render: (log) => (
        <span className="font-mono text-[11px] text-gray-400">
          {new Date(log.created_at).toLocaleDateString('ar-MR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'التفاصيل',
      render: (log) => (
        <button
          onClick={() => setSelectedLog(log)}
          className="px-2.5 py-1.5 rounded-lg bg-surface-dark border border-surface-border hover:border-gym-500/50 text-gray-300 hover:text-white transition-colors text-xs flex items-center gap-1 min-h-[36px]"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>عرض اللقطة</span>
        </button>
      ),
    },
  ];

  return (
    <>
      <Header
        title="سجل التدقيق والأمان (Audit & Security Logs)"
        subtitle="سجل تدقيق ثابت غير قابل للتعديل أو الحذف (Append-only) يوثق كافة العمليات الحساسة في الصالة"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Compliance Notice Banner */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">
              قاعدة الأمان غير القابلة للتفاوض:
            </span>
            <p className="text-gray-300 mt-1 leading-relaxed">
              هذا السجل محمي على مستوى قاعدة البيانات بـ Triggers و Security Definer.
              يُسجل كل تغيير على المشتركين، المدفوعات، الباقات، وعمليات الدخول مع لقطة سابقة ولاحقة (Before/After)
              لحماية أموال الصالة ومنع أي تلاعب بالمبالغ أو الاشتراكات.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'كافة العمليات' },
              { id: 'CANCEL_PAYMENT', label: 'إلغاء دفع' },
              { id: 'RECORD_PAYMENT', label: 'تسجيل دفع' },
              { id: 'INSERT', label: 'إضافة' },
              { id: 'UPDATE', label: 'تعديل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                  actionFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-600/30 font-bold'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            className="p-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white hover:border-amber-500/50 transition-colors flex items-center gap-1.5 text-xs min-h-[44px]"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-center space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-gym-500 text-white rounded-xl text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="لا توجد سجلات تدقيق"
            description="سجل العمليات الحساسة فارغ حالياً. سيسجل النظام تلقائياً أي عمليات دفع، اشتراك، أو تعديل."
            icon={ShieldAlert}
          />
        ) : (
          <DataTable<AuditRecord>
            data={filteredLogs}
            columns={columns}
            keyExtractor={(log) => log.id}
            searchPlaceholder="بحث في سجل التدقيق بنوع الإجراء أو المعرّف..."
            searchFilter={(log, q) =>
              log.action.toLowerCase().includes(q.toLowerCase()) ||
              log.entity.toLowerCase().includes(q.toLowerCase()) ||
              log.entity_id.toLowerCase().includes(q.toLowerCase()) ||
              log.id.toLowerCase().includes(q.toLowerCase())
            }
          />
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="تفاصيل لقطة السجل (Audit Snapshot)"
        >
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="glass-panel p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 text-[10px]">نوع الإجراء</div>
                  <div className="font-bold text-white mt-0.5">{selectedLog.action}</div>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 text-[10px]">الجدول المستهدف</div>
                  <div className="font-mono text-white mt-0.5">{selectedLog.entity}</div>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 text-[10px]">المعرّف</div>
                  <div className="font-mono text-white mt-0.5 text-[11px] truncate">{selectedLog.entity_id}</div>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 text-[10px]">التاريخ</div>
                  <div className="text-white mt-0.5 font-mono text-[11px]">
                    {new Date(selectedLog.created_at).toLocaleString('ar-MR')}
                  </div>
                </div>
              </div>

              {/* Before Snapshot */}
              <div>
                <div className="text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>اللقطة السابقة (Before State):</span>
                </div>
                <pre
                  dir="ltr"
                  className="bg-surface-dark border border-surface-border rounded-xl p-3 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48"
                >
                  {selectedLog.before
                    ? JSON.stringify(selectedLog.before, null, 2)
                    : '// لا توجد لقطة سابقة (عملية إضافة جديدة)'}
                </pre>
              </div>

              {/* After Snapshot */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>اللقطة اللاحقة (After State):</span>
                </div>
                <pre
                  dir="ltr"
                  className="bg-surface-dark border border-surface-border rounded-xl p-3 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48"
                >
                  {selectedLog.after
                    ? JSON.stringify(selectedLog.after, null, 2)
                    : '// تم حذف السجل بالكامل أو لا توجد حالة لاحقة'}
                </pre>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </>
  );
}
