require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');
const { cjkFontsAvailable, getFontPaths } = require('../services/fontService');

const OUTPUT = path.join(__dirname, 'AI-Quotation-Setup-Tutorial.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
const out = fs.createWriteStream(OUTPUT);
doc.pipe(out);

/* ── Fonts ──────────────────────────────────────────────────────────────── */
const useCJK = cjkFontsAvailable();
if (useCJK) {
  const fp = getFontPaths();
  doc.registerFont('R', fp.Regular);
  doc.registerFont('B', fp.Bold);
}
const R = useCJK ? 'R' : 'Helvetica';
const B = useCJK ? 'B' : 'Helvetica-Bold';

/* ── Colours ────────────────────────────────────────────────────────────── */
const PRIMARY = '#1e40af';
const WHITE   = '#ffffff';
const TEXT    = '#1e293b';
const MUTED   = '#64748b';
const LIGHT   = '#f8fafc';
const BORDER  = '#cbd5e1';
const CODEBG  = '#f1f5f9';
const ACCENT  = '#3b82f6';
const TIPBG   = '#eff6ff';

/* ── Layout constants ───────────────────────────────────────────────────── */
const PW = 595;   // A4 width  (pt)
const PH = 842;   // A4 height (pt)
const ML = 45;    // left margin
const MR = 45;    // right margin
const CW = PW - ML - MR;  // content width = 505

/* ── Y cursor ───────────────────────────────────────────────────────────── */
let Y = 0;

function setY(v) { Y = v; doc.y = v; }

function checkSpace(needed) {
  if (Y + needed > PH - 50) {
    doc.addPage({ size: 'A4', margin: 0 });
    setY(50);
  }
}

function gap(n = 10) { Y += n; }

/* ── Drawing helpers ────────────────────────────────────────────────────── */

function pageHeader(title) {
  doc.addPage({ size: 'A4', margin: 0 });
  doc.rect(0, 0, PW, 70).fill(PRIMARY);
  doc.font(B).fontSize(18).fillColor(WHITE)
    .text(title, ML, 22, { width: CW });
  setY(90);
}

function h1(text) {
  checkSpace(50);
  doc.rect(ML, Y, CW, 34).fill(PRIMARY);
  doc.font(B).fontSize(13).fillColor(WHITE)
    .text(text, ML + 12, Y + 10, { width: CW - 24, lineBreak: false });
  setY(Y + 42);
}

function h2(text) {
  checkSpace(40);
  gap(8);
  doc.font(B).fontSize(11).fillColor(PRIMARY)
    .text(text, ML, Y, { width: CW });
  setY(Y + 18);
}

function p(text) {
  checkSpace(20);
  doc.font(R).fontSize(9.5).fillColor(TEXT)
    .text(text, ML, Y, { width: CW, lineGap: 2 });
  setY(doc.y + 5);
}

function bullet(text) {
  checkSpace(18);
  doc.font(R).fontSize(9.5).fillColor(TEXT)
    .text('•', ML + 6, Y, { width: 10, lineBreak: false });
  doc.font(R).fontSize(9.5).fillColor(TEXT)
    .text(text, ML + 18, Y, { width: CW - 18, lineGap: 2 });
  setY(doc.y + 3);
}

function stepItem(num, text) {
  checkSpace(24);
  const y0 = Y;
  // Circle
  doc.circle(ML + 9, y0 + 7, 9).fill(PRIMARY);
  const nx = num >= 10 ? ML + 4 : ML + 6;
  doc.font(B).fontSize(8).fillColor(WHITE)
    .text(String(num), nx, y0 + 3, { lineBreak: false });
  // Text
  doc.font(R).fontSize(9.5).fillColor(TEXT)
    .text(text, ML + 24, y0, { width: CW - 24, lineGap: 2 });
  setY(doc.y + 4);
}

function codeBlock(text) {
  const lines  = text.split('\n');
  const lineH  = 13;
  const padV   = 10;
  const h      = lines.length * lineH + padV * 2;
  checkSpace(h + 8);
  const y0 = Y;
  doc.rect(ML, y0, CW, h).fill(CODEBG).stroke(BORDER);
  doc.font(R).fontSize(8).fillColor('#0f172a')
    .text(text, ML + 10, y0 + padV, { width: CW - 20, lineGap: 3 });
  setY(y0 + h + 8);
}

function tipBox(text) {
  const h = 32;
  checkSpace(h + 8);
  const y0 = Y;
  doc.rect(ML, y0, CW, h).fill(TIPBG);
  doc.rect(ML, y0, 4, h).fill(ACCENT);
  doc.font(R).fontSize(9).fillColor(ACCENT)
    .text('ℹ  ' + text, ML + 12, y0 + (h / 2) - 8, { width: CW - 20, lineGap: 2 });
  setY(y0 + h + 8);
}

function tableHeader(cols, widths) {
  checkSpace(26);
  const y0 = Y;
  let x = ML;
  cols.forEach((c, i) => {
    doc.rect(x, y0, widths[i], 22).fill(PRIMARY);
    doc.font(B).fontSize(8).fillColor(WHITE)
      .text(c, x + 4, y0 + 7, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  });
  setY(y0 + 22);
}

function tableRow(cells, widths, shade = false) {
  checkSpace(22);
  const y0 = Y;
  let x = ML;
  cells.forEach((c, i) => {
    doc.rect(x, y0, widths[i], 20).fill(shade ? LIGHT : WHITE).stroke(BORDER);
    doc.font(R).fontSize(8.5).fillColor(TEXT)
      .text(c, x + 4, y0 + 6, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  });
  setY(y0 + 20);
}

/* ══════════════════════════════════════════════════════════════════════════
   COVER
══════════════════════════════════════════════════════════════════════════ */
doc.rect(0, 0, PW, PH).fill(PRIMARY);
doc.font(B).fontSize(30).fillColor(WHITE)
  .text('AI Quotation Assistant', ML, 200, { width: CW, align: 'center' });
doc.font(R).fontSize(15).fillColor('#93c5fd')
  .text('Complete Setup Tutorial', ML, 248, { width: CW, align: 'center' });
doc.font(R).fontSize(10).fillColor('#bfdbfe')
  .text('Telegram Bot  •  Google Sheets  •  PDF  •  Email  •  DeepSeek AI',
    ML, 278, { width: CW, align: 'center' });
doc.font(R).fontSize(8).fillColor('#93c5fd')
  .text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    ML, PH - 55, { width: CW, align: 'center' });

/* ══════════════════════════════════════════════════════════════════════════
   PAGE 2 — OVERVIEW
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Overview');

h2('What You Will Get');
p('A Telegram bot that your customers message directly to:');
bullet('Ask product prices in any language (Chinese, English, Malay, etc.)');
bullet('Get instant AI-powered replies pulling data from your Google Sheet');
bullet('Request a full PDF quotation — automatically generated and emailed');
gap(8);

h2('What You Need');
bullet('A Windows PC with internet connection');
bullet('A Google account (for Google Sheets)');
bullet('A Telegram account');
bullet('A Gmail account (for sending quotation emails)');
bullet('A DeepSeek account (optional — free tier available)');
gap(8);

h2('Setup Steps');
const ovW = [80, CW - 80];
tableHeader(['Part', 'Description'], ovW);
[
  ['Part 1', 'Download and install the project'],
  ['Part 2', 'Create your Telegram bot'],
  ['Part 3', 'Set up Google Sheet product catalogue'],
  ['Part 4', 'Connect Google Sheets via Service Account'],
  ['Part 5', 'Configure Gmail for sending emails'],
  ['Part 6', 'Add DeepSeek AI (optional)'],
  ['Part 7', 'Set your company information'],
  ['Part 8', 'Start and test the bot'],
].forEach(([a, b], i) => tableRow([a, b], ovW, i % 2 === 1));

/* ══════════════════════════════════════════════════════════════════════════
   PART 1
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 1 — Download & Install the Project');
p('Install the required software and download the project files.');

h2('Step 1 — Install Node.js');
stepItem(1, 'Go to nodejs.org in your browser');
stepItem(2, 'Download the LTS version (recommended)');
stepItem(3, 'Run the installer with default settings');
stepItem(4, 'Verify installation — open PowerShell and type:');
codeBlock('node --version');

h2('Step 2 — Install Git');
stepItem(1, 'Go to git-scm.com');
stepItem(2, 'Download and install with default settings');

h2('Step 3 — Download the Project');
p('Open PowerShell (press Windows key, type PowerShell, press Enter) and run:');
codeBlock('git clone https://github.com/ahteyart/AIQuotation-\ncd AIQuotation-\nnpm install');
p('Wait for the "added X packages" message before continuing.');

h2('Step 4 — Create Settings File');
codeBlock('cp .env.example .env');
tipBox('The .env file stores all your private keys and settings. Never share this file.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 2
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 2 — Create Your Telegram Bot');

stepItem(1, 'Open Telegram on your phone or PC');
stepItem(2, 'Search for @BotFather in the search bar and open the chat');
stepItem(3, 'Send this command:');
codeBlock('/newbot');
stepItem(4, "BotFather asks for a display name — type your bot's name:");
codeBlock('My Shop Quotation Bot');
stepItem(5, 'BotFather asks for a username — must end in "bot":');
codeBlock('myshop_quotation_bot');
stepItem(6, 'BotFather replies with your token. Copy the full line:');
codeBlock('8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc');
stepItem(7, 'Open your .env file:');
codeBlock('notepad .env');
stepItem(8, 'Find the TELEGRAM_BOT_TOKEN line and set your token:');
codeBlock('TELEGRAM_BOT_TOKEN=8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc');
gap(4);
tipBox('Keep your bot token secret. Anyone with it can control your bot.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 3
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 3 — Set Up Google Sheet (Product Catalogue)');

stepItem(1, 'Go to sheets.google.com and create a new spreadsheet');
stepItem(2, 'Right-click the tab at the bottom → Rename → type: Products');
stepItem(3, 'Add these headers exactly in Row 1:');

const shW = [68, 52, 90, 48, 72, 80, 95];
tableHeader(['A: Name','B: Code','C: Description','D: Unit','E: CostPrice','F: SellingPrice','G: Category'], shW);
tableRow(['白米 5kg','RICE001','泰国白米','bag','18.00','23.00','Rice'], shW, false);
tableRow(['鸡胸肉','MEAT001','新鲜鸡胸肉','kg','12.00','16.50','Meat'], shW, true);
tableRow(['Basmati Rice','RICE003','Long grain','bag','28.00','40.00','Rice'], shW, false);
gap(6);

stepItem(4, 'Fill your own products from Row 2 onwards');
stepItem(5, 'Copy the Sheet ID from your browser URL:');
codeBlock('https://docs.google.com/spreadsheets/d/ 1rMwd8ZROxeoqZIaqpUyb7CmHFVV_iG0JXYlg8cUNDcE /edit\n                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n                                              This long string is your Sheet ID');
stepItem(6, 'Open .env and set your Sheet ID:');
codeBlock('GOOGLE_SHEET_ID=1rMwd8ZROxeoqZIaqpUyb7CmHFVV_iG0JXYlg8cUNDcE');
gap(4);
tipBox('Column E (CostPrice) is for internal records only. It does NOT appear in client PDFs.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 4
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 4 — Connect Google Sheets (Service Account)');
p('A Service Account allows the bot to read your Google Sheet automatically without manual login.');

h2('Create Google Cloud Project');
stepItem(1, 'Go to console.cloud.google.com');
stepItem(2, 'Click "Select a project" at the top → "New Project"');
stepItem(3, 'Name it (e.g. AIQuotation) → click Create');

h2('Enable Google Sheets API');
stepItem(1, 'Go to APIs & Services → Library in the left menu');
stepItem(2, 'Search "Google Sheets API" → click it → click Enable');

h2('Create Service Account and Download Key');
stepItem(1, 'Go to APIs & Services → Credentials');
stepItem(2, 'Click "+ Create Credentials" → "Service Account"');
stepItem(3, 'Name it (e.g. quotation-bot) → Create and Continue → Done');
stepItem(4, 'Click on the service account you just created');
stepItem(5, 'Go to the Keys tab → Add Key → Create new key → JSON → Create');
stepItem(6, 'A JSON file downloads automatically — remember where it saved!');

h2('Convert Key to Base64');
p('In PowerShell, run this (replace the filename and username with yours):');
codeBlock('[Convert]::ToBase64String(\n  [IO.File]::ReadAllBytes(\n    "C:\\Users\\USER\\Downloads\\aiquotation-abc123.json"\n  )\n) | clip');
p('This silently copies the result to clipboard. Open .env and paste:');
codeBlock('GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2Vydm...   (very long string)');

h2('Share Google Sheet with Service Account');
stepItem(1, 'Open the JSON file in Notepad, find the "client_email" field:');
codeBlock('"client_email": "quotation-bot@aiquotation.iam.gserviceaccount.com"');
stepItem(2, 'Open your Google Sheet → click Share button (top right)');
stepItem(3, 'Paste the client_email address → set role to Viewer → Send');
gap(4);
tipBox('If you skip sharing the sheet, the bot will show "Requested entity not found" error.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 5
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 5 — Gmail Email Setup');
p('The bot emails PDF quotations to clients automatically using your Gmail account.');

h2('Step 1 — Enable 2-Step Verification (required first)');
stepItem(1, 'Go to myaccount.google.com');
stepItem(2, 'Click Security → 2-Step Verification → Turn On');
stepItem(3, 'Follow the on-screen steps to complete setup');

h2('Step 2 — Create an App Password');
stepItem(1, 'Go to myaccount.google.com/apppasswords');
stepItem(2, 'Type a name in the "App name" box (e.g. AIQuotation)');
stepItem(3, 'Click Create');
stepItem(4, 'Google shows a 16-character password — copy it immediately!');
codeBlock('Example password:   abcd efgh ijkl mnop');

h2('Step 3 — Add to .env');
codeBlock('SMTP_USER=yourname@gmail.com\nSMTP_PASS=abcdefghijklmnop');
gap(4);
tipBox('Remove spaces from the App Password. Use App Password — NOT your real Gmail password.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 6
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 6 — DeepSeek AI (Optional but Recommended)');
p('Without DeepSeek, the bot only matches exact product names. With DeepSeek, customers can ask naturally in any language.');

h2('Comparison');
const cmpW = [CW / 2, CW / 2];
tableHeader(['Without DeepSeek AI', 'With DeepSeek AI'], cmpW);
tableRow(['Must type exact: /price 白米', 'Can ask: 白米多少钱？'], cmpW, false);
tableRow(['English only search', 'Understands Chinese, Malay, English'], cmpW, true);
tableRow(['No context memory', 'Remembers conversation history'], cmpW, false);
tableRow(['Simple keyword match', 'Understands intent and context'], cmpW, true);
gap(8);

h2('Setup Steps');
stepItem(1, 'Go to platform.deepseek.com in your browser');
stepItem(2, 'Sign up for a free account');
stepItem(3, 'Go to API Keys in the dashboard → Create new key');
stepItem(4, 'Copy the API key (starts with sk-)');
stepItem(5, 'Open .env and add:');
codeBlock('DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
gap(4);
tipBox('DeepSeek has a generous free tier — more than enough for a small business quotation bot.');

/* ══════════════════════════════════════════════════════════════════════════
   PART 7
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 7 — Company Information');
p('These details appear in the PDF quotation header, email signature, and footer.');

h2('Settings to Fill In');
codeBlock(
`COMPANY_NAME=My Shop Sdn Bhd
COMPANY_ADDRESS=No. 123, Jalan ABC, 47500 Subang Jaya
COMPANY_PHONE=+60 12-345 6789
COMPANY_EMAIL=info@myshop.com
COMPANY_WEBSITE=www.myshop.com
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6
QUOTE_VALIDITY_DAYS=30`
);

h2('Currency Symbol Reference');
const curW = [80, CW - 80];
tableHeader(['Symbol', 'Currency'], curW);
[['RM','Malaysian Ringgit'],['$','US Dollar / Singapore Dollar'],['£','British Pound'],['€','Euro'],['¥','Japanese Yen / Chinese Yuan']]
  .forEach(([s, c], i) => tableRow([s, c], curW, i % 2 === 1));
gap(8);

h2('Complete .env Example');
codeBlock(
`# Company
COMPANY_NAME=My Shop Sdn Bhd
COMPANY_EMAIL=info@myshop.com
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6

# Telegram
TELEGRAM_BOT_TOKEN=8997725471:AAHX8APOgcKSpWqTQyHPg08Drrhoa4ddPSc

# Google Sheets
GOOGLE_SHEET_ID=1rMwd8ZROxeoqZIaqpUyb7CmHFVV_iG0JXYlg8cUNDcE
GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2Vydm...

# Gmail
SMTP_USER=yourname@gmail.com
SMTP_PASS=abcdefghijklmnop

# DeepSeek AI (optional)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx`
);

/* ══════════════════════════════════════════════════════════════════════════
   PART 8
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Part 8 — Start & Test the Bot');

h2('Start the Bot');
p('Open PowerShell, navigate to the project folder, and run:');
codeBlock('cd C:\\Users\\USER\\AIQuotation-\nnpm start');
p('On first startup, fonts for Chinese characters download automatically (~4 MB):');
codeBlock('Downloading CJK font Regular (~2 MB, one-time)...\n  OK NotoSansSC-Regular.otf\nDownloading CJK font Bold (~2 MB, one-time)...\n  OK NotoSansSC-Bold.otf\nQuotation bot is running. Press Ctrl+C to stop.');
tipBox('Keep PowerShell open while using the bot. Closing PowerShell stops the bot.');

h2('Test Commands in Telegram');
const testW = [130, CW - 130];
tableHeader(['Send This', 'Expected Result'], testW);
[
  ['/start',              'Welcome message with all commands'],
  ['/list',               'Full product catalogue with prices'],
  ['/help',               'Shows all available commands'],
  ['鸡胸肉多少钱？',       'AI replies with the price in Chinese'],
  ['how much is rice?',   'AI replies in English with matching prices'],
  ['/price 白米',          'Shows all products matching 白米'],
  ['/quote',              'Starts quotation wizard'],
].forEach(([a, b], i) => tableRow([a, b], testW, i % 2 === 1));

h2('Using the Quotation Wizard (/quote)');
stepItem(1, 'Type /quote in Telegram');
stepItem(2, "Bot asks: Enter the client's full name");
stepItem(3, "Bot asks: Enter the client's email address");
stepItem(4, "Bot asks: Enter the client's company name (or type /skip)");
stepItem(5, 'Bot shows full product list — tap each item to select or deselect');
stepItem(6, 'Tap the "Generate & Send Quotation" button');
stepItem(7, 'Bot sends the PDF in Telegram AND emails it to the client automatically');

/* ══════════════════════════════════════════════════════════════════════════
   TROUBLESHOOTING
══════════════════════════════════════════════════════════════════════════ */
pageHeader('Troubleshooting');

const errW = [175, CW - 175];
tableHeader(['Error Message', 'How to Fix'], errW);
[
  ['404 Not Found (Telegram)',       'Wrong bot token — copy it again from @BotFather → /mybots'],
  ['Requested entity was not found', 'Wrong Sheet ID, or Sheet not shared with service account email'],
  ['GOOGLE_CREDENTIALS_BASE64 invalid','Re-run the PowerShell base64 command and paste again'],
  ['Unable to parse range: Products','Rename your sheet tab to exactly: Products'],
  ["Cannot find module 'openai'",    'Run: npm install'],
  ['Chinese text garbled in PDF',    'Run npm start — fonts download automatically on first run'],
  ['Email not sending',              'Use Gmail App Password, not your real Gmail password'],
  ['Bot not replying at all',        'Run deleteWebhook command below, then restart'],
  ['No products found for ...',      'Check products are in sheet and sheet is shared with service account'],
].forEach(([a, b], i) => tableRow([a, b], errW, i % 2 === 1));

gap(12);
h2('Fix: Bot Not Responding (Reset Webhook)');
p('Run this in PowerShell (replace with your actual token):');
codeBlock('Invoke-RestMethod -Uri "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"');
p('Then restart: npm start');

gap(12);
h2('Update to Latest Version');
codeBlock('git pull\nnpm install\nnpm start');

/* ══════════════════════════════════════════════════════════════════════════
   BACK COVER
══════════════════════════════════════════════════════════════════════════ */
doc.addPage({ size: 'A4', margin: 0 });
doc.rect(0, 0, PW, PH).fill(PRIMARY);

doc.font(B).fontSize(16).fillColor(WHITE)
  .text('Quick Command Reference', ML, 100, { width: CW, align: 'center' });

const col1X = ML;
const col2X = ML + CW / 2 + 10;
const colW  = CW / 2 - 10;

doc.font(B).fontSize(10).fillColor('#93c5fd').text('Bot Commands', col1X, 140, { width: colW });
let cy = 162;
[
  ['/start',       'Welcome message'],
  ['/list',        'All products with prices'],
  ['/price <name>','Search product price'],
  ['/quote',       'Start quotation wizard'],
  ['/help',        'Show all commands'],
  ['/cancel',      'Cancel current action'],
].forEach(([cmd, desc]) => {
  doc.font(B).fontSize(8.5).fillColor(WHITE).text(cmd, col1X, cy, { width: colW, lineBreak: false });
  doc.font(R).fontSize(8).fillColor('#bfdbfe').text(desc, col1X, cy + 11, { width: colW, lineBreak: false });
  cy += 28;
});

doc.font(B).fontSize(10).fillColor('#93c5fd').text('Key Files', col2X, 140, { width: colW });
let ry = 162;
[
  ['.env',             'All settings and credentials'],
  ['data/quotes.json', 'Quote history'],
  ['fonts/',           'CJK fonts (auto-downloaded)'],
  ['services/',        'Google Sheets, PDF, Email, AI'],
  ['bot/telegramBot.js','Bot conversation logic'],
].forEach(([file, desc]) => {
  doc.font(B).fontSize(8.5).fillColor(WHITE).text(file, col2X, ry, { width: colW, lineBreak: false });
  doc.font(R).fontSize(8).fillColor('#bfdbfe').text(desc, col2X, ry + 11, { width: colW, lineBreak: false });
  ry += 28;
});

doc.font(R).fontSize(9).fillColor('#bfdbfe')
  .text('To start the bot every time:', ML, PH - 110, { width: CW, align: 'center' });
doc.font(B).fontSize(11).fillColor(WHITE)
  .text('cd AIQuotation-   →   npm start', ML, PH - 92, { width: CW, align: 'center' });
doc.font(R).fontSize(8).fillColor('#93c5fd')
  .text('AI Quotation Assistant  •  github.com/ahteyart/AIQuotation-', ML, PH - 55, { width: CW, align: 'center' });

doc.end();
out.on('finish', () => console.log('PDF saved:', OUTPUT));
