require('dotenv').config({ path: './apps/backend/.env' });
const { runDailyReport, runWeeklyReport } = require('./apps/backend/src/jobs/cronJobs');

async function test() {
  console.log('--- Triggering Daily Report ---');
  await runDailyReport();

  console.log('\n--- Triggering Weekly Report ---');
  await runWeeklyReport();

  process.exit(0);
}

test();
