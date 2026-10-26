/**
 * GymSaaS — Advanced Analytics & Churn Prediction
 * خدمة التحليلات المتقدمة والتنبؤ بانقطاع الأعضاء (Churn Risk Detection)
 * مستوحاة من أفضل معايير أنظمة إدارة الصالات الأوروبية والعالمية
 */

export interface ChurnRiskAnalysis {
  memberId: string;
  memberName: string;
  phone: string;
  daysSinceLastVisit: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  whatsappLink: string;
  recommendation: string;
}

export function analyzeMemberChurn(
  memberId: string,
  memberName: string,
  phone: string,
  lastVisitDateStr?: string
): ChurnRiskAnalysis {
  const now = new Date();
  const lastVisit = lastVisitDateStr ? new Date(lastVisitDateStr) : new Date(now.getTime() - 15 * 86400000);
  const diffDays = Math.max(0, Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)));

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let recommendation = 'العضو منتظم في الحضور؛ استمر في تشجيعه.';

  if (diffDays >= 21) {
    riskLevel = 'critical';
    recommendation = 'انقطاع تام لأكثر من 3 أسابيع! يرجى تقديم عرض ترحيبي خاص لتجديد النشاط.';
  } else if (diffDays >= 14) {
    riskLevel = 'high';
    recommendation = 'غائب منذ أسبوعين، تواصل معه عبر واتساب لمعرفة سبب الغياب.';
  } else if (diffDays >= 7) {
    riskLevel = 'medium';
    recommendation = 'لم يحضر منذ أسبوع، أرسل رسالة تذكيرية تحفيزية.';
  }

  // تنظيف رقم الهاتف الموريتاني للواتساب (+222 ...)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('222') ? cleanPhone : `222${cleanPhone}`;
  const whatsappMsg = encodeURIComponent(
    `السلام عليكم كابتن ${memberName}، اشتقنا لك في الصالة! لاحظنا غيابك منذ أيام، نتمنى أن تكون بأفضل حال. ننتظر حضورك للتمرين القادم! 💪`
  );
  const whatsappLink = `https://wa.me/${targetPhone}?text=${whatsappMsg}`;

  return {
    memberId,
    memberName,
    phone,
    daysSinceLastVisit: diffDays,
    riskLevel,
    whatsappLink,
    recommendation,
  };
}

/**
 * الخريطة الحرارية لساعات الذروة (Peak Hours Distribution)
 */
export interface PeakHourSlot {
  hour: string; // '06:00', '16:00', etc.
  count: number;
  level: 'low' | 'moderate' | 'high' | 'peak';
}

export const mockPeakHours: PeakHourSlot[] = [
  { hour: '06:00 - 08:00', count: 18, level: 'moderate' },
  { hour: '08:00 - 11:00', count: 12, level: 'low' },
  { hour: '11:00 - 14:00', count: 8,  level: 'low' },
  { hour: '14:00 - 17:00', count: 24, level: 'moderate' },
  { hour: '17:00 - 20:00', count: 68, level: 'peak' }, // الذروة المسائية في نواكشوط
  { hour: '20:00 - 23:00', count: 45, level: 'high' },
  { hour: '23:00 - 01:00', count: 15, level: 'low' },
];
