export interface CopticDateInfo {
  year: number;
  month: number; // 1-13
  monthNameAr: string;
  monthNameEn: string;
  day: number;
  formattedAr: string;
  formattedEn: string;
}

export const COPTIC_MONTHS_AR = [
  'توت', 'بابه', 'هاتور', 'كيهك', 'طوبه', 'أمشير',
  'برمهات', 'برموده', 'بشنس', 'بؤونه', 'أبيب', 'مسرى', 'النسئ'
];

export const COPTIC_MONTHS_EN = [
  'Thout', 'Paopi', 'Hathor', 'Kiahk', 'Tobi', 'Meshir',
  'Paremhat', 'Paremoude', 'Pashons', 'Paoni', 'Epip', 'Mesori', 'Nasie'
];

/**
 * Converts a Gregorian Date into the Coptic (Alexandrian) liturgical calendar date.
 */
export function getCopticDate(gregorianDate: Date): CopticDateInfo {
  const y = gregorianDate.getFullYear();
  const m = gregorianDate.getMonth() + 1;
  const d = gregorianDate.getDate();

  // Convert Gregorian to Julian Day Number (JDN)
  const a = Math.floor((14 - m) / 12);
  const y1 = y + 4800 - a;
  const m1 = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * m1 + 2) / 5) + 365 * y1 + Math.floor(y1 / 4) - Math.floor(y1 / 100) + Math.floor(y1 / 400) - 32045;

  // Coptic epoch JDN is 1824665 (August 29, 284 AD Julian)
  const copticEpochJdn = 1824665;
  const copticDays = jdn - copticEpochJdn;

  const copticYear = Math.floor(copticDays / 1461) * 4 + Math.floor((copticDays % 1461) / 365) + 1;
  const dayOfYear = (copticDays % 1461) % 365;

  let cMonth = Math.floor(dayOfYear / 30) + 1;
  let cDay = (dayOfYear % 30) + 1;

  if (cMonth > 13) {
    cMonth = 13;
  }
  if (cDay <= 0) {
    cDay = 1;
  }

  const monthNameAr = COPTIC_MONTHS_AR[cMonth - 1] || 'توت';
  const monthNameEn = COPTIC_MONTHS_EN[cMonth - 1] || 'Thout';

  return {
    year: copticYear,
    month: cMonth,
    monthNameAr,
    monthNameEn,
    day: cDay,
    formattedAr: `${cDay} ${monthNameAr} ${copticYear} ش.`,
    formattedEn: `${cDay} ${monthNameEn} ${copticYear} A.M.`
  };
}
