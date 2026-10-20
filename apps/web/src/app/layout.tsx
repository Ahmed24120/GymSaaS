import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GymSaaS Nouakchott | منصة إدارة الصالات الرياضية',
  description: 'نظام متكامل وسحابي لإدارة الاشتراكات، المدفوعات، حركات الدخول وأعضاء الصالات الرياضية في نواكشوط وموريتانيا',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="antialiased selection:bg-gym-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
