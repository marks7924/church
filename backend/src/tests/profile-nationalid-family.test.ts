import assert from 'assert';
import { validateAndParseEgyptianNationalId, calculateEgyptianNationalIdAge, maskEgyptianNationalId } from '../utils/nationalId';

async function runTests() {
  console.log('\n🇪🇬 STARTING EGYPTIAN NATIONAL ID & PROFILE DERIVATION TESTS...\n');

  // Test 1: Valid Century 2 (1990-05-15) Male in Cairo
  console.log('Test 1: Valid Century 2 (1990-05-15) Male in Cairo...');
  const res1 = validateAndParseEgyptianNationalId('29005150101235');
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.birthDateString, '1990-05-15');
  assert.strictEqual(res1.gender, 'MALE');
  assert.strictEqual(res1.genderAr, 'ذكر');
  assert(res1.age! >= 35, 'Age must be at least 35');
  assert.strictEqual(res1.maskedId, '2900******1235');
  console.log('✅ Passed Test 1: Valid Century 2 Male');

  // Test 2: Valid Century 3 (2004-02-29) Leap Year Female in Giza
  console.log('Test 2: Valid Century 3 (2004-02-29) Leap Year Female...');
  const res2 = validateAndParseEgyptianNationalId('30402292100224');
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.birthDateString, '2004-02-29');
  assert.strictEqual(res2.gender, 'FEMALE');
  assert.strictEqual(res2.genderAr, 'أنثى');
  assert(res2.age! >= 21, 'Age must be at least 21');
  console.log('✅ Passed Test 2: Leap Year Female');

  // Test 3: Rejects invalid leap year date (2001-02-29)
  console.log('Test 3: Rejects invalid leap year date (2001-02-29)...');
  const res3 = validateAndParseEgyptianNationalId('30102292100224');
  assert.strictEqual(res3.isValid, false);
  assert(res3.errorAr?.includes('غير صحيح لشهر 2/2001'));
  console.log('✅ Passed Test 3: Non-leap year 29 Feb rejected');

  // Test 4: Rejects invalid month (e.g. Month 13)
  console.log('Test 4: Rejects invalid month 13...');
  const res4 = validateAndParseEgyptianNationalId('29513010101235');
  assert.strictEqual(res4.isValid, false);
  assert(res4.errorAr?.includes('13'));
  console.log('✅ Passed Test 4: Invalid month rejected');

  // Test 5: Rejects impossible future birth dates
  console.log('Test 5: Rejects impossible future birth dates...');
  const res5 = validateAndParseEgyptianNationalId('39901010101235');
  assert.strictEqual(res5.isValid, false);
  assert(res5.errorAr?.includes('المستقبل'));
  console.log('✅ Passed Test 5: Future date rejected');

  // Test 6: Rejects incorrect length
  console.log('Test 6: Rejects incorrect length or characters...');
  const res6a = validateAndParseEgyptianNationalId('2900515010123');
  assert.strictEqual(res6a.isValid, false);
  const res6b = validateAndParseEgyptianNationalId('2900515010123A');
  assert.strictEqual(res6b.isValid, false);
  console.log('✅ Passed Test 6: Invalid lengths rejected');

  // Test 7: Dynamic age calculation relative to event date
  console.log('Test 7: Dynamic age calculation relative to event date...');
  const ageAtEvent = calculateEgyptianNationalIdAge('30001010101235', new Date('2026-06-15'));
  assert.strictEqual(ageAtEvent, 26);
  console.log('✅ Passed Test 7: Dynamic age at event date calculated correctly');

  // Test 8: Masking format
  console.log('Test 8: Masking format verification...');
  const masked = maskEgyptianNationalId('29510150101235');
  assert.strictEqual(masked, '2951******1235');
  console.log('✅ Passed Test 8: Safe masking enforced');

  console.log('\n🎉 ALL 8 EGYPTIAN NATIONAL ID UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
