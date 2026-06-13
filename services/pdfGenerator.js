const PDFDocument = require('pdfkit');
const { getFontPaths, cjkFontsAvailable } = require('./fontService');

const PRIMARY = '#1e40af';
const WHITE = '#ffffff';
const LIGHT_BG = '#f8fafc';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ACCENT_LIGHT = '#93c5fd';

function settings() {
  return {
    companyName: process.env.COMPANY_NAME || 'Your Company',
    companyAddress: process.env.COMPANY_ADDRESS || '',
    companyPhone: process.env.COMPANY_PHONE || '',
    companyEmail: process.env.COMPANY_EMAIL || '',
    companyWebsite: process.env.COMPANY_WEBSITE || '',
    currency: process.env.CURRENCY_SYMBOL || '$',
    taxRate: parseFloat(process.env.DEFAULT_TAX_RATE) || 0,
    validDays: parseInt(process.env.QUOTE_VALIDITY_DAYS) || 30,
  };
}

function fmt(sym, n) {
  return `${sym}${Number(n).toFixed(2)}`;
}

function generateQuotationPDF(quotationData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Quotation ${quotationData.quoteNumber}`,
        Author: settings().companyName,
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Register CJK fonts so Chinese/Japanese/Korean characters render correctly
    if (cjkFontsAvailable()) {
      const fp = getFontPaths();
      doc.registerFont('Regular', fp.Regular);
      doc.registerFont('Bold',    fp.Bold);
    }

    const cfg = settings();
    const PW = doc.page.width;   // 595
    const ML = 50;               // left margin
    const CW = PW - ML * 2;     // content width = 495

    // ── HEADER BAND ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 130).fill(PRIMARY);

    // Company name
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(20).fillColor(WHITE)
      .text(cfg.companyName, ML, 22, { width: CW * 0.55 });

    // Company details
    doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(8.5).fillColor(ACCENT_LIGHT);
    let infoY = 50;
    [cfg.companyAddress, cfg.companyPhone, cfg.companyEmail, cfg.companyWebsite]
      .filter(Boolean)
      .forEach((line) => { doc.text(line, ML, infoY); infoY += 13; });

    // QUOTATION title
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(26).fillColor(WHITE)
      .text('QUOTATION', ML, 18, { width: CW, align: 'right' });

    // Quote meta
    const quoteDate = new Date(quotationData.createdAt || Date.now());
    const validUntil = new Date(quoteDate);
    validUntil.setDate(validUntil.getDate() + cfg.validDays);

    doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(9).fillColor(ACCENT_LIGHT);
    doc.text(`No: ${quotationData.quoteNumber}`, ML, 60, { width: CW, align: 'right' });
    doc.text(
      `Date: ${quoteDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      ML, 75, { width: CW, align: 'right' }
    );
    doc.text(
      `Valid Until: ${validUntil.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      ML, 90, { width: CW, align: 'right' }
    );

    // ── BILL TO ───────────────────────────────────────────────────────────────
    let y = 150;
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text('BILL TO', ML, y);
    y += 13;
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(13).fillColor(TEXT)
      .text(quotationData.clientName || 'Client', ML, y);
    y += 18;
    doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(10).fillColor(MUTED);
    if (quotationData.clientCompany) { doc.text(quotationData.clientCompany, ML, y); y += 14; }
    doc.text(quotationData.clientEmail || '', ML, y);
    y += 35;

    // ── PRODUCTS TABLE ────────────────────────────────────────────────────────
    // Columns (total = 495)
    const C = {
      num:   { x: ML,           w: 22  },
      name:  { x: ML + 22,      w: 135 },
      desc:  { x: ML + 157,     w: 130 },
      unit:  { x: ML + 287,     w: 45  },
      qty:   { x: ML + 332,     w: 38  },
      price: { x: ML + 370,     w: 63  },
      total: { x: ML + 433,     w: 62  },
    };

    // Header row
    const HDR_H = 24;
    doc.rect(ML, y, CW, HDR_H).fill(PRIMARY);
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(8).fillColor(WHITE);

    const headers = [
      { col: 'num',   label: '#',          align: 'center' },
      { col: 'name',  label: 'PRODUCT',    align: 'left'   },
      { col: 'desc',  label: 'DESCRIPTION',align: 'left'   },
      { col: 'unit',  label: 'UNIT',       align: 'center' },
      { col: 'qty',   label: 'QTY',        align: 'center' },
      { col: 'price', label: 'UNIT PRICE', align: 'right'  },
      { col: 'total', label: 'TOTAL',      align: 'right'  },
    ];
    headers.forEach(({ col, label, align }) => {
      const c = C[col];
      doc.text(label, c.x + 3, y + 8, { width: c.w - 6, align });
    });
    y += HDR_H;

    // Product rows
    const products = quotationData.products || [];
    let subtotal = 0;

    products.forEach((p, i) => {
      const price = parseFloat(p.sellingPrice ?? p.price) || 0;
      const qty   = parseInt(p.quantity) || 1;
      const total = price * qty;
      subtotal += total;

      const ROW_H = 30;
      doc.rect(ML, y, CW, ROW_H).fill(i % 2 === 0 ? WHITE : LIGHT_BG);
      doc.rect(ML, y, CW, ROW_H).strokeColor(BORDER).lineWidth(0.5).stroke();

      // Row number
      doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(8).fillColor(TEXT);
      doc.text(`${i + 1}`, C.num.x + 3, y + 11, { width: C.num.w - 6, align: 'center' });

      // Product name
      doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(8.5).fillColor(TEXT)
        .text(p.name || '', C.name.x + 3, y + 7, { width: C.name.w - 6, lineBreak: false });

      // Code under name
      if (p.code) {
        doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(7).fillColor(MUTED)
          .text(p.code, C.name.x + 3, y + 18, { width: C.name.w - 6, lineBreak: false });
      }

      // Description
      doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(8).fillColor(MUTED)
        .text(p.description || '', C.desc.x + 3, y + 11, { width: C.desc.w - 6, lineBreak: false });

      // Unit / Qty / Price / Total
      doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(8.5).fillColor(TEXT);
      doc.text(p.unit || 'pcs', C.unit.x + 3,  y + 11, { width: C.unit.w - 6,  align: 'center' });
      doc.text(`${qty}`,        C.qty.x + 3,   y + 11, { width: C.qty.w - 6,   align: 'center' });
      doc.text(fmt(cfg.currency, price), C.price.x + 3, y + 11, { width: C.price.w - 6, align: 'right' });
      doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold')
        .text(fmt(cfg.currency, total), C.total.x + 3, y + 11, { width: C.total.w - 6, align: 'right' });

      y += ROW_H;

      // Page break
      if (y > doc.page.height - 200) {
        doc.addPage({ margin: 0 });
        y = 50;
      }
    });

    // ── TOTALS ────────────────────────────────────────────────────────────────
    y += 12;
    const taxRate = parseFloat(quotationData.taxRate ?? cfg.taxRate) || 0;
    const tax      = subtotal * (taxRate / 100);
    const grand    = subtotal + tax;
    const TX = ML + CW - 220;

    const row = (label, value, bold = false) => {
      doc.font(bold ? cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold' : cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(10).fillColor(MUTED)
        .text(label, TX, y, { width: 120, align: 'right' });
      doc.font(bold ? cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold' : cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(10).fillColor(TEXT)
        .text(value, TX + 120, y, { width: 95, align: 'right' });
      y += 18;
    };

    row('Subtotal:', fmt(cfg.currency, subtotal));
    if (taxRate > 0) row(`Tax (${taxRate}%):`, fmt(cfg.currency, tax));

    // Grand total band
    doc.rect(TX, y, 215, 32).fill(PRIMARY);
    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(12).fillColor(WHITE);
    doc.text('GRAND TOTAL:', TX + 5, y + 10, { width: 110, align: 'right' });
    doc.text(fmt(cfg.currency, grand), TX + 115, y + 10, { width: 95, align: 'right' });
    y += 45;

    // ── NOTES ────────────────────────────────────────────────────────────────
    if (quotationData.notes) {
      doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(10).fillColor(TEXT).text('Notes:', ML, y);
      y += 14;
      doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(9).fillColor(MUTED)
        .text(quotationData.notes, ML, y, { width: CW });
      y += doc.heightOfString(quotationData.notes, { width: CW }) + 20;
    }

    // ── TERMS & FOOTER ────────────────────────────────────────────────────────
    const termsY = Math.max(y + 15, doc.page.height - 150);
    doc.moveTo(ML, termsY).lineTo(ML + CW, termsY)
      .strokeColor(BORDER).lineWidth(1).stroke();

    doc.font(cjkFontsAvailable() ? 'Bold' : 'Helvetica-Bold').fontSize(9).fillColor(MUTED)
      .text('Terms & Conditions', ML, termsY + 10);
    doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(8.5).fillColor('#94a3b8')
      .text(
        `1. This quotation is valid for ${cfg.validDays} days from the date of issue.\n` +
        '2. Prices are subject to change without notice after the validity period.\n' +
        '3. Payment terms as per prior agreement.\n' +
        '4. Delivery timelines will be confirmed upon order placement.',
        ML, termsY + 24, { width: CW }
      );

    doc.font(cjkFontsAvailable() ? 'Regular' : 'Helvetica').fontSize(8).fillColor('#94a3b8')
      .text('Thank you for your business!', ML, doc.page.height - 35, {
        width: CW,
        align: 'center',
      });

    doc.end();
  });
}

module.exports = { generateQuotationPDF };
