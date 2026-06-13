const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const FONT_DIR = path.join(__dirname, '..', 'fonts');

const FONTS = {
  Regular: {
    file: 'NotoSansSC-Regular.otf',
    url:  'https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf',
  },
  Bold: {
    file: 'NotoSansSC-Bold.otf',
    url:  'https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf',
  },
};

function downloadFile(url, dest, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 10) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'node-aiquotation' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, dest, hops + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const tmp = dest + '.tmp';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => { out.close(); fs.renameSync(tmp, dest); resolve(); });
      out.on('error', (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
    }).on('error', reject);
  });
}

async function ensureCJKFonts() {
  if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR, { recursive: true });

  for (const [name, { file, url }] of Object.entries(FONTS)) {
    const dest = path.join(FONT_DIR, file);
    if (fs.existsSync(dest)) continue;
    console.log(`Downloading CJK font ${name} (~2 MB, one-time)…`);
    try {
      await downloadFile(url, dest);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ Failed to download ${file}: ${err.message}`);
    }
  }
}

function getFontPaths() {
  return {
    Regular: path.join(FONT_DIR, FONTS.Regular.file),
    Bold:    path.join(FONT_DIR, FONTS.Bold.file),
  };
}

function cjkFontsAvailable() {
  const p = getFontPaths();
  return fs.existsSync(p.Regular) && fs.existsSync(p.Bold);
}

module.exports = { ensureCJKFonts, getFontPaths, cjkFontsAvailable };
