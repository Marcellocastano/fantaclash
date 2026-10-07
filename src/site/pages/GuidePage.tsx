import { GUIDES } from '../routes';
import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle } from '../blocks';
import { NotFoundPage } from './NotFoundPage';
import { GUIDE_BODIES } from '../content/guides';

/** Pagina di una guida: titolo dal registro, testo dal file della guida */
export function GuidePage({ slug }: { slug: string }) {
  const guide = GUIDES.find(g => g.slug === slug);
  const Body = GUIDE_BODIES[slug];
  const route = buildRoutes().find(r => r.kind === 'guide' && r.params?.slug === slug);
  if (!guide || !Body || !route) return <NotFoundPage />;
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Guida">{guide.title}</PageTitle>
        <Body />
        <GameCta />
      </article>
    </ContentLayout>
  );
}
