import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MemberQRScreen from './src/screens/MemberQRScreen';
import ReceptionistScannerScreen from './src/screens/ReceptionistScannerScreen';
import MemberOnboardingScreen from './src/screens/MemberOnboardingScreen';
import FitnessCalculatorScreen from './src/screens/FitnessCalculatorScreen';
import WorkoutTimerScreen from './src/screens/WorkoutTimerScreen';

type TabId = 'qr' | 'onboarding' | 'fitness' | 'timer' | 'scanner';

interface TabConfig {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'qr',         icon: '📲', label: 'رمز QR'   },
  { id: 'onboarding', icon: '🆕', label: 'اشترك'    },
  { id: 'fitness',    icon: '📊', label: 'لياقة'    },
  { id: 'timer',      icon: '⏱',  label: 'مؤقت'    },
  { id: 'scanner',    icon: '📷', label: 'الاستقبال' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('qr');

  const renderScreen = () => {
    switch (activeTab) {
      case 'qr':
        return <MemberQRScreen memberId="mem-001" />;
      case 'onboarding':
        return <MemberOnboardingScreen />;
      case 'fitness':
        return <FitnessCalculatorScreen />;
      case 'timer':
        return <WorkoutTimerScreen />;
      case 'scanner':
        return <ReceptionistScannerScreen gymId="gym-001" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f17" />

      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // تمييز تبويب الاستقبال بلون مختلف (دور آخر)
          const isScanner = tab.id === 'scanner';
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.tabIconContainer,
                  isActive && (isScanner ? styles.tabIconActiveScanner : styles.tabIconActive),
                ]}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && (isScanner ? styles.tabLabelActiveScanner : styles.tabLabelActive),
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  content: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingBottom: 6,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  tabIconActiveScanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#22c55e',
    fontWeight: '900',
  },
  tabLabelActiveScanner: {
    color: '#ef4444',
    fontWeight: '900',
  },
});
