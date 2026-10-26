/**
 * GymSaaS — Centralized Error Handling & Reverse Engineering Architecture
 * نظام إدارة الأخطاء المركزي المتقدم (Gestion des erreurs)
 * يضمن عدم انهيار التطبيق ويوفر رسائل باللغة العربية الفصحى المبسطة مع توجيه إجرائي
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  severity: ErrorSeverity;
  timestamp: string;
  actionRequired?: string;
}

export type Result<T, E = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export function createError(
  code: string,
  message: string,
  details?: string,
  severity: ErrorSeverity = 'error',
  actionRequired?: string
): AppError {
  return {
    code,
    message,
    details,
    severity,
    timestamp: new Date().toISOString(),
    actionRequired,
  };
}

/**
 * دالة لتنفيذ العمليات غير المتزامنة بأمان دون حدوث استثناءات غير متوقعة
 */
export async function safeExecute<T>(
  action: () => Promise<T>,
  fallbackMessage: string = 'حدث خطأ غير متوقع أثناء معالجة الطلب'
): Promise<Result<T, AppError>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (err: any) {
    console.error('[GymSaaS SafeExecute Error]:', err);

    const errorMessage =
      err?.message || (typeof err === 'string' ? err : fallbackMessage);

    // فك شفرات أخطاء قاعدة البيانات الشائعة (Postgres & RLS)
    let userFriendlyMessage = errorMessage;
    let code = 'EXECUTION_FAILED';
    let actionRequired = 'يرجى مراجعة المدخلات أو المحاولة مرة أخرى.';

    if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
      code = 'AUTH_PERMISSION_DENIED';
      userFriendlyMessage = 'ليس لديك الصلاحية الكافية للوصول إلى هذه البيانات وفق سياسة الأمان.';
      actionRequired = 'يرجى التواصل مع مالك الصالة أو المسؤول لتعديل صلاحيات حسابك.';
    } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique')) {
      code = 'DUPLICATE_RECORD';
      userFriendlyMessage = 'هذا السجل موجود بالفعل في النظام (الاسم، أو رقم الهاتف، أو المعرف).';
      actionRequired = 'تأكد من عدم تكرار رقم الهاتف أو المعرف المستخدم.';
    } else if (errorMessage.includes('violates foreign key')) {
      code = 'INVALID_RELATION';
      userFriendlyMessage = 'البيانات المرتبطة غير متوفرة (مثل رقم الصالة أو باقة الاشتراك).';
      actionRequired = 'تأكد من اختيار باقة وفرع صالحين.';
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
      code = 'NETWORK_ERROR';
      userFriendlyMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
      actionRequired = 'تأكد من اتصالك بالشبكة ثم أعد المحاولة.';
    }

    return {
      success: false,
      error: createError(code, userFriendlyMessage, errorMessage, 'error', actionRequired),
    };
  }
}
