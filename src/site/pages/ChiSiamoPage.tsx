import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, H2, PageTitle, Prose } from '../blocks';

const route = buildRoutes().find(r => r.kind === 'about')!;

/**
 * Chi siamo: il progetto FantaClash, senza nomi di persona (autore
 * organizzazione).
 */
export function ChiSiamoPage() {
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Chi siamo">FantaClash</PageTitle>
        <Prose>
          <p>
            FantaClash è un progetto amatoriale costruito da appassionati del fantacalcio ad asta. L'idea è semplice:
            le stagioni storiche della Serie A come campo da gioco, e un'asta contro il computer per mettere alla
            prova la propria strategia senza aspettare agosto.
          </p>
          <H2>Com'è fatto</H2>
          <p>
            Il gioco gira interamente nel browser: niente account, niente pubblicità, nessun dato personale raccolto.
            Le stagioni usano listoni ricostruiti dalle statistiche storiche, con un punteggio di overall che riassume
            rendimento in campo e reputazione nel fantacalcio di quell'anno.
          </p>
          <p>
            Il codice è open source e il sito non ha scopo di lucro. Se ti va di dare una mano con un suggerimento o
            una segnalazione, il pulsante di supporto è nel piè di pagina.
          </p>
          <GameCta />
        </Prose>
      </article>
    </ContentLayout>
  );
}
