import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessPath, homeForRole, resolveUserRole } from './access';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const protectedPath = /^\/(dashboard|super-admin|mobile)(?:\/|$)/.test(pathname);
  const redirect = (path: string) => {
    const result = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    return result;
  };
  const loginPath = `/login?next=${encodeURIComponent(pathname)}`;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return protectedPath ? redirect(loginPath) : response;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          previous.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return protectedPath ? redirect(loginPath) : response;
    if (!protectedPath && pathname !== '/login') return response;
    const role = await resolveUserRole(supabase, user.id);
    if (!role) return redirect('/403');
    if (pathname === '/login') return redirect(homeForRole(role));
    return canAccessPath(role, pathname) ? response : redirect('/403');
  } catch {
    return protectedPath ? redirect(loginPath) : response;
  }
}
