require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const { cjkFontsAvailable, getFontPaths } = require('../services/fontService');

const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
const out = fs.createWriteStream(path.join(__dirname, 'AI-Quotation-Setup-Tutorial.pdf'));
doc.pipe(out);

const useCJK = cjkFontsAvailable();
if (useCJK) {
  const fp = getFontPaths();
  doc.registerFont('Regular', fp.Regular);
  doc.registerFont('Bold', fp.Bold);
}

const F = {
  regular: useCJK ? 'Regular' : 'Helvetica',
  bold:    useCJK ? 'Bold'    : 'Helvetica-Bold',
};

const C = {
  primary: '#1e40af',
  white:   '#ffffff',
  text:    '#1e293b',
  muted:   '#64748b',
  light:   '#f8fafc',
  border:  '#e2e8f0',
  code:    '#1e293b',
  codeBg:  '#f1f5f9',
  accent:  '#3b82f6',
};

const PW = doc.page.width;
const ML = 50;
const CW = PW - ML * 2;

function newPage() {
  doc.addPage();
}

function checkSpace(needed = 60) {
  if (doc.y + needed > doc.page.height - 60) newPage();
}

function heading1(text) {
  checkSpace(80);
  doc.rect(ML, doc.y, CW, 40).fill(C.primary);
  doc.font(F.bold).fontSize(16).fillColor(C.white)
    .text(text, ML + 12, doc.y - 30, { width: CW - 24 });
  doc.moveDown(0.8);
}

function heading2(text) {
  checkSpace(60);
  doc.moveDown(0.5);
  doc.font(F.bold).fontSize(13).fillColor(C.primary).text(text, ML, doc.y);
  doc.moveDown(0.3);
}

function para(text) {
  checkSpace(30);
  doc.font(F.regular).fontSize(10).fillColor(C.text)
    .text(text, ML, doc.y, { width: CW, lineGap: 3 });
  doc.moveDown(0.4);
}

function bullet(text) {
  checkSpace(25);
  doc.font(F.regular).fontSize(10).fillColor(C.text)
    .text(`•  ${text}`, ML + 10, doc.y, { width: CW - 10, lineGap: 3 });
  doc.moveDown(0.25);
}

function step(num, text) {
  checkSpace(28);
  const y = doc.y;
  doc.circle(ML + 8, y + 7, 8).fill(C.primary);
  doc.font(F.bold).fontSize(9).fillColor(C.white).text(`${num}`, ML + 5, y + 3);
  doc.font(F.regular).fontSize(10).fillColor(C.text)
    .text(text, ML + 22, y, { width: CW - 22, lineGap: 3 });
  doc.moveDown(0.35);
}

function code(text) {
  checkSpace(35);
  const lines = text.split('\n');
  const h = lines.length * 15 + 14;
  doc.rect(ML, doc.y, CW, h).fill(C.codeBg);
  doc.font(F.regular).fontSize(8.5).fillColor(C.code)
    .text(text, ML + 10, doc.y - h + 8, { width: CW - 20, lineGap: 4 });
  doc.moveDown(0.5);
}

function tableRow(cells, widths, isHeader = false) {
  checkSpace(24);
  const y = doc.y;
  const h = 22;
  let x = ML;
  cells.forEach((cell, i) => {
    doc.rect(x, y, widths[i], h).fill(isHeader ? C.primary : (i % 2 === 0 ? C.white : C.light)).stroke(C.border);
    doc.font(isHeader ? F.bold : F.regular)
      .fontSize(isHeader ? 8 : 8.5)
      .fillColor(isHeader ? C.white : C.text)
      .text(cell, x + 5, y + 6, { width: widths[i] - 10, lineBreak: false });
    x += widths[i];
  });
  doc.y = y + h;
}

function tip(text) {
  checkSpace(40);
  doc.rect(ML, doc.y, CW, 30).fill('#eff6ff');
  doc.rect(ML, doc.y, 4, 30).fill(C.accent);
  doc.font(F.regular).fontSize(9).fillColor(C.accent)
    .text(`ℹ  ${text}`, ML + 12, doc.y - 22, { width: CW - 20, lineGap: 3 });
  doc.moveDown(0.6);
}

// ══════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, PW, doc.page.height).fill(C.primary);
doc.font(F.bold).fontSize(32).fillColor(C.white)
  .text('AI Quotation Assistant', ML, 180, { width: CW, align: 'center' });
doc.font(F.regular).fontSize(16).fillColor('#93c5fd')
  .text('Complete Setup Tutorial', ML, 230, { width: CW, align: 'center' });
doc.font(F.regular).fontSize(11).fillColor('#bfdbfe')
  .text('Telegram Bot  •  Google Sheets  •  PDF  •  Email  •  DeepSeek AI', ML, 270, { width: CW, align: 'center' });

doc.font(F.regular).fontSize(9).fillColor('#93c5fd')
  .text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    ML, doc.page.height - 60, { width: CW, align: 'center' });

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.rect(0, 0, PW, 80).fill(C.primary);
doc.font(F.bold).fontSize(20).fillColor(C.white).text('AI Quotation Assistant', ML, 20, { width: CW });
doc.font(F.regular).fontSize(10).fillColor('#93c5fd').text('Setup Tutorial', ML, 48, { width: CW });
doc.y = 100;

heading2('What You Will Get');
para('A Telegram bot that your customers can message directly to:');
bullet('Ask product prices in any language (Chinese, English, Malay, etc.)');
bullet('Get instant AI-powered replies using your Google Sheet as the database');
bullet('Request a full PDF quotation — automatically generated and emailed to them');

doc.moveDown(0.5);
heading2('What You Need');
bullet('A Windows PC with internet connection');
bullet('A Google account (for Google Sheets)');
bullet('A Telegram account');
bullet('A Gmail account (for sending quotation emails)');
bullet('A DeepSeek account (optional, for AI chat — free tier available)');

doc.moveDown(0.5);
heading2('Setup Overview');
const parts = [
  ['Part 1', 'Download & install the project'],
  ['Part 2', 'Create your Telegram bot'],
  ['Part 3', 'Set up your Google Sheet (product catalogue)'],
  ['Part 4', 'Connect Google Sheets (service account)'],
  ['Part 5', 'Configure Gmail for sending emails'],
  ['Part 6', 'Add DeepSeek AI (optional)'],
  ['Part 7', 'Set your company information'],
  ['Part 8', 'Start and test the bot'],
];
const tw = [80, CW - 80];
tableRow(['Part', 'Description'], tw, true);
parts.forEach(([p, d]) => tableRow([p, d], tw));

// ══════════════════════════════════════════════════════════════════════════════
// PART 1
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 1 — Download & Install the Project');
para('Install the required software and download the project files.');

heading2('Step 1 — Install Node.js');
step(1, 'Go to nodejs.org in your browser');
step(2, 'Download the LTS version (recommended)');
step(3, 'Run the installer with default settings');
step(4, 'Verify by opening PowerShell and typing:');
code('node --version');

heading2('Step 2 — Install Git');
step(1, 'Go to git-scm.com');
step(2, 'Download and install with default settings');

heading2('Step 3 — Download the Project');
para('Open PowerShell (press Windows key, type "PowerShell", press Enter) and run:');
code('git clone https://github.com/ahteyart/AIQuotation-\ncd AIQuotation-\nnpm install');
para('Wait for "added X packages" message before continuing.');

heading2('Step 4 — Create Settings File');
code('cp .env.example .env');
tip('The .env file stores all your private keys and settings. Never share this file with anyone.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 2
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 2 — Create Your Telegram Bot');

step(1, 'Open Telegram on your phone or PC');
step(2, 'Search for @BotFather in the search bar');
step(3, 'Start a chat and send:');
code('/newbot');
step(4, 'BotFather asks for a name — type your bot\'s display name:');
code('My Shop Quotation Bot');
step(5, 'BotFather asks for a username — must end in "bot":');
code('myshop_quotation_bot');
step(6, 'BotFather replies with your token:');
code('8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc');
step(7, 'Open your .env file:');
code('notepad .env');
step(8, 'Find the line and set your token (no quotes):');
code('TELEGRAM_BOT_TOKEN=8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc');

tip('Keep your bot token secret. Anyone with this token can control your bot.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 3
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 3 — Set Up Your Google Sheet');

step(1, 'Go to sheets.google.com and create a new spreadsheet');
step(2, 'Right-click the tab at the bottom → Rename → type: Products');
step(3, 'Add these exact headers in Row 1:');

const sheetW = [70, 55, 95, 50, 70, 80, 70];
tableRow(['A: Name','B: Code','C: Description','D: Unit','E: CostPrice','F: SellingPrice','G: Category'], sheetW, true);
tableRow(['白米 5kg','RICE001','泰国白米','bag','18.00','23.00','Rice'], sheetW);
tableRow(['鸡胸肉','MEAT001','新鲜鸡胸肉','kg','12.00','16.50','Meat'], sheetW);
tableRow(['Basmati Rice','RICE003','Long grain','bag','28.00','40.00','Rice'], sheetW);

doc.moveDown(0.5);
step(4, 'Fill your own products from Row 2 onwards following the same format');
step(5, 'Copy the Sheet ID from your browser URL:');
code('https://docs.google.com/spreadsheets/d/1rMwd8ZROxeoqZIaqpUyb7CmHFVV.../edit\n                                      ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ This part is your Sheet ID');
step(6, 'Open .env and set:');
code('GOOGLE_SHEET_ID=1rMwd8ZROxeoqZIaqpUyb7CmHFVV_iG0JXYlg8cUNDcE');

tip('Column E (CostPrice) is for your internal records only — it does NOT appear in the client PDF.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 4
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 4 — Connect Google Sheets (Service Account)');
para('A Service Account allows the bot to read your Google Sheet automatically.');

heading2('Create Google Cloud Project');
step(1, 'Go to console.cloud.google.com');
step(2, 'Click "Select a project" → "New Project"');
step(3, 'Name it (e.g. AIQuotation) → Create');

heading2('Enable Google Sheets API');
step(1, 'Go to APIs & Services → Library');
step(2, 'Search "Google Sheets API" → click it → Enable');

heading2('Create Service Account & Download Key');
step(1, 'Go to APIs & Services → Credentials');
step(2, 'Click "+ Create Credentials" → "Service Account"');
step(3, 'Name it (e.g. quotation-bot) → Create and Continue → Done');
step(4, 'Click on the service account → Keys tab');
step(5, 'Add Key → Create new key → JSON → Create');
step(6, 'A JSON file downloads automatically (save it!)');

heading2('Convert Key to Base64');
para('In PowerShell, run (replace the filename with yours):');
code('[Convert]::ToBase64String([IO.File]::ReadAllBytes(\n  "C:\\Users\\USER\\Downloads\\aiquotation-abc123.json"\n)) | clip');
para('This copies the result to your clipboard. Open .env and paste it:');
code('GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2Vydm...  (very long string)');

heading2('Share Google Sheet with Service Account');
step(1, 'Open the JSON file in Notepad, find "client_email":');
code('"client_email": "quotation-bot@aiquotation.iam.gserviceaccount.com"');
step(2, 'Open your Google Sheet → Share (top right)');
step(3, 'Paste the client_email address → Viewer role → Send');

tip('If you skip sharing the sheet, the bot will show "Requested entity was not found" error.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 5
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 5 — Gmail Email Setup');
para('The bot emails PDF quotations to clients automatically using your Gmail.');

heading2('Enable 2-Step Verification (required first)');
step(1, 'Go to myaccount.google.com');
step(2, 'Click Security → 2-Step Verification → Turn On');
step(3, 'Follow the steps to enable it');

heading2('Create App Password');
step(1, 'Go to myaccount.google.com/apppasswords');
step(2, 'Type a name (e.g. AIQuotation) in the "App name" box');
step(3, 'Click Create');
step(4, 'Google shows a 16-character password — copy it immediately!');
code('Example:  abcd efgh ijkl mnop');

heading2('Add to .env');
code('SMTP_USER=yourname@gmail.com\nSMTP_PASS=abcdefghijklmnop');
tip('Remove the spaces when pasting the 16-character App Password. Use App Password — NOT your real Gmail password.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 6
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 6 — DeepSeek AI (Optional but Recommended)');
para('Without DeepSeek, the bot only matches exact product names. With DeepSeek, customers can ask naturally in any language and the bot understands.');

heading2('Examples with DeepSeek AI enabled:');
const exW = [CW / 2, CW / 2];
tableRow(['Customer types', 'Bot understands'], exW, true);
tableRow(['鸡胸肉多少钱？', 'Searches for 鸡胸肉, replies in Chinese'], exW);
tableRow(['how much is basmati rice?', 'Finds Basmati Rice, replies in English'], exW);
tableRow(['berapa harga beras?', 'Finds rice products, replies in Malay'], exW);
tableRow(['i need a quote for 5 items', 'Suggests typing /quote'], exW);

doc.moveDown(0.5);
heading2('Setup Steps');
step(1, 'Go to platform.deepseek.com');
step(2, 'Sign up for a free account');
step(3, 'Go to API Keys → Create new key');
step(4, 'Copy the key (starts with sk-)');
step(5, 'Open .env and set:');
code('DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

tip('DeepSeek has a free tier with generous limits — more than enough for a small business quotation bot.');

// ══════════════════════════════════════════════════════════════════════════════
// PART 7
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 7 — Company Information');
para('These details appear in the PDF quotation header and email footer.');

code(
`COMPANY_NAME=My Shop Sdn Bhd
COMPANY_ADDRESS=No. 123, Jalan ABC, 47500 Subang Jaya
COMPANY_PHONE=+60 12-345 6789
COMPANY_EMAIL=info@myshop.com
COMPANY_WEBSITE=www.myshop.com
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6
QUOTE_VALIDITY_DAYS=30`
);

heading2('Currency Symbol');
const curW = [80, CW - 80];
tableRow(['Symbol', 'Currency'], curW, true);
tableRow(['RM', 'Malaysian Ringgit'], curW);
tableRow(['$', 'US Dollar'], curW);
tableRow(['£', 'British Pound'], curW);
tableRow(['S$', 'Singapore Dollar'], curW);
tableRow(['¥', 'Japanese Yen'], curW);

doc.moveDown(0.5);
heading2('Complete .env File Example');
code(
`COMPANY_NAME=My Shop Sdn Bhd
COMPANY_ADDRESS=No. 123, Jalan ABC, Subang Jaya
COMPANY_PHONE=+60 12-345 6789
COMPANY_EMAIL=info@myshop.com
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6
QUOTE_VALIDITY_DAYS=30

TELEGRAM_BOT_TOKEN=8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc

GOOGLE_SHEET_ID=1rMwd8ZROxeoqZIaqpUyb7CmHFVV_iG0JXYlg8cUNDcE
GOOGLE_SHEET_RANGE=Products!A2:G
GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2Vydm...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourname@gmail.com
SMTP_PASS=abcdefghijklmnop

DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
);

// ══════════════════════════════════════════════════════════════════════════════
// PART 8
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('PART 8 — Start & Test the Bot');

heading2('Start the Bot');
para('Open PowerShell and run:');
code('cd C:\\Users\\USER\\AIQuotation-\nnpm start');

para('First startup downloads Chinese fonts (one-time, ~4MB):');
code('Downloading CJK font Regular (~2 MB, one-time)…\n  ✓ NotoSansSC-Regular.otf\nDownloading CJK font Bold (~2 MB, one-time)…\n  ✓ NotoSansSC-Bold.otf\nQuotation bot is running. Press Ctrl+C to stop.');

tip('Keep PowerShell open while using the bot. Close it to stop the bot.');

heading2('Test Commands in Telegram');
const testW = [120, CW - 120];
tableRow(['Message / Command', 'Expected Result'], testW, true);
tableRow(['/start', 'Welcome message with command list'], testW);
tableRow(['/list', 'Full product catalogue with prices'], testW);
tableRow(['鸡胸肉多少钱？', 'AI replies with price in Chinese'], testW);
tableRow(['how much is rice?', 'AI replies in English with price'], testW);
tableRow(['/price 白米', 'Shows all matching products'], testW);
tableRow(['/quote', 'Starts quotation wizard → PDF + email'], testW);
tableRow(['/help', 'Shows all available commands'], testW);

heading2('Using the Quotation Wizard (/quote)');
step(1, 'Type /quote in Telegram');
step(2, 'Bot asks: Enter the client\'s full name');
step(3, 'Bot asks: Enter the client\'s email');
step(4, 'Bot asks: Enter the client\'s company (or /skip)');
step(5, 'Bot shows product list — tap to select/deselect items');
step(6, 'Tap "Generate & Send Quotation"');
step(7, 'Bot sends the PDF in Telegram + emails it to the client');

// ══════════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.y = 50;
heading1('Troubleshooting');

const errW = [170, CW - 170];
tableRow(['Error', 'Fix'], errW, true);
tableRow(['404 Not Found (Telegram)', 'Wrong bot token — get it from @BotFather → /mybots'], errW);
tableRow(['Requested entity was not found', 'Wrong Sheet ID, or Sheet not shared with service account email'], errW);
tableRow(['GOOGLE_CREDENTIALS_BASE64 invalid', 'Re-run the PowerShell base64 command and paste again'], errW);
tableRow(['Unable to parse range: Products', 'Rename your sheet tab to exactly: Products'], errW);
tableRow(['Cannot find module \'openai\'', 'Run: npm install'], errW);
tableRow(['Chinese text garbled in PDF', 'Run npm start — fonts download automatically (one-time)'], errW);
tableRow(['Email not sending', 'Use Gmail App Password (not your real password)'], errW);
tableRow(['Bot not replying', 'Run deleteWebhook command, then restart bot'], errW);
tableRow(['No products found for ...', 'Check that products are in the sheet & sheet is shared'], errW);

doc.moveDown(0.8);
heading2('Reset Telegram Webhook (if bot stops responding)');
para('Run this in PowerShell (replace with your actual token):');
code('Invoke-RestMethod -Uri "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"');
para('Then restart the bot with npm start.');

doc.moveDown(0.8);
heading2('Update the Bot (get latest features)');
code('git pull\nnpm install\nnpm start');

// ══════════════════════════════════════════════════════════════════════════════
// BACK COVER
// ══════════════════════════════════════════════════════════════════════════════
newPage();
doc.rect(0, 0, PW, doc.page.height).fill(C.primary);
doc.font(F.bold).fontSize(18).fillColor(C.white)
  .text('Quick Reference', ML, 120, { width: CW, align: 'center' });

const qrW = [CW / 2 - 5, CW / 2 - 5];
const qrX = ML;

// Left column
let qy = 160;
doc.font(F.bold).fontSize(11).fillColor('#93c5fd').text('Bot Commands', qrX, qy, { width: qrW[0] });
qy += 20;
const cmds = ['/start', '/list', '/price <name>', '/quote', '/help', '/cancel'];
cmds.forEach(c => {
  doc.font(F.regular).fontSize(9).fillColor(C.white).text(c, qrX + 10, qy, { width: qrW[0] - 10 });
  qy += 16;
});

// Right column
let ry = 160;
doc.font(F.bold).fontSize(11).fillColor('#93c5fd').text('Key Files', qrX + CW / 2, ry, { width: qrW[1] });
ry += 20;
const files = ['.env — all your settings', 'data/quotes.json — quote history', 'fonts/ — CJK fonts (auto-downloaded)', 'services/ — Google Sheets, PDF, Email', 'bot/telegramBot.js — bot logic'];
files.forEach(f => {
  doc.font(F.regular).fontSize(9).fillColor(C.white).text(f, qrX + CW / 2 + 10, ry, { width: qrW[1] - 10 });
  ry += 16;
});

doc.font(F.regular).fontSize(9).fillColor('#bfdbfe')
  .text('To start: cd AIQuotation-  →  npm start', ML, doc.page.height - 80, { width: CW, align: 'center' });
doc.font(F.regular).fontSize(8).fillColor('#93c5fd')
  .text('AI Quotation Assistant  •  github.com/ahteyart/AIQuotation-', ML, doc.page.height - 55, { width: CW, align: 'center' });

doc.end();
out.on('finish', () => console.log('PDF created: AI-Quotation-Setup-Tutorial.pdf'));
