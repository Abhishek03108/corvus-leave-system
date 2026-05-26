const js = await fetch('https://leave.thecorvusstudio.com/assets/index-lYC0HiBz.js').then(r => r.text());

// Find audit log rendering entries
const actionIdx = js.indexOf('action');
let lastIdx = 0;
while (true) {
  const matchIdx = js.indexOf('action', lastIdx);
  if (matchIdx === -1) break;
  // Look for something like .action or N.action or similar
  const slice = js.substring(Math.max(0, matchIdx - 100), matchIdx + 150);
  if (slice.includes('Audit') || slice.includes('audit') || slice.includes('log') || slice.includes('performed')) {
    console.log('=== action Context ===');
    console.log(slice);
  }
  lastIdx = matchIdx + 6;
  if (lastIdx > matchIdx + 2000) break; // Limit search
}
