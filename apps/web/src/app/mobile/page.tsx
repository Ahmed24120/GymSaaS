'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  UserPlus,
  Activity,
  Timer,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flame,
  Scale,
  Smartphone
} from 'lucide-react';
import { mockMembers } from '@/lib/mockData';

type TabType = 'qr' | 'onboarding' | 'fitness' | 'timer' | 'scanner';

export default function MobileAppWebSimulator() {
  const [activeTab, setActiveTab] = useState<TabType>('qr');
  const [secondsLeft, setSecondsLeft] = useState(30);

  // Dynamic QR countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fitness Calculator States
  const [bmiWeight, setBmiWeight] = useState('75');
  const [bmiHeight, setBmiHeight] = useState('175');
  const [calWeight, setCalWeight] = useState('75');
  const [calMins, setCalMins] = useState('45');
  const [selectedExercise, setSelectedExercise] = useState({ name: '🏋️ رفع أثقال', met: 5.0 });

  const bmiVal =
    parseFloat(bmiWeight) && parseFloat(bmiHeight)
      ? (parseFloat(bmiWeight) / Math.pow(parseFloat(bmiHeight) / 100, 2)).toFixed(1)
      : '0';

  const caloriesBurned = Math.round(
    selectedExercise.met * (parseFloat(calWeight) || 75) * ((parseFloat(calMins) || 45) / 60)
  );

  // Scanner Simulator States
  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'success' | 'expired';
    name?: string;
    phone?: string;
    plan?: string;
  }>({ status: 'idle' });

  // Onboarding States
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardPlan, setOnboardPlan] = useState('شهري (3,000 MRU)');
  const [onboardDone, setOnboardDone] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-between p-2 sm:p-6 font-sans">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-md flex items-center justify-between p-3 bg-surface-card rounded-2xl border border-surface-border mb-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>لوحة التحكم الرئيسية</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-gym-400 font-bold">
          <Smartphone className="w-4 h-4" />
          <span>نسخة الويب من تطبيق الجوال</span>
        </div>
      </div>

      {/* Mobile Shell Frame */}
      <div className="w-full max-w-md bg-[#111827] rounded-3xl border border-surface-border shadow-2xl flex flex-col overflow-hidden min-h-[680px]">
        {/* Mobile Header */}
        <div className="p-4 bg-[#0b0f17] border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Gym SaaS Pilot</h2>
            <p className="text-[11px] text-gray-400">نواكشوط - تفرغ زينة</p>
          </div>
          <span className="text-[10px] bg-gym-500/20 text-gym-400 border border-gym-500/30 px-2 py-0.5 rounded-full font-bold">
            Live MVP
          </span>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* TAB 1: DYNAMIC QR */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-full bg-[#0b0f17] p-3 rounded-xl border border-surface-border flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  رمز دخول مباشر (Live)
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  يتجدد خلال {secondsLeft}ث
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${(secondsLeft / 30) * 100}%` }}
                ></div>
              </div>

              {/* Simulated QR Box */}
              <div className="p-6 bg-white rounded-3xl shadow-xl flex flex-col items-center">
                <div className="relative">
                  <QrCode className="w-48 h-48 text-[#0b0f17]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-gym-500 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">
                      GYM
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Card */}
              <div className="w-full bg-[#0b0f17] p-3.5 rounded-2xl border border-surface-border flex items-center justify-between text-right">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gym-500/20 text-gym-400 font-bold flex items-center justify-center">
                    م
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">محمد الأمين ولد فال</div>
                    <div className="text-[10px] text-gray-400 font-mono">+222 46 80 12 34</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                  اشتراك نشط
                </span>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                يحتوي الرمز على توقيع رقمي خادمي (HMAC) مشفر ضد لقطات الشاشة لمنع استخدامه من قِبل صديق.
              </p>
            </div>
          )}

          {/* TAB 2: ONBOARDING */}
          {activeTab === 'onboarding' && (
            <div className="space-y-4 text-right">
              <h3 className="text-base font-bold text-white text-center">انضم إلى الصالة الآن</h3>
              <p className="text-xs text-gray-400 text-center">
                سجل بياناتك واحصل على رمز الدخول الفوري
              </p>

              {onboardDone ? (
                <div className="p-6 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">تم الاشتراك بنجاح!</h4>
                  <p className="text-xs text-gray-300">
                    مرحباً بك {onboardName} في صالة Gym SaaS Pilot. تم إصدار بطاقة الاشتراك الخاصة بك.
                  </p>
                  <button
                    onClick={() => {
                      setOnboardDone(false);
                      setActiveTab('qr');
                    }}
                    className="w-full py-2.5 rounded-xl bg-gym-500 text-white font-bold text-xs"
                  >
                    عرض رمز الـ QR للدخول ➔
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setOnboardDone(true);
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-gray-300 mb-1 font-semibold">الاسم الكامل *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد ولد سالم"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f17] border border-surface-border text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1 font-semibold">رقم الهاتف *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+222 46..."
                      value={onboardPhone}
                      onChange={(e) => setOnboardPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f17] border border-surface-border text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1 font-semibold">الباقة المختارة</label>
                    <select
                      value={onboardPlan}
                      onChange={(e) => setOnboardPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f17] border border-surface-border text-white text-xs"
                    >
                      <option>شهر واحد (3,000 MRU)</option>
                      <option>3 أشهر (7,500 MRU)</option>
                      <option>سنة كاملة (22,000 MRU)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gym-500 hover:bg-gym-600 text-white font-bold text-xs shadow-lg shadow-gym-600/30 mt-4"
                  >
                    ✓ تأكيد الاشتراك واستخراج الباركود
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FITNESS & CALORIES */}
          {activeTab === 'fitness' && (
            <div className="space-y-5 text-right text-xs">
              {/* BMI Section */}
              <div className="bg-[#0b0f17] p-4 rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-gym-400" />
                    مؤشر كتلة الجسم (BMI)
                  </span>
                  <span className="text-xl font-black text-gym-400 font-mono">{bmiVal}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-400">الوزن (kg):</label>
                    <input
                      type="number"
                      value={bmiWeight}
                      onChange={(e) => setBmiWeight(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-[#111827] border border-surface-border text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">الطول (cm):</label>
                    <input
                      type="number"
                      value={bmiHeight}
                      onChange={(e) => setBmiHeight(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-[#111827] border border-surface-border text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Calories Burned Section */}
              <div className="bg-[#0b0f17] p-4 rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    حاسبة السعرات المحروقة
                  </span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {caloriesBurned} سعرة
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-gray-400">نوع التمرين:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: '🏋️ رفع أثقال', met: 5.0 },
                      { name: '🏃 جري', met: 8.0 },
                      { name: '🚴 دراجة', met: 7.5 },
                      { name: '🥊 ملاكمة', met: 9.5 },
                    ].map((ex) => (
                      <button
                        key={ex.name}
                        onClick={() => setSelectedExercise(ex)}
                        className={`p-2 rounded-xl border text-right font-bold text-[11px] transition-all ${
                          selectedExercise.name === ex.name
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-[#111827] border-surface-border text-gray-400'
                        }`}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] text-gray-400">مدة التمرين (دقيقة):</label>
                    <input
                      type="number"
                      value={calMins}
                      onChange={(e) => setCalMins(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-[#111827] border border-surface-border text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORKOUT TIMER */}
          {activeTab === 'timer' && (
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <h3 className="text-base font-bold text-white">مؤقت أداء التمارين (Workout Timer)</h3>

              <div className="w-52 h-52 rounded-full border-4 border-gym-500/40 bg-[#0b0f17] flex flex-col items-center justify-center shadow-xl shadow-gym-900/30">
                <span className="text-4xl font-black font-mono text-white">25:00</span>
                <span className="text-xs text-gym-400 mt-1 font-bold">جاهز للتمرين</span>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                {['15 دقيقة', '30 دقيقة', '45 دقيقة'].map((dur) => (
                  <button
                    key={dur}
                    className="py-2.5 rounded-xl bg-[#0b0f17] border border-surface-border hover:border-gym-500 text-xs font-bold text-gray-300"
                  >
                    {dur}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 w-full">
                <button className="flex-1 py-3 rounded-xl bg-gym-500 text-white font-bold text-xs shadow-lg shadow-gym-600/30">
                  ▶ ابدأ التمرين
                </button>
                <button className="px-5 py-3 rounded-xl bg-[#0b0f17] border border-surface-border text-gray-400 font-bold text-xs">
                  إعادة
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SCANNER */}
          {activeTab === 'scanner' && (
            <div className="space-y-4 text-center">
              <h3 className="text-base font-bold text-white">ماسح مكتب الاستقبال</h3>
              <p className="text-xs text-gray-400">
                التحقق الفوري من اشتراك العضو عند بوابة الصالة
              </p>

              {/* Viewfinder Mock */}
              <div className="relative w-full h-56 bg-black/60 rounded-2xl border-2 border-dashed border-gym-500/50 flex flex-col items-center justify-center p-4">
                <ScanLine className="w-12 h-12 text-gym-400 animate-pulse mb-2" />
                <span className="text-xs text-gray-300">كاميرا المسح جاهزة للتحقق الفوري</span>
              </div>

              {/* Quick Test Buttons */}
              <div className="space-y-2">
                <div className="text-[11px] text-gray-400">جرّب فحص الحالات ميدانياً الآن:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setScanResult({
                        status: 'success',
                        name: 'محمد الأمين ولد فال',
                        phone: '+222 46 80 12 34',
                        plan: 'اشتراك ربع سنوي ساري',
                      })
                    }
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                  >
                    ✓ مسح عضو ساري (أخضر)
                  </button>
                  <button
                    onClick={() =>
                      setScanResult({
                        status: 'expired',
                        name: 'سيدي محمد ولد الشيخ',
                        phone: '+222 22 99 88 77',
                        plan: 'اشتراك منتهٍ بتاريخ 2026-09-30',
                      })
                    }
                    className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow"
                  >
                    ✗ مسح عضو منتهي (أحمر)
                  </button>
                </div>
              </div>

              {/* Result Feedback Modal */}
              {scanResult.status !== 'idle' && (
                <div
                  className={`p-4 rounded-2xl border text-right mt-3 space-y-2 animate-fade-in ${
                    scanResult.status === 'success'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {scanResult.status === 'success' ? '✓ تم قبول الدخول' : '✗ الدخول مرفوض'}
                    </span>
                    <button
                      onClick={() => setScanResult({ status: 'idle' })}
                      className="text-xs font-bold text-gray-400 hover:text-white"
                    >
                      إغلاق ✕
                    </button>
                  </div>
                  <div className="text-xs text-white font-bold">{scanResult.name}</div>
                  <div className="text-[11px] text-gray-300 font-mono">{scanResult.phone}</div>
                  <div className="text-[11px] font-bold">{scanResult.plan}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Tab Bar */}
        <div className="p-2 bg-[#0b0f17] border-t border-surface-border grid grid-cols-5 gap-1">
          {[
            { id: 'qr', label: 'الباركود', icon: QrCode },
            { id: 'onboarding', label: 'اشترك', icon: UserPlus },
            { id: 'fitness', label: 'لياقة', icon: Activity },
            { id: 'timer', label: 'مؤقت', icon: Timer },
            { id: 'scanner', label: 'الاستقبال', icon: ScanLine },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-gym-400 bg-gym-500/10 font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
