'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  ShieldCheck,
  Megaphone,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Eye,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  XCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  getGyms,
  updateGymStatus,
  getPlatformSubscriptions,
  getAds,
  createAd,
  updateAdStatus,
  GymRecord,
  PlatformSubRecord,
  AdRecord,
} from '@/lib/data';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { StatSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SuperAdminPage() {
  const { showToast } = useToast();

  const [gyms, setGyms] = useState<GymRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubRecord[]>([]);
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'gyms' | 'subscriptions' | 'ads'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Ad Modal state
  const [isAddAdOpen, setIsAddAdOpen] = useState(false);
  const [adAdvertiser, setAdAdvertiser] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adTargetLink, setAdTargetLink] = useState('');
  const [adStartDate, setAdStartDate] = useState('');
  const [adEndDate, setAdEndDate] = useState('');
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    const [gRes, sRes, aRes] = await Promise.all([
      getGyms(),
      getPlatformSubscriptions(),
      getAds(),
    ]);

    if (gRes.ok) setGyms(gRes.value);
    else setError(gRes.error.message);

    if (sRes.ok) setSubscriptions(sRes.value);
    if (aRes.ok) setAds(aRes.value);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleGymStatus = async (gymId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await updateGymStatus(gymId, nextStatus as any);
    if (res.ok) {
      setGyms((prev) =>
        prev.map((g) => (g.id === gymId ? { ...g, status: nextStatus as any } : g))
      );
      showToast({
        type: 'success',
        title: 'تم تحديث حالة الصالة بنجاح',
        message: `الحالة الجديدة: ${nextStatus === 'active' ? 'نشطة' : 'معلقة'}`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'فشل تحديث حالة الصالة',
        message: res.error.message,
      });
    }
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const res = await updateAdStatus(adId, nextStatus as any);
    if (res.ok) {
      setAds((prev) =>
        prev.map((a) => (a.id === adId ? { ...a, status: nextStatus as any } : a))
      );
      showToast({
        type: 'success',
        title: 'تم تحديث حالة الإعلان',
      });
    } else {
      showToast({
        type: 'error',
        title: 'فشل تحديث الإعلان',
        message: res.error.message,
      });
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adAdvertiser || !adImageUrl || !adStartDate || !adEndDate) {
      showToast({
        type: 'error',
        title: 'يرجى ملء جميع الحقول الإلزامية',
      });
      return;
    }

    setIsSubmittingAd(true);
    const res = await createAd({
      advertiser: adAdvertiser,
      title: adTitle.trim() || undefined,
      image_url: adImageUrl,
      target_link: adTargetLink.trim() || undefined,
      start_date: new Date(adStartDate).toISOString(),
      end_date: new Date(adEndDate).toISOString(),
    });

    if (res.ok) {
      setAds((prev) => [res.value, ...prev]);
      setIsAddAdOpen(false);
      setAdAdvertiser('');
      setAdTitle('');
      setAdImageUrl('');
      setAdTargetLink('');
      setAdStartDate('');
      setAdEndDate('');
      showToast({
        type: 'success',
        title: 'تمت إضافة الإعلان التجاري بنجاح',
      });
    } else {
      showToast({
        type: 'error',
        title: 'فشل إضافة الإعلان',
        message: res.error.message,
      });
    }
    setIsSubmittingAd(false);
  };

  // Calculations for overview
  const totalGyms = gyms.length;
  const activeGyms = gyms.filter((g) => g.status === 'active').length;
  const trialGyms = gyms.filter((g) => g.status === 'trial').length;
  const suspendedGyms = gyms.filter((g) => g.status === 'suspended').length;
  const totalPlatformMRU = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.price_mru || 0), 0);

  return (
    <div className="min-h-screen bg-surface-dark text-white p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                الإدارة العليا لمنصة GymSaaS
              </span>
              <span className="text-xs text-gray-400">نواكشوط، موريتانيا</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">لوحة تحكم السوبر أدمن (Super Admin)</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              إدارة اشتراكات الصالات الرياضية، حالة الحسابات، والحملات الإعلانية المركزية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="p-2.5 rounded-xl bg-surface-card border border-surface-border text-gray-300 hover:text-white flex items-center gap-1.5 text-xs min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-gym-500 hover:bg-gym-400 text-white font-bold text-xs flex items-center gap-1.5 min-h-[44px]"
            >
              <span>العودة للداشبورد</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">منطقة صلاحيات مقيدة:</span>
            <p className="text-gray-300 mt-0.5 leading-relaxed">
              هذه الصفحة مخصصة لمديري النظام (is_super_admin=true). أي تغيير على حالة الصالة سيؤثر فوراً على قدرة طاقم الصالة ومشتركيها على تسجيل الدخول.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-border">
          {[
            { id: 'overview', label: '📊 النظرة العامة', icon: BarChart3 },
            { id: 'gyms', label: `🏋️ الصالات المشتركة (${totalGyms})`, icon: Building2 },
            { id: 'subscriptions', label: `💳 اشتراكات المنصة (${subscriptions.length})`, icon: DollarSign },
            { id: 'ads', label: `📢 الإعلانات المركزية (${ads.length})`, icon: Megaphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gym-500 text-white shadow-md shadow-gym-600/30'
                  : 'bg-surface-card text-gray-400 hover:text-white border border-surface-border'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && <StatSkeleton />}

        {/* TAB 1: OVERVIEW */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="إجمالي الصالات المسجلة"
                value={totalGyms}
                subtitle={`${activeGyms} نشطة • ${trialGyms} تجريبية`}
                icon={<Building2 className="w-5 h-5 text-gym-400" />}
                isPositive={true}
              />
              <StatCard
                title="الصالات النشطة حالياً"
                value={activeGyms}
                subtitle={`${suspendedGyms} صالة معلقة`}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                isPositive={true}
              />
              <StatCard
                title="إيرادات المنصة الشهرية"
                value={`${totalPlatformMRU.toLocaleString()} MRU`}
                subtitle="اشتراكات الصالات في GymSaaS"
                icon={<DollarSign className="w-5 h-5 text-amber-400" />}
                isPositive={true}
                variant="amber"
              />
              <StatCard
                title="الحملات الإعلانية النشطة"
                value={ads.filter((a) => a.status === 'active').length}
                subtitle={`من أصل ${ads.length} إعلان`}
                icon={<Megaphone className="w-5 h-5 text-blue-400" />}
                isPositive={true}
              />
            </section>
          </div>
        )}

        {/* TAB 2: GYMS */}
        {!loading && activeTab === 'gyms' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-surface-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">قائمة الصالات الرياضية في المنصة</h3>
              <span className="text-xs text-gray-400 font-mono">{gyms.length} صالة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gyms.map((gym) => (
                <div
                  key={gym.id}
                  className="glass-panel p-5 rounded-2xl border border-surface-border space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-white">{gym.name}</h4>
                      <div className="text-xs text-gray-400 mt-0.5">{gym.city}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">ID: {gym.id}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        gym.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : gym.status === 'trial'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {gym.status === 'active' ? 'نشطة' : gym.status === 'trial' ? 'تجريبية' : 'معلقة'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      تاريخ الإنشاء: {new Date(gym.created_at).toLocaleDateString('ar-MR')}
                    </span>
                    <button
                      onClick={() => handleToggleGymStatus(gym.id, gym.status)}
                      className={`px-3 py-1.5 rounded-xl font-bold min-h-[36px] transition-colors ${
                        gym.status === 'active'
                          ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                      }`}
                    >
                      {gym.status === 'active' ? 'تعليق الصالة' : 'تفعيل الصالة'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM SUBSCRIPTIONS */}
        {!loading && activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-surface-border">
              <h3 className="font-bold text-sm text-white">اشتراكات الصالات في باقات المنصة (3,000 MRU / شهر)</h3>
            </div>

            <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-surface-card text-gray-400 uppercase text-[11px] font-semibold border-b border-surface-border">
                    <tr>
                      <th className="py-3 px-4">الصالة</th>
                      <th className="py-3 px-4">الخطة</th>
                      <th className="py-3 px-4">السعر</th>
                      <th className="py-3 px-4">الدورة</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">نهاية الفترة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-gray-200">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-surface-card/30">
                        <td className="py-3 px-4 font-bold text-white">
                          {sub.gym?.name || 'صالة النخبة للرياضة'}
                        </td>
                        <td className="py-3 px-4 font-mono">{sub.plan}</td>
                        <td className="py-3 px-4 font-bold text-amber-400 font-mono">
                          {sub.price_mru} MRU
                        </td>
                        <td className="py-3 px-4">{sub.period === 'monthly' ? 'شهري' : 'سنوي'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {new Date(sub.current_period_end).toLocaleDateString('ar-MR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADS */}
        {!loading && activeTab === 'ads' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-surface-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">إعلانات المنصة المركزية</h3>
                <p className="text-[11px] text-gray-400">تظهر هذه الإعلانات لمستخدمي تطبيق الجوال</p>
              </div>
              <button
                onClick={() => setIsAddAdOpen(true)}
                className="px-4 py-2 bg-gym-500 hover:bg-gym-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة إعلان جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="glass-panel p-5 rounded-2xl border border-surface-border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] text-gray-400 font-semibold">{ad.advertiser}</span>
                      <h4 className="font-bold text-base text-white mt-0.5">{ad.title || 'إعلان بدون عنوان'}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        ad.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {ad.status === 'active' ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1">
                    <div>رابط الصورة: <span className="font-mono text-gray-300">{ad.image_url}</span></div>
                    {ad.target_link && <div>الرابط المستهدف: <span className="font-mono text-gray-300">{ad.target_link}</span></div>}
                    <div>الصلاحية: {new Date(ad.start_date).toLocaleDateString('ar-MR')} إلى {new Date(ad.end_date).toLocaleDateString('ar-MR')}</div>
                  </div>

                  <div className="pt-2 border-t border-surface-border/50 flex justify-end">
                    <button
                      onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                      className="px-3 py-1.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-gray-300 hover:text-white"
                    >
                      {ad.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Add Ad */}
        <Modal
          isOpen={isAddAdOpen}
          onClose={() => setIsAddAdOpen(false)}
          title="إضافة إعلان تجاري للمنصة"
        >
          <form onSubmit={handleCreateAd} className="space-y-4 text-xs" dir="rtl">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">اسم المعلن *</label>
              <input
                type="text"
                required
                value={adAdvertiser}
                onChange={(e) => setAdAdvertiser(e.target.value)}
                placeholder="مثال: متجر المكملات الغذائية"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">عنوان الإعلان</label>
              <input
                type="text"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder="خصم 20% على البروتين للمشتركين"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">رابط صورة الإعلان *</label>
              <input
                type="url"
                required
                value={adImageUrl}
                onChange={(e) => setAdImageUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px] font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">الرابط المستهدف (اختياري)</label>
              <input
                type="url"
                value={adTargetLink}
                onChange={(e) => setAdTargetLink(e.target.value)}
                placeholder="https://wa.me/222..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px] font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">تاريخ البدء *</label>
                <input
                  type="date"
                  required
                  value={adStartDate}
                  onChange={(e) => setAdStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">تاريخ الانتهاء *</label>
                <input
                  type="date"
                  required
                  value={adEndDate}
                  onChange={(e) => setAdEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-white text-xs min-h-[44px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddAdOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-gray-300 min-h-[44px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmittingAd}
                className="px-5 py-2.5 rounded-xl bg-gym-500 hover:bg-gym-400 text-white font-bold min-h-[44px]"
              >
                {isSubmittingAd ? 'جارِ الإضافة...' : 'نشر الإعلان'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
