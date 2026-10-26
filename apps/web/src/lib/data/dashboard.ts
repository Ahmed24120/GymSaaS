import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';
import { MemberRecord } from './members';
import { PaymentRecord } from './payments';
import { VisitRecord } from './visits';

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringIn7Days: number;
  todayRevenueMRU: number;
  monthlyRevenueMRU: number;
  todayVisits: number;
  paymentMethodBreakdown: {
    name: string;
    method: string;
    amount: number;
    percent: number;
    color: string;
  }[];
  peakHours: { hour: number; count: number }[];
  churnRiskMembers: {
    id: string;
    full_name: string;
    phone: string;
    daysInactive: number;
    riskLevel: 'high' | 'medium';
  }[];
  recentVisits: VisitRecord[];
  recentPayments: PaymentRecord[];
}

export async function getDashboardMetrics(): Promise<Result<DashboardMetrics>> {
  try {
    const supabase = createClient();

    // 1. Fetch Members with their subscriptions
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select(`
        *,
        active_subscription:subscriptions(id, start_date, end_date, status, plan:plans(id, name, price_mru))
      `);

    if (memErr) return { ok: false, error: toAppError(memErr) };

    // 2. Fetch Payments
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select(`
        *,
        member:members(id, full_name, phone),
        subscription:subscriptions(id, start_date, end_date, plan:plans(id, name))
      `)
      .order('created_at', { ascending: false });

    if (payErr) return { ok: false, error: toAppError(payErr) };

    // 3. Fetch Visits
    const { data: visits, error: visErr } = await supabase
      .from('visits')
      .select(`
        *,
        member:members(id, full_name, phone, photo_path),
        branch:branches(id, name)
      `)
      .order('entered_at', { ascending: false });

    if (visErr) return { ok: false, error: toAppError(visErr) };

    const memberList = (members || []) as any[];
    const paymentList = (payments || []) as PaymentRecord[];
    const visitList = (visits || []) as VisitRecord[];

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalMembers = memberList.length;
    let activeMembers = 0;
    let expiredMembers = 0;
    let expiringIn7Days = 0;

    memberList.forEach((m) => {
      const sub = Array.isArray(m.active_subscription)
        ? m.active_subscription[0]
        : m.active_subscription;

      if (m.status === 'active') {
        activeMembers++;
        if (sub && sub.end_date) {
          const endDate = new Date(sub.end_date);
          if (endDate >= now && endDate <= in7Days) {
            expiringIn7Days++;
          }
        }
      } else {
        expiredMembers++;
      }
    });

    // Revenue calculations (strictly integer MRU)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayRevenueMRU = 0;
    let monthlyRevenueMRU = 0;
    const methodTotals: Record<string, number> = {
      bankily: 0,
      masrvi: 0,
      sedad: 0,
      cash: 0,
    };

    paymentList.forEach((p) => {
      if (p.status === 'completed') {
        const pDate = new Date(p.created_at);
        const amount = Math.round(Number(p.amount_mru) || 0);

        if (pDate >= startOfMonth) {
          monthlyRevenueMRU += amount;
          if (methodTotals[p.method] !== undefined) {
            methodTotals[p.method] += amount;
          } else {
            methodTotals[p.method] = amount;
          }
        }

        if (pDate >= startOfToday) {
          todayRevenueMRU += amount;
        }
      }
    });

    const paymentMethodBreakdown = [
      {
        name: 'بنكيلي (Bankily)',
        method: 'bankily',
        amount: methodTotals.bankily,
        percent: monthlyRevenueMRU > 0 ? Math.round((methodTotals.bankily / monthlyRevenueMRU) * 100) : 0,
        color: 'bg-emerald-500',
      },
      {
        name: 'مصرفي (Masrvi)',
        method: 'masrvi',
        amount: methodTotals.masrvi,
        percent: monthlyRevenueMRU > 0 ? Math.round((methodTotals.masrvi / monthlyRevenueMRU) * 100) : 0,
        color: 'bg-blue-500',
      },
      {
        name: 'سداد (Sedad)',
        method: 'sedad',
        amount: methodTotals.sedad,
        percent: monthlyRevenueMRU > 0 ? Math.round((methodTotals.sedad / monthlyRevenueMRU) * 100) : 0,
        color: 'bg-amber-500',
      },
      {
        name: 'نقداً (Espèces)',
        method: 'cash',
        amount: methodTotals.cash,
        percent: monthlyRevenueMRU > 0 ? Math.round((methodTotals.cash / monthlyRevenueMRU) * 100) : 0,
        color: 'bg-gray-400',
      },
    ];

    // Visits today
    const todayVisits = visitList.filter((v) => new Date(v.entered_at) >= startOfToday).length;

    // Peak hours (0 to 23)
    const hoursCount: Record<number, number> = {};
    for (let h = 6; h <= 23; h++) hoursCount[h] = 0;
    visitList.forEach((v) => {
      const h = new Date(v.entered_at).getHours();
      if (hoursCount[h] !== undefined) {
        hoursCount[h]++;
      } else {
        hoursCount[h] = 1;
      }
    });

    const peakHours = Object.entries(hoursCount)
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => a.hour - b.hour);

    // Churn risk calculation: Active members with last visit > 7 or 14 days ago
    const lastVisitByMember: Record<string, Date> = {};
    visitList.forEach((v) => {
      const vDate = new Date(v.entered_at);
      if (!lastVisitByMember[v.member_id] || vDate > lastVisitByMember[v.member_id]) {
        lastVisitByMember[v.member_id] = vDate;
      }
    });

    const churnRiskMembers: DashboardMetrics['churnRiskMembers'] = [];
    memberList.forEach((m) => {
      if (m.status === 'active') {
        const lastVisit = lastVisitByMember[m.id];
        const daysInactive = lastVisit
          ? Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24));

        if (daysInactive >= 14) {
          churnRiskMembers.push({
            id: m.id,
            full_name: m.full_name,
            phone: m.phone,
            daysInactive,
            riskLevel: 'high',
          });
        } else if (daysInactive >= 7) {
          churnRiskMembers.push({
            id: m.id,
            full_name: m.full_name,
            phone: m.phone,
            daysInactive,
            riskLevel: 'medium',
          });
        }
      }
    });

    return {
      ok: true,
      value: {
        totalMembers,
        activeMembers,
        expiredMembers,
        expiringIn7Days,
        todayRevenueMRU,
        monthlyRevenueMRU,
        todayVisits,
        paymentMethodBreakdown,
        peakHours,
        churnRiskMembers,
        recentVisits: visitList.slice(0, 5),
        recentPayments: paymentList.slice(0, 5),
      },
    };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
