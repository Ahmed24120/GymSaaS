import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function GoalsStreakScreen() {
  const [weeklyTarget, setWeeklyTarget] = useState(4);
  const [completedDays, setCompletedDays] = useState(3);
  const [streakWeeks, setStreakWeeks] = useState(4);

  const percentage = Math.round((completedDays / weeklyTarget) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>الأهداف والاستمرارية (Streak)</Text>
        <Text style={styles.subtitle}>حافظ على جدول تمارينك الأسبوعي وحقق أهدافك الرياضية</Text>
      </View>

      {/* Carte du Streak principal */}
      <View style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View style={styles.streakTextContainer}>
            <Text style={styles.streakBadge}>سلسلة التمارين المستمرة</Text>
            <Text style={styles.streakNumber}>{streakWeeks} أسابيع متتالية</Text>
          </View>
        </View>
        <Text style={styles.streakNote}>
          رائع جداً! أنت مستمر في تحقيق هدفك الأسبوعي دون انقطاع منذ شهر كامل.
        </Text>
      </View>

      {/* Objectif de la semaine */}
      <View style={styles.goalCard}>
        <View style={styles.goalHeaderRow}>
          <Text style={styles.goalTitle}>هدف الأسبوع الحالي</Text>
          <Text style={styles.goalRatio}>{completedDays} من {weeklyTarget} أيام</Text>
        </View>

        {/* Barre de progression */}
        <View style={styles.track}>
          <View style={[styles.progress, { width: `${percentage}%` }]} />
        </View>

        <Text style={styles.goalSubtitle}>
          بقي لديك تمرين واحد فقط هذا الأسبوع لتحقيق نسبة الإنجاز 100%.
        </Text>

        {/* Boutons d'ajustement de l'objectif (Touch targets >= 44px) */}
        <View style={styles.adjustRow}>
          <Text style={styles.adjustLabel}>تعديل الهدف الأسبوعي:</Text>
          <View style={styles.btnGroup}>
            {[3, 4, 5, 6].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.targetBtn, weeklyTarget === days && styles.targetBtnActive]}
                onPress={() => setWeeklyTarget(days)}
                accessibilityRole="button"
                accessibilityLabel={`${days} أيام`}
              >
                <Text style={[styles.targetBtnText, weeklyTarget === days && styles.targetBtnTextActive]}>
                  {days} أيام
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Badges d'encouragement */}
      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>الأوسمة والجوائز المحققة 🏆</Text>

        <View style={styles.badgeGrid}>
          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>🎖️</Text>
            <Text style={styles.badgeName}>بطل الاستمرارية</Text>
            <Text style={styles.badgeDesc}>4 أسابيع متواصلة</Text>
          </View>

          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>⚡</Text>
            <Text style={styles.badgeName}>نشاط الصباح</Text>
            <Text style={styles.badgeDesc}>5 تمارين قبل 9 صباحاً</Text>
          </View>

          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>🦾</Text>
            <Text style={styles.badgeName}>المثابر الفضي</Text>
            <Text style={styles.badgeDesc}>15 تمرين في الشهر</Text>
          </View>

          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>🎯</Text>
            <Text style={styles.badgeName}>دقة الحضور</Text>
            <Text style={styles.badgeDesc}>تسجيل QR منتظم</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
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
  streakCard: {
    backgroundColor: '#1f1505',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#78350f',
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  streakIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  streakTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  streakBadge: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '700',
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  streakNote: {
    fontSize: 11,
    color: '#d1d5db',
    lineHeight: 18,
    textAlign: 'right',
  },
  goalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  goalRatio: {
    fontSize: 13,
    fontWeight: '900',
    color: '#22c55e',
    fontFamily: 'monospace',
  },
  track: {
    height: 10,
    backgroundColor: '#1f2937',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progress: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 5,
  },
  goalSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 16,
    textAlign: 'right',
    marginBottom: 14,
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  adjustLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  targetBtn: {
    minHeight: 44, // Touch target >= 44px
    minWidth: 44,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  targetBtnActive: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  targetBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
  },
  targetBtnTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  badgesSection: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'right',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '48%',
    backgroundColor: '#182234',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 2,
  },
});
