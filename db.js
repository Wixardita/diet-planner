const DB_FILE = 'elenco_cibo_bda.json';

let dbCache = null;
let dbMeta = null;
let dbIndex = null;

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text);
    return toHex(await globalThis.crypto.subtle.digest('SHA-256', data));
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

function validateDataset(parsed) {
  if (!Array.isArray(parsed)) {
    throw new Error(`Formato DB non valido: atteso array JSON in ${DB_FILE}.`);
  }
  if (parsed.length === 0) {
    throw new Error(`Dataset vuoto in ${DB_FILE}.`);
  }
}

function buildIndex(items) {
  return items.map((item, idx) => {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    const tokens = new Set();
    for (const text of [item.name, ...aliases]) {
      for (const t of tokenize(text)) tokens.add(t);
    }
    return { idx, tokens: [...tokens] };
  });
}

async function readDbFile(source) {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      throw new Error(`Su file:// il browser blocca fetch/XHR del JSON. Carica manualmente ${DB_FILE} dall'interfaccia.`);
    }

    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Impossibile leggere ${source}: HTTP ${response.status}.`);
    }
    return response.text();
  }

  const fs = await import('node:fs/promises');
  try {
    return await fs.readFile(source, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`File DB mancante: ${source}. Esegui il builder BDA.`);
    }
    throw error;
  }
}

export async function loadDb(options = {}) {
  if (dbCache) return dbCache;

  const source = options.source || DB_FILE;
  const text = options.rawText ?? await readDbFile(source);
  const bytes = new TextEncoder().encode(text).length;
  const hash = await sha256Hex(text);
  const parsed = JSON.parse(text);
  validateDataset(parsed);

  dbCache = parsed;
  dbIndex = buildIndex(parsed);
  dbMeta = {
    source,
    items: parsed.length,
    bytes,
    hash,
    timestamp: new Date().toISOString(),
  };

  const log = options.logger || console.log;
  log(`[db] source=${dbMeta.source} items=${dbMeta.items} bytes=${dbMeta.bytes} hash=${dbMeta.hash} timestamp=${dbMeta.timestamp}`);

  return dbCache;
}

export function getDbMeta() {
  if (!dbMeta) throw new Error('DB non caricato: chiama prima loadDb().');
  return { ...dbMeta };
}

export async function search(query) {
  if (!dbCache || !dbIndex) throw new Error('DB non caricato: chiama prima loadDb().');

  const qTokens = tokenize(query);
  if (!qTokens.length) return [];

  const ranked = [];
  for (const entry of dbIndex) {
    let score = 0;
    let matchedAll = true;

    for (const qt of qTokens) {
      let matchedToken = false;
      for (const token of entry.tokens) {
        if (token.includes(qt) || qt.includes(token)) {
          score += token === qt ? 2 : 1;
          matchedToken = true;
          break;
        }
      }
      if (!matchedToken) {
        matchedAll = false;
        break;
      }
    }

    if (matchedAll) ranked.push({ score, item: dbCache[entry.idx] });
  }

  ranked.sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name), 'it'));
  return ranked.map((x) => x.item);
}

export function __resetForTests() {
  dbCache = null;
  dbMeta = null;
  dbIndex = null;
}
