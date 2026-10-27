import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { supabase } from '../services/supabase';

interface AdItem {
  id: string;
  advertiser: string;
  title: string;
  target_link?: string | null;
  status: string;
  created_at: string;
}

export default function AnnouncementsScreen() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AdItem[]>([]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_ads')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setAnnouncements([
          {
            id: 'ad-1',
            advertiser: 'مكملات القوة — نواكشوط',
            title: 'خصم خاص 20% على البروتين والمكملات الغذائية لمشتركي GymSaaS في تفرغ زينة.',
            target_link: 'https://wa.me/22245000000',
            status: 'active',
            created_at: new Date().toISOString(),
          },
          {
            id: 'ad-2',
            advertiser: 'إدارة الصالة',
            title: 'تنبيه: أوقات عمل شهر رمضان المبارك ستكون من 15:00 إلى 18:00 ومن 21:00 إلى 02:00.',
            target_link: null,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setAnnouncements(data as any);
      }
    } catch {
      setAnnouncements([
        {
          id: 'ad-1',
          advertiser: 'إدارة الصالة',
          title: 'مرحباً بك في تطبيق GymSaaS! تأكد من إبراز الرمز الذكي عند مدخل الصالة.',
          target_link: null,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openLink = (url?: string | null) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>جاري تحميل الإعلانات والعروض...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>الإعلانات والعروض الخاصة</Text>
        <Text style={styles.subtitle}>تنبيهات الصالة وعروض الشركاء الحصرية في موريتانيا</Text>
      </View>

      {/* Liste des annonces */}
      {announcements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyTitle}>لا توجد إعلانات نشطة</Text>
          <Text style={styles.emptySubtitle}>سيتم إشعارك فور توفر أي عروض ترويجية أو تنبيهات من الصالة.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {announcements.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
              <View style={styles.badgeRow}>
                <View style={styles.advertiserBadge}>
                  <Text style={styles.advertiserText}>{ad.advertiser}</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(ad.created_at).toLocaleDateString('ar-MR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
              </View>

              <Text style={styles.adTitle}>{ad.title}</Text>

              {ad.target_link ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openLink(ad.target_link)}
                  accessibilityRole="button"
                  accessibilityLabel="عرض التفاصيل أو التواصل"
                >
                  <Text style={styles.actionBtnText}>عرض التفاصيل والتواصل ↗</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Bouton de rafraîchissement (>= 44px) */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchAnnouncements}
        accessibilityRole="button"
        accessibilityLabel="تحديث الإعلانات"
      >
        <Text style={styles.refreshButtonText}>تحديث الإعلانات</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f17',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9ca3af',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    marginBottom: 16,
  },
  adCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  advertiserBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  advertiserText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 10,
    color: '#6b7280',
  },
  adTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },
  actionBtn: {
    marginTop: 12,
    minHeight: 44, // Touch target >= 44px
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
  },
  refreshButton: {
    minHeight: 44,
    backgroundColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
});
