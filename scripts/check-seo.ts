/**
 * Controllo SEO su `dist/` dopo `npm run build` (`npm run seo:check`).
 * Verifica che ogni URL della sitemap abbia un index.html generato con
 * title/description/canonical unici, un solo h1, nessun segnaposto
 * residuo e dati strutturati validi. Esce con codice 1 se fallisce.
 *
 * Node esegue questo file TypeScript nativamente (Node >= 22.18).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const SITE = 'https://www.fantaclash.it';

const errors: string[] = [];
const warnings: string[] = [];

function fail(msg: string) { errors.push(msg); }
function warn(msg: string) { warnings.push(msg); }

// --- File fondamentali -------------------------------------------------
for (const f of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'og-image.png']) {
  if (!existsSync(join(dist, f))) fail(`dist/${f} mancante`);
}
if (errors.length) { report(); process.exit(1); }

const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) fail('sitemap.xml senza URL');
const seen = new Set<string>();
for (const u of urls) {
  if (!u.startsWith(SITE)) fail(`URL sitemap fuori dominio canonico: ${u}`);
  if (seen.has(u)) fail(`URL sitemap duplicato: ${u}`);
  seen.add(u);
  if (!u.endsWith('/')) fail(`URL sitemap senza barra finale: ${u}`);
}

const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail('robots.txt senza riga Sitemap canonica');
if (/Disallow:\s*\/\s*$/m.test(robots)) fail('robots.txt blocca tutto il sito');

// --- Pagine ------------------------------------------------------------
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
let h1Total = 0;

for (const url of urls) {
  const path = url.slice(SITE.length);
  const file = join(dist, path === '/' ? 'index.html' : join(path, 'index.html'));
  if (!existsSync(file)) { fail(`${path}: index.html non generato`); continue; }
  const html = readFileSync(file, 'utf8');
  const tag = `pagina ${path}`;

  if (html.includes('<!--app-head-->') || html.includes('<!--app-html-->') || html.includes('<!--app-data-->'))
    fail(`${tag}: segnaposto non sostituito`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (!title) fail(`${tag}: <title> mancante`);
  else {
    if (title.length > 60) fail(`${tag}: title di ${title.length} caratteri (>60): "${title}"`);
    if (!title.includes('FantaClash')) warn(`${tag}: title senza nome del sito: "${title}"`);
    if (titles.has(title)) fail(`${tag}: title duplicato di ${titles.get(title)}`);
    titles.set(title, path);
  }

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) fail(`${tag}: meta description mancante`);
  else {
    if (desc.length < 110 || desc.length > 160) warn(`${tag}: description di ${desc.length} caratteri (attesa 110-160)`);
    if (descriptions.has(desc)) fail(`${tag}: description duplicata di ${descriptions.get(desc)}`);
    descriptions.set(desc, path);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  if (canonical !== url) fail(`${tag}: canonical "${canonical}" != "${url}"`);

  if (!/<meta property="og:title"/.test(html) || !/<meta property="og:image" content="[^"]*og-image\.png"/.test(html))
    fail(`${tag}: Open Graph incompleti`);
  if (!/<meta name="twitter:card"/.test(html)) fail(`${tag}: twitter:card mancante`);
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) fail(`${tag}: pagina pubblica con noindex`);

  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  h1Total += h1s;
  if (h1s !== 1) fail(`${tag}: ${h1s} elementi <h1> (atteso 1)`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { fail(`${tag}: JSON-LD non valido`); }
  }

  const imgs = html.match(/<img(?![^>]*alt=)[^>]*>/g)?.length ?? 0;
  if (imgs) fail(`${tag}: ${imgs} <img> senza alt`);
}

// Pagine note che devono esistere nella sitemap
for (const must of ['/', '/regole/', '/faq/', '/guida/', '/top-11/', '/chi-siamo/', '/privacy/']) {
  if (!seen.has(`${SITE}${must}`)) fail(`sitemap senza ${must}`);
}
const top11Count = urls.filter(u => /\/top-11\/\d{4}-\d{2}\/$/.test(u)).length;
if (top11Count !== 23) fail(`sitemap con ${top11Count} pagine Top 11 (attese 23)`);

// 404: esiste e non è indicizzabile
const notFound = readFileSync(join(dist, '404.html'), 'utf8');
if (!/noindex/.test(notFound)) fail('404.html senza noindex');
if (!/<h1[\s>]/.test(notFound)) fail('404.html senza <h1>');

function report() {
  for (const w of warnings) console.warn(`  ! ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`  x ${e}`);
    console.error(`\nseo:check: ${errors.length} errori, ${warnings.length} avvisi`);
  } else {
    console.log(`seo:check ok: ${urls.length} URL, ${titles.size} title unici, ${h1Total} h1, ${warnings.length} avvisi`);
  }
}

report();
process.exit(errors.length ? 1 : 0);
