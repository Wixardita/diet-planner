import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const required = [
  'index.html',
  'app.html',
  'app/globals.css',
  'content/translations.ts',
  'lib/formAdapter.ts',
  'public/images/hero-altiora.svg',
  'public/brand/logo-light.svg',
  'public/favicon.svg',
];

for (const file of required) {
  await access(file);
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('app/globals.css', 'dist/globals.css');

const staticPages = ['index.html', 'app.html', 'privacy.html', 'legal.html'];
for (const page of staticPages) {
  const html = await readFile(page, 'utf8');
  await writeFile(
    `dist/${page}`,
    html
      .replaceAll('href="app/globals.css"', 'href="globals.css"')
      .replaceAll('src="public/', 'src="')
      .replaceAll("'public/", "'")
  );
}

console.log('Static production build generated in dist/.');
