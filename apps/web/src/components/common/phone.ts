export function mauritaniaWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^00222/, '').replace(/^222(?=\d{8}$)/, '');
  return /^[234]\d{7}$/.test(digits) ? `222${digits}` : '';
}
