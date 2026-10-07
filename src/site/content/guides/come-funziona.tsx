import { GuideBody } from './types';
import { H2, Li, Prose, Table, Ul } from '../../blocks';

/**
 * Guida: come funziona l'asta del fantacalcio.
 * I numeri citati (100 crediti, 5 secondi, modulo 1-2-3-2) sono quelli di
 * FantaClash; le meccaniche generali valgono per ogni asta fantacalcistica.
 */
export const body: GuideBody = () => (
  <Prose>
    <p>
      L'asta del fantacalcio è il momento in cui si costruisce la squadra, ed è anche quello in cui si perdono più
      partite: un errore di valutazione in asta si trascina per mesi. Capire come funziona, e provarla prima, fa la
      differenza tra una rosa completa e una rosa sbilanciata.
    </p>
    <p>
      Questa guida usa le regole di FantaClash, il simulatore d'asta sulle stagioni storiche della Serie A, ma le
      meccaniche sono le stesse di quasi tutte le aste fantacalcistiche.
    </p>

    <H2>La struttura di un'asta</H2>
    <p>
      Un'asta è una successione di lotti. A ogni turno un partecipante chiama un giocatore: da quel momento il giocatore
      è all'asta e tutti possono rilanciare. In FantaClash le squadre sono 8 e la chiamata ruota in ordine: quando tocca
      a te, il giocatore del lotto lo scegli tu, e questa è già una strategia.
    </p>
    <Ul>
      <Li>
        <strong>Chiamata.</strong> Chi chiama il giocatore fa l'offerta d'apertura, di solito pari al minimo. In
        FantaClash l'apertura vale 1 credito.
      </Li>
      <Li>
        <strong>Rilanci.</strong> Gli altri partecipanti rilanciano al rialzo, di quanto vogliono. Ogni rilancio
        riporta il cronometro a zero: in FantaClash ci sono 5 secondi per decidere.
      </Li>
      <Li>
        <strong>Aggiudicazione.</strong> Quando il cronometro finisce senza rilanci, il giocatore va a chi ha offerto di
        più, al prezzo dell'ultima offerta.
      </Li>
    </Ul>
    <p>
      Molte aste reali dividono il listone per reparti: prima i portieri, poi i difensori, i centrocampisti e gli
      attaccanti. FantaClash funziona così: quando finisce un reparto si passa al successivo. Il risultato è che il
      mercato si apre e si chiude a fasi, e chi resta senza crediti quando escono gli attaccanti se ne pente.
    </p>

    <H2>Il budget e la regola più importante</H2>
    <p>
      Ogni squadra ha un budget fisso, in FantaClash 100 crediti, e deve comprare un numero fisso di giocatori, in
      FantaClash 8 con il modulo 1-2-3-2 (un portiere, due difensori, tre centrocampisti, due attaccanti).
    </p>
    <p>
      Da qui nasce la regola più importante di ogni asta:
    </p>
    <p>
      <strong>
        L'offerta massima non sono i crediti che hai, ma i crediti che hai meno un credito per ogni altro posto libero.
      </strong>
    </p>
    <p>
      Se ti restano 40 crediti e 5 posti liberi, puoi offrire al massimo 36: ti serve almeno un credito per ogni
      giocatore rimasto. Chi dimentica questo vincolo si trova a fine asta con il bidello come ottavo uomo. FantaClash
      applica il limite da solo (i rilanci oltre il massimo sono impossibili), nelle aste tra amici conviene segnarselo.
    </p>

    <H2>Un esempio concreto</H2>
    <p>Portieri, seconda chiamata. La squadra A chiama un portiere fuoriclasse. La puntata è di 1 credito.</p>
    <Table
      head={['Mossa', 'Offerta', 'Timer']}
      rows={[
        ['A chiama il giocatore', '1', '5"'],
        ['B rilancia', '4', 'torna a 5"'],
        ['C rilancia', '7', 'torna a 5"'],
        ['A rilancia', '9', 'torna a 5"'],
        ['Nessuno rilancia', '—', 'venduto a 9'],
      ]}
    />
    <p>
      Il giocatore costa 9: meno del suo valore, perché quasi tutte le squadre si tengono pronte per i portieri che
      devono ancora uscire. Capire quando gli avversari hanno voglia di spendere e quando no è metà del gioco.
    </p>

    <H2>Perché i rilanci riavviano il cronometro</H2>
    <p>
      La regola dei 5 secondi che ripartono a ogni rilancio esiste per dare a tutti il tempo di pensare, ma cambia la
      psicologia dell'asta: chi rilancia all'ultimo secondo non chiude il lotto, lo riapre. Per questo le battaglie vere
      si giocano nei primi secondi e negli ultimi. Nel mezzo si studia: chi ha già preso il portiere, quanti crediti
      restano a ognuno, chi sta spendendo troppo.
    </p>

    <H2>Gli errori più comuni</H2>
    <Ul>
      <Li>
        <strong>Spendere subito tutto sui primi nomi.</strong> I fuoriclasse escono a ogni reparto: pagare il primo che
        esce il prezzo pieno significa non avere crediti per gli ultimi, che spesso partono a metà prezzo.
      </Li>
      <Li>
        <strong>Rilanciare su ogni chiamata.</strong> Ogni rilancio è anche un'informazione data gratis agli avversari:
        chi rilancia su tutto dice a tutti quanto budget ha e quanto ci tiene.
      </Li>
      <Li>
        <strong>Ignorare le rose altrui.</strong> Se gli altri hanno già il portiere, il tuo portiere costa di meno.
        Guardare le rose degli avversari vale più di guardare il giocatore.
      </Li>
      <Li>
        <strong>Arrivare alla fine senza crediti.</strong> Gli ultimi lotti di un reparto sono gli affari del giorno.
      </Li>
    </Ul>

    <H2>Come allenarsi</H2>
    <p>
      L'asta si impara giocando, e le aste vere capitano una volta all'anno. FantaClash nasce proprio per questo: un
      simulatore d'asta con bot che rilanciano, bluffano e hanno personalità diverse, sulle stagioni storiche della
      Serie A. Se vuoi provare le strategie di questa guida senza aspettare agosto, basta scegliere un'annata e
      iniziare.
    </p>
  </Prose>
);
