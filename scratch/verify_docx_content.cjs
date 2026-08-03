/**
 * verify_docx_content.cjs
 * Checks that key phrases from each DOCX template are present
 * in the corresponding content function in offerLetterService.js
 */
const fs = require('fs');
const extracted = JSON.parse(fs.readFileSync('scratch/docx_extracted.json', 'utf8'));
const service   = fs.readFileSync('src/services/offerLetterService.js', 'utf8');

// Key unique phrases from each DOCX that MUST appear in the service
const checks = {
  'Appointment Letter': [
    'subject to the terms and conditions set out below',
    'All intellectual property created during your employment shall vest in Corvus Studio',
    'Please sign and return a copy of this letter as your acceptance',
  ],
  'Confirmation Letter': [
    'your employment with <span class="co">Corvus Studio</span> has been confirmed with effect from',
    'Your performance during the probation period has been evaluated and found satisfactory',
    'All other terms and conditions of your original Appointment Letter remain unchanged',
  ],
  'Experience Letter': [
    'This is to certify that',
    'was employed with',
    'We wish',
    'the very best in all future endeavours',
    'issued at the request of the individual for whatever purpose it may serve',
  ],
  'Relieving Letter': [
    'has been duly relieved from their duties with effect from the close of business',
    'is no longer associated with',
    'issued at the request of the individual for whatever purpose it may serve',
  ],
  'Salary Certificate': [
    'should not be construed as a guarantee of continued employment',
    'Permanent / Confirmed',
  ],
  'Employment Verification Certificate': [
    'The above information is provided in good faith based on our employment records',
    'hello@thecorvusstudio.com',
  ],
  'Increment Letter': [
    'revision in your compensation',
    'The revised salary will be reflected in your payroll from the effective month',
  ],
  'Promotion Letter': [
    'based on your performance, contributions, and demonstrated capabilities',
    'expanded responsibilities as communicated by your reporting lead',
  ],
  'Resignation Acceptance Letter': [
    'we hereby accept your resignation',
    'complete the handover of all assigned responsibilities',
    'processed within thirty (30) days of your last working date',
  ],
  'Full & Final Settlement Letter': [
    'full and final satisfaction of all dues, claims, and entitlements',
    'you confirm that you have no outstanding claims against Corvus Studio',
  ],
  'No Objection Certificate (NOC)': [
    'has no objection to',
    'does not conflict with the employee',
    'issued in good faith and is valid only for the stated purpose',
  ],
  'Appreciation Letter': [
    'I wish to extend my sincere appreciation',
    'reflection of the values we uphold at Corvus Studio',
  ],
  'Warning Letter': [
    'formal written warning',
    'unacceptable and cannot be tolerated',
    'up to and including termination of employment',
  ],
  'Show Cause Notice': [
    'You are hereby called upon to submit a written explanation',
    'Failure to respond within the specified period will be treated as an admission',
    'reserves all rights to conduct further inquiry',
  ],
  'Probation Extension Letter': [
    'extension is required before a confirmation decision is made',
    'A satisfactory review will result in confirmation of your employment',
    'Please sign and return a copy of this letter as your acknowledgement',
  ],
};

let passed = 0;
let failed = 0;

console.log('\nDocument Content Verification (DOCX → offerLetterService.js)\n');
console.log('='.repeat(65));

for (const [doc, phrases] of Object.entries(checks)) {
  const docPassed = phrases.every(phrase => service.includes(phrase));
  const missing   = phrases.filter(p => !service.includes(p));

  if (docPassed) {
    console.log(`✅  ${doc}`);
    passed++;
  } else {
    console.log(`❌  ${doc}`);
    missing.forEach(p => console.log(`      Missing: "${p.substring(0, 70)}..."`));
    failed++;
  }
}

console.log('='.repeat(65));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} documents.\n`);
