import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

/**
 * مكوّن عرض QR Code حقيقي باستخدام react-native-qrcode-svg
 * قابل للمسح بالكاميرا الحقيقية
 */
export default function QRCodeDisplay({ value, size = 220 }: QRCodeDisplayProps) {
  if (!value) return null;

  return (
    <View style={styles.wrapper}>
      <QRCode
        value={value}
        size={size}
        backgroundColor="#ffffff"
        color="#0b0f17"
        ecl="H"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
});
