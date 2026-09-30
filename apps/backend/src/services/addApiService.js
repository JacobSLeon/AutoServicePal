'use strict';

const logger = require('winston');
const { config } = require('../config/env');

/**
 * Access to Driver Data (ADD) Service
 * Simulates fetching driver data from the ADD API.
 * In a real-world scenario, this would authenticate and make an HTTP request to the UK ADD API.
 */
async function fetchDriverData(licenceNumber) {
  try {
    // Standardise input (licence numbers are 16 chars)
    const formattedLicence = licenceNumber.trim().toUpperCase().replace(/\s+/g, '');
    
    if (formattedLicence.length !== 16) {
      throw new Error('Driving licence number must be exactly 16 characters.');
    }

    // In a real integration, we would fetch from the ADD API here.
    // For MVP phase, we will simulate realistic responses based on the driving licence prefix.
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulation logic for demonstration
    if (formattedLicence.startsWith('SMITH')) {
      return {
        licence_number: formattedLicence,
        status: 'Valid',
        valid_to: '2030-05-15',
        penalty_points: 3,
        cpc_data: [
          { module: 'Module 1', expiry: '2028-01-01', status: 'Active' }
        ],
        tachograph_data: [
          { card_number: 'TACHO12345678', expiry: '2029-01-01', status: 'Valid' }
        ]
      };
    } else if (formattedLicence.startsWith('JONES')) {
      return {
        licence_number: formattedLicence,
        status: 'Disqualified',
        valid_to: '2020-01-01',
        penalty_points: 12,
        cpc_data: [],
        tachograph_data: []
      };
    } else {
      // Default standard valid licence
      return {
        licence_number: formattedLicence,
        status: 'Valid',
        valid_to: '2032-10-10',
        penalty_points: 0,
        cpc_data: [],
        tachograph_data: []
      };
    }
  } catch (err) {
    console.error('[addApiService] Error fetching driver data:', err);
    throw err;
  }
}

module.exports = {
  fetchDriverData
};
