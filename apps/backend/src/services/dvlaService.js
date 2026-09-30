'use strict';

const { config } = require('../config/env');
const logger = require('winston');

let accessTokenCache = { token: null, expiresAt: 0 };

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
    throw new Error(`Failed to fetch DVSA MOT OAuth token: ${res.status}`);
  }

  const data = await res.json();
  accessTokenCache.token = data.access_token;
  accessTokenCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessTokenCache.token;
}

async function fetchVehicleEnquiry(registrationNumber) {
  try {
    const { apiKey, apiUrl } = config.dvla;
    if (!apiKey || apiKey === 'dummy_key') {
      logger.warn('[dvlaService] DVLA VES API registrations are currently closed. Returning mock VES data for UI demonstration.');
      return {
        make: 'FORD',
        colour: 'BLUE',
        yearOfManufacture: 2018,
        engineCapacity: 1998,
        co2Emissions: 120,
        motStatus: 'Valid',
        motExpiryDate: '2027-01-01',
        taxStatus: 'Taxed',
        taxDueDate: '2027-01-01'
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ registrationNumber: registrationNumber.replace(/\s+/g, '') }),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`DVLA VES API Error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error fetching DVLA Vehicle Enquiry:', err);
    return null;
  }
}

async function fetchMotHistory(registrationNumber) {
  try {
    const { apiKey, apiUrl } = config.dvsaMot;
    if (!apiKey || apiKey === 'dummy_mot_key') {
      return null;
    }

    const token = await getDvsaAccessToken();
    const url = `${apiUrl}/${registrationNumber.replace(/\s+/g, '')}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`DVLA MOT API Error: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (data && !Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('Error fetching DVLA MOT History:', err);
    return null;
  }
}

async function getFullVehicleProfile(registrationNumber) {
  const [vesData, motData] = await Promise.all([
    fetchVehicleEnquiry(registrationNumber),
    fetchMotHistory(registrationNumber),
  ]);

  const profile = {
    make: vesData?.make || motData?.make || 'Unknown',
    model: vesData?.model || motData?.model || 'Unknown',
    colour: vesData?.colour || motData?.primaryColour || 'Unknown',
    yearOfManufacture: null,
    engineSize: vesData?.engineCapacity || null,
    emissions: vesData?.co2Emissions || null,
    motStatus: vesData?.motStatus || 'Unknown',
    motDueDate: vesData?.motExpiryDate || null,
    taxStatus: vesData?.taxStatus || 'Unknown',
    taxDueDate: vesData?.taxDueDate || null,
    latestMileage: null,
    averageYearlyMileage: null,
    motHistory: null,
  };

  if (motData && motData.motTests && motData.motTests.length > 0) {
    const sortedTests = motData.motTests.sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
    profile.motHistory = sortedTests;
    
    const latestTestWithMileage = sortedTests.find(t => t.odometerValue);
    if (latestTestWithMileage) {
      profile.latestMileage = parseInt(latestTestWithMileage.odometerValue, 10);
    }

    let year = vesData?.yearOfManufacture || motData?.manufactureYear;
    if (!year && motData?.firstUsedDate) {
      year = parseInt(motData.firstUsedDate.substring(0, 4), 10);
    }
    if (!year && vesData?.monthOfFirstRegistration) {
      year = parseInt(vesData.monthOfFirstRegistration.substring(0, 4), 10);
    }
    
    if (year) {
      profile.yearOfManufacture = parseInt(year, 10);
    }

    if (profile.latestMileage && profile.yearOfManufacture) {
      const currentYear = new Date().getFullYear();
      let age = currentYear - profile.yearOfManufacture;
      if (age < 1) age = 1;
      profile.averageYearlyMileage = Math.round(profile.latestMileage / age);
    }
  }

  return profile;
}

module.exports = {
  fetchVehicleEnquiry,
  fetchMotHistory,
  getFullVehicleProfile,
};
