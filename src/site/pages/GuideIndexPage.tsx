import { buildRoutes, GUIDES } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle, Prose } from '../blocks';
import { Icon } from '../../components/Icon';

const route = buildRoutes().find(r => r.kind === 'guide-index')!;

/** Indice delle guide al fantacalcio */
export function GuideIndexPage() {
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Guide">Guide al fantacalcio ad asta</PageTitle>
        <Prose>
          <p>
            Il fantacalcio d'asta è una cosa seria: chi improvvisa il giorno dell'asta paga gli errori per tutta la
            stagione. Queste guide raccolgono le regole, le strategie e gli strumenti per arrivare preparato — con
            FantaClash come campo di allenamento gratuito.
          </p>
        </Prose>
        <ul className="mt-10 grid sm:grid-cols-2 gap-6 max-w-4xl">
          {GUIDES.map(g => (
            <li key={g.slug}>
              <a href={`/guida/${g.slug}/`} className="block bg-surface border-2 border-ink shadow-block p-5 h-full hover:bg-canvas">
                <span className="block font-display text-2xl font-black text-ink leading-tight">{g.title}</span>
                <span className="block text-ink-soft mt-2">{g.description}</span>
                <span className="mt-3 inline-flex items-center gap-2 font-bold text-pitch-deep">
                  Leggi
                  <Icon name="arrow" className="w-4 h-4" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <GameCta />
      </article>
    </ContentLayout>
  );
}
