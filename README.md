# ALTIORA ESTATES

A production-ready Next.js landing page for a luxury real estate venture defining **flight-access luxury estates**.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publish

Deploy the repository to Vercel or any Next.js-compatible host. Configure `NEXT_PUBLIC_CONTACT_ENDPOINT` only when a real contact backend is available; otherwise the form adapter simulates success locally.

## Key files

- `app/page.tsx` — complete landing page sections.
- `content/translations.ts` — EN/IT-ready copy and structured content.
- `lib/formAdapter.ts` — swappable contact submission adapter.
- `public/images` — local SVG visual placeholders ready for replacement.
- `public/brand` — logo, dark logo, monogram and favicon SVG assets.
