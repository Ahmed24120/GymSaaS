import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '../services/supabase';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const [member, setMember] = useState({
    name: 'محمد الأمين ولد فال',
    phone: '+222 45 11 22 33',
    gym: 'GymSaaS Pilot — نواكشوط',
    branch: 'الفرع الرئيسي — تفرغ زينة',
    memberId: 'd0000000-0000-0000-0000-000000000001',
    joinDate: '2026-01-15',
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorer
    }
    Alert.alert('تسجيل الخروج', 'تم تسجيل خروجك بنجاح من التطبيق.');
    if (onLogout) onLogout();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête profil */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.phone}>{member.phone}</Text>
      </View>

      {/* Détails du compte */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>معلومات العضوية</Text>

        <View style={styles.row}>
          <Text style={styles.label}>الصالة الرياضية:</Text>
          <Text style={styles.value}>{member.gym}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>الفرع التابع له:</Text>
          <Text style={styles.value}>{member.branch}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>تاريخ الانضمام:</Text>
          <Text style={styles.value}>{member.joinDate}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>رقم العضوية:</Text>
          <Text style={[styles.value, styles.mono]}>{member.memberId.slice(0, 8)}...</Text>
        </View>
      </View>

      {/* Sécurité et vie privée */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>الأمان والخصوصية</Text>
        <Text style={styles.desc}>
          تطبيق GymSaaS محمي بنظام التشفير السحابي Supabase مع سياسات RLS لعزل البيانات ومنع الوصول غير المصرح به.
        </Text>
      </View>

      {/* Bouton de déconnexion (>= 44px) */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="تسجيل الخروج من الحساب"
      >
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#22c55e',
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  phone: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  card: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  mono: {
    fontFamily: 'monospace',
    color: '#22c55e',
  },
  desc: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 18,
    textAlign: 'right',
  },
  logoutButton: {
    width: '100%',
    minHeight: 44, // Touch target >= 44px
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
