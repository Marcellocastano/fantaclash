import { PlayerRole } from '../../types';
import { ROLE_TAG, TIER_CLASSES } from '../../components/player/tier';
import { Icon } from '../../components/Icon';
import { PitchSurface } from '../../components/PitchSurface';
import { Top11SeasonData } from '../top11';
import { useTop11SeasonData } from '../useTop11Data';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle, Table } from '../blocks';
import { NotFoundPage } from './NotFoundPage';

const ROLE_ORDER: { role: PlayerRole; label: string }[] = [
  { role: 'A', label: 'Attaccanti' },
  { role: 'C', label: 'Centrocampisti' },
  { role: 'D', label: 'Difensori' },
  { role: 'P', label: 'Portiere' },
];

/**
 * Pagina /top-11/<annata>/: la formazione ideale 4-3-3 dei migliori per
 * overall, su campo vero, con solo dati pubblici (niente media voto).
 */
export function Top11Page({ season, data: initial }: { season: string; data: Top11SeasonData | null }) {
  const { data: seasonData, loading, failed } = useTop11SeasonData(season, initial);
  if (failed) return <NotFoundPage />;
  if (loading || !seasonData) {
    return (
      <ContentLayout breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Top 11', path: '/top-11/' }]}>
        <p className="text-ink-muted">Caricamento della formazione…</p>
      </ContentLayout>
    );
  }
  const { stats } = seasonData;
  const data = seasonData;
  const rows = ROLE_ORDER.map(r => ({ ...r, players: data.players.filter(p => p.role === r.role) }));

  return (
    <ContentLayout
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Top 11', path: '/top-11/' },
        { name: `Serie A ${data.season}`, path: `/top-11/${data.season}/` },
      ]}
    >
      <article>
        <PageTitle kicker={data.label}>Top 11 della Serie A {data.season}</PageTitle>
        <p className="max-w-3xl text-lg leading-relaxed text-ink">
          I migliori giocatori della stagione {data.season} per overall, schierati in un 4-3-3 ideale. Il migliore
          dell'annata è <strong>{stats.topPlayer}</strong>; la squadra più rappresentata è il{' '}
          <strong>{stats.topClub}</strong> ({stats.topClubCount}{' '}
          {stats.topClubCount === 1 ? 'giocatore' : 'giocatori'})
          {stats.elite > 0 && (
            <>
              , e i fuoriclasse con overall 90 o più sono <strong>{stats.elite}</strong>
            </>
          )}
          .
        </p>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-10 items-start">
          {/* Campo con la formazione */}
          <div className="relative">
            <PitchSurface orientation="vertical" className="border-4 border-ink shadow-block" />
            <div className="absolute inset-0 flex flex-col justify-between p-[4%]">
              {rows.map(row => (
                <div key={row.role} className="flex justify-center gap-[3%]">
                  {row.players.map(p => (
                    <PlayerChip key={p.name} player={p} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Tabella accessibile degli 11 */}
          <div>
            <Table
              head={['Ruolo', 'Giocatore', 'Squadra', 'Overall']}
              rows={data.players.map(p => [
                <span key="r" className={ROLE_TAG[p.role]}>{p.role}</span>,
                `${p.firstName} ${p.surname}`.trim(),
                p.team,
                p.overall,
              ])}
            />
            <GameCta
              title={`Rifai l'asta della Serie A ${data.season}`}
              text="Il form si apre già su questa annata: stessi giocatori, stessa asta, la tua rosa."
              season={data.season}
            />
          </div>
        </div>

        {/* Navigazione tra le annate */}
        <nav aria-label="Altre annate" className="mt-14 flex items-center justify-between gap-4 max-w-3xl">
          {data.prev ? (
            <a href={`/top-11/${data.prev}/`} className="btn-ghost">
              <Icon name="chevron" className="w-4 h-4 -rotate-90" />
              Serie A {data.prev}
            </a>
          ) : (
            <span />
          )}
          <a href="/top-11/" className="font-bold text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40">
            Tutte le annate
          </a>
          {data.next ? (
            <a href={`/top-11/${data.next}/`} className="btn-ghost">
              Serie A {data.next}
              <Icon name="chevron" className="w-4 h-4 rotate-90" />
            </a>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </ContentLayout>
  );
}

/** Figurina sul campo: fascia di overall, ruolo, squadra, cognome grande */
function PlayerChip({ player }: { player: Top11SeasonData['players'][number] }) {
  const t = TIER_CLASSES[player.tier];
  return (
    <div className={`${t.bg} ${t.ink} border-2 border-ink shadow-block-sm px-1.5 sm:px-3 py-2 flex-1 max-w-[26%] min-w-0 text-center`}>
      <p className="font-display text-xl sm:text-2xl font-black leading-none">{player.overall}</p>
      <p className="mt-1"><span className={ROLE_TAG[player.role]}>{player.role}</span></p>
      <p className="font-display text-base sm:text-lg font-extrabold leading-tight mt-1 truncate" title={`${player.firstName} ${player.surname}`.trim()}>
        {player.surname}
      </p>
      <p className={`text-xs font-semibold truncate ${t.muted}`}>{player.team}</p>
    </div>
  );
}
