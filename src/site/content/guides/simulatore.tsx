import { GuideBody } from './types';
import { H2, Li, Prose, Ul } from '../../blocks';

/**
 * Guida: il simulatore d'asta come allenamento.
 * Descrivi qui FantaClash come strumento per allenarsi in vista delle aste
 * vere, non come gioco fine a se stesso.
 */
export const body: GuideBody = () => (
  <Prose>
    <p>
      L'asta del fantacalcio è l'unico momento dell'anno in cui non puoi cambiare idea: quello che compri ad agosto lo
      tieni fino a giugno. Eppure la maggior parte dei fantallenatori ci arriva senza averne fatta una di prova da mesi.
      Un simulatore d'asta serve a questo: fare pratica senza rischiare la stagione.
    </p>

    <H2>Cosa impara chi si allena</H2>
    <Ul>
      <Li>
        <strong>Il ritmo del timer.</strong> Cinque secondi per rilancio sembrano pochi finché non sei sotto pressione
        su un giocatore che vuoi davvero. Avere il polso già allenato conta.
      </Li>
      <Li>
        <strong>Quanto vale un giocatore.</strong> Dopo un'asta sai che i portieri buoni costano tra 8 e 15 e che gli
        ultimi attaccanti partono a poco. Il prezzo giusto non si legge in una lista, si impara facendola.
      </Li>
      <Li>
        <strong>La gestione dei crediti.</strong> Nessuno si accorge di aver sforato il budget finché non deve
        rilanciare. In un simulatore lo scopri senza conseguenze.
      </Li>
      <Li>
        <strong>Leggere gli avversari.</strong> Chi bluffa, chi rincorre, chi aspetta la fine del reparto. Le asta sono
        un gioco di informazione, e la pratica serve a questo.
      </Li>
    </Ul>

    <H2>Come funziona FantaClash</H2>
    <p>
      FantaClash è un simulatore d'asta sulle stagioni storiche della Serie A: scegli un'annata dal 2003-04 al
      2025-26, e affronti sette avversari comandati dal computer. Ogni bot ha una personalità: c'è chi offre solo per
      i fuoriclasse, chi rilancia sui pupilli, chi aspetta i lotti finali. L'asta si conclude in pochi minuti e puoi
      rigiocarla su un'altra stagione o cambiare strategia.
    </p>
    <p>
      Dopo l'asta la stagione non finisce: le otto rose entrano in un torneo a eliminazione diretta e guardi le
      partite con cronaca e pagelle. Così la stessa asta diventa anche una prova di quanto hai comprato bene.
    </p>

    <H2>Due livelli di difficoltà</H2>
    <p>
      All'inizio conviene partire da Normale: i bot sbagliano, sottovalutano alcune fasce e lasciano andare i top
      giocatori a prezzi umani. Quando inizi a vincere regolarmente puoi passare a Difficile, dove la competizione
      sui top è più aggressiva e gli errori di valutazione si pagano.
    </p>

    <H2>Allenarsi su un'asta vera, più corta</H2>
    <p>
      L'asta di FantaClash è più corta di una classica asta di fantacalcio: 96 giocatori in listone, 8 per rosa. Il
      vantaggio è che una sessione dura pochi minuti, e in una serata ne fai tre. Il ritmo del timer, la rotazione dei
      chiamanti e la logica dei rilanci però sono quelli veri: chi si allena qui arriva all'asta reale già abituato.
    </p>
    <p>
      Se vuoi capire meglio le regole di base, la guida su{' '}
      <a href="/guida/come-funziona-asta-fantacalcio/" className="text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold">
        come funziona l'asta del fantacalcio
      </a>{' '}
      è il posto giusto. E per imparare a vincere, le{' '}
      <a href="/guida/strategie-asta-fantacalcio/" className="text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold">
        strategie d'asta
      </a>{' '}
      ti aspettano.
    </p>
  </Prose>
);
