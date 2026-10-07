import { buildRoutes } from '../routes';
import { Top11IndexEntry } from '../top11';
import { useTop11Index } from '../useTop11Data';
import { ContentLayout } from '../ContentLayout';
import { ROLE_TAG } from '../../components/player/tier';
import { GameCta, PageTitle, Prose } from '../blocks';
import { Icon } from '../../components/Icon';

const route = buildRoutes().find(r => r.kind === 'top11-index')!;

/**
 * Indice /top-11/: tutte le 23 annate come biglietti, con il miglior
 * giocatore di ciascuna. I dati arrivano dal pre-rendering (data prop);
 * in sviluppo vengono caricati dai JSON pubblici.
 */
export function Top11IndexPage({ data }: { data: Top11IndexEntry[] | null }) {
  const seasons = useTop11Index(data) ?? [];
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Archivio">Top 11 della Serie A dal 2003-04 al 2025-26</PageTitle>
        <Prose>
          <p>
            Ventitré stagioni di Serie A, ventitré formazioni ideali. Per ogni annata la Top 11 dei migliori per
            overall, schierata in un 4-3-3: sfoglia le annate, ritrova i campioni della tua infanzia e, se ti viene
            voglia, rifai quell'asta con FantaClash.
          </p>
        </Prose>
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasons.map(s => (
            <li key={s.season}>
              <a href={`/top-11/${s.season}/`} className="block bg-surface border-2 border-ink shadow-block-sm p-5 h-full hover:bg-canvas">
                <span className="block font-display text-3xl font-black text-ink leading-none">{s.season}</span>
                <span className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                  {s.best.map(b => (
                    <span key={b.role} className="flex items-baseline gap-1.5 min-w-0 text-sm">
                      <span className={ROLE_TAG[b.role]}>{b.role}</span>
                      <span className="font-semibold text-ink truncate">{b.surname}</span>
                      <span className="font-display font-extrabold text-whistle-deep ml-auto tabular-nums">{b.overall}</span>
                    </span>
                  ))}
                </span>
                <span className="mt-3 inline-flex items-center gap-2 font-bold text-pitch-deep text-sm">
                  Vedi la formazione
                  <Icon name="arrow" className="w-4 h-4" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <GameCta title="L'annata giusta per la tua asta" text="Scegli la stagione, chiama i campioni e prova a completare l'album." />
      </article>
    </ContentLayout>
  );
}
