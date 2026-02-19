# diet-planner

Planner HTML con ricerca ingredienti da database locale.

## Database alimenti locale (BDA)

Il progetto ora usa un solo database locale:

- `db/foods_it_bda_1109.json`

Per rigenerarlo da BDA:

```bash
node tools/build_bda_db.mjs
```

Lo script scarica l'elenco alimenti BDA, recupera i macro per 100g (kcal, proteine, carboidrati, grassi, fibre), produce il JSON finale e stampa un report di completezza.
