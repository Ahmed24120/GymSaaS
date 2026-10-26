import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── المسارات المحمية وصلاحياتها ──────────────────────────────────────────
// مصدر الأدوار: migration سطر 17: CREATE TYPE staff_role AS ENUM ('gym_owner', 'receptionist')
// مصدر Super Admin: migration سطر 62: is_super_admin BOOLEAN في public.profiles
const ROUTE_RULES = [
  {
    // /super-admin — للسوبر أدمن فقط (public.profiles.is_super_admin = true)
    pattern: /^\/super-admin/,
    allowedRoles: ['super_admin'] as const,
  },
  {
    // /dashboard — لمالك الصالة والاستقبال (gym_staff.role = gym_owner | receptionist)
    pattern: /^\/dashboard/,
    allowedRoles: ['gym_owner', 'receptionist'] as const,
  },
  {
    // /mobile — للعضو المرتبط بصالة (أو أي مستخدم مصادَق عليه)
    pattern: /^\/mobile/,
    allowedRoles: ['gym_owner', 'receptionist', 'member'] as const,
  },
];

type UserRole = 'super_admin' | 'gym_owner' | 'receptionist' | 'member';

// ─── قراءة الدور من قاعدة البيانات ──────────────────────────────────────────
// يُقرأ من: public.profiles (is_super_admin) + public.gym_staff (role, is_active)
// لا نُخمّن أسماء الجداول — مصدرها migration السطور 57-79
async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole | null> {
  try {
    // 1. هل is_super_admin في public.profiles؟ (migration سطر 62)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    if (profile?.is_super_admin === true) return 'super_admin';

    // 2. اقرأ role من public.gym_staff حيث is_active = true (migration سطر 73-75)
    const { data: staffRow } = await supabase
      .from('gym_staff')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (staffRow?.role === 'gym_owner')    return 'gym_owner';
    if (staffRow?.role === 'receptionist') return 'receptionist';

    // 3. هل عضو في صالة؟ (public.members.user_id — migration سطر 86)
    const { data: memberRow } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberRow) return 'member';

    return null; // لا دور معروف
  } catch {
    return null;
  }
}

// ─── دالة الـ middleware الرئيسية ────────────────────────────────────────────
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // إذا غابت متغيرات البيئة، دع الطلب يمر (ستظهر رسالة الخطأ في الصفحة)
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // تحديث الجلسة أولاً
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // إيجاد قاعدة المسار المطابقة
  const matchedRule = ROUTE_RULES.find((r) => r.pattern.test(pathname));

  if (!matchedRule) {
    // مسار غير محمي — مرر
    if (pathname === '/login' && user) {
      // المستخدم مسجَّل دخوله ويحاول /login — حوّله للوحة التحكم
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // ─── المسار محمي ────────────────────────────────────────────────────────
  if (!user) {
    // لا جلسة → /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // قراءة الدور من قاعدة البيانات
  const role = await getUserRole(supabase, user.id);

  if (!role) {
    // مستخدم مسجَّل دخوله بلا دور → 403
    return NextResponse.redirect(new URL('/403', request.url));
  }

  // التحقق من الصلاحية
  const allowed = (matchedRule.allowedRoles as readonly string[]).includes(role);
  if (!allowed) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return response;
}
