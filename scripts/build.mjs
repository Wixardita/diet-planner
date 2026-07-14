import { cp, mkdir, rm, access } from 'node:fs/promises';
const required=['index.html','app.html','app/globals.css','content/translations.ts','lib/formAdapter.ts','public/images/hero-altiora.svg','public/brand/logo-light.svg','public/favicon.svg'];
for (const f of required) await access(f);
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true}); await cp('index.html','dist/index.html'); await cp('app.html','dist/app.html'); await cp('privacy.html','dist/privacy.html'); await cp('legal.html','dist/legal.html'); await cp('app/globals.css','dist/globals.css');
console.log('Static production build generated in dist/.');
