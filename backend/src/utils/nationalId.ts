/**
 * Egyptian National ID Parser and Validator Utility
 * 
 * Rules:
 * 1. 14 numeric digits.
 * 2. Digit 1 = Birth Century: 2 = 1900-1999; 3 = 2000-2099.
 * 3. Digits 2-7 = YYMMDD.
 * 4. Calendar date validation (handles leap years, exact days per month, rejects future dates).
 * 5. Digit 13 = Gender: Odd = Male; Even = Female.
 * 6. Dynamic age calculation using Egypt local time (Africa/Cairo context).
 * 7. Masking for security in UI, logs, and public views.
 */

export interface EgyptianNationalIdResult {
  isValid: boolean;
  error?: string;
  errorAr?: string;
  normalizedId?: string;
  maskedId?: string;
  dateOfBirth?: Date;
  birthDateString?: string; // YYYY-MM-DD
  age?: number;
  gender?: 'MALE' | 'FEMALE';
  genderAr?: string;
  genderEn?: string;
  governorateCode?: string;
  governorateNameAr?: string;
}

const EGYPTIAN_GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية'
};

/**
 * Normalizes any Arabic-Indic digits (٠-٩) and strips formatting/whitespace
 */
export function normalizeEgyptianNationalId(raw: string | null | undefined): string {
  if (!raw) return '';
  const arabicIndicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return String(raw)
    .trim()
    .replace(/[٠-٩]/g, d => arabicIndicDigits[d] || d)
    .replace(/[^0-9]/g, '');
}

/**
 * Masks national ID for safe display (e.g., 2951******1234 or 2951015******4)
 */
export function maskEgyptianNationalId(raw: string | null | undefined): string {
  const normalized = normalizeEgyptianNationalId(raw);
  if (normalized.length !== 14) return '**************';
  return `${normalized.slice(0, 4)}******${normalized.slice(10)}`;
}

/**
 * Computes the number of days in a given month and year (accurate for leap years)
 */
function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Gets current date in Cairo timezone (UTC+2 or UTC+3 depending on DST)
 */
function getCairoNow(): { year: number; month: number; day: number; date: Date } {
  const now = new Date();
  const cairoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = cairoFormatter.formatToParts(now);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }
  return {
    year: partMap.year || now.getFullYear(),
    month: partMap.month || (now.getMonth() + 1),
    day: partMap.day || now.getDate(),
    date: now
  };
}

/**
 * Validates and extracts derived attributes from an Egyptian National ID
 */
export function validateAndParseEgyptianNationalId(raw: string | null | undefined): EgyptianNationalIdResult {
  const id = normalizeEgyptianNationalId(raw);

  if (!id) {
    return {
      isValid: false,
      error: 'National ID is required.',
      errorAr: 'الرقم القومي مطلوب.'
    };
  }

  if (id.length !== 14) {
    return {
      isValid: false,
      error: `Invalid National ID length (${id.length} digits). Must be exactly 14 digits.`,
      errorAr: `طول الرقم القومي غير صحيح (${id.length} رقم)، يجب أن يتكون من 14 رقماً بالضبط.`
    };
  }

  const centuryChar = id[0];
  if (centuryChar !== '2' && centuryChar !== '3') {
    return {
      isValid: false,
      error: 'Invalid century digit in National ID. Must start with 2 (1900-1999) or 3 (2000-2099).',
      errorAr: 'الرقم القومي غير صالح: الرقم الأول يجب أن يكون 2 (لمواليد 1900-1999) أو 3 (لمواليد 2000 فما فوق).'
    };
  }

  const century = centuryChar === '2' ? 1900 : 2000;
  const yearOffset = parseInt(id.substring(1, 3), 10);
  const birthYear = century + yearOffset;
  const birthMonth = parseInt(id.substring(3, 5), 10);
  const birthDay = parseInt(id.substring(5, 7), 10);

  if (birthMonth < 1 || birthMonth > 12) {
    return {
      isValid: false,
      error: `Invalid birth month (${birthMonth}) encoded in National ID.`,
      errorAr: `شهر الميلاد المشفر بالرقم القومي (${birthMonth}) غير صالح.`
    };
  }

  const maxDays = getDaysInMonth(birthYear, birthMonth);
  if (birthDay < 1 || birthDay > maxDays) {
    return {
      isValid: false,
      error: `Invalid birth day (${birthDay}) for year ${birthYear} and month ${birthMonth}. Max allowed is ${maxDays}.`,
      errorAr: `يوم الميلاد المشفر بالرقم القومي (${birthDay}) غير صحيح لشهر ${birthMonth}/${birthYear}.`
    };
  }

  // Create authoritative Date object for Date of Birth (UTC midnight)
  const dateOfBirth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  const cairoNow = getCairoNow();

  // Ensure birth date is not in the future
  if (
    birthYear > cairoNow.year ||
    (birthYear === cairoNow.year && birthMonth > cairoNow.month) ||
    (birthYear === cairoNow.year && birthMonth === cairoNow.month && birthDay > cairoNow.day)
  ) {
    return {
      isValid: false,
      error: 'Invalid National ID: Encoded birth date is in the future.',
      errorAr: 'الرقم القومي غير صالح: تاريخ الميلاد يقع في المستقبل.'
    };
  }

  // Dynamic Age calculation
  let age = cairoNow.year - birthYear;
  if (
    cairoNow.month < birthMonth ||
    (cairoNow.month === birthMonth && cairoNow.day < birthDay)
  ) {
    age--;
  }

  if (age < 0 || age > 125) {
    return {
      isValid: false,
      error: `Calculated age (${age}) is outside realistic bounds.`,
      errorAr: `العمر المحسوب من الرقم القومي (${age}) غير صالح.`
    };
  }

  // Gender derivation: Digit 13 (index 12)
  const genderDigit = parseInt(id[12], 10);
  const isMale = genderDigit % 2 !== 0;
  const gender: 'MALE' | 'FEMALE' = isMale ? 'MALE' : 'FEMALE';
  const genderAr = isMale ? 'ذكر' : 'أنثى';
  const genderEn = isMale ? 'Male' : 'Female';

  // Governorate derivation: Digits 8-9 (indices 7-9)
  const govCode = id.substring(7, 9);
  const governorateNameAr = EGYPTIAN_GOVERNORATES[govCode] || 'غير محدد';

  const mmStr = String(birthMonth).padStart(2, '0');
  const ddStr = String(birthDay).padStart(2, '0');
  const birthDateString = `${birthYear}-${mmStr}-${ddStr}`;

  return {
    isValid: true,
    normalizedId: id,
    maskedId: maskEgyptianNationalId(id),
    dateOfBirth,
    birthDateString,
    age,
    gender,
    genderAr,
    genderEn,
    governorateCode: govCode,
    governorateNameAr
  };
}

/**
 * Calculates dynamically derived age at an optional reference date (e.g. event date or now)
 */
export function calculateEgyptianNationalIdAge(raw: string | null | undefined, referenceDate?: Date): number | null {
  const result = validateAndParseEgyptianNationalId(raw);
  if (!result.isValid || !result.dateOfBirth) return null;

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const cairoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = cairoFormatter.formatToParts(ref);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  const refYear = partMap.year || ref.getFullYear();
  const refMonth = partMap.month || (ref.getMonth() + 1);
  const refDay = partMap.day || ref.getDate();

  const birthYear = result.dateOfBirth.getUTCFullYear();
  const birthMonth = result.dateOfBirth.getUTCMonth() + 1;
  const birthDay = result.dateOfBirth.getUTCDate();

  let age = refYear - birthYear;
  if (
    refMonth < birthMonth ||
    (refMonth === birthMonth && refDay < birthDay)
  ) {
    age--;
  }

  return age;
}
