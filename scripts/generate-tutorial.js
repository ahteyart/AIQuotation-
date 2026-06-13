/**
 * AI Quotation Assistant — Setup Tutorial PDF Generator
 * Run: node scripts/generate-tutorial.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');
const { ensureCJKFonts, cjkFontsAvailable, getFontPaths } = require('../services/fontService');

const OUTPUT = path.join(__dirname, 'AI-Quotation-Setup-Tutorial.pdf');

async function main() {
  // Ensure CJK fonts are available so Chinese text renders correctly
  console.log('Checking CJK fonts…');
  await ensureCJKFonts();
  console.log('Generating tutorial PDF…');
  generate();
}

function generate() {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const out = fs.createWriteStream(OUTPUT);
  doc.pipe(out);
  out.on('finish', () => console.log('PDF saved:', OUTPUT));

  /* ── Fonts ────────────────────────────────────────────────────────────── */
  const useCJK = cjkFontsAvailable();
  if (useCJK) {
    const fp = getFontPaths();
    doc.registerFont('R', fp.Regular);
    doc.registerFont('B', fp.Bold);
  }
  const R = useCJK ? 'R' : 'Helvetica';
  const B = useCJK ? 'B' : 'Helvetica-Bold';

  /* ── Colours ──────────────────────────────────────────────────────────── */
  const PRIMARY = '#1e40af';
  const WHITE   = '#ffffff';
  const TEXT    = '#1e293b';
  const MUTED   = '#64748b';
  const LIGHT   = '#f8fafc';
  const BORDER  = '#cbd5e1';
  const CODEBG  = '#f1f5f9';
  const ACCENT  = '#3b82f6';
  const TIPBG   = '#eff6ff';
  const WARNBG  = '#fef9c3';
  const WARNBAR = '#eab308';

  /* ── Layout ───────────────────────────────────────────────────────────── */
  const PW = 595;
  const PH = 842;
  const ML = 45;
  const MR = 45;
  const CW = PW - ML - MR;   // 505

  /* ── Y cursor ─────────────────────────────────────────────────────────── */
  let Y = 0;
  function setY(v) { Y = v; doc.y = v; }
  function gap(n = 10) { Y += n; }
  function checkSpace(needed) {
    if (Y + needed > PH - 55) {
      doc.addPage({ size: 'A4', margin: 0 });
      setY(50);
    }
  }

  /* ── Drawing helpers ──────────────────────────────────────────────────── */

  function pageHeader(title, subtitle) {
    doc.addPage({ size: 'A4', margin: 0 });
    doc.rect(0, 0, PW, subtitle ? 82 : 68).fill(PRIMARY);
    doc.font(B).fontSize(17).fillColor(WHITE)
      .text(title, ML, 20, { width: CW });
    if (subtitle) {
      doc.font(R).fontSize(9.5).fillColor('#93c5fd')
        .text(subtitle, ML, 46, { width: CW });
    }
    setY(subtitle ? 98 : 84);
  }

  function sectionBadge(label) {
    checkSpace(30);
    gap(4);
    const bW = doc.font(B).fontSize(8).widthOfString(label) + 20;
    const y0 = Y;
    doc.rect(ML, y0, bW, 18).fill(PRIMARY);
    doc.font(B).fontSize(8).fillColor(WHITE)
      .text(label, ML + 10, y0 + 5, { width: bW - 20, lineBreak: false });
    setY(y0 + 24);
  }

  function h1(text) {
    checkSpace(44);
    gap(4);
    const y0 = Y;
    doc.rect(ML, y0, CW, 30).fill(PRIMARY);
    doc.font(B).fontSize(12).fillColor(WHITE)
      .text(text, ML + 12, y0 + 9, { width: CW - 24, lineBreak: false });
    setY(y0 + 36);
  }

  function h2(text) {
    checkSpace(36);
    gap(8);
    const y0 = Y;
    doc.moveTo(ML, y0 + 14).lineTo(ML + CW, y0 + 14)
      .strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.font(B).fontSize(11).fillColor(PRIMARY)
      .text(text, ML, y0, { width: CW });
    setY(y0 + 22);
  }

  function p(text, opts = {}) {
    checkSpace(20);
    const y0 = Y;
    doc.font(R).fontSize(9.5).fillColor(TEXT)
      .text(text, ML, y0, { width: CW, lineGap: 2, ...opts });
    setY(doc.y + 5);
  }

  function bullet(text, indent = 0) {
    checkSpace(18);
    const y0 = Y;
    const ix = ML + 8 + indent;
    doc.font(R).fontSize(9).fillColor(ACCENT)
      .text('▸', ix, y0, { width: 12, lineBreak: false });
    doc.font(R).fontSize(9.5).fillColor(TEXT)
      .text(text, ix + 14, y0, { width: CW - 14 - indent, lineGap: 2 });
    setY(doc.y + 3);
  }

  function stepItem(num, text) {
    checkSpace(28);
    const y0 = Y;
    doc.circle(ML + 9, y0 + 9, 9).fill(PRIMARY);
    const nx = num >= 10 ? ML + 4 : ML + 6;
    doc.font(B).fontSize(8).fillColor(WHITE)
      .text(String(num), nx, y0 + 5, { lineBreak: false });
    doc.font(R).fontSize(9.5).fillColor(TEXT)
      .text(text, ML + 24, y0 + 1, { width: CW - 24, lineGap: 2 });
    setY(doc.y + 5);
  }

  function codeBlock(text, label) {
    const lines = text.split('\n');
    const lineH = 13;
    const padV  = 8;
    const h     = lines.length * lineH + padV * 2 + (label ? 14 : 0);
    checkSpace(h + 10);
    const y0 = Y;
    doc.rect(ML, y0, CW, h).fill(CODEBG);
    doc.rect(ML, y0, CW, h).strokeColor(BORDER).lineWidth(0.5).stroke();
    if (label) {
      doc.font(B).fontSize(7).fillColor(MUTED)
        .text(label, ML + 8, y0 + 5, { lineBreak: false });
    }
    doc.font(R).fontSize(8).fillColor('#0f172a')
      .text(text, ML + 8, y0 + padV + (label ? 12 : 0), { width: CW - 16, lineGap: 3 });
    setY(y0 + h + 8);
  }

  function tipBox(text, warn = false) {
    const approxH = Math.ceil(text.length / 75) * 13 + 22;
    checkSpace(approxH + 8);
    const y0 = Y;
    const bg  = warn ? WARNBG : TIPBG;
    const bar = warn ? WARNBAR : ACCENT;
    doc.rect(ML, y0, CW, approxH).fill(bg);
    doc.rect(ML, y0, 4, approxH).fill(bar);
    const icon = warn ? '⚠  ' : 'ℹ  ';
    doc.font(R).fontSize(9).fillColor(bar)
      .text(icon + text, ML + 12, y0 + 6, { width: CW - 20, lineGap: 2 });
    setY(y0 + approxH + 8);
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
    const maxLines = cells.reduce((m, c, i) => {
      const approx = Math.ceil(c.length / Math.max(1, (widths[i] - 8) / 5));
      return Math.max(m, approx);
    }, 1);
    const rowH = Math.max(20, maxLines * 12 + 8);
    checkSpace(rowH);
    const y0 = Y;
    let x = ML;
    cells.forEach((c, i) => {
      doc.rect(x, y0, widths[i], rowH).fill(shade ? LIGHT : WHITE).stroke(BORDER);
      doc.font(R).fontSize(8.5).fillColor(TEXT)
        .text(c, x + 4, y0 + 5, { width: widths[i] - 8, lineBreak: false });
      x += widths[i];
    });
    setY(y0 + rowH);
  }

  function twoColLine(label, value) {
    checkSpace(18);
    const y0 = Y;
    doc.font(B).fontSize(9).fillColor(MUTED)
      .text(label, ML, y0, { width: 150, lineBreak: false });
    doc.font(R).fontSize(9).fillColor(TEXT)
      .text(value, ML + 155, y0, { width: CW - 155 });
    setY(doc.y + 4);
  }

  /* ════════════════════════════════════════════════════════════════════════
     COVER PAGE
  ════════════════════════════════════════════════════════════════════════ */
  doc.rect(0, 0, PW, PH).fill(PRIMARY);

  // decorative circle
  doc.circle(PW - 60, 80, 110).fill('#1d3a9e').opacity(0.5);
  doc.opacity(1);
  doc.circle(60, PH - 80, 90).fill('#1d3a9e').opacity(0.4);
  doc.opacity(1);

  doc.font(B).fontSize(9).fillColor('#93c5fd')
    .text('AI QUOTATION ASSISTANT', ML, 140, { width: CW, align: 'center' });
  doc.font(B).fontSize(34).fillColor(WHITE)
    .text('Complete\nSetup Guide', ML, 162, { width: CW, align: 'center', lineGap: 4 });
  doc.font(R).fontSize(11).fillColor('#bfdbfe')
    .text('From idea to a working Telegram quotation bot', ML, 248, { width: CW, align: 'center' });

  // feature pills
  const pills = ['Telegram Bot', 'Google Sheets', 'PDF Quotes', 'Auto Email', 'DeepSeek AI'];
  let px = ML + 12;
  const pillY = 290;
  doc.font(B).fontSize(7.5).fillColor('#1e40af');
  pills.forEach(label => {
    const pw2 = doc.widthOfString(label) + 16;
    doc.rect(px, pillY, pw2, 16).fill('#93c5fd');
    doc.font(B).fontSize(7.5).fillColor('#1e40af')
      .text(label, px + 8, pillY + 4, { lineBreak: false });
    px += pw2 + 8;
  });

  // divider
  doc.moveTo(ML + 60, 330).lineTo(PW - ML - 60, 330)
    .strokeColor('#3b5fc0').lineWidth(1).stroke();

  // Table of contents preview on cover
  doc.font(B).fontSize(10).fillColor('#93c5fd')
    .text('What this guide covers:', ML, 350, { width: CW, align: 'center' });
  const parts = [
    'Part 1  —  Prerequisites & Installation',
    'Part 2  —  Clone the Project from GitHub',
    'Part 3  —  Create Your Telegram Bot',
    'Part 4  —  Google Sheet Product Catalogue',
    'Part 5  —  Connect Google Sheets (Service Account)',
    'Part 6  —  Gmail Email Setup',
    'Part 7  —  DeepSeek AI (Natural Language)',
    'Part 8  —  Company Settings',
    'Part 9  —  Start & Test the Bot',
    'Appendix — Troubleshooting',
  ];
  let partY = 374;
  parts.forEach((pt, i) => {
    doc.font(i % 2 === 0 ? B : R).fontSize(9).fillColor(i % 2 === 0 ? WHITE : '#bfdbfe')
      .text(pt, ML + 60, partY, { width: CW - 120 });
    partY += 16;
  });

  doc.font(R).fontSize(7.5).fillColor('#64a0d4')
    .text('For educational use — all credentials in this guide are examples only',
      ML, PH - 55, { width: CW, align: 'center' });

  /* ════════════════════════════════════════════════════════════════════════
     INTRODUCTION — BACKGROUND
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Introduction — What You Are Building', 'Understanding the system before you start');

  h2('The Problem This Solves');
  p('Preparing and sending a price quotation is time-consuming. Every time a customer asks "how much is this?", you have to manually look up prices, create a PDF, and email it back — often taking 10–30 minutes per quote.');
  gap(4);
  p('This project automates the entire flow. Customers message your Telegram bot, the bot reads your live price list from Google Sheets, and generates a branded PDF quotation that is emailed to the client — all in seconds.');

  gap(6);
  h2('System Architecture');
  p('Here is how all the parts connect:');
  gap(6);

  // Architecture diagram (text-based boxes)
  const boxData = [
    { label: 'Customer',       sub: 'Telegram app',          x: ML,           y: Y,     w: 110, color: '#0f766e' },
    { label: 'Telegram Bot',   sub: 'node-telegram-bot-api', x: ML + 130,     y: Y,     w: 120, color: PRIMARY   },
    { label: 'DeepSeek AI',    sub: 'Natural language',      x: ML + 270,     y: Y,     w: 110, color: '#7c3aed' },
    { label: 'Google Sheets',  sub: 'Product catalogue',     x: ML + 130,     y: Y + 70, w: 120, color: '#15803d' },
    { label: 'PDF Generator',  sub: 'PDFKit / CJK fonts',    x: ML,           y: Y + 70, w: 110, color: '#b45309' },
    { label: 'Gmail / SMTP',   sub: 'Nodemailer',            x: ML + 270,     y: Y + 70, w: 110, color: '#be123c' },
  ];
  const archStartY = Y;
  boxData.forEach(b => {
    doc.rect(b.x, b.y, b.w, 42).fill(b.color);
    doc.font(B).fontSize(9).fillColor(WHITE)
      .text(b.label, b.x + 6, b.y + 8, { width: b.w - 12, lineBreak: false });
    doc.font(R).fontSize(7.5).fillColor('rgba(255,255,255,0.75)')
      .text(b.sub, b.x + 6, b.y + 22, { width: b.w - 12, lineBreak: false });
  });
  // arrows (simplified)
  doc.moveTo(ML + 110, archStartY + 21).lineTo(ML + 128, archStartY + 21)
    .strokeColor(BORDER).lineWidth(1.5).stroke();
  doc.moveTo(ML + 250, archStartY + 21).lineTo(ML + 268, archStartY + 21)
    .strokeColor(BORDER).lineWidth(1.5).stroke();
  doc.moveTo(ML + 190, archStartY + 42).lineTo(ML + 190, archStartY + 68)
    .strokeColor(BORDER).lineWidth(1.5).stroke();
  doc.moveTo(ML + 130, archStartY + 91).lineTo(ML + 110, archStartY + 91)
    .strokeColor(BORDER).lineWidth(1.5).stroke();
  doc.moveTo(ML + 250, archStartY + 91).lineTo(ML + 268, archStartY + 91)
    .strokeColor(BORDER).lineWidth(1.5).stroke();
  setY(archStartY + 130);

  gap(6);
  h2('What You Will Need');
  const reqW = [160, CW - 160];
  tableHeader(['Requirement', 'Notes'], reqW);
  [
    ['Windows / Mac / Linux PC', 'Any modern computer'],
    ['Node.js v18 or later',     'Free download from nodejs.org'],
    ['Git',                       'Free download from git-scm.com'],
    ['Telegram account',          'Free app — mobile or desktop'],
    ['Google account',            'For Google Sheets & service account'],
    ['Gmail account',             'To send quotation emails (can be same Google account)'],
    ['DeepSeek account (optional)', 'Free tier — for AI natural language chat'],
  ].forEach(([a, b], i) => tableRow([a, b], reqW, i % 2 === 1));

  /* ════════════════════════════════════════════════════════════════════════
     PART 1 — PREREQUISITES
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 1 — Prerequisites & Installation', 'Install the tools you need before starting');

  h1('Install Node.js');
  stepItem(1, 'Open your browser and go to:  nodejs.org');
  stepItem(2, 'Download the LTS version (recommended — more stable)');
  stepItem(3, 'Run the installer. Click Next on every screen. Default settings are fine.');
  stepItem(4, 'After installation, verify it works. Open a terminal / PowerShell and type:');
  codeBlock('node --version\nnpm --version');
  p('You should see version numbers like  v20.x.x  and  10.x.x  — any recent version is fine.');
  tipBox('Windows users: search "PowerShell" in the Start menu and open it. Keep it open throughout this guide.');

  gap(8);
  h1('Install Git');
  stepItem(1, 'Go to:  git-scm.com/downloads');
  stepItem(2, 'Download for your operating system and run the installer');
  stepItem(3, 'All default settings are fine — just keep clicking Next');
  stepItem(4, 'Verify it installed correctly:');
  codeBlock('git --version');

  /* ════════════════════════════════════════════════════════════════════════
     PART 2 — CLONE PROJECT
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 2 — Get the Project from GitHub', 'Download and install all project dependencies');

  h1('Clone the Repository');
  p('Open your terminal (PowerShell on Windows) and run these commands one at a time:');
  codeBlock('git clone https://github.com/ahteyart/AIQuotation-\ncd AIQuotation-', 'Terminal');
  p('This downloads the project into a folder called  AIQuotation-  on your computer.');

  gap(8);
  h1('Install Dependencies');
  codeBlock('npm install', 'Terminal — run inside the AIQuotation- folder');
  p('This downloads all required packages. Wait for the "added X packages" message. It may take 1–2 minutes.');

  gap(8);
  h1('Create Your Settings File');
  p('The project comes with an example settings file. Copy it to create your own:');
  codeBlock('cp .env.example .env', 'Terminal — Windows PowerShell');
  p('On Windows PowerShell, if cp does not work:');
  codeBlock('copy .env.example .env', 'Terminal — alternative for Windows');
  tipBox('The .env file is your private configuration file. It is listed in .gitignore so it will never be accidentally uploaded to GitHub.', true);

  gap(8);
  h1('Understanding the Project Structure');
  const strW = [160, CW - 160];
  tableHeader(['File / Folder', 'Purpose'], strW);
  [
    ['.env',                    'Your private settings (created from .env.example)'],
    ['.env.example',            'Template showing all available settings'],
    ['index.js',                'Entry point — starts the bot'],
    ['bot/telegramBot.js',      'Telegram bot logic and conversation flow'],
    ['services/googleSheets.js','Reads product data from Google Sheets'],
    ['services/pdfGenerator.js','Creates the PDF quotation document'],
    ['services/emailService.js','Sends the PDF to clients via email'],
    ['services/llmService.js',  'DeepSeek AI integration for natural language'],
    ['services/fontService.js', 'Downloads CJK fonts for Chinese/Japanese text'],
    ['data/quotes.json',        'Local history of generated quotes'],
  ].forEach(([a, b], i) => tableRow([a, b], strW, i % 2 === 1));

  /* ════════════════════════════════════════════════════════════════════════
     PART 3 — TELEGRAM BOT
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 3 — Create Your Telegram Bot', 'Get a bot token from @BotFather');

  p('Every Telegram bot needs a token — a secret key that identifies your bot. You get this from @BotFather, Telegram\'s official bot management account.');

  gap(6);
  h1('Create the Bot');
  stepItem(1, 'Open Telegram on your phone or desktop');
  stepItem(2, 'Tap the search icon and search for:  @BotFather');
  stepItem(3, 'Open the @BotFather chat and tap Start if prompted');
  stepItem(4, 'Send this message:');
  codeBlock('/newbot');
  stepItem(5, 'BotFather asks for a display name. Type something descriptive:');
  codeBlock('My Shop Quotation Assistant');
  stepItem(6, 'BotFather asks for a username. It must end in "bot":');
  codeBlock('myshop_quotation_bot');
  stepItem(7, 'BotFather replies with your token. It looks like this:');
  codeBlock('Congratulations! Use this token to access the HTTP API:\n1234567890:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n\nKeep your token secure and store it safely.');

  gap(8);
  tipBox('Your token is a long string with a colon in the middle, like  1234567890:AAHX...  — copy the entire line including the number before the colon.', true);

  gap(8);
  h1('Add Token to Settings');
  stepItem(1, 'Open your .env file in a text editor:');
  codeBlock('notepad .env', 'Windows PowerShell');
  codeBlock('open -a TextEdit .env', 'Mac Terminal');
  stepItem(2, 'Find the  TELEGRAM_BOT_TOKEN  line and replace the placeholder:');
  codeBlock('# BEFORE (placeholder):\nTELEGRAM_BOT_TOKEN=your_bot_token_here\n\n# AFTER (your real token):\nTELEGRAM_BOT_TOKEN=1234567890:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  stepItem(3, 'Save the file (Ctrl+S on Windows, Cmd+S on Mac)');

  gap(8);
  h1('Telegram Bot Commands Reference');
  const cmdW = [130, CW - 130];
  tableHeader(['Command', 'What It Does'], cmdW);
  [
    ['/start',              'Welcome message and introduction to the bot'],
    ['/list',               'Show full product catalogue with prices'],
    ['/price <name>',       'Search for a specific product price'],
    ['/quote',              'Start the quotation wizard to generate a PDF'],
    ['/help',               'Show all available commands'],
    ['/cancel',             'Cancel the current action'],
    ['Free text (e.g. 鸡胸肉多少钱？)', 'AI answers product questions in any language'],
  ].forEach(([a, b], i) => tableRow([a, b], cmdW, i % 2 === 1));

  /* ════════════════════════════════════════════════════════════════════════
     PART 4 — GOOGLE SHEET
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 4 — Google Sheet Product Catalogue', 'Set up your product list in Google Sheets');

  h1('Create the Spreadsheet');
  stepItem(1, 'Go to:  sheets.google.com  and sign in with your Google account');
  stepItem(2, 'Click the  +  button or "Blank spreadsheet"');
  stepItem(3, 'Click on the tab at the bottom (it says "Sheet1") → right-click → Rename');
  stepItem(4, 'Type exactly:');
  codeBlock('Products');
  tipBox('The tab name must be exactly  Products  (capital P). The bot looks for this specific tab name.');

  gap(6);
  h1('Add Column Headers');
  p('Click on cell A1 and add these headers exactly as shown:');
  const colW2 = [46, 46, 90, 46, 68, 72, 74, CW - 442];
  tableHeader(['A','B','C','D','E','F','G','Notes'], colW2);
  tableRow(['Name','Code','Description','Unit','CostPrice','SellingPrice','Category', 'Headers in Row 1'], colW2, false);
  gap(10);

  p('Example data starting from Row 2:');
  const shW = [72, 56, 92, 40, 60, 72, 113];
  tableHeader(['A: Name','B: Code','C: Description','D: Unit','E: CostPrice','F: SellingPrice','G: Category'], shW);
  [
    ['白米 5kg',  'RICE001','泰国白米',    'bag', '18.00', '23.00', 'Rice'],
    ['鸡胸肉',    'MEAT001','新鲜鸡胸肉', 'kg',  '12.00', '16.50', 'Meat'],
    ['Basmati Rice','RICE003','Long grain','bag','28.00', '40.00', 'Rice'],
    ['Chicken Egg','EGG001', 'Fresh daily','tray','9.50',  '13.90', 'Egg'],
  ].forEach((row, i) => tableRow(row, shW, i % 2 === 1));

  gap(8);
  tipBox('Column E (CostPrice) is for your internal records ONLY. It never appears in the PDF sent to clients. Column F (SellingPrice) is what clients see.');

  gap(8);
  h1('Get Your Sheet ID');
  p('Look at the URL in your browser when you have the spreadsheet open:');
  codeBlock('https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit\n                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n                                          This is your Sheet ID — copy it');
  p('Open your .env file and set:');
  codeBlock('GOOGLE_SHEET_ID=YOUR_GOOGLE_SHEET_ID_HERE');

  /* ════════════════════════════════════════════════════════════════════════
     PART 5 — SERVICE ACCOUNT
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 5 — Connect Google Sheets (Service Account)', 'Allow the bot to read your spreadsheet automatically');

  p('The bot needs permission to read your Google Sheet. Instead of logging in every time, we create a "Service Account" — a special Google account just for the bot. You grant this account read access to your sheet.');

  gap(6);
  h1('Create a Google Cloud Project');
  stepItem(1, 'Go to:  console.cloud.google.com  (sign in with your Google account)');
  stepItem(2, 'Click "Select a project" at the top of the page');
  stepItem(3, 'Click "New Project" in the top right of the popup');
  stepItem(4, 'Project name: AIQuotation  (or any name you like)');
  stepItem(5, 'Click Create and wait a few seconds');

  gap(8);
  h1('Enable Google Sheets API');
  stepItem(1, 'In the left menu go to:  APIs & Services → Library');
  stepItem(2, 'In the search box type:  Google Sheets API');
  stepItem(3, 'Click on "Google Sheets API" in the results → Click Enable');

  gap(8);
  h1('Create a Service Account');
  stepItem(1, 'Go to:  APIs & Services → Credentials  in the left menu');
  stepItem(2, 'Click "+ Create Credentials" → choose "Service account"');
  stepItem(3, 'Service account name:  quotation-bot  (or any name)');
  stepItem(4, 'Click "Create and Continue" → then "Done" (skip optional fields)');
  stepItem(5, 'You will see your new service account in the list — click on it');
  stepItem(6, 'Go to the "Keys" tab → click "Add Key" → "Create new key"');
  stepItem(7, 'Choose JSON → click Create');
  stepItem(8, 'A JSON file downloads automatically. Note where it saved!');

  gap(8);
  h1('Convert the Key to Base64');
  p('The bot reads the key as a Base64 string. Run this in PowerShell (Windows):');
  codeBlock('[Convert]::ToBase64String(\n  [IO.File]::ReadAllBytes("C:\\Users\\YourName\\Downloads\\your-key-file.json")\n) | clip', 'Windows PowerShell — replace the file path with your actual path');
  p('This copies a very long string to your clipboard. Now open .env and paste:');
  codeBlock('GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiw...   (very long)', 'Your .env file');
  p('On Mac / Linux:');
  codeBlock('base64 -i ~/Downloads/your-key-file.json | pbcopy   # Mac\nbase64 -w0 ~/Downloads/your-key-file.json          # Linux — copy the output', 'Mac / Linux Terminal');

  gap(8);
  h1('Share Your Google Sheet with the Service Account');
  p('The service account has its own email address (in the JSON file you downloaded). You must share the sheet with this email.');
  stepItem(1, 'Open your downloaded JSON file in Notepad. Find the  "client_email"  line:');
  codeBlock('"client_email": "quotation-bot@your-project-name.iam.gserviceaccount.com"');
  stepItem(2, 'Copy that email address (without the quote marks)');
  stepItem(3, 'Open your Google Sheet → click the blue "Share" button (top right)');
  stepItem(4, 'Paste the service account email → set role to "Viewer" → click Send');
  tipBox('If you skip this sharing step, the bot will show: "Requested entity was not found". Simply share the sheet and restart the bot.', true);

  /* ════════════════════════════════════════════════════════════════════════
     PART 6 — GMAIL
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 6 — Gmail Email Setup', 'Enable the bot to email PDF quotations to clients');

  p('The bot sends PDF quotations directly to clients via Gmail. For security, Gmail requires you to use a special "App Password" rather than your real password.');

  gap(6);
  h1('Step 1 — Enable 2-Step Verification');
  p('App Passwords require 2-Step Verification to be turned on first.');
  stepItem(1, 'Go to:  myaccount.google.com');
  stepItem(2, 'Click "Security" in the left menu');
  stepItem(3, 'Find "2-Step Verification" and click it');
  stepItem(4, 'Click "Turn On" and follow the steps (usually just add your phone number)');

  gap(8);
  h1('Step 2 — Create an App Password');
  stepItem(1, 'Go to:  myaccount.google.com/apppasswords');
  stepItem(2, 'In the "App name" box, type:  AIQuotation');
  stepItem(3, 'Click "Create"');
  stepItem(4, 'Google shows a 16-character password. Copy it immediately — it only shows once!');
  codeBlock('Example of what an App Password looks like:\nabcd efgh ijkl mnop\n\nYour actual password will be different characters — this is just an example.');
  tipBox('Remove the spaces when you paste it into .env. The password is the 16 letters only.', true);

  gap(8);
  h1('Step 3 — Add to Your Settings File');
  codeBlock('SMTP_USER=your.email@gmail.com\nSMTP_PASS=abcdefghijklmnop', 'Your .env file — use your real email and App Password');
  tipBox('Use your App Password — NOT your regular Gmail login password. Using the wrong password causes an "Authentication failed" error.');

  /* ════════════════════════════════════════════════════════════════════════
     PART 7 — DEEPSEEK
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 7 — DeepSeek AI (Optional but Recommended)', 'Enable natural language conversations in any language');

  h2('Why Use DeepSeek AI?');
  const cmpW = [CW / 2, CW / 2];
  tableHeader(['Without DeepSeek AI', 'With DeepSeek AI'], cmpW);
  [
    ['Must type commands: /price 白米',  'Natural: 白米多少钱？ (how much is white rice?)'],
    ['English keyword only',              '中文、English、Bahasa — any language works'],
    ['No memory of conversation',         'Remembers context across the conversation'],
    ['Exact product name required',       'Understands partial matches and synonyms'],
    ['No explanation of prices',          'Can explain, compare, and recommend products'],
  ].forEach(([a, b], i) => tableRow([a, b], cmpW, i % 2 === 1));

  gap(10);
  h1('Set Up DeepSeek API');
  stepItem(1, 'Go to:  platform.deepseek.com  in your browser');
  stepItem(2, 'Click Sign Up and create a free account');
  stepItem(3, 'After login, click "API Keys" in the left dashboard');
  stepItem(4, 'Click "Create new API key"');
  stepItem(5, 'Copy the key — it starts with  sk-');
  stepItem(6, 'Open your .env file and add:');
  codeBlock('DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Your .env file — replace with your real key');
  tipBox('DeepSeek has a generous free tier. For a small business bot handling tens of quotes per day, the free credits are more than sufficient.');

  gap(6);
  h2('How the AI Works');
  p('When a customer sends a free-text message (not a / command), the bot:');
  bullet('Sends the entire product catalogue and price list to DeepSeek');
  bullet('Sends the customer\'s question and conversation history');
  bullet('DeepSeek understands the intent (even in Chinese/Malay) and finds the right products');
  bullet('Returns a natural-language reply with prices and recommendations');
  p('If  DEEPSEEK_API_KEY  is not set, the bot falls back to a simple keyword search instead.');

  /* ════════════════════════════════════════════════════════════════════════
     PART 8 — COMPANY SETTINGS
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 8 — Company Settings', 'Personalise the PDF quotation with your company details');

  p('These settings appear in the PDF header, email signature, and quotation footer.');

  gap(6);
  h1('Set Your Company Information');
  codeBlock(
`# ── Company Information ──────────────────────────────────────
COMPANY_NAME=My Shop Sdn Bhd
COMPANY_ADDRESS=No. 123, Jalan Example, 47500 Subang Jaya, Selangor
COMPANY_PHONE=+60 12-345 6789
COMPANY_EMAIL=info@myshop.com
COMPANY_WEBSITE=www.myshop.com

# ── Quotation Settings ────────────────────────────────────────
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6
QUOTE_VALIDITY_DAYS=30`,
    'Your .env file — replace with your real details'
  );

  gap(8);
  h1('Currency Symbol Reference');
  const curW = [70, CW - 70];
  tableHeader(['Symbol', 'Currency'], curW);
  [
    ['RM',  'Malaysian Ringgit'],
    ['$',   'US Dollar / Singapore Dollar'],
    ['S$',  'Singapore Dollar (explicit)'],
    ['£',   'British Pound'],
    ['€',   'Euro'],
    ['¥ / ￥','Japanese Yen / Chinese Yuan'],
    ['₹',   'Indian Rupee'],
  ].forEach(([s, c], i) => tableRow([s, c], curW, i % 2 === 1));

  gap(8);
  h1('Complete .env Reference');
  p('Here is a full .env example with all available settings (replace everything with YOUR real values):');
  codeBlock(
`# ── Telegram ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# ── Google Sheets ──────────────────────────────────────────────
GOOGLE_SHEET_ID=YOUR_GOOGLE_SHEET_ID_HERE
GOOGLE_CREDENTIALS_BASE64=YOUR_BASE64_ENCODED_SERVICE_ACCOUNT_JSON

# ── Gmail / SMTP ───────────────────────────────────────────────
SMTP_USER=your.email@gmail.com
SMTP_PASS=YOUR_16_CHAR_APP_PASSWORD

# ── DeepSeek AI (optional) ────────────────────────────────────
DEEPSEEK_API_KEY=sk-YOUR_DEEPSEEK_API_KEY_HERE

# ── Company Information ────────────────────────────────────────
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Company Address
COMPANY_PHONE=Your Phone Number
COMPANY_EMAIL=Your Email
COMPANY_WEBSITE=Your Website

# ── Quotation Settings ────────────────────────────────────────
CURRENCY_SYMBOL=RM
DEFAULT_TAX_RATE=6
QUOTE_VALIDITY_DAYS=30`,
    'YOUR .env file — these are ALL placeholders, replace with real values'
  );
  tipBox('Never share your .env file or commit it to GitHub. It contains all your private keys.', true);

  /* ════════════════════════════════════════════════════════════════════════
     PART 9 — START & TEST
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Part 9 — Start & Test the Bot', 'Launch the bot and verify everything works');

  h1('Start the Bot');
  p('Open your terminal, navigate to the project folder, and run:');
  codeBlock('cd AIQuotation-\nnpm start', 'Terminal / PowerShell');
  p('On the very first startup, the bot automatically downloads Chinese/Japanese font files (~4 MB total). You will see:');
  codeBlock('Checking CJK fonts...\nDownloading CJK font Regular (~2 MB, one-time)...\n  ✓ NotoSansSC-Regular.otf\nDownloading CJK font Bold (~2 MB, one-time)...\n  ✓ NotoSansSC-Bold.otf\nQuotation bot is running. Press Ctrl+C to stop.');
  p('After the first run, fonts are cached locally and startup is instant.');
  tipBox('Keep the terminal window open while using the bot. Closing it stops the bot.');

  gap(8);
  h1('Test the Bot — Step by Step');
  p('Open Telegram, search for your bot\'s username, and test each feature:');
  gap(4);
  sectionBadge('STEP 1 — Basic connection test');
  p('Send:  /start');
  p('Expected: A welcome message listing all available commands.');
  gap(4);
  sectionBadge('STEP 2 — Product catalogue test');
  p('Send:  /list');
  p('Expected: A list of all your products with selling prices.');
  p('If you see an error here, check Parts 4 and 5 (Google Sheet setup).');
  gap(4);
  sectionBadge('STEP 3 — Price search test');
  p('Send:  /price rice  (or any product name from your sheet)');
  p('Expected: Products matching "rice" with their prices.');
  gap(4);
  sectionBadge('STEP 4 — AI conversation test (if DeepSeek set up)');
  p('Send a natural question like:  白米多少钱？  or  how much is chicken?');
  p('Expected: AI replies in the same language with price information and context.');
  gap(4);
  sectionBadge('STEP 5 — Generate a PDF quotation');
  stepItem(1, 'Send:  /quote');
  stepItem(2, "Bot asks for client's name — type a test name");
  stepItem(3, "Bot asks for client's email — type YOUR OWN email (so you receive the test)");
  stepItem(4, "Bot asks for company name — type anything or send:  /skip");
  stepItem(5, 'Bot shows product list with inline buttons — tap products to select them');
  stepItem(6, 'Tap "Generate & Send Quotation"');
  stepItem(7, 'Bot sends the PDF in Telegram AND emails it to the address you entered');

  gap(8);
  h1('What a Successful PDF Looks Like');
  const pdfW = [120, CW - 120];
  tableHeader(['PDF Section', 'Content'], pdfW);
  [
    ['Header band',     'Your company name and contact details (in blue)'],
    ['QUOTATION title', 'Quote number, date, and validity date'],
    ['Bill To section', 'Client name, company, and email'],
    ['Products table',  'Product name, code, description, unit, quantity, unit price, total'],
    ['Totals section',  'Subtotal, tax (if set), and grand total'],
    ['Notes',           'Any additional notes added during the quote wizard'],
    ['Terms & footer',  'Standard terms and conditions + "Thank you for your business!"'],
  ].forEach(([a, b], i) => tableRow([a, b], pdfW, i % 2 === 1));

  /* ════════════════════════════════════════════════════════════════════════
     TROUBLESHOOTING
  ════════════════════════════════════════════════════════════════════════ */
  pageHeader('Appendix — Troubleshooting', 'Common errors and how to fix them');

  const errW = [188, CW - 188];
  tableHeader(['Error / Symptom', 'Fix'], errW);
  [
    ['404 Not Found (Telegram polls)',
     'Wrong bot token. Go to @BotFather → /mybots → select your bot → copy full token again'],
    ['Bot not responding to messages',
     'Webhook conflict. Run the deleteWebhook command shown below, then npm start'],
    ['Requested entity was not found',
     'Two possible causes: (1) wrong Sheet ID, or (2) sheet not shared with service account email'],
    ['GOOGLE_CREDENTIALS_BASE64 invalid JSON',
     'The base64 string was cut off or has extra spaces. Re-run the PowerShell base64 command and paste fresh'],
    ['Unable to parse range: Products!A2:G',
     'Your sheet tab is not named "Products". Right-click the tab and rename it exactly to: Products'],
    ["Cannot find module 'openai'",
     'Run:  npm install  inside the project folder'],
    ['Chinese text shows boxes or garbled',
     'Fonts not downloaded. Run npm start once — fonts download automatically. Or check internet connection'],
    ['Email authentication failed',
     'You used your real Gmail password. You must use a Gmail App Password instead (see Part 6)'],
    ['Email not received by client',
     'Check spam folder. Also verify SMTP_USER and SMTP_PASS are set correctly in .env'],
    ['No products found for query',
     'Product not in sheet, or sheet not shared with service account. Check /list shows your products first'],
    ['Bot stops after closing terminal',
     'Normal behaviour. The bot only runs while the terminal is open. See below for running in background'],
  ].forEach(([a, b], i) => tableRow([a, b], errW, i % 2 === 1));

  gap(12);
  h2('Fix: Bot Not Responding (Delete Webhook)');
  p('If the bot was previously connected to a webhook, run this once in PowerShell to reset it:');
  codeBlock('# Replace YOUR_BOT_TOKEN with your actual token:\nInvoke-RestMethod -Uri "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"', 'Windows PowerShell');
  codeBlock('# Mac / Linux:\ncurl https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook', 'Mac / Linux Terminal');
  p('You should see:  {"ok":true,"result":true,...}  — then restart with  npm start');

  gap(8);
  h2('Update to Latest Version');
  p('To download the latest code updates:');
  codeBlock('git pull\nnpm install\nnpm start', 'Terminal');

  gap(8);
  h2('Keep the Bot Running 24/7 (Advanced)');
  p('To keep the bot running even when you close the terminal, install PM2:');
  codeBlock('npm install -g pm2\npm2 start index.js --name quotation-bot\npm2 save\npm2 startup', 'Terminal — installs process manager');
  p('After this, the bot starts automatically every time your computer restarts.');

  /* ════════════════════════════════════════════════════════════════════════
     BACK COVER
  ════════════════════════════════════════════════════════════════════════ */
  doc.addPage({ size: 'A4', margin: 0 });
  doc.rect(0, 0, PW, PH).fill(PRIMARY);
  doc.circle(PW - 40, PH - 60, 100).fill('#1d3a9e').opacity(0.4);
  doc.opacity(1);

  doc.font(B).fontSize(15).fillColor(WHITE)
    .text('Quick Reference Card', ML, 80, { width: CW, align: 'center' });

  // Two columns
  const col1X = ML + 10;
  const col2X = ML + CW / 2 + 10;
  const colW2b = CW / 2 - 20;

  // Column 1: Bot Commands
  doc.font(B).fontSize(9.5).fillColor('#93c5fd')
    .text('Bot Commands', col1X, 118, { width: colW2b });
  let cy = 138;
  [
    ['/start',           'Welcome & introduction'],
    ['/list',            'All products with prices'],
    ['/price <name>',    'Search product price'],
    ['/quote',           'Start quotation wizard'],
    ['/help',            'Show all commands'],
    ['/cancel',          'Cancel current action'],
    ['Free text message','AI answers in any language'],
  ].forEach(([cmd, desc]) => {
    doc.font(B).fontSize(8.5).fillColor(WHITE)
      .text(cmd, col1X, cy, { width: colW2b, lineBreak: false });
    doc.font(R).fontSize(8).fillColor('#bfdbfe')
      .text(desc, col1X, cy + 12, { width: colW2b, lineBreak: false });
    cy += 30;
  });

  // Column 2: Checklist
  doc.font(B).fontSize(9.5).fillColor('#93c5fd')
    .text('Setup Checklist', col2X, 118, { width: colW2b });
  let ry = 138;
  [
    ['Node.js & Git installed'],
    ['Project cloned & npm install done'],
    ['Telegram bot token in .env'],
    ['Google Sheet named "Products"'],
    ['Service account created & shared'],
    ['Base64 credentials in .env'],
    ['Gmail App Password in .env'],
    ['DeepSeek API key in .env (optional)'],
    ['Company info in .env'],
    ['npm start — bot is running'],
  ].forEach(item => {
    doc.rect(col2X, ry + 2, 9, 9).strokeColor('#93c5fd').lineWidth(0.8).stroke();
    doc.font(R).fontSize(8.5).fillColor(WHITE)
      .text(item, col2X + 15, ry, { width: colW2b - 15, lineBreak: false });
    ry += 22;
  });

  // Bottom banner
  doc.rect(0, PH - 120, PW, 120).fill('#172554');
  doc.font(R).fontSize(9).fillColor('#bfdbfe')
    .text('To start the bot every time:', ML, PH - 105, { width: CW, align: 'center' });
  doc.font(B).fontSize(12).fillColor(WHITE)
    .text('cd AIQuotation-     →     npm start', ML, PH - 88, { width: CW, align: 'center' });
  doc.moveTo(ML + 80, PH - 68).lineTo(PW - ML - 80, PH - 68)
    .strokeColor('#3b5fc0').lineWidth(0.5).stroke();
  doc.font(R).fontSize(8).fillColor('#64a0d4')
    .text('github.com/ahteyart/AIQuotation-', ML, PH - 58, { width: CW, align: 'center' });
  doc.font(R).fontSize(7.5).fillColor('#475a8a')
    .text('All credentials shown in this guide are examples only — never use example values in production',
      ML, PH - 42, { width: CW, align: 'center' });

  doc.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
