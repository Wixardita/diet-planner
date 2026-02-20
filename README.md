# diet-planner (DB hard reset)

Architettura minima con **una sola pipeline DB** e **una sola fonte dati**:

- Dataset canonico: `elenco_cibo_bda.json`
- Modulo unico DB: `db.js`
- API pubblica: `loadDb()`, `getDbMeta()`, `search(query)`

## Avvio progetto

### Modalità 1 — doppio click (`file://`) senza server

1. Apri `app.html` con doppio click.
2. Seleziona manualmente **esattamente** `elenco_cibo_bda.json` dal picker file.
3. Esegui le ricerche.

> In `file://` non usiamo `fetch/XHR` sul JSON (bloccato da Edge/Chrome): il file viene letto tramite File API locale.

### Modalità 2 — server locale (`http://`)

1. Assicurati che esista `elenco_cibo_bda.json` in root.
2. Avvia un server statico dalla root:

```bash
python -m http.server 8000
```

3. Apri `http://localhost:8000/app.html`.

## Rigenerazione DB (fonte ufficiale BDA)

```bash
node build_bda_db.mjs
```

Questo script scarica dal portale BDA ufficiale (`bda.ieo.it`) e genera **solo** `elenco_cibo_bda.json`.

## Diagnostica obbligatoria al load

`loadDb()` stampa sempre:

- `source`
- `items`
- `bytes`
- `hash`
- `timestamp`

## Nota `file://` vs `http://`

Stessa fonte dati in entrambi i casi: `elenco_cibo_bda.json`.
Differenza tecnica esplicita:

- `http://` → load automatico via `fetch`;
- `file://` → load manuale via File API (no fetch/XHR).

Non esistono fallback, cache secondarie o dataset alternativi.

## Test

```bash
node test_db.mjs
```

Copre:

- mock minimo (`pasta`/`pollo`)
- dataset reale (`pasta`)
