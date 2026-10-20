import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';

const PRESET_DURATIONS = [
  { label: '20 دقيقة', seconds: 1200 },
  { label: '30 دقيقة', seconds: 1800 },
  { label: '45 دقيقة', seconds: 2700 },
  { label: '60 دقيقة', seconds: 3600 },
  { label: '90 دقيقة', seconds: 5400 },
];

const INTERVAL_PRESETS = [
  { label: 'Tabata (20/10)', work: 20, rest: 10, rounds: 8 },
  { label: 'AMRAP (40/20)', work: 40, rest: 20, rounds: 10 },
  { label: 'EMOM (45/15)', work: 45, rest: 15, rounds: 10 },
];

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutTimerScreen() {
  const [activeTab, setActiveTab] = useState<'simple' | 'interval'>('simple');

  // Simple timer
  const [simpleTotal, setSimpleTotal] = useState(1800); // 30 min default
  const [simpleLeft, setSimpleLeft] = useState(1800);
  const [simpleRunning, setSimpleRunning] = useState(false);
  const simpleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Interval timer
  const [intervalPreset, setIntervalPreset] = useState(INTERVAL_PRESETS[0]);
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  const [phaseLeft, setPhaseLeft] = useState(INTERVAL_PRESETS[0].work);
  const [currentRound, setCurrentRound] = useState(1);
  const [intervalRunning, setIntervalRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (simpleRef.current) clearInterval(simpleRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Pulse on active
  useEffect(() => {
    if (simpleRunning || intervalRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [simpleRunning, intervalRunning]);

  // ====== Simple Timer Logic ======
  const startSimple = () => {
    setSimpleRunning(true);
    simpleRef.current = setInterval(() => {
      setSimpleLeft((prev) => {
        if (prev <= 1) {
          clearInterval(simpleRef.current!);
          setSimpleRunning(false);
          Vibration.vibrate([0, 300, 200, 300, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseSimple = () => {
    setSimpleRunning(false);
    if (simpleRef.current) clearInterval(simpleRef.current);
  };

  const resetSimple = () => {
    pauseSimple();
    setSimpleLeft(simpleTotal);
  };

  const selectPreset = (seconds: number) => {
    setSimpleTotal(seconds);
    setSimpleLeft(seconds);
    if (simpleRef.current) clearInterval(simpleRef.current);
    setSimpleRunning(false);
  };

  // ====== Interval Timer Logic ======
  const startInterval = () => {
    setIntervalRunning(true);
    setPhase('work');
    setPhaseLeft(intervalPreset.work);
    setCurrentRound(1);

    let p: 'work' | 'rest' = 'work';
    let left = intervalPreset.work;
    let round = 1;

    intervalRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        Vibration.vibrate([0, 200, 100, 200]);
        if (p === 'work') {
          p = 'rest';
          left = intervalPreset.rest;
        } else {
          round += 1;
          if (round > intervalPreset.rounds) {
            clearInterval(intervalRef.current!);
            setIntervalRunning(false);
            Vibration.vibrate([0, 500, 200, 500, 200, 500]);
            return;
          }
          p = 'work';
          left = intervalPreset.work;
        }
      }
      setPhase(p);
      setPhaseLeft(left);
      setCurrentRound(round);
    }, 1000);
  };

  const stopInterval = () => {
    setIntervalRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('work');
    setPhaseLeft(intervalPreset.work);
    setCurrentRound(1);
  };

  const selectIntervalPreset = (preset: typeof INTERVAL_PRESETS[0]) => {
    stopInterval();
    setIntervalPreset(preset);
    setPhaseLeft(preset.work);
  };

  const simpleProgress = simpleLeft / simpleTotal;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>مؤقت التمرين</Text>
      <Text style={styles.pageSubtitle}>مؤقت بسيط · تدريب متقطع HIIT</Text>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'simple' && styles.tabBtnActive]}
          onPress={() => { stopInterval(); pauseSimple(); setActiveTab('simple'); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'simple' && styles.tabBtnTextActive]}>
            ⏱ مؤقت بسيط
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'interval' && styles.tabBtnActive]}
          onPress={() => { stopInterval(); pauseSimple(); setActiveTab('interval'); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'interval' && styles.tabBtnTextActive]}>
            ⚡ تدريب متقطع
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======= SIMPLE TIMER ======= */}
      {activeTab === 'simple' && (
        <View style={styles.section}>
          {/* Preset Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
            {PRESET_DURATIONS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.presetChip, simpleTotal === p.seconds && styles.presetChipActive]}
                onPress={() => selectPreset(p.seconds)}
              >
                <Text style={[styles.presetChipText, simpleTotal === p.seconds && styles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Clock Display */}
          <Animated.View
            style={[
              styles.clockContainer,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: simpleRunning ? '#22c55e' : '#374151',
              },
            ]}
          >
            <Text style={styles.clockText}>{formatTime(simpleLeft)}</Text>
            <Text style={styles.clockSub}>
              {simpleRunning ? 'جارٍ التمرين...' : simpleLeft === 0 ? '🎉 انتهى التمرين!' : 'جاهز'}
            </Text>
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${simpleProgress * 100}%` as any,
                  backgroundColor: simpleProgress > 0.25 ? '#22c55e' : '#ef4444',
                },
              ]}
            />
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetSimple}
            >
              <Text style={styles.resetBtnText}>↺ إعادة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainBtn, simpleRunning ? styles.pauseBtn : styles.startBtn]}
              onPress={simpleRunning ? pauseSimple : startSimple}
              disabled={simpleLeft === 0}
            >
              <Text style={styles.mainBtnText}>
                {simpleRunning ? '⏸ إيقاف' : '▶ ابدأ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ======= INTERVAL TIMER ======= */}
      {activeTab === 'interval' && (
        <View style={styles.section}>
          {/* Preset Buttons */}
          {INTERVAL_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={[styles.intervalPresetCard, intervalPreset.label === preset.label && styles.intervalPresetCardActive]}
              onPress={() => selectIntervalPreset(preset)}
              disabled={intervalRunning}
            >
              <Text style={[styles.intervalPresetLabel, intervalPreset.label === preset.label && styles.intervalPresetLabelActive]}>
                {preset.label}
              </Text>
              <Text style={styles.intervalPresetDetail}>
                عمل {preset.work}ث · راحة {preset.rest}ث · {preset.rounds} جولة
              </Text>
            </TouchableOpacity>
          ))}

          {/* Phase Display */}
          <Animated.View
            style={[
              styles.clockContainer,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: phase === 'work' ? '#22c55e' : '#3b82f6',
              },
            ]}
          >
            <Text
              style={[
                styles.phaseLabel,
                { color: phase === 'work' ? '#22c55e' : '#3b82f6' },
              ]}
            >
              {phase === 'work' ? '💪 عمل' : '😮‍💨 راحة'}
            </Text>
            <Text style={styles.clockText}>{formatTime(phaseLeft)}</Text>
            <Text style={styles.clockSub}>
              الجولة {currentRound} / {intervalPreset.rounds}
            </Text>
          </Animated.View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            {intervalRunning ? (
              <TouchableOpacity
                style={[styles.mainBtn, styles.pauseBtn, { flex: 1 }]}
                onPress={stopInterval}
              >
                <Text style={styles.mainBtnText}>⏹ إيقاف</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.mainBtn, styles.startBtn, { flex: 1 }]}
                onPress={startInterval}
              >
                <Text style={styles.mainBtnText}>▶ ابدأ التدريب</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ScrollView>
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
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  tabBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  tabBtnText: { fontSize: 13, color: '#9ca3af', fontWeight: '700' },
  tabBtnTextActive: { color: '#ffffff' },
  section: {},
  presetsRow: { marginBottom: 20 },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 8,
  },
  presetChipActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  presetChipText: { fontSize: 13, color: '#9ca3af', fontWeight: '700' },
  presetChipTextActive: { color: '#ffffff' },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#111827',
    borderWidth: 4,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  clockText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  clockSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  phaseLabel: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#1f2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: { height: '100%', borderRadius: 4 },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  mainBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtn: { backgroundColor: '#22c55e' },
  pauseBtn: { backgroundColor: '#ef4444' },
  mainBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  resetBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  resetBtnText: { color: '#9ca3af', fontSize: 14, fontWeight: '700' },
  intervalPresetCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  intervalPresetCardActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
  intervalPresetLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 3,
  },
  intervalPresetLabelActive: { color: '#22c55e' },
  intervalPresetDetail: { fontSize: 12, color: '#9ca3af' },
});
