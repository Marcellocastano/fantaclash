import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, H2, Li, PageTitle, Prose, Table, Ul } from '../blocks';

const route = buildRoutes().find(r => r.kind === 'rules')!;

/**
 * Le regole di FantaClash: numeri presi dalle costanti del gioco
 * (src/services/auction/rules.ts, src/types/index.ts). Se cambiano le
 * regole, aggiornare questa pagina.
 */
export function RulesPage() {
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker="Regolamento">Regole di FantaClash: asta, rosa e torneo</PageTitle>
        <Prose>
          <p>
            FantaClash è un gioco di fantacalcio ad asta sulle stagioni storiche della Serie A: scegli un'annata, vinci
            l'asta contro 7 avversari comandati dal computer e porta la tua squadra a una coppa a eliminazione diretta.
            Qui trovi tutte le regole, con i numeri esatti usati dal gioco.
          </p>

          <H2>La squadra</H2>
          <Ul>
            <Li>
              <strong>8 squadre</strong> in ogni torneo: la tua e 7 bot, ognuno con una personalità diversa (c'è chi
              spende solo per i fuoriclasse, chi punta tutto sui pupilli, chi aspetta gli ultimi giocatori di un
              reparto).
            </Li>
            <Li>
              <strong>100 crediti</strong> per squadra, identici per tutti.
            </Li>
            <Li>
              <strong>Rosa da 8 giocatori</strong> con modulo fisso <strong>1-2-3-2</strong>: un portiere, due
              difensori, tre centrocampisti e due attaccanti. Niente panchina: ogni acquisto conta.
            </Li>
          </Ul>

          <H2>Il listone</H2>
          <p>
            Ogni annata ha un listone di <strong>96 giocatori reali</strong>: 12 portieri, 24 difensori, 36
            centrocampisti e 24 attaccanti. Sono i migliori della Serie A di quella stagione, scelti per valore di
            listone. Accanto al nome trovi l'overall, un punteggio da 70 a 99 che riassume rendimento in campo e
            reputazione nel fantacalcio di quell'anno. I giocatori sono divisi in fasce: bronzo fino a 79, argento da
            80 a 84, oro da 85 a 89, fuoriclasse da 90 in su.
          </p>

          <H2>L'asta</H2>
          <Ul>
            <Li>
              Si gioca <strong>per reparti</strong>: prima tutti i portieri, poi i difensori, i centrocampisti e infine
              gli attaccanti. A ogni giro una squadra chiama un giocatore da mettere all'asta; la chiamata ruota tra
              le squadre e continua anche quando cambia il reparto.
            </Li>
            <Li>
              Chi chiama fa <strong>l'offerta d'apertura da 1 credito</strong>. Gli altri rilanciano di quanto vogliono,
              purché restino sotto il loro massimo.
            </Li>
            <Li>
              Il <strong>cronometro è di 5 secondi</strong> e riparte a ogni rilancio: chi non rilancia in tempo resta
              fuori. All'ultimo secondo un rilancio allunga sempre il lotto.
            </Li>
            <Li>
              <strong>L'offerta massima</strong> è pari ai crediti rimasti meno un credito per ogni altro posto libero:
              la rosa deve potersi completare, non puoi scommettere tutto su un solo giocatore.
            </Li>
            <Li>
              Chi vince paga il prezzo dell'ultima offerta e il giocatore entra in rosa. L'asta continua finché tutte
              le 8 squadre non hanno gli 8 giocatori.
            </Li>
          </Ul>

          <H2>Il torneo</H2>
          <Ul>
            <Li>
              Coppa a eliminazione diretta a 8 squadre: <strong>quarti di finale, semifinali e finale</strong>, con il
              sorteggio degli accoppiamenti dopo l'asta.
            </Li>
            <Li>
              Le partite si svolgono minuto per minuto: occasione, tiro, parata o gol, con cartellini, rigori ed
              eventi rari. In caso di pareggio si va ai <strong>calci di rigore</strong> ad oltranza.
            </Li>
            <Li>
              Nella tua partita scegli lo <strong>stile di gioco</strong> (attacca, equilibrata o difendi) al calcio
              d'inizio, all'intervallo e al 75'. Ogni stile cambia le occasioni e il consumo di fiato della squadra:
              più attacchi, più corri, più ti stanchi.
            </Li>
            <Li>
              Se si va ai rigori scegli tu <strong>l'ordine dei rigoristi</strong>: chi tira per primo conta, perché le
              probabilità cambiano da giocatore a giocatore.
            </Li>
            <Li>
              Le altre partite del turno si simulano da sole quando finisce la tua. Alla fine ottieni una card del
              torneo da scaricare o condividere.
            </Li>
          </Ul>

          <H2>Voti e fantavoti</H2>
          <p>
            Dopo ogni partita ogni giocatore riceve un <strong>voto</strong>, che misura il rendimento, e un
            <strong> fantavoto</strong>, che aggiunge i bonus e i malus degli eventi. I bonus e i malus sono quelli
            classici del fantacalcio:
          </p>
          <Table
            head={['Evento', 'Bonus / malus']}
            rows={[
              ['Gol', '+3'],
              ['Assist', '+1'],
              ['Gol subito (portiere)', '−1'],
              ['Rigore parato', '+3'],
              ['Rigore sbagliato', '−3'],
              ['Ammonizione', '−0,5'],
              ['Espulsione', '−1'],
              ['Autogol', '−2'],
              ['Porta inviolata (portiere)', '+1'],
            ]}
          />
          <p>
            Il fantavoto di squadra decide i premi di fine torneo: campione, finalista o eliminato. Il giocatore con
            la fantamedia più alta del torneo diventa il MVP della tua card.
          </p>

          <GameCta text="Le regole si imparano in un'asta sola. Scegli l'annata e prova." />
        </Prose>
      </article>
    </ContentLayout>
  );
}
