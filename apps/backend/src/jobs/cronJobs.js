'use strict';

const cron = require('node-cron');
const db = require('../config/database');

async function runDailyReport() {
  console.log('[cron] Running Daily Operational Report...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. New Registrations in the last 24 hours
    const [{ count: newRegsCount }] = await db('users')
      .where('created_at', '>=', yesterday)
      .count('* as count');

    // 2. Multi-account registrations heuristic (same full_name_v5 created in the last 24h)
    const multiAccounts = await db('users')
      .select('full_name_v5')
      .count('* as count')
      .where('created_at', '>=', yesterday)
      .groupBy('full_name_v5')
      .havingRaw('count(*) > 1');

    // 3. Account Deletions
    // Note: Since soft delete / account deletion feature doesn't exist yet, this is mocked to 0.
    const deletedAccounts = 0;

    const report = {
      date: new Date().toISOString(),
      type: 'DAILY',
      newRegistrations24h: parseInt(newRegsCount, 10),
      multiAccountFlags: multiAccounts.map(m => ({ full_name_v5: m.full_name_v5, count: parseInt(m.count, 10) })),
      accountDeletions: deletedAccounts
    };

    console.log('[cron] Daily Report Generated:\n', JSON.stringify(report, null, 2));
    return report;
  } catch (err) {
    console.error('[cron] Error running daily report:', err);
    throw err;
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
    const [{ count: activeUsersCount }] = await db('users')
      .where('last_login_at', '>=', lastWeek)
      .count('* as count');

    // 2. Inactive Users (Users who haven't logged in for 30 days)
    const [{ count: inactiveUsersCount }] = await db('users')
      .where('last_login_at', '<', thirtyDaysAgo)
      .orWhere(function() {
        this.whereNull('last_login_at').andWhere('created_at', '<', thirtyDaysAgo);
      })
      .count('* as count');

    // 3. Activity Summary: New Service Records in last 7 days
    const [{ count: newServicesCount }] = await db('service_records')
      .where('created_at', '>=', lastWeek)
      .count('* as count');

    // 4. Activity Summary: Total Pending V5 Verifications
    const [{ count: newV5sCount }] = await db('v5_verifications')
      .where('status', 'PENDING')
      .count('* as count');

    const report = {
      date: new Date().toISOString(),
      type: 'WEEKLY',
      activeUsers7d: parseInt(activeUsersCount, 10),
      inactiveUsers30d: parseInt(inactiveUsersCount, 10),
      newServiceRecords7d: parseInt(newServicesCount, 10),
      pendingV5Verifications: parseInt(newV5sCount, 10)
    };

    console.log('[cron] Weekly Report Generated:\n', JSON.stringify(report, null, 2));
    return report;
  } catch (err) {
    console.error('[cron] Error running weekly report:', err);
    throw err;
  }
}

function initCronJobs() {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    runDailyReport().catch(() => {});
  });

  // Run weekly on Sunday at midnight
  cron.schedule('0 0 * * 0', () => {
    runWeeklyReport().catch(() => {});
  });

  console.log('[cron] Scheduled daily and weekly operational reports.');
}

module.exports = { initCronJobs, runDailyReport, runWeeklyReport };
