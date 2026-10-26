import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

import { ToastProvider } from '@/components/common/Toast';
import BottomNav from '@/components/ui/BottomNav';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'GymSaaS Nouakchott | منصة إدارة الصالات الرياضية',
  description: 'نظام متكامل وسحابي لإدارة الاشتراكات، المدفوعات، حركات الدخول وأعضاء الصالات الرياضية في نواكشوط وموريتانيا',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0f1d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${cairo.variable}`}>
      <body className="antialiased selection:bg-gym-500 selection:text-white font-sans bg-surface-dark text-white pb-16 md:pb-0 min-h-screen">
        <ToastProvider>
          {children}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
