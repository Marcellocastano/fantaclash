/**
 * Pre-rendering delle pagine pubbliche (eseguito da `npm run build` dopo
 * le due build di Vite). Per ogni pagina del registro (src/site/routes.ts)
 * scrive dist/<percorso>/index.html con contenuto e <head> completi, poi
 * 404.html e sitemap.xml. Infine elimina la build server temporanea.
 *
 * Node esegue questo file TypeScript nativamente (Node >= 22.18).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const serverDir = join(root, 'dist-server');

interface RouteLike {
  path: string;
  kind: string;
}

const server = await import(pathToFileURL(join(serverDir, 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');

for (const marker of ['<!--app-head-->', '<!--app-html-->', '<!--app-data-->']) {
  if (!template.includes(marker)) throw new Error(`Segnaposto ${marker} assente in dist/index.html`);
}

const analytics: string = server.GOATCOUNTER_CODE
  ? `<script data-goatcounter="https://${server.GOATCOUNTER_CODE}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`
  : '';

/** Pagina completa: head, contenuto e dati per la hydration */
function page(route: RouteLike, data: unknown = null): string {
  // Blocco JSON (non eseguibile): nessuno script inline, CSP senza 'unsafe-inline'
  const dataScript = data === null ? '' : `<script id="page-data" type="application/json">${server.safeJson(data)}</script>`;
  return template
    .replace('<!--app-head-->', `${server.renderHead(route)}\n    ${analytics}`)
    .replace('<!--app-html-->', server.render(route.path, data))
    .replace('<!--app-data-->', dataScript);
}

function write(relativePath: string, content: string) {
  const file = join(dist, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

// Top 11: i dati delle stagioni vengono letti direttamente dai JSON pubblici
const seasonsDir = join(root, 'public/data/seasons');
const index = JSON.parse(readFileSync(join(seasonsDir, 'index.json'), 'utf8')) as { season: string; label: string }[];
const seasonIds = index.map(s => s.season);

const top11Data: Record<string, unknown> = {};
const top11JsonLdMap: Record<string, object[]> = {};
const indexEntries: unknown[] = [];
for (const s of index) {
  const file = JSON.parse(readFileSync(join(seasonsDir, `${s.season}.json`), 'utf8'));
  const data = server.buildSeasonData(s.season, s.label, file.players, seasonIds);
  top11Data[s.season] = data;
  top11JsonLdMap[s.season] = [server.top11JsonLd(data)];
  indexEntries.push(server.indexEntry(s.season, file.players));
}

const routes: RouteLike[] = server.buildRoutes(seasonIds, top11JsonLdMap);
for (const route of routes) {
  const data = route.kind === 'top11' ? top11Data[route.params!.season] : route.kind === 'top11-index' ? indexEntries : null;
  write(route.path === '/' ? 'index.html' : join(route.path, 'index.html'), page(route, data));
}
write('404.html', page(server.NOT_FOUND_ROUTE));
write('sitemap.xml', server.renderSitemap(routes));

rmSync(serverDir, { recursive: true, force: true });
console.log(`Pre-rendering: ${routes.length} pagine + 404.html + sitemap.xml`);
