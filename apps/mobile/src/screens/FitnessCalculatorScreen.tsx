import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

// ======= حاسبة BMI =======
function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const h = height / 100;
  return weight / (h * h);
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'نقص وزن', color: '#f59e0b' };
  if (bmi < 25) return { label: 'وزن طبيعي', color: '#22c55e' };
  if (bmi < 30) return { label: 'زيادة وزن', color: '#f59e0b' };
  return { label: 'سمنة', color: '#ef4444' };
}

// ======= حاسبة BMR + TDEE (Mifflin-St Jeor) =======
function calcBMR(weight: number, height: number, age: number, gender: 'male' | 'female'): number {
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_LEVELS = [
  { label: 'نشاط خفيف جداً', multiplier: 1.2 },
  { label: 'نشاط خفيف', multiplier: 1.375 },
  { label: 'نشاط متوسط', multiplier: 1.55 },
  { label: 'نشاط عالٍ', multiplier: 1.725 },
  { label: 'نشاط مكثف جداً', multiplier: 1.9 },
];

// ======= حاسبة السعرات المحروقة =======
const EXERCISES = [
  { label: '🏋️ رفع أثقال', mets: 5.0 },
  { label: '🏃 جري (متوسط)', mets: 8.0 },
  { label: '🚴 دراجة', mets: 7.5 },
  { label: '🤸 تمارين هوائية', mets: 6.0 },
  { label: '🧘 يوغا', mets: 3.0 },
  { label: '🥊 ملاكمة', mets: 9.8 },
  { label: '🏊 سباحة', mets: 7.0 },
  { label: '⚡ HIIT', mets: 10.0 },
];

// السعرات المحروقة = MET × وزن(kg) × مدة(h)
function calcCaloriesBurned(met: number, weight: number, minutes: number): number {
  return Math.round(met * weight * (minutes / 60));
}

export default function FitnessCalculatorScreen() {
  const [activeTab, setActiveTab] = useState<'bmi' | 'tdee' | 'calories'>('bmi');

  // BMI inputs
  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');

  // TDEE inputs
  const [tdeeWeight, setTdeeWeight] = useState('');
  const [tdeeHeight, setTdeeHeight] = useState('');
  const [tdeeAge, setTdeeAge] = useState('');
  const [tdeeGender, setTdeeGender] = useState<'male' | 'female'>('male');
  const [tdeeActivity, setTdeeActivity] = useState(ACTIVITY_LEVELS[1]);

  // Calories burned inputs
  const [calWeight, setCalWeight] = useState('');
  const [calMinutes, setCalMinutes] = useState('');
  const [calExercise, setCalExercise] = useState(EXERCISES[0]);

  // ====== BMI Results ======
  const bmi = calcBMI(parseFloat(bmiWeight), parseFloat(bmiHeight));
  const bmiCat = bmiCategory(bmi);

  // ====== TDEE Results ======
  const bmr = calcBMR(
    parseFloat(tdeeWeight),
    parseFloat(tdeeHeight),
    parseFloat(tdeeAge),
    tdeeGender
  );
  const tdee = bmr * tdeeActivity.multiplier;

  // ====== Calories Burned ======
  const burnedCals = calcCaloriesBurned(
    calExercise.mets,
    parseFloat(calWeight) || 70,
    parseFloat(calMinutes) || 0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>حاسبة اللياقة البدنية</Text>
      <Text style={styles.pageSubtitle}>BMI · السعرات اليومية · المحروقات</Text>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TabBtn
          label="BMI"
          active={activeTab === 'bmi'}
          onPress={() => setActiveTab('bmi')}
        />
        <TabBtn
          label="سعرات يومية"
          active={activeTab === 'tdee'}
          onPress={() => setActiveTab('tdee')}
        />
        <TabBtn
          label="محروقات"
          active={activeTab === 'calories'}
          onPress={() => setActiveTab('calories')}
        />
      </View>

      {/* ======= BMI TAB ======= */}
      {activeTab === 'bmi' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مؤشر كتلة الجسم (BMI)</Text>

          <InputField
            label="الوزن (kg)"
            value={bmiWeight}
            onChange={setBmiWeight}
            placeholder="70"
          />
          <InputField
            label="الطول (cm)"
            value={bmiHeight}
            onChange={setBmiHeight}
            placeholder="170"
          />

          {bmi > 0 && (
            <View style={[styles.resultCard, { borderColor: bmiCat.color }]}>
              <Text style={[styles.bigNumber, { color: bmiCat.color }]}>
                {bmi.toFixed(1)}
              </Text>
              <Text style={[styles.bigLabel, { color: bmiCat.color }]}>
                {bmiCat.label}
              </Text>

              {/* BMI Scale */}
              <View style={styles.bmiScale}>
                <ScaleSegment color="#3b82f6" label="نقص" range="< 18.5" />
                <ScaleSegment color="#22c55e" label="طبيعي" range="18.5–25" />
                <ScaleSegment color="#f59e0b" label="زيادة" range="25–30" />
                <ScaleSegment color="#ef4444" label="سمنة" range="> 30" />
              </View>
            </View>
          )}

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 مؤشر كتلة الجسم (BMI) هو الوزن (kg) مقسوماً على مربع الطول (m²).
              يُستخدم كمؤشر أولي لتقييم الوزن الصحي.
            </Text>
          </View>
        </View>
      )}

      {/* ======= TDEE TAB ======= */}
      {activeTab === 'tdee' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>السعرات اليومية المطلوبة (TDEE)</Text>

          <InputField label="الوزن (kg)" value={tdeeWeight} onChange={setTdeeWeight} placeholder="70" />
          <InputField label="الطول (cm)" value={tdeeHeight} onChange={setTdeeHeight} placeholder="170" />
          <InputField label="العمر (سنة)" value={tdeeAge} onChange={setTdeeAge} placeholder="25" />

          <Text style={styles.fieldLabel}>الجنس:</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, tdeeGender === 'male' && styles.genderBtnActive]}
              onPress={() => setTdeeGender('male')}
            >
              <Text style={[styles.genderBtnText, tdeeGender === 'male' && styles.genderBtnTextActive]}>
                👨 ذكر
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, tdeeGender === 'female' && styles.genderBtnActive]}
              onPress={() => setTdeeGender('female')}
            >
              <Text style={[styles.genderBtnText, tdeeGender === 'female' && styles.genderBtnTextActive]}>
                👩 أنثى
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>مستوى النشاط اليومي:</Text>
          {ACTIVITY_LEVELS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.activityItem, tdeeActivity.label === a.label && styles.activityItemActive]}
              onPress={() => setTdeeActivity(a)}
            >
              <Text style={[styles.activityLabel, tdeeActivity.label === a.label && styles.activityLabelActive]}>
                {a.label}
              </Text>
              <Text style={styles.activityMulti}>×{a.multiplier}</Text>
            </TouchableOpacity>
          ))}

          {bmr > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultRow}>
                معدل الأيض الأساسي (BMR):{' '}
                <Text style={styles.resultHighlight}>{Math.round(bmr)} سعرة</Text>
              </Text>
              <Text style={styles.bigNumber}>{Math.round(tdee)}</Text>
              <Text style={styles.bigLabel}>سعرة حرارية / اليوم</Text>

              <View style={styles.tdeeGoalRow}>
                <TdeeGoalChip label="خسارة وزن" value={Math.round(tdee - 500)} color="#f59e0b" />
                <TdeeGoalChip label="حفاظ" value={Math.round(tdee)} color="#22c55e" />
                <TdeeGoalChip label="زيادة كتلة" value={Math.round(tdee + 300)} color="#3b82f6" />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ======= CALORIES BURNED TAB ======= */}
      {activeTab === 'calories' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>السعرات المحروقة في التمرين</Text>

          <InputField label="الوزن (kg)" value={calWeight} onChange={setCalWeight} placeholder="70" />
          <InputField label="مدة التمرين (دقيقة)" value={calMinutes} onChange={setCalMinutes} placeholder="45" />

          <Text style={styles.fieldLabel}>نوع التمرين:</Text>
          <View style={styles.exerciseGrid}>
            {EXERCISES.map((ex) => (
              <TouchableOpacity
                key={ex.label}
                style={[styles.exerciseChip, calExercise.label === ex.label && styles.exerciseChipActive]}
                onPress={() => setCalExercise(ex)}
              >
                <Text style={[styles.exerciseChipText, calExercise.label === ex.label && styles.exerciseChipTextActive]}>
                  {ex.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.resultCard, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.bigNumber, { color: '#f59e0b' }]}>{burnedCals}</Text>
            <Text style={[styles.bigLabel, { color: '#f59e0b' }]}>سعرة حرارية محروقة</Text>
            <Text style={styles.calDetail}>
              {calExercise.label} · {calMinutes || 0} دقيقة
            </Text>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 السعرات المحروقة = معامل MET × الوزن (kg) × المدة (ساعة).
              الأرقام تقريبية وتختلف حسب الشدة الفعلية.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ====== Sub-Components ======
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        keyboardType="numeric"
        textAlign="right"
      />
    </View>
  );
}

function ScaleSegment({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <View style={styles.scaleSegment}>
      <View style={[styles.scaleDot, { backgroundColor: color }]} />
      <Text style={styles.scaleLabel}>{label}</Text>
      <Text style={styles.scaleRange}>{range}</Text>
    </View>
  );
}

function TdeeGoalChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.tdeeChip, { borderColor: color }]}>
      <Text style={[styles.tdeeChipVal, { color }]}>{value}</Text>
      <Text style={styles.tdeeChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f17' },
  scrollContent: { padding: 20 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  tabBtnText: { fontSize: 12, color: '#9ca3af', fontWeight: '700' },
  tabBtnTextActive: { color: '#ffffff' },
  section: {},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'right',
  },
  inputGroup: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 4,
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
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  bigNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#22c55e',
  },
  bigLabel: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '700',
    marginBottom: 14,
  },
  bmiScale: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  scaleSegment: { alignItems: 'center', minWidth: 60 },
  scaleDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 3 },
  scaleLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '700' },
  scaleRange: { fontSize: 9, color: '#6b7280' },
  tipBox: {
    backgroundColor: 'rgba(31,41,55,0.5)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  tipText: { fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 16 },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  genderBtnText: { fontSize: 14, color: '#9ca3af', fontWeight: '700' },
  genderBtnTextActive: { color: '#ffffff' },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 7,
  },
  activityItemActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
  activityLabel: { fontSize: 13, color: '#9ca3af' },
  activityLabelActive: { color: '#22c55e', fontWeight: '800' },
  activityMulti: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace' },
  resultRow: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  resultHighlight: { color: '#22c55e', fontWeight: '900' },
  tdeeGoalRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tdeeChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#0b0f17',
  },
  tdeeChipVal: { fontSize: 16, fontWeight: '900' },
  tdeeChipLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'flex-end',
  },
  exerciseChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  exerciseChipActive: { backgroundColor: '#7c3aed', borderColor: '#8b5cf6' },
  exerciseChipText: { fontSize: 12, color: '#9ca3af', fontWeight: '700' },
  exerciseChipTextActive: { color: '#ffffff' },
  calDetail: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
