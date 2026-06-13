const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const { getProducts, clearCache }     = require('../services/googleSheets');
const { generateQuotationPDF }        = require('../services/pdfGenerator');
const { sendQuotationEmail }          = require('../services/emailService');

const quotesFile = path.join(__dirname, '..', 'data', 'quotes.json');

function readQuotes() {
  try { return JSON.parse(fs.readFileSync(quotesFile, 'utf8')); }
  catch { return []; }
}

function persist(quote) {
  const list = readQuotes();
  list.unshift(quote);
  fs.writeFileSync(quotesFile, JSON.stringify(list.slice(0, 200), null, 2));
}

// ── Products ─────────────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  try {
    const products = await getProducts(req.query.refresh === 'true');
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/products/refresh', async (_req, res) => {
  try {
    clearCache();
    const products = await getProducts(true);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Quotes ────────────────────────────────────────────────────────────────────

router.get('/quotes', (_req, res) => {
  try {
    res.json({ success: true, quotes: readQuotes() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate new quotation
router.post('/quote', async (req, res) => {
  try {
    const { clientName, clientEmail, clientCompany, products, notes, taxRate, sendEmail } = req.body;

    if (!clientName || !clientEmail || !products?.length) {
      return res.status(400).json({ success: false, error: 'clientName, clientEmail and products are required.' });
    }

    const quoteNumber = `Q${Date.now().toString().slice(-7)}`;
    const quoteData = {
      id: uuidv4(),
      quoteNumber,
      clientName,
      clientEmail,
      clientCompany: clientCompany || '',
      products,
      notes: notes || '',
      taxRate: parseFloat(taxRate) || 0,
      createdAt: new Date().toISOString(),
      source: 'web',
      emailSent: false,
    };

    const pdfBuffer = await generateQuotationPDF(quoteData);

    if (sendEmail !== false) {
      try {
        await sendQuotationEmail(clientEmail, quoteData, pdfBuffer);
        quoteData.emailSent = true;
      } catch (e) {
        console.error('Email failed:', e.message);
      }
    }

    persist(quoteData);

    res.json({
      success: true,
      quoteNumber,
      emailSent: quoteData.emailSent,
      pdf: pdfBuffer.toString('base64'),
    });
  } catch (err) {
    console.error('Quote generation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download PDF for an existing quote
router.get('/quotes/:id/pdf', async (req, res) => {
  try {
    const quote = readQuotes().find((q) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found.' });

    const pdfBuffer = await generateQuotationPDF(quote);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quotation-${quote.quoteNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Re-send email for an existing quote
router.post('/quotes/:id/email', async (req, res) => {
  try {
    const quote = readQuotes().find((q) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found.' });

    const pdfBuffer = await generateQuotationPDF(quote);
    await sendQuotationEmail(quote.clientEmail, quote, pdfBuffer);
    res.json({ success: true, message: `Email sent to ${quote.clientEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a quote
router.delete('/quotes/:id', (req, res) => {
  try {
    const list = readQuotes().filter((q) => q.id !== req.params.id);
    fs.writeFileSync(quotesFile, JSON.stringify(list, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Settings (read-only; write via .env) ──────────────────────────────────────

router.get('/settings', (_req, res) => {
  res.json({
    success: true,
    settings: {
      companyName:        process.env.COMPANY_NAME || '',
      companyAddress:     process.env.COMPANY_ADDRESS || '',
      companyPhone:       process.env.COMPANY_PHONE || '',
      companyEmail:       process.env.COMPANY_EMAIL || '',
      companyWebsite:     process.env.COMPANY_WEBSITE || '',
      currencySymbol:     process.env.CURRENCY_SYMBOL || '$',
      defaultTaxRate:     process.env.DEFAULT_TAX_RATE || '0',
      quoteValidityDays:  process.env.QUOTE_VALIDITY_DAYS || '30',
      googleSheetId:      process.env.GOOGLE_SHEET_ID || '',
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      emailConfigured:    !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      googleConfigured:   !!(
        process.env.GOOGLE_SHEET_ID &&
        (process.env.GOOGLE_CREDENTIALS_BASE64 ||
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          process.env.GOOGLE_CLIENT_EMAIL)
      ),
    },
  });
});

module.exports = router;
