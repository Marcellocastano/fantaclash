// Scarica una tantum le sezioni usate come fixture nei test.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSections, getSectionWikitext } from '../wiki/client.ts';
import { stripHtml } from './wikipediaParsers.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = join(ROOT, 'test', 'fixtures');
mkdirSync(FIXTURES, { recursive: true });

async function save(title: string, kind: 'stats' | 'rosa', file: string): Promise<void> {
  const sections = await getSections(title);
  if (!sections) throw new Error(`pagina mancante: ${title}`);
  const sec = sections.find(s =>
    kind === 'stats'
      ? stripHtml(s.line) === 'Statistiche dei giocatori'
      : s.line === 'Rosa'
  );
  if (!sec) throw new Error(`sezione ${kind} mancante in ${title}`);
  const wt = await getSectionWikitext(title, sec.index);
  if (wt === null) throw new Error(`wikitext mancante: ${title}#${sec.index}`);
  writeFileSync(join(FIXTURES, file), wt);
  console.log(`salvato ${file} (${wt.length} byte)`);
}

await save('Associazione Sportiva Roma 2006-2007', 'stats', 'roma-2006-07-stats.wikitext');
await save('Associazione Sportiva Roma 2006-2007', 'rosa', 'roma-2006-07-rosa.wikitext');
await save('Associazione Calcio ChievoVerona 2002-2003', 'stats', 'chievo-2002-03-stats.wikitext');
