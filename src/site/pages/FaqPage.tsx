import { buildRoutes } from '../routes';
import { FAQ_ITEMS } from '../faqData';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle } from '../blocks';
import { Icon } from '../../components/Icon';

const route = buildRoutes().find(r => r.kind === 'faq')!;

/** Domande frequenti: il testo è condiviso con i dati strutturati (faqData.ts) */
export function FaqPage() {
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="FAQ">Domande frequenti su FantaClash</PageTitle>
        <dl className="max-w-3xl space-y-4">
          {FAQ_ITEMS.map(item => (
            <div key={item.question} className="bg-surface border-2 border-ink shadow-block-sm">
              <dt className="px-5 py-4 font-display text-2xl font-black text-ink leading-tight flex items-start justify-between gap-4">
                {item.question}
                <Icon name="chevron" className="w-5 h-5 rotate-90 shrink-0 mt-1 text-ink-muted" aria-hidden="true" />
              </dt>
              <dd className="px-5 pb-5 text-lg text-ink-soft leading-relaxed border-t-2 border-ink/10 pt-4">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
        <GameCta title="Altra domanda? La risposta è un'asta" text="Apri il gioco e prova: si impara in fretta." />
      </article>
    </ContentLayout>
  );
}
