'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  CreditCard,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Camera,
  ShieldCheck,
  Receipt,
  UserPlus
} from 'lucide-react';
import {
  getMembers,
  MemberRecord,
  getPlans,
  PlanRecord,
  getVisits,
  VisitRecord,
  recordVisit,
  recordPayment,
} from '@/lib/data';
import { formatMRU } from '@/lib/services/currency';
import { formatDateNouakchott, getDaysRemaining } from '@/lib/services/dateUtils';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { QRVerifyResponse } from '@/lib/qr/contract';

export default function ReceptionTerminalPage() {
  const { showToast } = useToast();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [recentVisits, setRecentVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [verificationResult, setVerificationResult] = useState<
    'idle' | 'valid' | 'expired' | 'notFound' | 'loading'
  >('idle');
  const [verificationDetails, setVerificationDetails] = useState<{
    planName?: string;
    endDate?: string;
    reason?: string;
  }>({});

  const [isRecordingVisit, setIsRecordingVisit] = useState(false);
  const [entryRecorded, setEntryRecorded] = useState(false);

  // Quick Payment Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bankily' | 'masrvi' | 'sedad'>('bankily');
  const [txRef, setTxRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Scan simulation / direct input
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [isScanningQR, setIsScanningQR] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [mRes, pRes, vRes] = await Promise.all([
      getMembers(),
      getPlans(),
      getVisits(),
    ]);

    if (mRes.ok) setMembers(mRes.value);
    if (pRes.ok) {
      const activePlans = pRes.value.filter((p) => p.active);
      setPlans(activePlans);
      if (activePlans.length > 0) setSelectedPlanId(activePlans[0].id);
    }
    if (vRes.ok) setRecentVisits(vRes.value.slice(0, 10));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle manual member search
  const handleSearch = (query: string) => {
    setEntryRecorded(false);
    setSearchQuery(query);
    const q = query.trim().toLowerCase();
    if (!q) {
      setSelectedMember(null);
      setVerificationResult('idle');
      return;
    }

    const found = members.find(
      (m) =>
        m.phone.includes(q) ||
        m.full_name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );

    if (found) {
      setSelectedMember(found);
      const sub = found.active_subscription;
      const hasActiveSub =
        found.status === 'active' && sub &&
        sub.status === 'active' &&
        new Date(sub.end_date) > new Date();

      if (hasActiveSub) {
        setVerificationResult('valid');
        setVerificationDetails({
          planName: sub?.plan?.name || 'اشتراك قياسي',
          endDate: sub?.end_date,
        });
      } else {
        setVerificationResult('expired');
        setVerificationDetails({
          planName: sub?.plan?.name || 'اشتراك سابق',
          endDate: sub?.end_date,
          reason: 'انتهت فترة الاشتراك أو تم إيقافه',
        });
      }
    } else {
      setSelectedMember(null);
      setVerificationResult('notFound');
      setVerificationDetails({
        reason: 'لم يتم العثور على أي مشترك يطابق رقم الهاتف أو الاسم المدخل',
      });
    }
  };

  // Verify HMAC QR Token via POST /api/qr/verify
  const handleVerifyQRToken = async (tokenString: string) => {
    if (!tokenString.trim()) return;
    setIsScanningQR(true);
    setSelectedMember(null);
    setEntryRecorded(false);
    setVerificationResult('loading');

    try {
      const res = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenString.trim() }),
      });

      const data: QRVerifyResponse = await res.json();

      if (data.allowed) {
        setEntryRecorded(true);
        setVerificationResult('valid');
        setVerificationDetails({
          planName: data.subscription.plan_name,
          endDate: data.subscription.end_date,
        });

        // Find or create member display
        const matched = members.find((m) => m.id === data.member.id);
        if (matched) {
          setSelectedMember(matched);
        } else {
          setSelectedMember({
            id: data.member.id,
            gym_id: '',
            full_name: data.member.full_name,
            phone: data.member.phone,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        showToast({
          type: 'success',
          title: 'دخول مصرّح به ✅',
          message: `مرحباً بك ${data.member.full_name}`,
        });

        // Refresh visits list
        const vRes = await getVisits();
        if (vRes.ok) setRecentVisits(vRes.value.slice(0, 10));
      } else {
        setVerificationResult('expired');
        setVerificationDetails({
          reason: data.error || 'تم رفض رمز الـ QR',
        });

        showToast({
          type: 'error',
          title: 'الدخول مرفوض ❌',
          message: data.error,
        });
      }
    } catch {
      setVerificationResult('expired');
      setVerificationDetails({ reason: 'فشل الاتصال بخادم التحقق' });
    } finally {
      setIsScanningQR(false);
      setQrTokenInput('');
    }
  };

  // Manual Check-in button
  const handleManualCheckIn = async () => {
    if (!selectedMember || entryRecorded) return;
    setIsRecordingVisit(true);

    const res = await recordVisit({
      member_id: selectedMember.id,
      method: 'manual',
    });

    if (res.ok) {
      setEntryRecorded(true);
      setRecentVisits((prev) => [res.value, ...prev].slice(0, 10));
      showToast({
        type: 'success',
        title: 'تم تسجيل الدخول يدوياً',
        message: `تم توثيق حركة الدخول للمشترك: ${selectedMember.full_name}`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'فشل تسجيل الدخول',
        message: res.error.message,
      });
    }

    setIsRecordingVisit(false);
  };

  // Quick Payment & Renewal
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedPlanId) return;

    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    setIsSubmittingPayment(true);

    const res = await recordPayment({
      member_id: selectedMember.id,
      plan_id: plan.id,
      duration_days: plan.duration_days,
      amount_mru: plan.price_mru,
      method: paymentMethod,
      transaction_ref: txRef.trim() || undefined,
    });

    if (res.ok) {
      showToast({
        type: 'success',
        title: 'تم تجديد الاشتراك وتوثيق الدفعة بنجاح',
        message: `المبلغ: ${plan.price_mru} MRU - طريقة الدفع: ${paymentMethod}`,
      });

      setIsPaymentOpen(false);
      setTxRef('');

      // Refresh members data and set status to valid
      const mRes = await getMembers();
      if (mRes.ok) {
        setMembers(mRes.value);
        const updated = mRes.value.find((m) => m.id === selectedMember.id);
        if (updated) {
          setSelectedMember(updated);
          setVerificationResult('valid');
          setVerificationDetails({
            planName: plan.name,
            endDate: updated.active_subscription?.end_date,
          });
        }
      }
    } else {
      showToast({
        type: 'error',
        title: 'فشل تسجيل الدفعة',
        message: res.error.message,
      });
    }

    setIsSubmittingPayment(false);
  };

  return (
    <>
      <Header
        title="محطة الاستقبال السريعة (Reception Terminal)"
        subtitle="التحقق الفوري من المشتركين عبر مسح QR المشفر أو البحث بالهاتف والاسم"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto" dir="rtl">
        {/* TOP SEARCH & QR INPUT BAR */}
        <section className="glass-panel p-4 sm:p-5 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Phone/Name Search */}
            <div className="relative flex-1">
              <input
                type="text"
                aria-label="البحث بالاسم أو الهاتف"
                placeholder="ابحث بالاسم الكامل أو رقم الهاتف (مثال: 45112233)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full ps-12 pe-4 py-3.5 rounded-xl bg-surface-dark border border-surface-border text-base text-white focus:outline-none focus:border-gym-500 transition-colors font-medium min-h-[52px]"
                autoFocus
              />
              <Search className="w-5 h-5 text-gray-400 absolute start-4 top-4 pointer-events-none" />
            </div>

            {/* Quick QR Token Input for barcode/camera scanner */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyQRToken(qrTokenInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="رمز QR"
                placeholder="امسح أو الصق رمز الـ QR..."
                value={qrTokenInput}
                onChange={(e) => setQrTokenInput(e.target.value)}
                className="w-full md:w-64 px-4 py-3.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-white focus:outline-none focus:border-gym-500 transition-colors font-mono min-h-[52px]"
              />
              <button
                type="submit"
                disabled={!qrTokenInput.trim() || isScanningQR}
                className="px-5 py-3.5 bg-gym-500 hover:bg-gym-400 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap min-h-[52px] shadow-md shadow-gym-600/20"
              >
                <Camera className="w-4 h-4" />
                <span>{isScanningQR ? 'جارِ الفحص...' : 'فحص الرمز'}</span>
              </button>
            </form>
          </div>
        </section>

        {/* DOMINANT VERIFICATION SCREEN (Readable from 3 meters away) */}
        <section aria-live="polite" className={`${verificationResult === 'valid' || verificationResult === 'expired' ? 'fixed inset-0 z-40 overflow-y-auto bg-surface-dark' : 'min-h-[320px] sm:min-h-[380px] rounded-3xl'} transition-all duration-300 flex flex-col items-center p-4 sm:p-10 text-center shadow-xl`}>
          {(verificationResult === 'valid' || verificationResult === 'expired') && (
            <button type="button" onClick={() => { setVerificationResult('idle'); setSelectedMember(null); setSearchQuery(''); setEntryRecorded(false); }} className="min-h-[48px] mb-4 px-6 py-3 rounded-xl bg-surface-card border border-surface-border text-white">فحص عضو آخر</button>
          )}
          {verificationResult === 'idle' && (
            <div className="glass-panel w-full h-full py-16 px-6 rounded-3xl border border-surface-border flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-surface-dark border border-surface-border flex items-center justify-center text-gym-400 shadow-inner">
                <QrCode className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                محطة الاستقبال في وضع الاستعداد
              </h3>
              <p className="text-sm text-gray-400 max-w-md">
                قم بمسح رمز QR الخاص بهاتف المشترك أو ابحث برقم الهاتف أعلاه للتحقق الفوري من صلاحية الاشتراك.
              </p>
            </div>
          )}

          {verificationResult === 'loading' && (
            <div className="glass-panel w-full py-16 rounded-3xl border border-surface-border flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-12 h-12 text-gym-400 animate-spin" />
              <p className="text-base font-bold text-white">جارِ التحقق الأمني من الرمز...</p>
            </div>
          )}

          {/* HUGE GREEN SCREEN: VALID */}
          {verificationResult === 'valid' && selectedMember && (
            <div className="w-full bg-emerald-600 text-white rounded-3xl p-6 sm:p-10 border-4 border-emerald-400 shadow-2xl shadow-emerald-950/50 space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <CheckCircle2 className="w-20 h-20 sm:w-28 sm:h-28 text-emerald-200 animate-bounce" />
                <span className="px-4 py-1.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs sm:text-sm font-bold tracking-wider">
                  اشتراك سارٍ ومصرّح بالدخول ✅
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                  {selectedMember.full_name}
                </h2>
                <p className="text-lg sm:text-xl font-mono text-emerald-100" dir="ltr">
                  {selectedMember.phone}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto bg-emerald-700/60 p-4 rounded-2xl text-xs sm:text-sm">
                <div>
                  <span className="text-emerald-200 block text-[11px]">الباقة الحالية</span>
                  <span className="font-bold">{verificationDetails.planName || 'باقة الصالة'}</span>
                </div>
                <div>
                  <span className="text-emerald-200 block text-[11px]">تاريخ الانتهاء</span>
                  <span className="font-bold font-mono">
                    {formatDateNouakchott(verificationDetails.endDate)}
                    {verificationDetails.endDate && (
                      <span className="me-1 text-emerald-200 text-xs">
                        ({getDaysRemaining(verificationDetails.endDate)} يوم متبقٍ)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleManualCheckIn}
                  disabled={isRecordingVisit || entryRecorded}
                  className="px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg min-h-[48px] transition-transform active:scale-95"
                >
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                  <span>{entryRecorded ? 'تم تسجيل الزيارة' : isRecordingVisit ? 'جارِ التوثيق...' : 'تسجيل الدخول الآن'}</span>
                </button>

                <button
                  onClick={() => setIsPaymentOpen(true)}
                  className="px-6 py-3.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 border border-emerald-400 min-h-[48px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تجديد / تمديد الاشتراك</span>
                </button>
              </div>
            </div>
          )}

          {/* HUGE RED SCREEN: EXPIRED */}
          {verificationResult === 'expired' && (
            <div className="w-full bg-rose-600 text-white rounded-3xl p-6 sm:p-10 border-4 border-rose-400 shadow-2xl shadow-rose-950/50 space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <XCircle className="w-20 h-20 sm:w-28 sm:h-28 text-rose-200" />
                <span className="px-4 py-1.5 rounded-full bg-rose-700/80 text-rose-100 text-xs sm:text-sm font-bold tracking-wider">
                  الدخول مرفوض ❌
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                  {selectedMember ? selectedMember.full_name : 'مشترك غير مصرّح له'}
                </h2>
                {selectedMember && (
                  <p className="text-lg sm:text-xl font-mono text-rose-100" dir="ltr">
                    {selectedMember.phone}
                  </p>
                )}
                <p className="text-sm sm:text-base text-rose-200 font-medium">
                  {verificationDetails.reason || 'انتهت صلاحية الاشتراك أو تم إيقافه.'}
                </p>
              </div>

              {/* Action: Renew */}
              {selectedMember && (
                <div className="pt-2">
                  <button
                    onClick={() => setIsPaymentOpen(true)}
                    className="px-8 py-4 bg-white text-rose-800 hover:bg-rose-50 rounded-2xl font-black text-sm sm:text-base flex items-center gap-2.5 mx-auto shadow-xl min-h-[52px] transition-transform active:scale-95"
                  >
                    <CreditCard className="w-5 h-5 text-rose-700" />
                    <span>تجديد الاشتراك وسداد الرسوم الآن</span>
                  </button>
                </div>
              )}
              {!selectedMember && (
                <button type="button" onClick={() => { setVerificationResult('idle'); setSearchQuery(''); }} className="min-h-[52px] px-6 py-3 bg-white text-rose-800 rounded-2xl font-bold">تجديد الاشتراك — ابحث عن العضو أولاً</button>
              )}
            </div>
          )}

          {/* AMBER SCREEN: NOT FOUND */}
          {verificationResult === 'notFound' && (
            <div className="w-full bg-amber-600 text-white rounded-3xl p-6 sm:p-10 border-4 border-amber-400 shadow-2xl shadow-amber-950/50 space-y-4">
              <AlertCircle className="w-20 h-20 text-amber-200 mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-black">عضو غير مسجل في النظام</h2>
              <p className="text-sm sm:text-base text-amber-100 max-w-md mx-auto">
                {verificationDetails.reason || 'تأكد من كتابة رقم الهاتف بصورة صحيحة أو قم بإضافة العضو في النظام.'}
              </p>
            </div>
          )}
        </section>

        {/* RECENT VISITS LOG */}
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-gym-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">آخر حركات الدخول المسجلة</h3>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-surface-dark border border-surface-border text-gray-300 hover:text-white text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {recentVisits.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                لا توجد حركات دخول مسجلة اليوم حتى الآن
              </div>
            ) : (
              recentVisits.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gym-500/10 text-gym-400 border border-gym-500/30 flex items-center justify-center font-bold">
                      {v.member?.full_name?.charAt(0) || 'ع'}
                    </div>
                    <div>
                      <div className="font-bold text-white">{v.member?.full_name || 'عضو غير معروف'}</div>
                      <div className="text-[10px] text-gray-400 font-mono" dir="ltr">
                        {v.member?.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        v.method === 'qr'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {v.method === 'qr' ? '📱 QR ديناميكي' : '🔍 تسجيل يدوي'}
                    </span>
                    <span className="font-mono text-gray-400 text-[11px]">
                      {new Date(v.entered_at).toLocaleTimeString('ar-MR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* QUICK PAYMENT / RENEWAL MODAL */}
        <Modal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          title={`تجديد اشتراك: ${selectedMember?.full_name || ''}`}
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs" dir="rtl">
            {/* Plan selection */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">اختر الباقة</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs focus:outline-none focus:border-gym-500 min-h-[44px]"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price_mru} MRU ({p.duration_days} يوماً)
                  </option>
                ))}
              </select>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">طريقة الدفع</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bankily', name: 'بنكيلي (Bankily)' },
                  { id: 'masrvi', name: 'مصرفي (Masrvi)' },
                  { id: 'sedad', name: 'سداد (Sedad)' },
                  { id: 'cash', name: 'نقداً (Espèces)' },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all min-h-[44px] ${
                      paymentMethod === m.id
                        ? 'bg-gym-500/20 text-gym-400 border-gym-500'
                        : 'bg-surface-dark text-gray-400 border-surface-border'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Ref */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">
                رقم العملية المرجعي (اختياري)
              </label>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="رقم إشعار التحويل البنكي..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs focus:outline-none focus:border-gym-500 min-h-[44px] font-mono"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-dark text-gray-300 hover:text-white border border-surface-border min-h-[44px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="px-5 py-2.5 rounded-xl bg-gym-500 hover:bg-gym-400 text-white font-bold min-h-[44px] flex items-center gap-1.5"
              >
                {isSubmittingPayment ? 'جارِ التسجيل...' : 'تأكيد واستلام المبلغ'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  );
}
