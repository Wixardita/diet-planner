#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { loadDb, search, getDbMeta, __resetForTests } from './db.js';

async function testMockDataset() {
  const mockFile = 'tmp_mock_db.json';
  const mock = [
    { id: 'x1', name: 'Pasta di semola', aliases: ['spaghetti'], per100: {} },
    { id: 'x2', name: 'Petto di pollo', aliases: ['pollo'], per100: {} },
  ];

  await fs.writeFile(mockFile, JSON.stringify(mock), 'utf8');
  __resetForTests();
  await loadDb({ source: mockFile, logger: () => {} });

  const pasta = await search('pasta');
  const pollo = await search('pollo');
  const meta = getDbMeta();

  assert(pasta.length > 0, 'Mock: "pasta" deve restituire risultati');
  assert(pollo.length > 0, 'Mock: "pollo" deve restituire risultati');
  assert.equal(meta.source, mockFile);

  await fs.unlink(mockFile);
}

async function testRealDataset() {
  __resetForTests();
  await loadDb({ source: 'elenco_cibo_bda.json', logger: () => {} });
  const pasta = await search('pasta');
  assert(pasta.length > 0, 'Reale: "pasta" deve restituire risultati');
}

await testMockDataset();
await testRealDataset();
console.log('test_db: ok');
