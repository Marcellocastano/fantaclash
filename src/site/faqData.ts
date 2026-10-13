/**
 * Domande frequenti sulla home di FantaClash: il testo di /faq/ e i dati
 * strutturati FAQPage condividono questa lista (routes.ts, FaqPage.tsx).
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'FantaClash è gratis?',
    answer:
      'Sì. FantaClash è un gioco gratuito, senza pubblicità e senza acquisti in app. Non serve creare un account: apri la pagina e giochi.',
  },
  {
    question: 'Serve registrarsi o scaricare qualcosa?',
    answer:
      'No. FantaClash funziona nel browser, da computer, tablet e telefono. Il gioco viene salvato sul dispositivo che stai usando: niente account e niente dati raccolti.',
  },
  {
    question: 'Con quali stagioni si gioca?',
    answer:
      "Con 23 annate della Serie A, dalla 2003-04 alla 2025-26. Ogni stagione ha il suo listone di 144 giocatori reali, con le statistiche di quell'anno.",
  },
  {
    question: "Cos'è l'overall?",
    answer:
      "Un punteggio da 70 a 99 che riassume quanto un giocatore ha reso in quella stagione: rendimento in campo (media voto, gol, assist, presenze) più la reputazione nel fantacalcio dell'epoca.",
  },
  {
    question: "Come funziona l'asta?",
    answer:
      "Otto squadre con 250 crediti ciascuna si contendono i giocatori, reparto per reparto: portieri, difensori, centrocampisti e attaccanti. Chi chiama il giocatore parte da un credito, gli altri rilanciano; il cronometro torna a 5 secondi a ogni rilancio. Vince chi offre di più.",
  },
  {
    question: 'Quanti giocatori compra ogni squadra?',
    answer:
      'Dodici: un portiere, quattro difensori, quattro centrocampisti e tre attaccanti. Ne schieri otto scegliendo uno dei sei moduli; quattro sono riserve senza cambi automatici.',
  },
  {
    question: 'Cosa succede dopo l\u2019asta?',
    answer:
      "Puoi scegliere la coppa a eliminazione diretta (quarti, semifinale, finale) oppure due gironi da quattro con andata e ritorno, semifinali, finale e finale per il terzo posto. Nei gironi il pareggio vale un punto; in eliminazione diretta si va ai rigori. Prima di ogni partita scegli modulo e titolari.",
  },
  {
    question: 'Posso giocare contro i miei amici?',
    answer:
      "Sì, quando il multiplayer è attivo nella versione del sito: crea una stanza, invita da 1 a 7 amici con il codice e giocate insieme all'asta e alle partite. I bot completano i posti liberi.",
  },
  {
    question: 'La partita si salva se chiudo la pagina?',
    answer:
      'Sì, il gioco salva l\u2019asta e il torneo nel browser del dispositivo. Se ricarichi riprendi da dove eri rimasto; una partita del torneo interrotta riparte dal calcio d\u2019inizio.',
  },
  {
    question: 'FantaClash è collegato alla Lega Serie A o a Fantacalcio?',
    answer:
      'No. FantaClash è un progetto amatoriale indipendente, senza scopo di lucro. Fantacalcio® e Serie A sono marchi dei rispettivi titolari.',
  },
];
