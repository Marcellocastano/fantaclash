import { GuideBody } from './types';
import { H2, Li, Prose, Ul } from '../../blocks';

/**
 * Guida: il fantacalcio sulle stagioni storiche.
 * Spiega cosa rende diverso un'asta sul 2006-07 rispetto a una sull'anno
 * corrente, e come nasce l'overall dei giocatori.
 */
export const body: GuideBody = () => (
  <Prose>
    <p>
      Il fantacalcio classico si gioca sulla stagione in corso. C'è un modo diverso per farlo: prendere una stagione
      del passato, ricostruire il listone e fare l'asta come se fosse di nuovo quell'anno. FantaClash nasce da questa
      idea, e copre 23 annate della Serie A, dalla 2003-04 alla 2025-26.
    </p>

    <H2>Perché le stagioni passate</H2>
    <p>
      Il fantacalcio sulle stagioni storiche toglie il lato "chi ha più informazioni vince" e aggiunge quello "chi
      ricorda meglio vince". Conosci già i nomi e sai come è finita quella stagione, ma non sai chi dei tuoi amici
      punta lo stesso giocatore, e il prezzo resta una scommessa. In più permette sfide impossibili nel fantacalcio
      normale: la tua squadra del 2006-07 contro quella di chi sceglieva il 2015-16, ad esempio.
    </p>

    <H2>Cosa cambia rispetto all'anno in corso</H2>
    <Ul>
      <Li>
        <strong>Giocatori diversi per fascia.</strong> Il 2006-07 aveva Kakà e Totti nei primi posti, il 2015-16
        Higuain e Pogba, il 2024-25 i nuovi campioni. Le fasce di prezzo e le scelte tattiche cambiano ad ogni
        annata.
      </Li>
      <Li>
        <strong>Nessun "scouting" possibile.</strong> Le squadre sono congelate a quella stagione: nessuno può
        inventarsi il giocatore che poi esploderà. Se Buffon è nel 2006-07 con overall 94, è finito lì.
      </Li>
      <Li>
        <strong>Stessa annata, stessa partita.</strong> Tutti giocano con lo stesso listone e lo stesso storico. Le
        differenze sono solo nelle scelte d'asta.
      </Li>
    </Ul>

    <H2>Come nasce l'overall</H2>
    <p>
      Ogni giocatore del listone ha un punteggio, l'overall, da 70 a 99. Non è il valore di mercato: è quanto quel
      giocatore ha reso nella stagione specifica. La formula usa due elementi:
    </p>
    <Ul>
      <Li>
        <strong>Il rendimento in campo</strong>, cioè la media voto, i gol, gli assist, le presenze e i cartellini di
        quell'annata.
      </Li>
      <Li>
        <strong>La reputazione nel fantacalcio</strong>, perché giocare nella Juventus o nel Milan del 2007 non è come
        giocare in una squadra di fondo classifica, anche se le statistiche sono simili.
      </Li>
    </Ul>
    <p>
      Il risultato è un listone dove i fuoriclasse sono riconoscibili (overall 90 e oltre) e le sorprese si pagano
      meno. Gli overall guidano sia l'asta, dove i bot li usano per fare offerte, sia il torneo, dove la forza della
      rosa influenza le partite.
    </p>

    <H2>Idee per giocarci in compagnia</H2>
    <p>
      FantaClash è pensato per giocare da soli contro i bot, ma si presta anche alle sfide tra amici:
    </p>
    <Ul>
      <Li>
        <strong>Stessa stagione, stessa rosa.</strong> Due giocatori fanno la stessa asta separatamente e confrontano
        la formazione ottenuta: chi ha speso meglio i crediti?
      </Li>
      <Li>
        <strong>Annate a confronto.</strong> Chi vince un torneo sul 2006-07 contro chi l'ha vinto sul 2015-16? La
        card del torneo dice chi ha avuto la rosa più forte.
      </Li>
      <Li>
        <strong>Solo uno lo sa.</strong> Ogni giocatore sceglie la sua stagione preferita e gioca l'asta: alla fine si
        confrontano i risultati del torneo.
      </Li>
    </Ul>

    <H2>Le 23 stagioni</H2>
    <p>
      Dal 2003-04 (il Milan di Shevchenko e Kakà, la Juventus di Capello) al 2025-26. Ogni stagione è il suo mondo:
      i campioni cambiano, le squadre cambiano, le strategie cambiano. Se vuoi sfogliare i migliori di ogni annata,
      le <a href="/top-11/" className="text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold">Top 11 per stagione</a> ti aspettano.
    </p>
  </Prose>
);
