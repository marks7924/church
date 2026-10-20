/**
 * Robust, Unicode-aware Arabic Tashkeel (diacritics) stripper and Bible reference utilities.
 */

export function removeArabicTashkeel(text: string): string {
  if (!text) return '';
  // Unicode ranges:
  // \u0610-\u061A (Arabic sign/marks)
  // \u064B-\u065F (Arabic vowels & shadda: fathtan, dammatan, kasratan, fatha, damma, kasra, shadda, sukun, etc.)
  // \u0670 (Superscript Alef / Dagger Alef)
  // \u06D6-\u06ED (Quranic small signs and annotations)
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Format a list of selected verse numbers into a canonical reference string.
 * Consecutive verses become a range (e.g., [16, 17, 18] -> "16–18").
 * Non-consecutive verses remain comma-separated (e.g., [16, 18] -> "16, 18").
 */
export function formatVerseRange(verses: number[]): string {
  if (!verses || verses.length === 0) return '';
  const sorted = Array.from(new Set(verses)).sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);

  // Check if all consecutive
  const isConsecutive = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  if (isConsecutive) {
    return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  // Group into consecutive sub-ranges if mixed
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      if (rangeStart === prev) {
        ranges.push(String(rangeStart));
      } else {
        ranges.push(`${rangeStart}–${prev}`);
      }
      rangeStart = curr;
      prev = curr;
    }
  }

  if (rangeStart === prev) {
    ranges.push(String(rangeStart));
  } else {
    ranges.push(`${rangeStart}–${prev}`);
  }

  return ranges.join(', ');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API failed, trying fallback...', err);
  }

  // Fallback for older browsers or non-HTTPS contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}
