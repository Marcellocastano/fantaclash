import { PlayerRole } from '../../types';
import { ROLE_TAG, TIER_CLASSES } from '../../components/player/tier';
import { Icon } from '../../components/Icon';
import { PitchSurface } from '../../components/PitchSurface';
import { Top11SeasonData } from '../top11';
import { useTop11SeasonData } from '../useTop11Data';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle, Table } from '../blocks';
import { NotFoundPage } from './NotFoundPage';
import { useT } from '../../i18n/I18nProvider';

const ROLE_ORDER: PlayerRole[] = ['A', 'C', 'D', 'P'];

/**
 * Pagina /top-11/<annata>/: la formazione ideale 4-3-3 dei migliori per
 * overall, su campo vero, con solo dati pubblici (niente media voto).
 */
export function Top11Page({ season, data: initial }: { season: string; data: Top11SeasonData | null }) {
  const t = useT();
  const { data: seasonData, loading, failed } = useTop11SeasonData(season, initial);
  if (failed) return <NotFoundPage />;
  if (loading || !seasonData) {
    return (
      <ContentLayout breadcrumbs={[{ name: t('common.home'), path: '/' }, { name: t('site.common.top11'), path: '/top-11/' }]}>
        <p className="text-ink-muted">{t('site.top11.pageLoading')}</p>
      </ContentLayout>
    );
  }
  const { stats } = seasonData;
  const data = seasonData;
  const rows = ROLE_ORDER.map(role => ({ role, players: data.players.filter(p => p.role === role) }));

  return (
    <ContentLayout
      breadcrumbs={[
        { name: t('common.home'), path: '/' },
        { name: t('site.common.top11'), path: '/top-11/' },
        { name: t('site.top11.crumbSeason', { season: data.season }), path: `/top-11/${data.season}/` },
      ]}
    >
      <article>
        <PageTitle kicker={data.label}>{t('site.top11.title', { season: data.season })}</PageTitle>
        <p className="max-w-3xl text-lg leading-relaxed text-ink">
          {t('site.top11.introA', { season: data.season })}<strong>{stats.topPlayer}</strong>
          {t('site.top11.introB')}<strong>{stats.topClub}</strong>
          {t('site.top11.introC', { n: stats.topClubCount, unit: t(stats.topClubCount === 1 ? 'site.top11.unitOne' : 'site.top11.unitMany') })}
          {stats.elite > 0 && (
            <>
              {t('site.top11.introD')}<strong>{stats.elite}</strong>
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
              head={[t('site.top11.th1'), t('site.top11.th2'), t('site.top11.th3'), t('site.top11.th4')]}
              rows={data.players.map(p => [
                <span key="r" className={ROLE_TAG[p.role]}>{p.role}</span>,
                `${p.firstName} ${p.surname}`.trim(),
                p.team,
                p.overall,
              ])}
            />
            <GameCta
              title={t('site.top11.ctaTitle', { season: data.season })}
              text={t('site.top11.ctaText')}
              season={data.season}
            />
          </div>
        </div>

        {/* Navigazione tra le annate */}
        <nav aria-label={t('site.top11.ariaOthers')} className="mt-14 flex items-center justify-between gap-4 max-w-3xl">
          {data.prev ? (
            <a href={`/top-11/${data.prev}/`} className="btn-ghost">
              <Icon name="chevron" className="w-4 h-4 rotate-90" />
              {t('site.top11.serieA', { season: data.prev })}
            </a>
          ) : (
            <span />
          )}
          <a href="/top-11/" className="font-bold text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40">
            {t('site.top11.allSeasons')}
          </a>
          {data.next ? (
            <a href={`/top-11/${data.next}/`} className="btn-ghost">
              {t('site.top11.serieA', { season: data.next })}
              <Icon name="chevron" className="w-4 h-4 -rotate-90" />
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
