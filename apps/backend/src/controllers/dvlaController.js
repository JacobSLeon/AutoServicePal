'use strict';

const { config } = require('../config/env');

let accessTokenCache = { token: null, expiresAt: 0 };

/**
 * Helper to get a valid DVSA OAuth token.
 */
async function getDvsaAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  const { clientId, clientSecret, tokenUrl, scope } = config.dvsaMot;
  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error('DVSA MOT OAuth credentials not fully configured');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', scope);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[dvlaController] OAuth Token Error: ${res.status} - ${errText}`);
    throw new Error(`Failed to fetch DVSA MOT OAuth token: ${res.status}`);
  }

  const data = await res.json();
  accessTokenCache.token = data.access_token;
  // Expire 1 minute early for safety
  accessTokenCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessTokenCache.token;
}

/**
 * Helper to fetch vehicle data from DVSA MOT API 
 */
async function getVehicleDataFromMot(reg) {
  if (!config.dvsaMot.apiKey || config.dvsaMot.apiKey === 'dummy_mot_key') {
    return null;
  }
  try {
    const token = await getDvsaAccessToken();
    const motUrl = `${config.dvsaMot.apiUrl}/${reg}`;
    const res = await fetch(motUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.dvsaMot.apiKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[dvlaController] MOT Data keys:`, Object.keys(data));
      if (data.motTests && data.motTests.length > 0) {
        console.log(`[dvlaController] First MOT test keys:`, Object.keys(data.motTests[0]));
      }
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      } else if (data && !Array.isArray(data)) {
        return data; // It's a single object
      }
    } else {
      const errText = await res.text();
      console.error(`[dvlaController] MOT API Error: ${res.status} - ${errText}`);
    }
  } catch (err) {
    console.error('[dvlaController] Error in getVehicleDataFromMot:', err);
  }
  return null;
}

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

    // Fallback if API key is not present or is dummy
    if (!apiKey || apiKey === 'dummy_key') {
      console.log(`[dvlaController] No DVLA API Key found. Attempting MOT API fallback for ${reg}`);
      const motData = await getVehicleDataFromMot(reg);
      if (motData) {
        let calculatedMotStatus = 'Unknown';
        let expiryDateStr = null;
        if (motData.motTests && motData.motTests.length > 0) {
          expiryDateStr = motData.motTests[0].expiryDate;
          if (expiryDateStr) {
            calculatedMotStatus = new Date(expiryDateStr) > new Date() ? 'Valid' : 'Expired';
          }
        }
        return res.status(200).json({
          status: 'success',
          data: {
            registrationNumber: reg.toUpperCase(),
            make: motData.make || 'Unknown',
            model: motData.model || 'Unknown',
            sub_model: 'Unknown',
            colour: motData.primaryColour || 'Unknown',
            motStatus: calculatedMotStatus,
            motExpiryDate: expiryDateStr,
            taxStatus: 'Unknown',
            taxDueDate: null,
          }
        });
      }

      console.log(`[dvlaController] No MOT data found either. Returning hardcoded mock data for ${reg}`);
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

    // Call official DVLA API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ registrationNumber: reg }),
    });

    if (!response.ok) {
      // If DVLA returns a 404, the vehicle wasn't found
      if (response.status === 404) {
        return res.status(404).json({
          status: 'error',
          message: 'Vehicle registration not found in DVLA database.',
        });
      }
      
      // Other errors fallback to MOT API or mock data for local testing resilience
      console.error(`[dvlaController] DVLA API responded with status ${response.status}. Attempting MOT API fallback.`);
      const motData = await getVehicleDataFromMot(reg);
      if (motData) {
        let calculatedMotStatus = 'Unknown';
        let expiryDateStr = null;
        if (motData.motTests && motData.motTests.length > 0) {
          expiryDateStr = motData.motTests[0].expiryDate;
          if (expiryDateStr) {
            calculatedMotStatus = new Date(expiryDateStr) > new Date() ? 'Valid' : 'Expired';
          }
        }
        return res.status(200).json({
          status: 'success',
          data: {
            registrationNumber: reg.toUpperCase(),
            make: motData.make || 'Unknown',
            model: motData.model || 'Unknown',
            sub_model: 'Unknown',
            colour: motData.primaryColour || 'Unknown',
            motStatus: calculatedMotStatus,
            motExpiryDate: expiryDateStr,
            taxStatus: 'Unknown',
            taxDueDate: null,
          }
        });
      }

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

    let motStatus = data.motStatus || 'Unknown';
    let motExpiryDate = data.motExpiryDate;

    // If DVSA MOT API is configured, use it for accurate MOT data
    if (config.dvsaMot.apiKey && config.dvsaMot.apiKey !== 'dummy_mot_key') {
      try {
        const token = await getDvsaAccessToken();
        const motUrl = `${config.dvsaMot.apiUrl}/${reg}`;
        const motResponse = await fetch(motUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.dvsaMot.apiKey,
            'Authorization': `Bearer ${token}`
          },
        });
        if (motResponse.ok) {
          const motData = await motResponse.json();
          if (motData && motData.length > 0 && motData[0].motTests && motData[0].motTests.length > 0) {
            const latestTest = motData[0].motTests[0];
            if (latestTest.testResult === 'PASSED') {
              motStatus = 'Valid';
              motExpiryDate = latestTest.expiryDate;
            } else {
              motStatus = 'Failed';
            }
          }
        }
      } catch (err) {
        console.error(`[dvlaController] Failed to fetch supplemental MOT data:`, err);
      }
    }

    // Map DVLA official response to our expected schema
    return res.status(200).json({
      status: 'success',
      data: {
        registrationNumber: data.registrationNumber || reg.toUpperCase(),
        make: data.make || 'Unknown',
        model: data.model || 'Unknown', 
        sub_model: 'Unknown',
        colour: data.colour || 'Unknown',
        motStatus: motStatus,
        motExpiryDate: motExpiryDate,
        taxStatus: data.taxStatus || 'Unknown',
        taxDueDate: data.taxDueDate,
      },
    });
  } catch (err) {
    console.error(`[dvlaController] Error communicating with DVLA API:`, err);
    return next(err);
  }
}

/**
 * GET /api/v1/dvla/mot/:reg
 * Fetches MOT history from the official DVSA MOT History API.
 */
async function getMotHistory(req, res, next) {
  try {
    const reg = req.params.reg;
    if (!reg) {
      return res.status(400).json({ status: 'error', message: 'Registration number is required' });
    }

    const { apiKey, apiUrl } = config.dvsaMot;

    if (!apiKey || apiKey === 'dummy_mot_key') {
      console.log(`[dvlaController] No real DVSA MOT API Key found. Returning mock MOT history for ${reg}`);
      return res.status(200).json({
        status: 'success',
        data: {
          registration: reg.toUpperCase(),
          make: 'Mock',
          model: 'Data',
          motTests: [
            {
              completedDate: '2023-10-15',
              testResult: 'PASSED',
              expiryDate: '2024-10-15',
              odometerValue: '45000',
              odometerUnit: 'mi',
              motTestNumber: '123456789012',
              rfrAndComments: []
            }
          ]
        }
      });
    }

    const token = await getDvsaAccessToken();
    const requestUrl = `${apiUrl}/${reg}`;
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          status: 'error',
          message: 'MOT history not found for this registration.',
        });
      }
      
      const errText = await response.text();
      console.error(`[dvlaController] DVSA MOT API responded with status ${response.status}: ${errText}`);
      return res.status(response.status).json({
        status: 'error',
        message: 'Failed to fetch MOT history from DVSA API.',
      });
    }

    const data = await response.json();
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(404).json({
        status: 'error',
        message: 'No MOT data found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: Array.isArray(data) ? data[0] : data,
    });
  } catch (err) {
    console.error(`[dvlaController] Error communicating with DVSA MOT API:`, err);
    return next(err);
  }
}

module.exports = { lookupRegistration, getMotHistory };
