import { it, expect } from 'vitest';
import { mauritaniaWhatsAppPhone } from '../components/common/phone';

it.each(['45112233', '+222 45112233', '22245112233', '0022245112233'])('normalizes WhatsApp phone %s', (phone) => {
  expect(mauritaniaWhatsAppPhone(phone)).toBe('22245112233');
});
it.each(['123', '', '22222245112233'])('rejects malformed phone %s', (phone) => {
  expect(mauritaniaWhatsAppPhone(phone)).toBe('');
});
