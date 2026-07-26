'use strict';

const cron = require('node-cron');
const db = require('../config/database');

async function runDailyReport() {
  console.log('[cron] Running Daily Operational Report...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. New Registrations in the last 24 hours
    const { rows: newRegs } = await db.raw(
      `SELECT count(*) as count FROM users WHERE created_at >= ?`,
      [yesterday]
    );

    // 2. Multi-account registrations heuristic (same full_name_v5 created in the last 24h)
    const { rows: multiAccounts } = await db.raw(
      `SELECT full_name_v5, count(*) as count 
       FROM users 
       WHERE created_at >= ? 
       GROUP BY full_name_v5 
       HAVING count(*) > 1`,
      [yesterday]
    );

    // 3. Account Deletions
    // Note: Since soft delete / account deletion feature doesn't exist yet, this is mocked to 0.
    const deletedAccounts = 0;

    const report = {
      date: new Date().toISOString(),
      type: 'DAILY',
      newRegistrations24h: parseInt(newRegs[0].count, 10),
      multiAccountFlags: multiAccounts,
      accountDeletions: deletedAccounts
    };

    console.log('[cron] Daily Report Generated:\n', JSON.stringify(report, null, 2));
    return report;
  } catch (err) {
    console.error('[cron] Error running daily report:', err);
  }
}

async function runWeeklyReport() {
  console.log('[cron] Running Weekly Operational Report...');
  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Login Logs (Active users in last 7 days)
    const { rows: activeUsers } = await db.raw(
      `SELECT count(*) as count FROM users WHERE last_login_at >= ?`,
      [lastWeek]
    );

    // 2. Inactive Users (Users who haven't logged in for 30 days)
    const { rows: inactiveUsers } = await db.raw(
      `SELECT count(*) as count FROM users WHERE last_login_at < ? OR (last_login_at IS NULL AND created_at < ?)`,
      [thirtyDaysAgo, thirtyDaysAgo]
    );

    // 3. Activity Summary: New Service Records in last 7 days
    const { rows: newServices } = await db.raw(
      `SELECT count(*) as count FROM service_records WHERE created_at >= ?`,
      [lastWeek]
    );

    // 4. Activity Summary: Total Pending V5 Verifications
    const { rows: newV5s } = await db.raw(
      `SELECT count(*) as count FROM v5_verifications WHERE status = 'PENDING'`
    );

    const report = {
      date: new Date().toISOString(),
      type: 'WEEKLY',
      activeUsers7d: parseInt(activeUsers[0].count, 10),
      inactiveUsers30d: parseInt(inactiveUsers[0].count, 10),
      newServiceRecords7d: parseInt(newServices[0].count, 10),
      pendingV5Verifications: parseInt(newV5s[0].count, 10)
    };

    console.log('[cron] Weekly Report Generated:\n', JSON.stringify(report, null, 2));
    return report;
  } catch (err) {
    console.error('[cron] Error running weekly report:', err);
  }
}

function initCronJobs() {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    runDailyReport();
  });

  // Run weekly on Sunday at midnight
  cron.schedule('0 0 * * 0', () => {
    runWeeklyReport();
  });

  console.log('[cron] Scheduled daily and weekly operational reports.');
}

module.exports = { initCronJobs, runDailyReport, runWeeklyReport };
