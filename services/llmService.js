const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not set.');
  }
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return client;
}

function buildSystemPrompt(products) {
  const companyName = process.env.COMPANY_NAME || 'our company';
  const currency    = process.env.CURRENCY_SYMBOL || '$';

  const catalogue = products.length
    ? products
        .map((p) => {
          let line = `- ${p.name}`;
          if (p.code)        line += ` [${p.code}]`;
          if (p.description) line += `: ${p.description}`;
          line += ` | Price: ${currency}${Number(p.sellingPrice).toFixed(2)} per ${p.unit}`;
          if (p.category)    line += ` | Category: ${p.category}`;
          return line;
        })
        .join('\n')
    : 'No products available yet.';

  return `You are a helpful sales assistant for ${companyName}.
Your job is to help customers check product prices and request quotations.

Current product catalogue:
${catalogue}

Guidelines:
- Always reply in the SAME language the customer uses (Chinese, English, Malay, etc.)
- If asked about a product price, give the exact price from the catalogue above
- If multiple products match, list all of them with prices
- If a product is NOT in the catalogue, say so politely and suggest checking /list
- If the customer wants a quotation for multiple items, tell them to type /quote
- Keep replies short, friendly, and helpful
- Never make up prices — only use the catalogue above`;
}

async function chat(history, products) {
  const ai       = getClient();
  const messages = history.map((m) => ({ role: m.role, content: m.content }));

  const response = await ai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: buildSystemPrompt(products) },
      ...messages,
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { chat };
