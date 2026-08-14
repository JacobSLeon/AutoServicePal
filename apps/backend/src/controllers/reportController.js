'use strict';

const { runDailyReport, runWeeklyReport } = require('../jobs/cronJobs');
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const fastcsv = require('fast-csv');

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

/**
 * GET /api/v1/services/export/:vehicleId?format=pdf|csv
 * Export service logs
 */
exports.exportServiceHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const format = req.query.format || 'pdf';

    const vehicle = await db('vehicles').where({ id: vehicleId, owner_id: req.user.id }).first();
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found or unauthorized' });
    }

    const records = await db('service_records')
      .where({ vehicle_id: vehicleId })
      .orderBy('service_date', 'desc');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=service_history_${vehicle.registration_number}.csv`);
      
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(res);
      records.forEach(r => {
        csvStream.write({
          Date: r.service_date.toISOString().split('T')[0],
          Type: r.service_type,
          Name: r.record_name,
          Cost: r.cost || 0,
          Provider: r.provider_details || 'N/A',
          Status: r.verification_status
        });
      });
      csvStream.end();
      return;
    }

    // Default to PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=service_history_${vehicle.registration_number}.pdf`);
    
    const doc = new PDFDocument();
    doc.pipe(res);
    
    doc.fontSize(20).text(`Service History: ${vehicle.registration_number}`, { align: 'center' });
    doc.moveDown();
    
    records.forEach(r => {
      doc.fontSize(14).text(`${r.service_date.toISOString().split('T')[0]} - ${r.record_name}`);
      doc.fontSize(12).text(`Type: ${r.service_type} | Cost: ${r.cost || 0} | Provider: ${r.provider_details || 'N/A'}`);
      doc.fontSize(12).text(`Status: ${r.verification_status}`);
      doc.moveDown();
    });
    
    doc.end();
  } catch (err) {
    next(err);
  }
};
