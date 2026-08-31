export function normalizePhone(input: unknown): string {
  let s = String(input ?? '').trim();
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  s = s.replace(/[۰-۹]/g, c => String(fa.indexOf(c)))
       .replace(/[٠-٩]/g, c => String(ar.indexOf(c)))
       .replace(/[^\d+]/g, '');
  if (s.startsWith('0098')) s = '+98' + s.slice(4);
  else if (s.startsWith('98') && !s.startsWith('+98')) s = '+' + s;
  else if (s.startsWith('09')) s = '+98' + s.slice(1);
  return s;
}
