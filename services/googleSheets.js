const { google } = require('googleapis');

let cache = null;
let cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function buildAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    let credentials;
    try {
      credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString()
      );
    } catch {
      throw new Error(
        'GOOGLE_CREDENTIALS_BASE64 is invalid. Make sure you base64-encoded the entire JSON key file.'
      );
    }
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes,
    });
  }

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes,
    });
  }

  throw new Error(
    'Google credentials not configured. Set GOOGLE_CREDENTIALS_BASE64, ' +
    'GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.'
  );
}

async function getProducts(forceRefresh = false) {
  if (!forceRefresh && cache && Date.now() - cacheAt < CACHE_TTL) return cache;

  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set.');
  }

  const auth = buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = process.env.GOOGLE_SHEET_RANGE || 'Products!A2:G';

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });

  const rows = data.values || [];

  cache = rows
    .map((row, i) => ({
      id: i + 1,
      name: (row[0] || '').trim(),
      code: (row[1] || '').trim(),
      description: (row[2] || '').trim(),
      unit: (row[3] || 'pcs').trim(),
      costPrice: parseFloat(row[4]) || 0,
      sellingPrice: parseFloat(row[5]) || 0,
      category: (row[6] || '').trim(),
    }))
    .filter((p) => p.name);

  cacheAt = Date.now();
  return cache;
}

function clearCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = { getProducts, clearCache };
