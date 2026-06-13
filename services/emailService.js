const nodemailer = require('nodemailer');

function buildTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email not configured. Set SMTP_USER and SMTP_PASS in your .env file.');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendQuotationEmail(toEmail, quotationData, pdfBuffer) {
  const transporter = buildTransporter();
  const companyName = process.env.COMPANY_NAME || 'Us';
  const currency = process.env.CURRENCY_SYMBOL || '$';

  const productRows = (quotationData.products || [])
    .map(
      (p, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${p.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${p.quantity || 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${currency}${Number(p.sellingPrice ?? p.price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${currency}${(Number(p.sellingPrice ?? p.price) * (p.quantity || 1)).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const subtotal = (quotationData.products || []).reduce(
    (s, p) => s + Number(p.sellingPrice ?? p.price) * (p.quantity || 1),
    0
  );
  const taxRate = parseFloat(quotationData.taxRate) || 0;
  const tax = subtotal * (taxRate / 100);
  const grand = subtotal + tax;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr><td style="background:#1e40af;padding:30px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:2px;">QUOTATION</h1>
          <p style="margin:8px 0 0;color:#93c5fd;font-size:14px;">${companyName}</p>
        </td></tr>

        <!-- Quote meta -->
        <tr><td style="padding:24px 40px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <table width="100%"><tr>
            <td><strong style="color:#1e293b;">Quote No:</strong> <span style="color:#1e40af;">${quotationData.quoteNumber}</span></td>
            <td style="text-align:right;color:#64748b;font-size:13px;">
              Date: ${new Date(quotationData.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </td>
          </tr></table>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:28px 40px 12px;">
          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">Dear <strong>${quotationData.clientName}</strong>,</p>
          <p style="color:#64748b;font-size:14px;margin:0;">
            Thank you for your enquiry. Please find your quotation below.
          </p>
        </td></tr>

        <!-- Products table -->
        <tr><td style="padding:0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background:#1e40af;color:#ffffff;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;">Product</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;">Total</th>
              </tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:16px 40px;">
          <table style="margin-left:auto;">
            <tr>
              <td style="padding:4px 16px;color:#64748b;text-align:right;">Subtotal:</td>
              <td style="padding:4px 0;color:#1e293b;text-align:right;min-width:100px;">${currency}${subtotal.toFixed(2)}</td>
            </tr>
            ${taxRate > 0 ? `<tr>
              <td style="padding:4px 16px;color:#64748b;text-align:right;">Tax (${taxRate}%):</td>
              <td style="padding:4px 0;color:#1e293b;text-align:right;">${currency}${tax.toFixed(2)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:10px 16px;background:#1e40af;color:#ffffff;font-weight:bold;border-radius:4px 0 0 4px;text-align:right;">GRAND TOTAL:</td>
              <td style="padding:10px 0;background:#1e40af;color:#ffffff;font-weight:bold;text-align:right;padding-right:12px;border-radius:0 4px 4px 0;">${currency}${grand.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">
            This quotation is valid for ${process.env.QUOTE_VALIDITY_DAYS || 30} days.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            A detailed PDF is attached. Contact us at
            <a href="mailto:${process.env.COMPANY_EMAIL || ''}" style="color:#1e40af;">${process.env.COMPANY_EMAIL || ''}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Quotation ${quotationData.quoteNumber} from ${companyName}`,
    html,
    attachments: [
      {
        filename: `quotation-${quotationData.quoteNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

module.exports = { sendQuotationEmail };
