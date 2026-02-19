#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://bda.ieo.it';
const LIST_PATH = '/?page_id=1161';
const OUTPUT = path.resolve('db/foods_it_bda_1109.json');

function cleanText(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return null;
  if (normalized.toLowerCase() === 'tr') return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalMergeName(value) {
  return normalizeName(value)
    .replace(/\b(di|del|della|dello|dei|delle|al|alla|alle|con|senza)\b/g, ' ')
    .replace(/\b(crudo|cruda|fresco|fresca|freschi|fresche|pastorizzato|pastorizzata|biologico|biologica|nostrano|nostrana|intero|intera)\b/g, ' ')
    .replace(/\b(cotto|cotta)\s+al\s+vapore\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMacros(foodComponents) {
  const out = { kcal: null, protein: null, carbs: null, fat: null, fiber: null };

  for (const group of foodComponents || []) {
    for (const component of group.components || []) {
      const label = cleanText(component.dscomp).toLowerCase();
      const unit = cleanText(component.cnum).toLowerCase();
      const value = parseNumber(component.valore);

      if (out.kcal === null && label === 'energia, ric con fibra' && unit === 'kcal') out.kcal = value;
      else if (out.protein === null && label.startsWith('proteine totali')) out.protein = value;
      else if (out.carbs === null && label.startsWith('carboidrati disponibili')) out.carbs = value;
      else if (out.fat === null && label.startsWith('lipidi totali')) out.fat = value;
      else if (out.fiber === null && label.startsWith('fibra alimentare totale')) out.fiber = value;
    }
  }

  return out;
}

async function postJson(pathname, body) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}`);
  return response.json();
}

async function fetchList() {
  const response = await fetch(`${BASE_URL}${LIST_PATH}`);
  if (!response.ok) throw new Error(`Elenco alimenti non disponibile: HTTP ${response.status}`);
  const html = await response.text();
  const rows = [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>.*?<\/td>\s*<td/gis)];
  return rows.map((m) => ({ code: m[1], name: cleanText(m[2]) }));
}

function dedupeEntries(entries) {
  const merged = new Map();
  for (const entry of entries) {
    const sig = `${canonicalMergeName(entry.name)}|${JSON.stringify(entry.per100)}`;
    if (!merged.has(sig)) {
      merged.set(sig, { ...entry, aliases: [...entry.aliases] });
      continue;
    }
    const existing = merged.get(sig);
    const keepCurrentAsPrimary = entry.name.length < existing.name.length;
    if (keepCurrentAsPrimary) {
      if (!entry.aliases.includes(existing.name)) entry.aliases.push(existing.name);
      for (const alias of existing.aliases) {
        if (!entry.aliases.includes(alias) && alias !== entry.name) entry.aliases.push(alias);
      }
      merged.set(sig, { ...entry, aliases: entry.aliases });
      continue;
    }
    if (entry.name !== existing.name && !existing.aliases.includes(entry.name) && entry.name !== canonicalMergeName(existing.name)) {
      existing.aliases.push(entry.name);
    }
  }
  return [...merged.values()];
}

async function fetchFood(code, fallbackName) {
  let foodId = `${code}_2`;
  let foodInfo = null;

  try {
    const infoRes = await postJson('/api/BDA/FoodInfo', { language: 0, foodId });
    foodInfo = infoRes.foodInfo;
  } catch {
    // fallback via search-by-code
  }

  if (!foodInfo) {
    const search = await postJson('/api/BDA/SearchFoodByCode', { language: 0, searchValue: String(code) });
    const found = Array.isArray(search.foods) ? search.foods[0] : null;
    if (found?.idFood) {
      foodId = found.idFood;
      const infoRes = await postJson('/api/BDA/FoodInfo', { language: 0, foodId });
      foodInfo = infoRes.foodInfo;
    }
  }

  const comps = await postJson('/api/BDA/FoodComponents', { language: 0, foodId });
  const per100 = extractMacros(comps.foodComponents);

  return {
    id: `bda:${code}`,
    name: cleanText(foodInfo?.description || fallbackName),
    aliases: [],
    category: cleanText(foodInfo?.catMercDescription || '') || null,
    per100,
    source: 'BDA (bda.ieo.it)',
    rank: 1000,
  };
}

async function main() {
  const foods = await fetchList();
  const entries = [];

  for (let i = 0; i < foods.length; i += 1) {
    const food = foods[i];
    const item = await fetchFood(food.code, food.name);
    entries.push(item);
    if ((i + 1) % 100 === 0) console.log(`[build_bda_db] progress ${i + 1}/${foods.length}`);
  }

  const finalDb = dedupeEntries(entries);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(finalDb, null, 2)}\n`, 'utf8');

  const complete = finalDb.filter((f) => Object.values(f.per100).every((v) => v !== null)).length;
  const incomplete = finalDb.length - complete;
  const hasPasta = finalDb.some((f) => normalizeName(f.name).includes('pasta'));
  const hasUovoIntero = finalDb.some((f) => {
    const n = normalizeName(f.name);
    return n.includes('uovo') && !n.includes('albume');
  });

  console.log(`[build_bda_db] total foods: ${finalDb.length}`);
  console.log(`[build_bda_db] complete macros: ${complete}`);
  console.log(`[build_bda_db] incomplete macros: ${incomplete}`);
  console.log(`[build_bda_db] pasta present: ${hasPasta}`);
  console.log(`[build_bda_db] whole-egg equivalent present: ${hasUovoIntero}`);
  if (!hasPasta) console.log('[build_bda_db] WARNING: nessuna voce "pasta" trovata in BDA.');
}

main().catch((error) => {
  console.error('[build_bda_db] failed:', error.message);
  console.error('[build_bda_db] Se la rete o il sito BDA non è raggiungibile, usa un export locale (es. Excel/CSV BDA) e poi converti con questo script adattando fetchList/fetchFood.');
  process.exit(1);
});
