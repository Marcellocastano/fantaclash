import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { H2, PageTitle, Prose, Ul, Li } from '../blocks';

const route = buildRoutes().find(r => r.kind === 'privacy')!;

/** Privacy policy: nessun account, salvataggio nel browser, analytics anonime */
export function PrivacyPage() {
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Privacy">Privacy e dati</PageTitle>
        <Prose>
          <p>
            FantaClash è un gioco che gira interamente nel browser, senza account e senza raccolta di dati personali.
            Questa pagina spiega cosa viene salvato e dove.
          </p>

          <H2>Dati di gioco</H2>
          <p>
            Il nome della squadra, la stagione scelta, lo stato dell'asta e il tabellone del torneo vengono salvati
            nel <strong>localStorage</strong> del tuo browser, sul dispositivo che stai usando. Il gioco non invia
            questi dati a nessun server: servono solo per riprendere la partita da dove eri rimasto quando chiudi e
            riapri la pagina.
          </p>
          <Ul>
            <Li>
              <strong>Salvataggio automatico</strong>: a ogni turno il gioco scrive lo stato nel browser. Puoi
              cancellarlo ricominciando da capo con "Nuova partita" dal menu.
            </Li>
            <Li>
              <strong>Nessun account</strong>: non serve registrarsi e non viene chiesta la email.
            </Li>
            <Li>
              <strong>Nessun cookie di profilazione</strong>: non ci sono banner, non ci sono tracker di terze parti.
            </Li>
          </Ul>

          <H2>Analytics</H2>
          <p>
            Per capire come viene usato il sito misuriamo le visite con <strong>GoatCounter</strong>, uno strumento
            senza cookie: conta le pagine visitate e gli eventi del gioco (inizio asta, torneo completato), senza
            identificare l'utente e senza profilazione. Le statistiche sono pubbliche solo a noi.
          </p>

          <H2>Font esterne e contenuti</H2>
          <p>
            Il sito non carica font, script o immagini da servizi di terze parti durante la navigazione. Le icone e i
            contenuti sono ospitati su questo stesso dominio. L'unico collegamento esterno, se attivo, è il pulsante
            di supporto che rimanda alla pagina di donazione del progetto.
          </p>

          <H2>Contatti</H2>
          <p>
            Per segnalare un problema o chiedere la cancellazione di un contenuto pubblicato su FantaClash puoi
            scrivere tramite il pulsante di supporto nel footer della pagina.
          </p>
        </Prose>
      </article>
    </ContentLayout>
  );
}
