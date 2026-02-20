#!/usr/bin/env node
import fs from 'node:fs/promises';

const BASE_URL = 'https://bda.ieo.it';
const LIST_PATH = '/?page_id=1161';
const OUTPUT = 'elenco_cibo_bda.json';

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
  const seenCodes = new Set();
  const foods = [];

  for (let page = 1; page <= 200; page += 1) {
    const listUrl = page === 1 ? `${BASE_URL}${LIST_PATH}` : `${BASE_URL}${LIST_PATH}&paged=${page}`;
    const response = await fetch(listUrl);
    if (!response.ok) throw new Error(`Lista BDA non disponibile (pagina ${page}): HTTP ${response.status}`);

    const html = await response.text();
    const rows = [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>.*?<\/td>\s*<td/gis)];
    const pageFoods = rows.map((m) => ({ code: m[1], name: cleanText(m[2]) }));
    let added = 0;

    for (const food of pageFoods) {
      if (seenCodes.has(food.code)) continue;
      seenCodes.add(food.code);
      foods.push(food);
      added += 1;
    }

    if (pageFoods.length === 0 || added === 0) break;
  }

  if (!foods.length) throw new Error('Nessun alimento trovato nella lista BDA.');
  return foods;
}

async function fetchFood(code, fallbackName) {
  let foodId = `${code}_2`;
  let foodInfo = null;

  try {
    const infoRes = await postJson('/api/BDA/FoodInfo', { language: 0, foodId });
    foodInfo = infoRes.foodInfo;
  } catch {
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
  };
}

async function main() {
  const list = await fetchList();
  const out = [];

  for (let i = 0; i < list.length; i += 1) {
    out.push(await fetchFood(list[i].code, list[i].name));
    if ((i + 1) % 100 === 0) console.log(`[build_bda_db] progress ${i + 1}/${list.length}`);
  }

  await fs.writeFile(OUTPUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  const hasPasta = out.some((f) => normalizeName(f.name).includes('pasta'));
  if (!hasPasta) throw new Error('Sanity check fallita: nessuna voce "pasta" trovata nel dataset finale.');

  console.log(`[build_bda_db] output=${OUTPUT} items=${out.length}`);
}

main().catch((error) => {
  console.error(`[build_bda_db] failed: ${error.message}`);
  process.exit(1);
});
