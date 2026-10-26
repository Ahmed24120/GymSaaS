'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Trash2,
  Check,
  X,
  FileCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import {
  getMembers,
  MemberRecord,
  getPlans,
  PlanRecord,
  createMember,
  recordPayment,
} from '@/lib/data';
import { useToast } from '@/components/common/Toast';

interface ImportedRow {
  rowIndex: number;
  fullName: string;
  phone: string;
  planName: string;
  matchedPlan?: PlanRecord;
  isValid: boolean;
  errors: string[];
  isDuplicateInFile: boolean;
  isDuplicateInDb: boolean;
  status: 'pending' | 'imported' | 'failed' | 'rejected';
  failureReason?: string;
}

export default function ExcelImportPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingMembers, setExistingMembers] = useState<MemberRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImportComplete, setIsImportComplete] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoadingInitial(true);
      const [mRes, pRes] = await Promise.all([getMembers(), getPlans()]);
      if (mRes.ok) setExistingMembers(mRes.value);
      if (pRes.ok) setPlans(pRes.value.filter((p) => p.active));
      setLoadingInitial(false);
    };
    init();
  }, []);

  const validatePhoneMRU = (phoneStr: string): boolean => {
    // Normalizes phone: removes spaces, dashes, parentheses
    const cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');
    // Mauritanian mobile phones start with 2, 3, or 4 and have 8 digits (or prefixed by +222 or 222 or 00222)
    return /^(\+?222|00222)?[234][0-9]{7}$/.test(cleaned);
  };

  const normalizePhone = (phoneStr: string): string => {
    return phoneStr.replace(/[\s\-\(\)]/g, '').replace(/^(\+222|00222|222)/, '');
  };

  const parseExcelBuffer = async (buffer: ArrayBuffer, fileName: string) => {
    setIsProcessing(true);
    try {
      const wb = read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const jsonRows: any[] = utils.sheet_to_json(sheet, { defval: '' });

      if (jsonRows.length === 0) {
        showToast({
          type: 'error',
          title: 'الملف فارغ',
          message: 'لم يتم العثور على أي صفوف بيانات في ورقة العمل الأولى.',
        });
        setIsProcessing(false);
        return;
      }

      const seenPhonesInFile = new Set<string>();
      const parsedRows: ImportedRow[] = [];

      jsonRows.forEach((raw, idx) => {
        // Map common arabic / english column names
        const fullName = String(
          raw['full_name'] || raw['الاسم'] || raw['الاسم الكامل'] || raw['name'] || ''
        ).trim();

        const phone = String(
          raw['phone'] || raw['الهاتف'] || raw['رقم الهاتف'] || raw['telephone'] || ''
        ).trim();

        const planName = String(
          raw['plan_name'] || raw['الباقة'] || raw['نوع الاشتراك'] || raw['plan'] || ''
        ).trim();

        const errors: string[] = [];
        let isValid = true;

        if (!fullName || fullName.length < 3) {
          isValid = false;
          errors.push('الاسم غير صحيح (يجب أن يحتوي على 3 أحرف على الأقل)');
        }

        if (!phone || !validatePhoneMRU(phone)) {
          isValid = false;
          errors.push('رقم هاتف موريتاني غير صالح (يجب أن يبدأ بـ 2 أو 3 أو 4 ويتكون من 8 أرقام)');
        }

        const normalized = normalizePhone(phone);
        const isDuplicateInFile = seenPhonesInFile.has(normalized);
        if (isDuplicateInFile) {
          isValid = false;
          errors.push('رقم الهاتف مكرر داخل نفس الملف');
        } else if (normalized) {
          seenPhonesInFile.add(normalized);
        }

        const isDuplicateInDb = existingMembers.some(
          (m) => normalizePhone(m.phone) === normalized
        );
        if (isDuplicateInDb) {
          isValid = false;
          errors.push('رقم الهاتف مسجل مسبقاً في قاعدة بيانات الصالة');
        }

        // Match Plan
        let matchedPlan = plans.find(
          (p) =>
            p.name.toLowerCase() === planName.toLowerCase() ||
            p.name.includes(planName) ||
            planName.includes(p.name)
        );

        if (!matchedPlan && planName) {
          errors.push(`الباقة "${planName}" غير معرفة في النظام`);
          isValid = false;
        } else if (!matchedPlan && plans.length > 0) {
          // Default to first plan if omitted
          matchedPlan = plans[0];
        }

        parsedRows.push({
          rowIndex: idx + 2, // Header is row 1
          fullName,
          phone,
          planName: matchedPlan ? matchedPlan.name : planName || 'غير محددة',
          matchedPlan,
          isValid,
          errors,
          isDuplicateInFile,
          isDuplicateInDb,
          status: isValid ? 'pending' : 'rejected',
          failureReason: errors.join(' • '),
        });
      });

      setRows(parsedRows);
      showToast({
        type: 'success',
        title: 'تمت قراءة الملف بنجاح',
        message: `تم فحص ${parsedRows.length} صفاً من البيانات.`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'خطأ في معالجة الملف',
        message: 'تأكد من اختيار ملف Excel صالح بصيغة .xlsx أو .xls أو .csv',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsImportComplete(false);
    const buffer = await f.arrayBuffer();
    await parseExcelBuffer(buffer, f.name);
  };

  const handleDownloadTemplate = () => {
    const samplePlan = plans[0]?.name || 'اشتراك شهري عادي (1 شهر)';
    const headers = ['full_name', 'phone', 'plan_name'];
    const sampleData = [
      headers,
      ['محمد أحمد سالم', '45112233', samplePlan],
      ['فاطمة بنت المختار', '36224455', samplePlan],
      ['سيدي محمد ولد اعلي', '22998877', samplePlan],
    ];

    const ws = utils.aoa_to_sheet(sampleData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'قالب_استيراد_الأعضاء');
    writeFile(wb, 'gymsaas_members_template.xlsx');

    showToast({
      type: 'success',
      title: 'تم تحميل القالب',
      message: 'قم بتعبئة البيانات بنفس الصيغة ثم أعد رفع الملف.',
    });
  };

  const handleExecuteImport = async () => {
    const validRows = rows.filter((r) => r.isValid && r.status === 'pending');
    if (validRows.length === 0) {
      showToast({
        type: 'error',
        title: 'لا توجد صفوف صالحة للاستيراد',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        // 1. Create Member
        const mRes = await createMember({
          full_name: row.fullName,
          phone: row.phone,
        });

        if (!mRes.ok) {
          row.status = 'failed';
          row.failureReason = mRes.error.message;
          failCount++;
        } else {
          // 2. Record Payment & activate subscription if plan exists
          if (row.matchedPlan) {
            await recordPayment({
              member_id: mRes.value.id,
              plan_id: row.matchedPlan.id,
              duration_days: row.matchedPlan.duration_days,
              amount_mru: row.matchedPlan.price_mru,
              method: 'cash',
              transaction_ref: 'EXCEL-IMPORT',
            });
          }

          row.status = 'imported';
          successCount++;
        }
      } catch (err: any) {
        row.status = 'failed';
        row.failureReason = err.message || 'خطأ غير متوقع';
        failCount++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      setRows([...rows]);
    }

    setIsImporting(false);
    setIsImportComplete(true);

    // Refresh database member cache
    const mRes = await getMembers();
    if (mRes.ok) setExistingMembers(mRes.value);

    showToast({
      type: successCount > 0 ? 'success' : 'error',
      title: 'اكتملت عملية الاستيراد',
      message: `تم إدخال ${successCount} مشترك بنجاح. فشل: ${failCount}`,
    });
  };

  const validRowsCount = rows.filter((r) => r.isValid).length;
  const rejectedRowsCount = rows.filter((r) => !r.isValid).length;
  const importedCount = rows.filter((r) => r.status === 'imported').length;

  return (
    <>
      <Header
        title="استيراد الأعضاء عبر Excel (Excel Import)"
        subtitle="رفع وتدقيق جماعي لقوائم المشتركين مع فحص أرقام الهواتف الموريتانية ومنع التكرار"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto" dir="rtl">
        {/* ACTION BANNER & TEMPLATE DOWNLOAD */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-white">إرشادات تنسيق ملف Excel</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-2xl">
              يجب أن يحتوي الملف على الأعمدة التالية: <span className="text-gym-400 font-mono">full_name</span> (الاسم الكامل)،{' '}
              <span className="text-gym-400 font-mono">phone</span> (رقم الهاتف 8 أرقام)، و{' '}
              <span className="text-gym-400 font-mono">plan_name</span> (اسم باقة الاشتراك).
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 rounded-xl bg-surface-dark hover:bg-surface-border border border-surface-border text-white text-xs font-bold flex items-center gap-2 transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4 text-gym-400" />
            <span>تحميل قالب Excel جاهز</span>
          </button>
        </div>

        {/* DRAG & DROP UPLOAD ZONE */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="glass-panel p-8 sm:p-12 rounded-3xl border-2 border-dashed border-surface-border hover:border-gym-500/60 transition-all text-center cursor-pointer group bg-surface-card/40"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-surface-border flex items-center justify-center text-gym-400 mx-auto mb-4 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white">
            {file ? file.name : 'انقر لاختيار ملف Excel أو قم بسحبه هنا'}
          </h4>
          <p className="text-xs text-gray-400 mt-1.5">
            يدعم صيغ .xlsx و .xls و .csv (حجم أقصى 5 ميغابايت)
          </p>
        </div>

        {/* PROCESSING LOADER */}
        {isProcessing && (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
            <Loader2 className="w-8 h-8 text-gym-400 animate-spin mx-auto" />
            <p className="text-sm font-bold text-white">جارِ فحص وتدقيق صفوف الملف...</p>
          </div>
        )}

        {/* PREVIEW & AUDIT TABLE */}
        {rows.length > 0 && !isProcessing && (
          <div className="space-y-4">
            {/* Summary Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-white">إجمالي الصفوف: {rows.length}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  صالحة ({validRowsCount})
                </span>
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  مرفوضة ({rejectedRowsCount})
                </span>
                {importedCount > 0 && (
                  <span className="text-blue-400 font-bold">
                    تم إدخالها ({importedCount})
                  </span>
                )}
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={validRowsCount === 0 || isImporting || isImportComplete}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gym-500 hover:bg-gym-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-gym-600/30 min-h-[44px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارِ الاستيراد ({importProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>تأكيد استيراد المشتركين الصالحين ({validRowsCount})</span>
                  </>
                )}
              </button>
            </div>

            {/* Table of Rows */}
            <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-surface-card text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">رقم الصف</th>
                      <th className="py-3 px-4">الاسم الكامل</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">الباقة المختارة</th>
                      <th className="py-3 px-4">حالة التدقيق</th>
                      <th className="py-3 px-4">ملاحظات وسبب الرفض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-gray-200">
                    {rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          !row.isValid
                            ? 'bg-rose-500/5'
                            : row.status === 'imported'
                            ? 'bg-emerald-500/5'
                            : 'hover:bg-surface-card/30'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-gray-400">#{row.rowIndex}</td>
                        <td className="py-3 px-4 font-bold text-white">{row.fullName || '—'}</td>
                        <td className="py-3 px-4 font-mono" dir="ltr">{row.phone || '—'}</td>
                        <td className="py-3 px-4">{row.planName}</td>
                        <td className="py-3 px-4">
                          {row.status === 'imported' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                              تم الإدخال بنجاح ✅
                            </span>
                          ) : row.isValid ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                              صالح للاستيراد
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                              مرفوض ❌
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {row.failureReason || 'مطابق للمعايير وبدون تكرار'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
