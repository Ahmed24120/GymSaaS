// Result<T, E> — نمط موحّد لمعالجة الأخطاء بدون استثناءات غير متوقعة
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AppError = {
  code: string;
  message: string; // رسالة عربية للمستخدم
};

// أكواد الخطأ المعيارية
export const AUTH_ERRORS: Record<string, string> = {
  'invalid_credentials':    'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'email_not_confirmed':    'يجب تأكيد البريد الإلكتروني أولاً.',
  'user_not_found':         'لم يُعثر على الحساب.',
  'too_many_requests':      'كثرة المحاولات. انتظر قليلاً ثم أعد المحاولة.',
  'network_error':          'فشل الاتصال بالخادم. تحقق من الإنترنت.',
  'no_gym_staff_record':    'الحساب غير مرتبط بأي صالة. تواصل مع المشرف.',
  'unknown':                'حدث خطأ غير متوقع. حاول مجدداً.',
};

export function toAppError(err: unknown): AppError {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: string }).message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
      return { code: 'invalid_credentials', message: AUTH_ERRORS['invalid_credentials'] };
    }
    if (msg.includes('email not confirmed')) {
      return { code: 'email_not_confirmed', message: AUTH_ERRORS['email_not_confirmed'] };
    }
    if (msg.includes('too many requests')) {
      return { code: 'too_many_requests', message: AUTH_ERRORS['too_many_requests'] };
    }
  }
  if (err instanceof TypeError) {
    return { code: 'network_error', message: AUTH_ERRORS['network_error'] };
  }
  return { code: 'unknown', message: AUTH_ERRORS['unknown'] };
}
