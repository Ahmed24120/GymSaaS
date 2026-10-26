'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  QrCode,
  Calendar,
  Clock,
  Target,
  Trophy,
  Megaphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flame,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Activity,
  Award
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getMembers,
  MemberRecord,
  getVisits,
  VisitRecord,
  getAds,
  AdRecord,
} from '@/lib/data';
import { formatDateNouakchott, getDaysRemaining } from '@/lib/services/dateUtils';
import { QRTokenResponse } from '@/lib/qr/contract';

type TabType = 'qr' | 'subscription' | 'visits' | 'goals' | 'ads';

function MobileContent() {
  const searchParams = useSearchParams();
  const requestedMemberId = searchParams.get('member_id');

  const [activeTab, setActiveTab] = useState<TabType>('qr');
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic QR state
  const [qrToken, setQrToken] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    const loadMemberData = async () => {
      setLoading(true);
      const [mRes, vRes, aRes] = await Promise.all([
        getMembers(),
        getVisits(),
        getAds(),
      ]);

      let selected: MemberRecord | null = null;
      if (mRes.ok && mRes.value.length > 0) {
        if (requestedMemberId) {
          selected = mRes.value.find((m) => m.id === requestedMemberId) || mRes.value[0];
        } else {
          selected = mRes.value.find((m) => m.status === 'active') || mRes.value[0];
        }
        setMember(selected);
      }

      if (vRes.ok) {
        setVisits(
          selected
            ? vRes.value.filter((v) => v.member_id === selected?.id)
            : vRes.value.slice(0, 10)
        );
      }

      if (aRes.ok) {
        setAds(aRes.value.filter((a) => a.status === 'active'));
      }

      setLoading(false);
    };

    loadMemberData();
  }, [requestedMemberId]);

  // Fetch signed QR token
  const fetchQRToken = async (memberId: string) => {
    setIsRotating(true);
    try {
      const res = await fetch(`/api/qr?member_id=${memberId}`);
      if (res.ok) {
        const data: QRTokenResponse = await res.json();
        setQrToken(data.token);
        setSecondsLeft(30);
      }
    } catch {
      // Silent error fallback
    } finally {
      setIsRotating(false);
    }
  };

  const memberId = member?.id;

  useEffect(() => {
    if (!memberId) return;
    fetchQRToken(memberId);

    // 30s rotation timer
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchQRToken(memberId);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [memberId]);

  const sub = member?.active_subscription;
  const isSubActive =
    sub && sub.status === 'active' && new Date(sub.end_date) > new Date();

  // Streak & Goals calculation (Screen 22)
  const targetDaysPerWeek = 4;
  const visitsThisWeek = Math.min(visits.length, 3);
  const currentStreak = 4; // 4 consecutive weeks of meeting goal

  return (
    <div className="min-h-screen bg-[#070a10] text-white flex flex-col items-center justify-center sm:p-4 select-none">
      {/* Centered phone frame on desktop, edge-to-edge on mobile */}
      <div className="w-full sm:max-w-md sm:h-[860px] bg-[#0c121d] sm:rounded-[36px] sm:border-2 sm:border-surface-border shadow-2xl flex flex-col overflow-hidden relative">
        {/* Top Mobile Bar */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-surface-border/60 bg-[#0e1624]">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>الداشبورد</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gym-400">
            <ShieldCheck className="w-4 h-4 text-gym-400" />
            <span>GymSaaS Member</span>
          </div>
          <div className="text-[10px] font-mono text-gray-400">24/7 Live</div>
        </div>

        {/* Member Profile Header */}
        <div className="p-4 bg-gradient-to-b from-[#0e1624] to-[#0c121d] border-b border-surface-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gym-500/20 text-gym-400 border border-gym-500/30 flex items-center justify-center font-black text-base shadow-inner">
              {member?.full_name?.charAt(0) || 'ع'}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">{member?.full_name || 'عضو الصالة'}</h2>
              <div className="text-[11px] text-gray-400 font-mono" dir="ltr">
                {member?.phone || ''}
              </div>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
              isSubActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            {isSubActive ? 'اشتراك سارٍ ✅' : 'منتهي الصلاحية ❌'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-5 p-1.5 bg-[#0a0f19] border-b border-surface-border/50 text-center text-[10px] font-bold">
          {[
            { id: 'qr', label: 'الرمز QR', icon: QrCode },
            { id: 'subscription', label: 'الاشتراك', icon: Calendar },
            { id: 'goals', label: 'الأهداف', icon: Target },
            { id: 'visits', label: 'الزيارات', icon: Clock },
            { id: 'ads', label: 'العروض', icon: Megaphone },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  active
                    ? 'bg-gym-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS (Scrollable area) */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* TAB 1: DYNAMIC QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-gym-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  رمز دخول مشفر بتقنية HMAC-SHA256
                </span>
                <p className="text-[11px] text-gray-400">
                  يتجدد الرمز تلقائياً كل 30 ثانية لمنع لقطات الشاشة والاحتيال
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-5 rounded-3xl bg-white border-4 border-gym-500 shadow-2xl relative flex items-center justify-center">
                {qrToken ? (
                  <QRCodeSVG
                    value={qrToken}
                    size={210}
                    level="H"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[210px] h-[210px] flex items-center justify-center text-gray-500 text-xs">
                    <RefreshCw className="w-8 h-8 animate-spin text-gym-500" />
                  </div>
                )}
              </div>

              {/* Countdown Progress Circle */}
              <div className="flex items-center gap-3 bg-surface-dark px-4 py-2.5 rounded-2xl border border-surface-border">
                <div className="w-8 h-8 rounded-full bg-gym-500/20 text-gym-400 border border-gym-500/30 flex items-center justify-center font-mono font-bold text-xs">
                  {secondsLeft}s
                </div>
                <div className="text-start">
                  <div className="text-[11px] font-bold text-white">صلاحية الرمز الحالية</div>
                  <div className="text-[10px] text-gray-400">
                    التجديد التلقائي بعد {secondsLeft} ثانية
                  </div>
                </div>
                <button
                  onClick={() => member && fetchQRToken(member.id)}
                  disabled={isRotating}
                  className="ms-auto p-1.5 text-gray-400 hover:text-white"
                  title="تجديد يدوي"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center max-w-xs leading-relaxed">
                وجّه شاشة الهاتف مباشرة نحو كاميرا محطة الاستقبال عند مدخل الصالة لتسجيل الدخول التلقائي.
              </p>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION DETAILS */}
          {activeTab === 'subscription' && (
            <div className="space-y-4 text-xs">
              <div className="p-5 rounded-2xl bg-surface-dark border border-surface-border space-y-3">
                <div className="text-gray-400 text-[11px]">الباقة الحالية</div>
                <div className="text-xl font-black text-white">
                  {sub?.plan?.name || 'اشتراك قياسي (1 شهر)'}
                </div>
                <div className="text-amber-400 font-mono font-bold text-base">
                  {sub?.plan?.price_mru ? `${sub.plan.price_mru} MRU` : '1,500 MRU'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-dark border border-surface-border">
                  <span className="text-[10px] text-gray-400 block">تاريخ البدء</span>
                  <span className="font-bold text-white font-mono mt-0.5 block">
                    {formatDateNouakchott(sub?.start_date)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-dark border border-surface-border">
                  <span className="text-[10px] text-gray-400 block">تاريخ الانتهاء</span>
                  <span className="font-bold text-white font-mono mt-0.5 block">
                    {formatDateNouakchott(sub?.end_date)}
                  </span>
                </div>
              </div>

              {sub?.end_date && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold">
                    الأيام المتبقية: {getDaysRemaining(sub.end_date)} يوماً
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">
                    اشتراكك يتيح لك الدخول اليومي للفرع الرئيسي وصالة كمال الأجسام.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE GOALS & STREAK (Screen 22) */}
          {activeTab === 'goals' && (
            <div className="space-y-4 text-xs">
              {/* Streak Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-surface-dark border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    الاستمرارية المتتالية (Streak)
                  </span>
                  <div className="text-2xl font-black text-white mt-1">
                    {currentStreak} أسابيع متتالية 🔥
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    أنت تحافظ على هدف التمارين الأسبوعي بانتظام!
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-amber-400 shrink-0" />
              </div>

              {/* Weekly Target Progress */}
              <div className="p-4 rounded-2xl bg-surface-dark border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">هدف هذا الأسبوع</span>
                  <span className="font-mono text-gym-400 font-bold">
                    {visitsThisWeek} من {targetDaysPerWeek} أيام
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gym-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((visitsThisWeek / targetDaysPerWeek) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  بقي لديك يوم واحد فقط من التمارين لتحقيق الهدف الأسبوعي بنسبة 100%.
                </p>
              </div>

              {/* Motivational Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-dark border border-surface-border text-center space-y-1">
                  <Award className="w-6 h-6 text-gym-400 mx-auto" />
                  <div className="font-bold text-white text-[11px]">مواظب فضي</div>
                  <div className="text-[9px] text-gray-400">أكثر من 15 زيارة شهرياً</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-dark border border-surface-border text-center space-y-1">
                  <Activity className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="font-bold text-white text-[11px]">بطل الصباح</div>
                  <div className="text-[9px] text-gray-400">حضور قبل 09:00 صباحاً</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VISITS HISTORY */}
          {activeTab === 'visits' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-gray-400 text-[11px] pb-1 border-b border-surface-border/50">
                <span>سجل زياراتك الأخيرة</span>
                <span>{visits.length} زيارات موثقة</span>
              </div>

              {visits.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  لا توجد زيارات مسجلة لهذا الحساب حتى الآن.
                </div>
              ) : (
                visits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {v.branch?.name || 'الفرع الرئيسي - تفرغ زينة'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {v.method === 'qr' ? '📱 مسح رمز QR ديناميكي' : '🔍 تسجيل يدوي بالاستقبال'}
                      </div>
                    </div>
                    <span className="font-mono text-gray-300 text-[11px]">
                      {new Date(v.entered_at).toLocaleDateString('ar-MR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: CENTRAL ANNOUNCEMENTS & ADS */}
          {activeTab === 'ads' && (
            <div className="space-y-3 text-xs">
              <div className="text-[11px] text-gray-400 pb-1 border-b border-surface-border/50">
                عروض وخصومات خاصة بمشتركي GymSaaS
              </div>

              {ads.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  لا توجد عروض ترويجية نشطة حالياً.
                </div>
              ) : (
                ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-4 rounded-2xl bg-surface-dark border border-surface-border space-y-2"
                  >
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      {ad.advertiser}
                    </span>
                    <h4 className="font-bold text-white text-sm">{ad.title || 'عرض خاص'}</h4>
                    {ad.target_link && (
                      <a
                        href={ad.target_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gym-400 hover:text-gym-300 text-[11px] font-bold pt-1"
                      >
                        <span>الاستفادة من العرض</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MobileSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070a10] flex items-center justify-center text-white text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-gym-500" />
        </div>
      }
    >
      <MobileContent />
    </Suspense>
  );
}
