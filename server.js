require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory and quotes file exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const quotesFile = path.join(dataDir, 'quotes.json');
if (!fs.existsSync(quotesFile)) fs.writeFileSync(quotesFile, '[]');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));

// Serve the SPA for every non-API route
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Start Telegram bot if token is present
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    require('./bot/telegramBot');
    console.log('Telegram bot started (polling mode)');
  } catch (err) {
    console.error('Telegram bot failed to start:', err.message);
  }
} else {
  console.log('Telegram bot skipped – set TELEGRAM_BOT_TOKEN to enable');
}
