import { buildRoutes } from '../routes';
import { Top11IndexEntry } from '../top11';
import { useTop11Index } from '../useTop11Data';
import { ContentLayout } from '../ContentLayout';
import { ROLE_TAG } from '../../components/player/tier';
import { GameCta, PageTitle, Prose } from '../blocks';
import { Icon } from '../../components/Icon';
import { useT } from '../../i18n/I18nProvider';

const route = buildRoutes().find(r => r.kind === 'top11-index')!;

/**
 * Indice /top-11/: tutte le 23 annate come biglietti, con il miglior
 * giocatore di ciascuna. I dati arrivano dal pre-rendering (data prop);
 * in sviluppo vengono caricati dai JSON pubblici.
 */
export function Top11IndexPage({ data }: { data: Top11IndexEntry[] | null }) {
  const t = useT();
  const { entries: seasons, loading, total } = useTop11Index(data);
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker={t('site.top11.indexKicker')}>{t('site.top11.indexTitle')}</PageTitle>
        <Prose>
          <p>{t('site.top11.indexIntro')}</p>
        </Prose>
        {loading && (
          <p className="mt-6 text-sm font-bold text-ink-muted" role="status">
            {t('site.top11.loading')}{total ? `… ${seasons.length}/${total}` : '…'}
          </p>
        )}
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
                  {t('site.top11.see')}
                  <Icon name="arrow" className="w-4 h-4" />
                </span>
              </a>
            </li>
          ))}
          {/* Scheletro delle annate ancora in caricamento */}
          {loading &&
            Array.from({ length: (total || 6) - seasons.length }, (_, i) => (
              <li key={`scheletro-${i}`} aria-hidden="true">
                <div className="border-2 border-dashed border-line-strong p-5 h-full motion-safe:animate-pulse">
                  <span className="block h-8 w-28 bg-line" />
                  <span className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                    {Array.from({ length: 4 }, (_, j) => (
                      <span key={j} className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-line" />
                        <span className="h-4 w-16 bg-line" />
                        <span className="h-4 w-6 bg-line ml-auto" />
                      </span>
                    ))}
                  </span>
                </div>
              </li>
            ))}
        </ul>
        <GameCta title={t('site.top11.indexCtaTitle')} text={t('site.top11.indexCtaText')} />
      </article>
    </ContentLayout>
  );
}
