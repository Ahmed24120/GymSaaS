import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { verifyQRTokenViaAPI } from '../services/qrSecurity';
import { supabase } from '../services/supabase';
import { VerificationResult, Member } from '../types';

const { width, height } = Dimensions.get('window');

interface ReceptionistScannerScreenProps {
  gymId?: string;
}

export default function ReceptionistScannerScreen({ gymId = 'gym-001' }: ReceptionistScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [showManualSearch, setShowManualSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scanned, setScanned] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Member[]>([]);

  // Process a scanned QR code string via real web API
  const handleScanData = async (qrString: string) => {
    if (scanned) return;
    setScanned(true);

    const result = await verifyQRTokenViaAPI(qrString);
    setScanResult(result);
    setShowResultModal(true);

    if (result.valid) {
      setTimeout(() => {
        setShowResultModal(false);
        setScanned(false);
      }, 4000);
    }
  };

  // Barcode scan callback from CameraView
  const onBarcodeScanned = ({ data }: { data: string }) => {
    handleScanData(data);
  };

  // Manual search by phone or name
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const { data } = await supabase
          .from('members')
          .select('id, full_name, phone, status')
          .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(10);
        if (data) {
          setSearchResults(
            data.map((m: any) => ({
              id: m.id,
              gym_id: gymId,
              gym_name: 'GymSaaS Pilot',
              branch_name: 'الفرع الرئيسي',
              full_name: m.full_name,
              phone: m.phone,
              status: m.status,
              plan_name: 'اشتراك شهري',
              end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
            }))
          );
        }
      } catch {
        setSearchResults([]);
      }
    };
    search();
  }, [searchQuery, gymId]);

  const filteredMembers = searchResults;

  const handleManualCheckIn = (member: Member) => {
    setShowManualSearch(false);
    if (member.status === 'active') {
      setScanResult({
        valid: true,
        code: 'SUCCESS',
        message: 'تم تسجيل الدخول يدوياً عبر الاستقبال بنجاح.',
        member: member,
        visit_time: new Date().toLocaleTimeString('ar-MR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      });
    } else {
      setScanResult({
        valid: false,
        code: 'EXPIRED_SUBSCRIPTION',
        message: `اشتراك منتهٍ بتاريخ ${new Date(member.end_date).toLocaleDateString('ar-MR')}`,
        member: member,
      });
    }
    setShowResultModal(true);
  };

  // ====== حالة إذن الكاميرا ======
  if (!permission) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateText}>جارٍ التحقق من إذن الكاميرا...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateEmoji}>📷</Text>
        <Text style={styles.stateTitle}>إذن الكاميرا مطلوب</Text>
        <Text style={styles.stateText}>
          يحتاج الماسح إلى الوصول للكاميرا لمسح رموز QR الخاصة بالأعضاء
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>منح إذن الكاميرا</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>ماسح مكتب الاستقبال</Text>
          <Text style={styles.topSubtitle}>
            {scanned ? '✅ تم المسح — جارٍ التحقق' : 'وجّه الكاميرا نحو رمز QR الخاص بالعضو'}
          </Text>
        </View>

        {/* ======= REAL CAMERA VIEWFINDER ======= */}
        <View style={styles.viewfinderContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
          >
            {/* Overlay: Scanning Frame */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {scanned && <View style={styles.scannedOverlay} />}
              </View>
              <Text style={styles.scanHintText}>
                {scanned ? '✓ تم المسح بنجاح' : 'ضع رمز QR داخل الإطار'}
              </Text>
            </View>
          </CameraView>
        </View>

        {/* Quick Re-scan button after scan */}
        {scanned && !showResultModal && (
          <TouchableOpacity
            style={styles.rescanBtn}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.rescanBtnText}>⟳ مسح رمز جديد</Text>
          </TouchableOpacity>
        )}

        {/* Quick Test Buttons (for simulator/development) */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>اختبار سريع عبر الخادم:</Text>
          <View style={styles.testRow}>
            <TouchableOpacity
              style={[styles.testBtn, { backgroundColor: '#15803d' }]}
              onPress={async () => {
                const { fetchSignedQRToken } = await import('../services/qrApi');
                const res = await fetchSignedQRToken('d0000000-0000-0000-0000-000000000001');
                if (res.success && res.data) {
                  handleScanData(res.data.token);
                }
              }}
            >
              <Text style={styles.testBtnText}>✓ فحص QR حقيقي</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Fallback Button: Manual Search */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.manualSearchBtn}
            onPress={() => setShowManualSearch(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.manualSearchBtnText}>🔍 بحث يدوي بالاسم أو الهاتف</Text>
          </TouchableOpacity>
        </View>

        {/* ====== FULL SCREEN RESULT MODAL ====== */}
        <Modal
          visible={showResultModal}
          animationType="fade"
          transparent={false}
          onRequestClose={() => { setShowResultModal(false); setScanned(false); }}
        >
          <View
            style={[
              styles.fullScreenResult,
              { backgroundColor: scanResult?.valid ? '#052e16' : '#450a0a' },
            ]}
          >
            <SafeAreaView style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <View style={styles.resultCard}>
                {/* Status Icon */}
                <View
                  style={[
                    styles.resultIconCircle,
                    { backgroundColor: scanResult?.valid ? '#22c55e' : '#ef4444' },
                  ]}
                >
                  <Text style={styles.resultIconText}>{scanResult?.valid ? '✓' : '✕'}</Text>
                </View>

                <Text style={styles.resultHeading}>
                  {scanResult?.valid ? 'تم قبول الدخول' : 'الدخول مرفوض'}
                </Text>
                <Text style={styles.resultSubMessage}>{scanResult?.message}</Text>

                {/* Member Profile */}
                {scanResult?.member && (
                  <View style={styles.verifiedMemberBox}>
                    <Image
                      source={{
                        uri:
                          scanResult.member.photo_url ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                      }}
                      style={styles.verifiedPhoto}
                    />
                    <Text style={styles.verifiedName}>{scanResult.member.full_name}</Text>
                    <Text style={styles.verifiedPhone}>{scanResult.member.phone}</Text>
                    <View style={styles.verifiedPlanTag}>
                      <Text style={styles.verifiedPlanText}>{scanResult.member.plan_name}</Text>
                    </View>

                    {scanResult.valid && (
                      <View style={styles.visitTimestampRow}>
                        <Text style={styles.visitTimestampLabel}>وقت تسجيل الزيارة:</Text>
                        <Text style={styles.visitTimestampVal}>{scanResult.visit_time}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={[
                    styles.dismissBtn,
                    { backgroundColor: scanResult?.valid ? '#22c55e' : '#ef4444' },
                  ]}
                  onPress={() => { setShowResultModal(false); setScanned(false); }}
                >
                  <Text style={styles.dismissBtnText}>
                    {scanResult?.valid ? 'متابعة المسح ←' : 'إغلاق وتنبيه العضو'}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>

        {/* ====== MANUAL SEARCH MODAL ====== */}
        <Modal
          visible={showManualSearch}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowManualSearch(false)}
        >
          <View style={styles.manualModalOverlay}>
            <View style={styles.manualModalContent}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>البحث اليدوي</Text>
                <TouchableOpacity onPress={() => setShowManualSearch(false)}>
                  <Text style={styles.manualCloseX}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.manualInput}
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />

              <ScrollView style={{ maxHeight: height * 0.45 }}>
                {filteredMembers.length === 0 ? (
                  <Text style={styles.noResults}>لا توجد نتائج</Text>
                ) : (
                  filteredMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.manualItem}
                      onPress={() => handleManualCheckIn(member)}
                    >
                      <View>
                        <Text style={styles.manualItemName}>{member.full_name}</Text>
                        <Text style={styles.manualItemPhone}>{member.phone}</Text>
                      </View>
                      <View style={styles.manualItemRight}>
                        <Text
                          style={[
                            styles.manualItemStatus,
                            { color: member.status === 'active' ? '#4ade80' : '#f87171' },
                          ]}
                        >
                          {member.status === 'active' ? 'اشتراك نشط ✓' : 'منتهي ✗'}
                        </Text>
                        <Text style={styles.checkInTextBtn}>تسجيل حضور ←</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0f17' },
  container: { flex: 1, justifyContent: 'space-between' },
  centeredState: {
    flex: 1,
    backgroundColor: '#0b0f17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stateEmoji: { fontSize: 56, marginBottom: 16 },
  stateTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  stateText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  permBtn: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  permBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  topBar: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  topTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  topSubtitle: { fontSize: 11, color: '#9ca3af', marginTop: 3, textAlign: 'center' },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: height * 0.42,
  },
  camera: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: width * 0.55,
    height: width * 0.55,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#22c55e',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  scanHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rescanBtn: {
    alignSelf: 'center',
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginVertical: 8,
  },
  rescanBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  testSection: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  testTitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
    textAlign: 'right',
    fontWeight: '700',
  },
  testRow: { flexDirection: 'row', gap: 8 },
  testBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  testBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  bottomBar: { padding: 16 },
  manualSearchBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  manualSearchBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  // Result Modal
  fullScreenResult: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultCard: { width: '100%', maxWidth: 360, alignItems: 'center' },
  resultIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultIconText: { fontSize: 44, color: '#ffffff', fontWeight: '900' },
  resultHeading: { fontSize: 26, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  resultSubMessage: {
    fontSize: 14,
    color: '#e5e7eb',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  verifiedMemberBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  verifiedPhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#ffffff',
    marginBottom: 10,
  },
  verifiedName: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  verifiedPhone: { fontSize: 12, color: '#d1d5db', fontFamily: 'monospace', marginTop: 2 },
  verifiedPlanTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
  },
  verifiedPlanText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  visitTimestampRow: { flexDirection: 'row', marginTop: 10, gap: 6 },
  visitTimestampLabel: { fontSize: 11, color: '#9ca3af' },
  visitTimestampVal: { fontSize: 11, color: '#4ade80', fontFamily: 'monospace', fontWeight: '700' },
  dismissBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  dismissBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  // Manual Search Modal
  manualModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  manualModalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  manualTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  manualCloseX: { fontSize: 20, color: '#9ca3af' },
  manualInput: {
    backgroundColor: '#0b0f17',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12,
  },
  noResults: { color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  manualItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  manualItemName: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  manualItemPhone: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  manualItemRight: { alignItems: 'flex-end' },
  manualItemStatus: { fontSize: 11, fontWeight: '800', marginBottom: 3 },
  checkInTextBtn: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
});
