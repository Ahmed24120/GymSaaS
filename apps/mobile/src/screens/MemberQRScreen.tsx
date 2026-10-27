import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { fetchSignedQRToken } from '../services/qrApi';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface MemberQRScreenProps {
  memberId?: string;
}

export default function MemberQRScreen({ memberId = 'd0000000-0000-0000-0000-000000000001' }: MemberQRScreenProps) {
  const [qrToken, setQrToken] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('محمد الأمين ولد فال');
  const [planName, setPlanName] = useState<string>('اشتراك شهري (1 شهر)');
  const [isSubActive, setIsSubActive] = useState<boolean>(true);

  const progressAnim = useRef(new Animated.Value(1)).current;

  // 1. Charge les détails du membre depuis Supabase (si disponible)
  useEffect(() => {
    let isMounted = true;
    async function loadMember() {
      try {
        const { data: mData } = await supabase
          .from('members')
          .select('id, full_name, status, subscriptions(status, plan:plans(name))')
          .eq('id', memberId)
          .maybeSingle();

        if (mData && isMounted) {
          setMemberName(mData.full_name);
          const subs = (mData as any).subscriptions || [];
          const activeSub = subs.find((s: any) => s.status === 'active') || subs[0];
          if (activeSub) {
            setPlanName(activeSub.plan?.name || 'اشتراك قياسي');
            setIsSubActive(activeSub.status === 'active');
          }
        }
      } catch {
        // Fallback transparent aux données par défaut
      }
    }
    loadMember();
    return () => {
      isMounted = false;
    };
  }, [memberId]);

  // 2. Récupère le QR signé via l'API REST de GymSaaS
  const refreshQR = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchSignedQRToken(memberId);

    if (result.success && result.data) {
      setQrToken(result.data.token);
      setSecondsLeft(30);

      // Réinitialise l'animation du compte à rebours (30s)
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 30000,
        useNativeDriver: false,
      }).start();
    } else {
      setError(result.error || 'تعذر جلب رمز الـ QR من الخادم');
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshQR();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [memberId]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.gymTitle}>GymSaaS Nouakchott</Text>
        <Text style={styles.branchSubtitle}>الفرع الرئيسي — تفرغ زينة</Text>
      </View>

      {/* Carte QR principale */}
      <View style={styles.qrCard}>
        {/* En-tête de sécurité */}
        <View style={styles.securityHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>رمز دخول مباشر (HMAC)</Text>
          </View>
          <Text style={styles.timerText}>يتجدد خلال {secondsLeft} ثانية</Text>
        </View>

        {/* Barre de progression 30s */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressBarWidth,
                backgroundColor: secondsLeft > 10 ? '#22c55e' : '#f59e0b',
              },
            ]}
          />
        </View>

        {/* Contenu QR / Loading / Error */}
        <View style={styles.qrWrapper}>
          {loading && !qrToken ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#22c55e" />
              <Text style={styles.stateText}>جاري إنشاء رمز دخول مشفر...</Text>
            </View>
          ) : error && !qrToken ? (
            <View style={styles.centerState}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>تعذر الاتصال بخادم الـ QR</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={refreshQR}
                accessibilityRole="button"
                accessibilityLabel="إعادة المحاولة"
              >
                <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <QRCodeDisplay value={qrToken} size={width * 0.55} />
          )}
        </View>

        {/* Informations de l'adhérent */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{memberName}</Text>
          <Text style={styles.memberPlan}>{planName}</Text>
          <View
            style={[
              styles.badge,
              isSubActive ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isSubActive ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {isSubActive ? 'اشتراك سارٍ ✅' : 'منتهي الصلاحية ❌'}
            </Text>
          </View>
        </View>

        {/* Bouton de renouvellement manuel (Touch target >= 44px) */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshQR}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="تحديث الرمز الآن"
        >
          <Text style={styles.refreshButtonText}>
            {loading ? 'جاري التحديث...' : '🔄 تحديث الرمز الآن'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Guide d'utilisation */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>💡 تعليمات الدخول السريع:</Text>
        <Text style={styles.instructionsBody}>
          1. وجّه شاشة هاتفك نحو كاميرا محطة الاستقبال عند مدخل الصالة.
        </Text>
        <Text style={styles.instructionsBody}>
          2. يتجدد الرمز تلقائياً كل 30 ثانية بتقنية التشفير HMAC لحماية حسابك من التزوير.
        </Text>
        <Text style={styles.instructionsBody}>
          3. في حال وجود ضعف في الاتصال، اضغط على زر "تحديث الرمز الآن".
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 36,
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  gymTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  branchSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  qrCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  securityHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  timerText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBar: {
    height: '100%',
  },
  qrWrapper: {
    width: width * 0.65,
    height: width * 0.65,
    maxWidth: 260,
    maxHeight: 260,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  stateText: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberInfo: {
    marginTop: 18,
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  memberPlan: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#22c55e',
  },
  badgeTextInactive: {
    color: '#ef4444',
  },
  refreshButton: {
    marginTop: 18,
    width: '100%',
    minHeight: 44, // Touch target >= 44px
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
  instructionsCard: {
    width: '100%',
    maxWidth: 380,
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 6,
    textAlign: 'right',
  },
  instructionsBody: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 18,
    textAlign: 'right',
    marginTop: 2,
  },
});
