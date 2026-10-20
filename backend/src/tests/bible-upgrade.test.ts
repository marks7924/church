import fs from 'fs';
import path from 'path';
import { 
  removeArabicTashkeel, 
  parseBibleReference, 
  searchBible, 
  getBibleStudyContext, 
  CANONICAL_BOOKS 
} from '../services/bible.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('\n========================================');
  console.log('RUNNING BIBLE UPGRADE SUITE TESTS');
  console.log('========================================\n');

  // Test 1: Arabic Tashkeel Removal
  console.log('--- 1. Arabic Diacritics (Tashkeel) Stripping ---');
  const vocalizedAr = 'فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ.';
  const strippedAr = removeArabicTashkeel(vocalizedAr);
  assert(!strippedAr.includes('\u064E'), 'Fatha removed');
  assert(!strippedAr.includes('\u0650'), 'Kasra removed');
  assert(!strippedAr.includes('\u064F'), 'Damma removed');
  assert(!strippedAr.includes('\u0652'), 'Sukun removed');
  assert(!strippedAr.includes('\u0651'), 'Shadda removed');
  assert(strippedAr.includes('في البدء كان الكلمة'), 'Base Arabic letters preserved');
  assert(strippedAr.endsWith('.'), 'Punctuation preserved');

  // Test 1.2: Mixed text with English and Numbers
  const mixed = 'يوحنا 3: 16 (John 3:16) — «لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ»';
  const strippedMixed = removeArabicTashkeel(mixed);
  assert(strippedMixed.includes('John 3:16'), 'English text preserved intact in mixed string');
  assert(strippedMixed.includes('لأنه هكذا أحب الله العالم'), 'Arabic tashkeel cleanly removed without altering base words');

  // Test 2: Bible Reference Parsing
  console.log('\n--- 2. Bible Reference Parser ---');
  const ref1 = parseBibleReference('John 3:16');
  assert(ref1 !== null && ref1.bookMeta.id === 'JHN' && ref1.chapter === 3 && ref1.verseStart === 16, 'Parsed John 3:16 correctly');

  const ref2 = parseBibleReference('يوحنا 3: 16-18');
  assert(ref2 !== null && ref2.bookMeta.id === 'JHN' && ref2.chapter === 3 && ref2.verseStart === 16 && ref2.verseEnd === 18, 'Parsed Arabic "يوحنا 3: 16-18" range correctly');

  const ref3 = parseBibleReference('مزمور 23:1');
  assert(ref3 !== null && ref3.bookMeta.id === 'PSA' && ref3.chapter === 23 && ref3.verseStart === 1, 'Parsed Arabic "مزمور 23:1" correctly');

  // Test 3: Bible Canonical Sections
  console.log('\n--- 3. Canonical Books & Sections ---');
  assert(CANONICAL_BOOKS.length === 66, 'All 66 canonical books defined');
  const gen = CANONICAL_BOOKS.find(b => b.id === 'GEN');
  assert(gen?.sectionAr === 'أسفار الشريعة (التوراة)', 'Genesis assigned to Pentateuch / Law');
  const mat = CANONICAL_BOOKS.find(b => b.id === 'MAT');
  assert(mat?.sectionAr === 'الأناجيل الأربعة', 'Matthew assigned to Gospels');
  const rom = CANONICAL_BOOKS.find(b => b.id === 'ROM');
  assert(rom?.sectionAr === 'رسائل بولس الرسول', 'Romans assigned to Pauline Epistles');

  // Test 4: Bible Search (Direct Navigation & Keyword Search)
  console.log('\n--- 4. Fast Bible Search Engine ---');
  const directSearchResult = await searchBible('John 3:16', 'van-dyck');
  assert(directSearchResult.isDirectReference === true, 'Direct reference flag is true for John 3:16');
  assert(directSearchResult.results.length >= 1, 'Direct passage returned');
  assert(directSearchResult.results[0].verseNumber === 16, 'Target verse number is 16');

  const keywordSearchResult = await searchBible('محبة', 'van-dyck', 10);
  assert(keywordSearchResult.results.length > 0, 'Arabic diacritic-insensitive keyword search found matches for "محبة"');

  // Test 5: Contextual Study Mode
  console.log('\n--- 5. 5-Section Contextual Study Mode ---');
  const study = await getBibleStudyContext('jhn', 3, 16);
  assert(study !== null, 'Study context found');
  assert(Boolean(study?.literaryContext?.sectionAr), 'Literary section context present');
  assert(Array.isArray(study?.relatedScriptures) && study.relatedScriptures.length > 0, 'Cross references present');
  assert(Array.isArray(study?.reflectionQuestions) && study.reflectionQuestions.length > 0, 'Reflection questions present');

  // Test 6: Verify 2 Real Background Assets on Disk
  console.log('\n--- 6. Two Real Background Assets Verification ---');
  const darkCandidate = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'bible', 'bible-bg-dark.png');
  const lightCandidate = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'bible', 'bible-bg-light.png');

  assert(fs.existsSync(darkCandidate), 'Dark background asset exists in frontend public images');
  assert(fs.existsSync(lightCandidate), 'Light background asset exists in frontend public images');

  console.log('\n========================================');
  console.log('ALL BIBLE UPGRADE TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
