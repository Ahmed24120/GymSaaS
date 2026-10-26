import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY غير موجودة.\n' +
      'انسخ apps/web/.env.example إلى apps/web/.env.local وضع القيم الحقيقية.'
    );
  }

  return createBrowserClient(url, key);
}
