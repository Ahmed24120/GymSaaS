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
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import VisitsHistoryScreen from './src/screens/VisitsHistoryScreen';
import GoalsStreakScreen from './src/screens/GoalsStreakScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

type TabId = 'qr' | 'subscription' | 'visits' | 'goals' | 'announcements' | 'profile';

interface TabConfig {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'qr',            icon: '📲', label: 'الرمز QR'    },
  { id: 'subscription',  icon: '💳', label: 'الاشتراك'    },
  { id: 'visits',        icon: '🕒', label: 'الزيارات'    },
  { id: 'goals',         icon: '🎯', label: 'الـ Streak'  },
  { id: 'announcements', icon: '📢', label: 'الإعلانات'  },
  { id: 'profile',       icon: '👤', label: 'الملف'       },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('qr');

  const renderScreen = () => {
    switch (activeTab) {
      case 'qr':
        return <MemberQRScreen />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'visits':
        return <VisitsHistoryScreen />;
      case 'goals':
        return <GoalsStreakScreen />;
      case 'announcements':
        return <AnnouncementsScreen />;
      case 'profile':
        return <ProfileScreen onLogout={() => setActiveTab('qr')} />;
      default:
        return <MemberQRScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f17" />

      {/* Contenu principal */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Barre de navigation inférieure (Touch targets >= 44px) */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View
                style={[
                  styles.tabIconContainer,
                  isActive && styles.tabIconActive,
                ]}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
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
    paddingTop: 4,
    paddingHorizontal: 2,
    minHeight: 56, // Hauteur conforme pour l'accessibilité
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Touch target >= 44px
    minWidth: 44,
    paddingVertical: 2,
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#22c55e',
    fontWeight: '900',
  },
});
