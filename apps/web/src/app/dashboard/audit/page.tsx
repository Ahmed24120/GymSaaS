'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  ShieldAlert,
  Search,
  Filter,
  Lock,
  User,
  Clock,
  ArrowRight,
  FileCheck2,
  AlertCircle,
  Database
} from 'lucide-react';
import { mockAuditLogs } from '@/lib/mockData';
import { AuditLog } from '@/types/database';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' ? true : log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <>
      <Header
        title="سجل التدقيق والأمان (Audit & Security Logs)"
        subtitle="سجل تدقيق ثابت غير قابل للتعديل أو الحذف (Append-only) يوثق كافة العمليات الحساسة في الصالة"
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Compliance Notice Banner */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">
              قاعدة الأمان غير القابلة للتفاوض (AGENTS.md - البند 5.3):
            </span>
            <p className="text-gray-300 mt-1 leading-relaxed">
              هذا السجل محمي على مستوى قاعدة البيانات بـ Triggers و Security Definer.
              يُسجل كل تغيير على المشتركين، المدفوعات، الباقات، وعمليات الدخول مع لقطة سابقة ولاحقة (Before/After)
              لحماية أموال الصالة ومنع أي تلاعب بالمبالغ أو الاشتراكات.
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-surface-border">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ابحث بنوع الإجراء، الجدول، أو المعرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'كافة العمليات' },
              { id: 'RECORD_PAYMENT', label: 'تسجيل دفع' },
              { id: 'CANCEL_PAYMENT', label: 'إلغاء دفع' },
              { id: 'CREATE_MEMBER', label: 'عضو جديد' },
              { id: 'QR_CHECKIN', label: 'دخول QR' },
              { id: 'UPDATE_PLAN_PRICE', label: 'تعديل سعر' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  actionFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-600/30 font-bold'
                    : 'bg-surface-dark text-gray-400 hover:text-white border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Table */}
        <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-dark text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-5">معرف السجل</th>
                  <th className="py-3.5 px-5">نوع الإجراء (Action)</th>
                  <th className="py-3.5 px-5">الجدول (Entity)</th>
                  <th className="py-3.5 px-5">المُنفّذ (Actor)</th>
                  <th className="py-3.5 px-5">التوقيت (Africa/Nouakchott)</th>
                  <th className="py-3.5 px-5 text-center">تفاصيل التغيير (Diff)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-gray-200">
                {filteredLogs.map((log) => {
                  const isCancel = log.action.includes('CANCEL');
                  const isPayment = log.action.includes('PAYMENT');
                  const isMember = log.action.includes('MEMBER');

                  return (
                    <tr key={log.id} className="hover:bg-surface-border/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400">
                        {log.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                            isCancel
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isPayment
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isMember
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-gray-300">
                        {log.entity} <span className="text-gray-500">({log.entity_id})</span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-white">
                        {log.actor_id === 'usr-admin' ? 'المدير العام' : 'موظف الاستقبال'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-300">
                        {new Date(log.created_at).toLocaleDateString('ar-MR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1 rounded-lg bg-surface-dark border border-surface-border hover:border-gym-500 text-gym-400 font-bold text-[11px] transition-colors"
                        >
                          عرض البيانات ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: View Before / After Log Details */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-surface-border shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-gym-400" />
                  <span>تفاصيل سجل التدقيق: {selectedLog.id}</span>
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-dark p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 mb-1">الإجراء:</div>
                  <div className="font-mono font-bold text-amber-400">{selectedLog.action}</div>
                </div>
                <div className="bg-surface-dark p-3 rounded-xl border border-surface-border">
                  <div className="text-gray-400 mb-1">الجدول / السجل:</div>
                  <div className="font-mono font-bold text-white">
                    {selectedLog.entity} / {selectedLog.entity_id}
                  </div>
                </div>
              </div>

              {/* Before / After JSON comparison */}
              <div className="space-y-3 text-xs">
                {selectedLog.before && (
                  <div>
                    <div className="text-red-400 font-bold mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span>البيانات السابقة (Before):</span>
                    </div>
                    <pre className="p-3 rounded-xl bg-surface-dark border border-red-500/20 text-gray-300 font-mono text-[11px] overflow-x-auto text-left">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.after && (
                  <div>
                    <div className="text-emerald-400 font-bold mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>البيانات الجديدة (After):</span>
                    </div>
                    <pre className="p-3 rounded-xl bg-surface-dark border border-emerald-500/20 text-gray-300 font-mono text-[11px] overflow-x-auto text-left">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-surface-dark border border-surface-border hover:bg-surface-border text-white text-xs font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
