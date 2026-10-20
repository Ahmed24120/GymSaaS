import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

interface MemberOnboardingScreenProps {
  onRegistered?: (memberId: string) => void;
}

const PLANS = [
  { id: 'plan-1m', label: 'شهر واحد', price: 3000, days: 30 },
  { id: 'plan-3m', label: 'ثلاثة أشهر', price: 7500, days: 90 },
  { id: 'plan-6m', label: 'ستة أشهر', price: 13000, days: 180 },
  { id: 'plan-12m', label: 'سنة كاملة', price: 22000, days: 365 },
];

const GOALS = ['خسارة وزن', 'بناء عضلات', 'لياقة عامة', 'رياضة هواية'];

export default function MemberOnboardingScreen({ onRegistered }: MemberOnboardingScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bankily' | 'masrvi' | 'sedad'>('cash');
  const [registrationDone, setRegistrationDone] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  const handleNextStep1 = () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم الكامل ورقم الهاتف');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!selectedGoal) {
      Alert.alert('خطأ', 'يرجى تحديد هدفك من الاشتراك');
      return;
    }
    setStep(3);
  };

  const handleFinish = () => {
    // توليد معرف عشوائي للعضو (في الإنتاج = Supabase UUID)
    const newId = 'mem-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedId(newId);
    setRegistrationDone(true);
    if (onRegistered) onRegistered(newId);
  };

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + selectedPlan.days);
  const endDateLabel = endDate.toLocaleDateString('ar-MR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (registrationDone) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✅</Text>
        </View>
        <Text style={styles.successTitle}>تم التسجيل بنجاح!</Text>
        <Text style={styles.successSubtitle}>مرحباً بك في صالة Gym SaaS Pilot</Text>

        <View style={styles.successCard}>
          <Row label="الاسم:" value={fullName} />
          <Row label="رقم الهاتف:" value={phone} />
          <Row label="الباقة:" value={selectedPlan.label} />
          <Row label="ينتهي في:" value={endDateLabel} valueColor="#22c55e" />
          <Row label="معرف العضوية:" value={generatedId} mono />
        </View>

        <Text style={styles.qrHint}>
          انتقل إلى تبويب «بوابة العضو» لعرض رمز QR الخاص بك
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>انضم إلى الصالة</Text>
          <Text style={styles.headerSub}>
            الخطوة {step} من 3
          </Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.stepsRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, step >= s && styles.stepDotActive]}
            >
              <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        {/* ======= STEP 1: البيانات الشخصية ======= */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>البيانات الشخصية</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الكامل *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: محمد ولد أحمد"
                placeholderTextColor="#6b7280"
                value={fullName}
                onChangeText={setFullName}
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رقم الهاتف *</Text>
              <TextInput
                style={styles.input}
                placeholder="+222 XX XX XX XX"
                placeholderTextColor="#6b7280"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>العمر (سنة)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25"
                  placeholderTextColor="#6b7280"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>الوزن (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor="#6b7280"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الطول (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="170"
                placeholderTextColor="#6b7280"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep1}>
              <Text style={styles.nextBtnText}>التالي ←</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======= STEP 2: الهدف والباقة ======= */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>الهدف والباقة</Text>

            <Text style={styles.inputLabel}>هدفك من الانضمام:</Text>
            <View style={styles.goalsGrid}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalChip, selectedGoal === g && styles.goalChipActive]}
                  onPress={() => setSelectedGoal(g)}
                >
                  <Text style={[styles.goalChipText, selectedGoal === g && styles.goalChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>اختر باقتك:</Text>
            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selectedPlan.id === plan.id && styles.planCardActive]}
                onPress={() => setSelectedPlan(plan)}
              >
                <View>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planDays}>{plan.days} يوم</Text>
                </View>
                <Text style={styles.planPrice}>{plan.price.toLocaleString()} MRU</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>→ رجوع</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep2}>
                <Text style={styles.nextBtnText}>التالي ←</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======= STEP 3: الدفع وتأكيد التسجيل ======= */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>تأكيد الدفع</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>ملخص الاشتراك</Text>
              <Row label="الاسم:" value={fullName} />
              <Row label="الباقة:" value={selectedPlan.label} />
              <Row label="السعر:" value={`${selectedPlan.price.toLocaleString()} MRU`} />
              <Row label="تاريخ الانتهاء:" value={endDateLabel} valueColor="#22c55e" />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>طريقة الدفع:</Text>
            <View style={styles.paymentGrid}>
              {(['cash', 'bankily', 'masrvi', 'sedad'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.payChip, paymentMethod === m && styles.payChipActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.payChipText, paymentMethod === m && styles.payChipTextActive]}>
                    {m === 'cash' ? '💵 كاش' : m === 'bankily' ? '📱 بنكيلي' : m === 'masrvi' ? '🏦 مصرفي' : '💳 سداد'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>→ رجوع</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#22c55e' }]} onPress={handleFinish}>
                <Text style={styles.nextBtnText}>✓ تأكيد التسجيل</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text
        style={[
          rowStyles.value,
          valueColor ? { color: valueColor } : {},
          mono ? { fontFamily: 'monospace' } : {},
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  label: { fontSize: 13, color: '#9ca3af' },
  value: { fontSize: 13, color: '#f3f4f6', fontWeight: '700' },
});

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    backgroundColor: '#0b0f17',
    minHeight: '100%',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  stepDotText: { fontSize: 13, fontWeight: '900', color: '#9ca3af' },
  stepDotTextActive: { color: '#ffffff' },
  stepContainer: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 18,
    textAlign: 'right',
  },
  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row' },
  inputLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 14,
  },
  nextBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    flex: 1,
  },
  nextBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  backBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    flex: 1,
    marginLeft: 8,
  },
  backBtnText: { color: '#9ca3af', fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 8 },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  goalChipActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  goalChipText: { fontSize: 13, color: '#9ca3af', fontWeight: '700' },
  goalChipTextActive: { color: '#ffffff' },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  planCardActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
  planLabel: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  planDays: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  planPrice: { fontSize: 16, fontWeight: '900', color: '#22c55e' },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'right',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  payChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  payChipActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  payChipText: { fontSize: 13, color: '#9ca3af', fontWeight: '700' },
  payChipTextActive: { color: '#ffffff' },
  // Success Screen
  successContainer: {
    flex: 1,
    backgroundColor: '#0b0f17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: { fontSize: 44 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  successSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 24 },
  successCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  qrHint: {
    fontSize: 12,
    color: '#22c55e',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
  },
});
