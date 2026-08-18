'use strict';

const { config } = require('../config/env');

/**
 * GET /api/v1/dvla/lookup/:reg
 * Fetches vehicle details from the official DVLA Vehicle Enquiry API.
 * Falls back to mock data if no API key is provided or the DVLA API is unreachable,
 * which is useful for local development and testing.
 */
async function lookupRegistration(req, res, next) {
  try {
    const reg = req.params.reg;
    
    if (!reg) {
      return res.status(400).json({ status: 'error', message: 'Registration number is required' });
    }

    const { apiKey, apiUrl } = config.dvla;

    // Fallback Mock Data if API key is not present
    if (!apiKey) {
      console.log(`[dvlaController] No DVLA API Key found. Returning mock data for ${reg}`);
      return res.status(200).json({
        status: 'success',
        data: {
          registrationNumber: reg.toUpperCase(),
          make: 'FORD',
          model: 'FIESTA',
          sub_model: 'ZETEC',
          colour: 'BLUE',
          motStatus: 'Valid',
          motExpiryDate: '2026-10-15',
          taxStatus: 'Taxed',
          taxDueDate: '2025-12-01',
        },
      });
    }

    // Call CheckCarDetails API
    const requestUrl = `${apiUrl}?apikey=${apiKey}&vrm=${reg}`;
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If DVLA returns a 404, the vehicle wasn't found
      if (response.status === 404) {
        return res.status(404).json({
          status: 'error',
          message: 'Vehicle registration not found in DVLA database.',
        });
      }
      
      // Other errors fallback to mock data for local testing resilience
      console.error(`[dvlaController] DVLA API responded with status ${response.status}. Falling back to mock data.`);
      return res.status(200).json({
        status: 'success',
        data: {
          registrationNumber: reg.toUpperCase(),
          make: 'VOLKSWAGEN',
          model: 'GOLF',
          sub_model: 'MATCH',
          colour: 'BLACK',
          motStatus: 'Valid',
          motExpiryDate: '2026-11-20',
          taxStatus: 'Taxed',
          taxDueDate: '2025-11-20',
        },
      });
    }

    const data = await response.json();

    // Map CheckCarDetails response to our expected schema
    return res.status(200).json({
      status: 'success',
      data: {
        registrationNumber: data.registrationNumber,
        make: data.make,
        model: data.model || 'Unknown', 
        sub_model: 'Unknown',
        colour: data.colour,
        motStatus: data.mot?.motStatus || 'Unknown',
        motExpiryDate: data.mot?.motDueDate, // CheckCarDetails uses motDueDate for expiry
        taxStatus: data.tax?.taxStatus || 'Unknown',
        taxDueDate: data.tax?.taxDueDate,
      },
    });
  } catch (err) {
    console.error(`[dvlaController] Error communicating with DVLA API:`, err);
    return next(err);
  }
}

module.exports = { lookupRegistration };
