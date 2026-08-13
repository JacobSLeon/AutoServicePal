'use strict';

const { runDailyReport, runWeeklyReport } = require('../jobs/cronJobs');

/**
 * Trigger and fetch the daily operational report
 */
exports.getDailyReport = async (req, res, next) => {
  try {
    const report = await runDailyReport();
    res.status(200).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger and fetch the weekly operational report
 */
exports.getWeeklyReport = async (req, res, next) => {
  try {
    const report = await runWeeklyReport();
    res.status(200).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
};
