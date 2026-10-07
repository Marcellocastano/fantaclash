import { GuideBody } from './types';
import { H2, Prose, Table } from '../../blocks';

/**
 * Guida: strategie per l'asta del fantacalcio.
 * Le sette mosse sono descritte sulle meccaniche di FantaClash (personalità
 * dei bot, rilanci a 5 secondi, reparti a fasi) ma valgono in ogni asta.
 */
export const body: GuideBody = () => (
  <Prose>
    <p>
      Ogni asta ha le stesse regole, ma si vincono con strategie diverse: c'è chi punta tutto sui campioni, chi caccia
      le occasioni, chi aspetta che gli altri si svenino. Questa guida raccoglie le mosse che funzionano davvero, e che
      i bot di FantaClash usano contro di te.
    </p>

    <H2>1. Decidi prima dove spendere</H2>
    <p>
      Cento crediti divisi in 8 posti significano circa 12 a giocatore, ma nessuno deve spenderli davvero così. Le
      scuole di pensiero sono due: il "totem", con due campioni e sei giocatori di fascia bassa, e la rosa bilanciata,
      con tutti i titolari di fascia media-alta. Non esiste una risposta giusta, esiste solo sceglierla prima
      dell'asta: chi decide durante compra i primi troppo cari e gli ultimi troppo tardi.
    </p>

    <H2>2. I primi lotti costano di più, sempre</H2>
    <p>
      A inizio reparto tutti hanno il budget pieno e nessuno vuole partire male: il primo giocatore buono va a prezzo
      pieno o di più. Nel corso del reparto i prezzi calano, perché chi ha già speso smette di rilanciare. Se il tuo
      obiettivo è un giocatore preciso, l'ultimo disponibile di fascia alta di solito costa meno del primo. Il prezzo è
      il punto debole delle asta: la pazienza paga.
    </p>

    <H2>3. Guarda le rose, non i nomi</H2>
    <p>
      Il prezzo di un giocatore non lo fa la scheda: lo fanno le rose avversarie. Se sei squadre hanno già il portiere,
      il portiere forte che esce adesso non ha mercato, e pagarlo un credito è possibile. Al contrario, se tre squadre
      devono ancora prendere l'attaccante, l'ultimo titolare va a rincorsa. FantaClash mostra tutte le rose in colonna:
      le guardi tra un lotto e l'altro, è il dato più importante dell'asta.
    </p>

    <H2>4. Rilancia meno, rilancia di più</H2>
    <p>
      Ogni rilancio segnala agli avversari che ti interessa il giocatore. Le due scuole: chi rilancia poco alla volta
      allunga il lotto e logora gli avversari; chi rilancia a scatti grandi chiude i lotto deboli subito. Un rilancio
      da 15 quando l'offerta è a 3 dice due cose: "lo voglio" e "mi restano crediti". Usalo di rado, o perde effetto.
    </p>

    <H2>5. Il rilancio all'ultimo secondo non chiude nulla</H2>
    <p>
      Una credenza diffusa: "rilancio all'ultimo secondo così gli altri non fanno in tempo". Falso: ogni rilancio
      riporta il timer a 5 secondi, quindi un rilancio tardi non vince il lotto, lo allunga. Serve solo a logorare chi
      vuole il giocatore e a sondare il suo budget. Se vuoi davvero chiudere, offri un prezzo che gli altri non possono
      o non vogliono pareggiare.
    </p>

    <H2>6. Ogni bot (e ogni amico) ha una personalità</H2>
    <p>
      I giocatori d'asta si dividono in archetipi riconoscibili. In FantaClash i bot sono fatti apposta per
      allenarti a leggerli:
    </p>
    <Table
      head={['Personalità', 'Come si comporta', 'Come batterla']}
      rows={[
        ['Il parsimonioso', 'Offre solo per il massimo valore per credito', 'Lo logori rilanciando, non rischia mai'],
        ['Lo stratega', 'Ti fa alzare i prezzi senza voler comprare', 'Non seguirlo su giocatori che non ti interessano'],
        ['Il cacciatore', 'Vince sempre i suoi pupilli, a qualsiasi prezzo', 'Digli "prego" e tieni i crediti per dopo'],
        ['Il furbo', 'Aspetta gli ultimi giocatori di reparto', 'Non aspettarlo: compra prima tu'],
      ]}
    />
    <p>
      Il trucco è lo stesso contro persone vere: dopo un reparto capisci chi hai davanti, e da lì giochi contro i loro
      limiti, non contro i nomi.
    </p>

    <H2>7. Gestisci il fiato dei crediti</H2>
    <p>
      Alla fine del reparto dei centrocampisti chi ha speso troppo guarda gli attaccanti dagli spalti. La regola
      pratica: se hai ancora più di un posto libero, non superare mai il tuo budget diviso il numero di posti, più la
      metà. Chi sfora la linea compra a 25 un giocatore da 15 e poi perde l'ultimo titolare a 4.
    </p>

    <H2>Provarle sul serio</H2>
    <p>
      Tutte queste mosse puoi testarle senza aspettare l'asta vera: in FantaClash i bot rilanciano, bluffano e hanno
      personalità diverse. Se vuoi allenarti, la guida al <a href="/guida/simulatore-asta-fantacalcio/" className="text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold">simulatore d'asta</a> spiega
      come.
    </p>
  </Prose>
);
