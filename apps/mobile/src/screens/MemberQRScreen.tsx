import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { generateDynamicQRToken, mockMembersDB } from '../services/qrSecurity';
import { Member } from '../types';

const { width } = Dimensions.get('window');

interface MemberQRScreenProps {
  memberId?: string;
}

export default function MemberQRScreen({ memberId = 'mem-001' }: MemberQRScreenProps) {
  const member: Member = mockMembersDB[memberId] || mockMembersDB['mem-001'];

  const [qrToken, setQrToken] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const progressAnim = React.useRef(new Animated.Value(1)).current;

  // Function to refresh the dynamic QR token
  const refreshQR = () => {
    const newToken = generateDynamicQRToken(member.id, member.gym_id);
    setQrToken(newToken);
    setSecondsLeft(30);

    // Reset and trigger smooth animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();
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
  }, [member.id]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.gymTitle}>{member.gym_name}</Text>
        <Text style={styles.branchSubtitle}>{member.branch_name}</Text>
      </View>

      {/* Main Dynamic QR Card */}
      <View style={styles.qrCard}>
        {/* Anti-Screenshot Live Security Watermark */}
        <View style={styles.securityHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>رمز دخول مباشر (Live)</Text>
          </View>
          <Text style={styles.timerText}>يتجدد خلال {secondsLeft} ثانية</Text>
        </View>

        {/* Dynamic Animated ProgressBar */}
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

        {/* Dynamic QR Container */}
        <View style={styles.qrWrapper}>
          {qrToken ? <QRCodeDisplay value={qrToken} size={width * 0.58} /> : null}
        </View>

        {/* Member Quick Badge */}
        <View style={styles.memberInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{member.full_name.charAt(0)}</Text>
          </View>
          <View style={styles.memberTextCol}>
            <Text style={styles.memberName}>{member.full_name}</Text>
            <Text style={styles.memberPhone}>{member.phone}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>اشتراك نشط</Text>
          </View>
        </View>

        {/* Manual Refresh CTA */}
        <TouchableOpacity style={styles.refreshButton} onPress={refreshQR} activeOpacity={0.8}>
          <Text style={styles.refreshButtonText}>تحديث الرمز يدوياً</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>تفاصيل الاشتراك الحالي</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>نوع الباقة:</Text>
          <Text style={styles.detailValue}>{member.plan_name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>تاريخ الانتهاء:</Text>
          <Text style={[styles.detailValue, { color: '#22c55e' }]}>
            {new Date(member.end_date).toLocaleDateString('ar-MR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>معرف العضوية:</Text>
          <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{member.id}</Text>
        </View>
      </View>

      {/* Anti-Fraud Notice */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          يحتوي هذا الرمز على تشفير خادمي موقّع ضد لقطات الشاشة لحماية حسابك ولن يتم قبوله عند انتهاء العداد.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#0b0f17',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  gymTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  branchSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  qrCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '700',
  },
  timerText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  qrWrapper: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0b0f17',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  memberTextCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  memberName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  memberPhone: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  refreshButton: {
    width: '100%',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  noticeBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  noticeText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
