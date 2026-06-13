const TelegramBot = require('node-telegram-bot-api');
const { getProducts }         = require('../services/googleSheets');
const { generateQuotationPDF } = require('../services/pdfGenerator');
const { sendQuotationEmail }  = require('../services/emailService');
const { v4: uuidv4 }          = require('uuid');
const fs                      = require('fs');
const path                    = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ── Conversation state per chat ────────────────────────────────────────────
// state: idle | name | email | company | products
const sessions = new Map();

function session(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, { state: 'idle' });
  return sessions.get(chatId);
}

function reset(chatId) {
  sessions.set(chatId, { state: 'idle' });
}

// ── Helpers ────────────────────────────────────────────────────────────────
const currency = () => process.env.CURRENCY_SYMBOL || '$';

function fmt(n) {
  return `${currency()}${Number(n).toFixed(2)}`;
}

function buildProductKeyboard(products, selected) {
  const rows = [];

  // 1 product per row (shows price)
  for (const p of products) {
    const tick = selected.has(p.id) ? '✅' : '⬜';
    rows.push([{
      text: `${tick} ${p.name} — ${fmt(p.sellingPrice)}`,
      callback_data: `tp_${p.id}`,
    }]);
  }

  rows.push([
    { text: '✅ Select All',   callback_data: 'sel_all' },
    { text: '⬜ Deselect All', callback_data: 'desel_all' },
  ]);

  rows.push([{ text: '📄 Generate & Send Quotation', callback_data: 'generate' }]);
  rows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

  return { inline_keyboard: rows };
}

function saveQuote(quoteData) {
  const file = path.join(__dirname, '..', 'data', 'quotes.json');
  let list = [];
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ok */ }
  list.unshift(quoteData);
  fs.writeFileSync(file, JSON.stringify(list.slice(0, 200), null, 2));
}

// ── /start ─────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  reset(msg.chat.id);
  bot.sendMessage(msg.chat.id,
    `👋 *Welcome to the Quotation Assistant!*\n\n` +
    `Here's what I can do:\n\n` +
    `📋 /list — Show all products with prices\n` +
    `🔍 /price <name> — Find a product's price\n` +
    `📄 /quote — Generate a client quotation (PDF)\n` +
    `❓ /help — Show this help message`,
    { parse_mode: 'Markdown' }
  );
});

// ── /help ──────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Quotation Assistant — Commands*\n\n` +
    `/list — View all products & selling prices\n` +
    `/price <name> — Search price by product name\n` +
    `/quote — Start quotation wizard\n` +
    `/cancel — Cancel current operation\n\n` +
    `_Products are pulled live from Google Sheets._`,
    { parse_mode: 'Markdown' }
  );
});

// ── /cancel ────────────────────────────────────────────────────────────────
bot.onText(/\/cancel/, (msg) => {
  reset(msg.chat.id);
  bot.sendMessage(msg.chat.id, '✅ Operation cancelled.');
});

// ── /list ──────────────────────────────────────────────────────────────────
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  const loading = await bot.sendMessage(chatId, '⏳ Fetching products from Google Sheets…');

  try {
    const products = await getProducts();
    bot.deleteMessage(chatId, loading.message_id).catch(() => {});

    if (!products.length) {
      return bot.sendMessage(chatId, '⚠️ No products found in the Google Sheet.');
    }

    // Group by category
    const grouped = {};
    for (const p of products) {
      const cat = p.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    let text = `📦 *Product Catalogue (${products.length} items)*\n\n`;
    for (const [cat, items] of Object.entries(grouped)) {
      text += `*${cat}*\n`;
      for (const p of items) {
        text += `  • *${p.name}*`;
        if (p.code) text += ` _(${p.code})_`;
        text += ` — ${fmt(p.sellingPrice)}\n`;
        if (p.description) text += `    _${p.description}_\n`;
      }
      text += '\n';
    }

    text += `_Use /quote to generate a client quotation._`;

    // Telegram messages max 4096 chars – split if needed
    const chunks = [];
    while (text.length > 4000) {
      const split = text.lastIndexOf('\n', 4000);
      chunks.push(text.slice(0, split));
      text = text.slice(split + 1);
    }
    chunks.push(text);

    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

// ── /price <name> ─────────────────────────────────────────────────────────
bot.onText(/\/price (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query  = match[1].trim().toLowerCase();

  try {
    const products = await getProducts();
    const found    = products.filter((p) => p.name.toLowerCase().includes(query));

    if (!found.length) {
      return bot.sendMessage(chatId, `🔍 No products matching *${match[1]}*.\n\nUse /list to see all products.`, { parse_mode: 'Markdown' });
    }

    let text = `🔍 *Results for "${match[1]}"*\n\n`;
    for (const p of found) {
      text += `*${p.name}*`;
      if (p.code) text += ` _(${p.code})_`;
      text += `\n  Selling Price: *${fmt(p.sellingPrice)}*\n`;
      if (p.description) text += `  ${p.description}\n`;
      text += '\n';
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

// ── /quote ─────────────────────────────────────────────────────────────────
bot.onText(/\/quote$/, (msg) => {
  const chatId = msg.chat.id;
  reset(chatId);
  session(chatId).state = 'name';
  bot.sendMessage(chatId,
    `📄 *New Quotation Wizard*\n\nStep 1/3 — Please enter the *client's full name*:`,
    { parse_mode: 'Markdown' }
  );
});

// ── Text message handler (wizard steps + free-text price search) ───────────
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const s      = session(chatId);
  const text   = msg.text.trim();

  // ── Free-text price search when idle ──────────────────────────────────────
  if (s.state === 'idle') {
    try {
      const products = await getProducts();
      const query    = text.toLowerCase();
      const found    = products.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
      );

      if (!found.length) {
        return bot.sendMessage(
          chatId,
          `🔍 No products found for "*${text}*".\n\nTry /list to see all available products.`,
          { parse_mode: 'Markdown' }
        );
      }

      let reply = `🔍 *Price for "${text}"*\n\n`;
      for (const p of found) {
        reply += `📦 *${p.name}*`;
        if (p.code) reply += ` _(${p.code})_`;
        reply += `\n💰 Price: *${fmt(p.sellingPrice)}* / ${p.unit}`;
        if (p.description) reply += `\n_${p.description}_`;
        reply += '\n\n';
      }
      reply += `_Type /quote to generate a full quotation._`;

      return bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    } catch (err) {
      return bot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  }

  // Step 1 – Client name
  if (s.state === 'name') {
    s.clientName = text;
    s.state = 'email';
    return bot.sendMessage(chatId,
      `✅ Name: *${text}*\n\nStep 2/3 — Please enter the *client's email address*:`,
      { parse_mode: 'Markdown' }
    );
  }

  // Step 2 – Client email
  if (s.state === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return bot.sendMessage(chatId, `❌ That doesn't look like a valid email. Please try again:`);
    }
    s.clientEmail = text;
    s.state = 'company';
    return bot.sendMessage(chatId,
      `✅ Email: *${text}*\n\nStep 3/3 — Client's *company name*? (or type /skip):`,
      { parse_mode: 'Markdown' }
    );
  }

  // Step 3 – Company (or /skip)
  if (s.state === 'company') {
    s.clientCompany = text === '/skip' ? '' : text;
    s.state = 'products';
    await showProductSelection(chatId, s);
    return;
  }
});

async function showProductSelection(chatId, s) {
  const loading = await bot.sendMessage(chatId, '⏳ Loading products…');
  try {
    const products = await getProducts();
    bot.deleteMessage(chatId, loading.message_id).catch(() => {});

    if (!products.length) {
      reset(chatId);
      return bot.sendMessage(chatId, '⚠️ No products found in Google Sheets. Please add products first.');
    }

    s.products         = products;
    s.selectedProducts = new Set(products.map((p) => p.id)); // select all by default

    const keyboard = buildProductKeyboard(s.products, s.selectedProducts);
    const header =
      `📋 *Select products for the quotation*\n` +
      `Client: *${s.clientName}*\n` +
      `Email: ${s.clientEmail}\n` +
      (s.clientCompany ? `Company: ${s.clientCompany}\n` : '') +
      `\n_Tap products to toggle. All are selected by default._`;

    const sentMsg = await bot.sendMessage(chatId, header, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    s.msgId = sentMsg.message_id;
  } catch (err) {
    bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Could not load products: ${err.message}`);
    reset(chatId);
  }
}

// ── Callback query handler ─────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data   = query.data;
  const s      = session(chatId);

  bot.answerCallbackQuery(query.id).catch(() => {});

  // Toggle individual product
  if (data.startsWith('tp_')) {
    const id = parseInt(data.slice(3));
    if (s.selectedProducts.has(id)) {
      s.selectedProducts.delete(id);
    } else {
      s.selectedProducts.add(id);
    }
    return updateProductMessage(chatId, s);
  }

  if (data === 'sel_all') {
    s.selectedProducts = new Set(s.products.map((p) => p.id));
    return updateProductMessage(chatId, s);
  }

  if (data === 'desel_all') {
    s.selectedProducts = new Set();
    return updateProductMessage(chatId, s);
  }

  if (data === 'cancel') {
    reset(chatId);
    bot.editMessageText('❌ Quotation cancelled.', {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
    return;
  }

  if (data === 'generate') {
    if (!s.selectedProducts?.size) {
      return bot.answerCallbackQuery(query.id, {
        text: 'Please select at least one product.',
        show_alert: true,
      });
    }
    await generateAndSend(chatId, s, query.message.message_id);
  }
});

function updateProductMessage(chatId, s) {
  const keyboard = buildProductKeyboard(s.products, s.selectedProducts);
  const count    = s.selectedProducts.size;
  const header =
    `📋 *Select products for the quotation*\n` +
    `Client: *${s.clientName}*\n` +
    `Email: ${s.clientEmail}\n` +
    (s.clientCompany ? `Company: ${s.clientCompany}\n` : '') +
    `\n_${count} product(s) selected._`;

  bot.editMessageText(header, {
    chat_id: chatId,
    message_id: s.msgId,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  }).catch(() => {});
}

async function generateAndSend(chatId, s, origMsgId) {
  // Remove keyboard
  bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: chatId,
    message_id: origMsgId,
  }).catch(() => {});

  const statusMsg = await bot.sendMessage(chatId, '⏳ Generating PDF quotation…');

  try {
    const selectedProds = s.products
      .filter((p) => s.selectedProducts.has(p.id))
      .map((p) => ({ ...p, quantity: 1 }));

    const quoteNumber = `Q${Date.now().toString().slice(-7)}`;
    const quoteData = {
      id: uuidv4(),
      quoteNumber,
      clientName:    s.clientName,
      clientEmail:   s.clientEmail,
      clientCompany: s.clientCompany || '',
      products:      selectedProds,
      notes:         '',
      taxRate:       parseFloat(process.env.DEFAULT_TAX_RATE) || 0,
      createdAt:     new Date().toISOString(),
      source:        'telegram',
      emailSent:     false,
    };

    const pdfBuffer = await generateQuotationPDF(quoteData);

    // Send PDF as document in Telegram
    await bot.sendDocument(chatId, pdfBuffer, {
      filename: `quotation-${quoteNumber}.pdf`,
      contentType: 'application/pdf',
    }, {
      caption: `📄 *Quotation ${quoteNumber}* for ${s.clientName}`,
      parse_mode: 'Markdown',
    });

    // Try to email
    let emailStatus = '';
    try {
      await sendQuotationEmail(s.clientEmail, quoteData, pdfBuffer);
      quoteData.emailSent = true;
      emailStatus = `✅ Email sent to *${s.clientEmail}*`;
    } catch (e) {
      emailStatus = `⚠️ Email failed: ${e.message}`;
    }

    saveQuote(quoteData);

    const total = selectedProds.reduce((sum, p) => sum + p.sellingPrice, 0);
    await bot.editMessageText(
      `✅ *Quotation Generated!*\n\n` +
      `📌 Quote No: *${quoteNumber}*\n` +
      `👤 Client: ${s.clientName}\n` +
      `📦 Products: ${selectedProds.length}\n` +
      `💰 Total: *${fmt(total)}*\n\n` +
      emailStatus,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
      }
    );
  } catch (err) {
    bot.editMessageText(`❌ Failed to generate quotation: ${err.message}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } finally {
    reset(chatId);
  }
}

// ── Polling errors ─────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Telegram polling error:', err.message);
});

module.exports = bot;
