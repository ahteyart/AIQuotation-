require('dotenv').config();
const path = require('path');
const fs   = require('fs');

// Ensure data directory exists for quote history
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const quotesFile = path.join(dataDir, 'quotes.json');
if (!fs.existsSync(quotesFile)) fs.writeFileSync(quotesFile, '[]');

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in .env');
  process.exit(1);
}

require('./bot/telegramBot');
console.log('Quotation bot is running. Press Ctrl+C to stop.');
