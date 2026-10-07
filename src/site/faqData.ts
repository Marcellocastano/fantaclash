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
      "Con 23 annate della Serie A, dalla 2003-04 alla 2025-26. Ogni stagione ha il suo listone di 96 giocatori reali, con le statistiche di quell'anno.",
  },
  {
    question: "Cos'è l'overall?",
    answer:
      "Un punteggio da 70 a 99 che riassume quanto un giocatore ha reso in quella stagione: rendimento in campo (media voto, gol, assist, presenze) più la reputazione nel fantacalcio dell'epoca.",
  },
  {
    question: "Come funziona l'asta?",
    answer:
      "Otto squadre con 100 crediti ciascuna si contendono i giocatori, reparto per reparto: portieri, difensori, centrocampisti e attaccanti. Chi chiama il giocatore parte da un credito, gli altri rilanciano; il cronometro torna a 5 secondi a ogni rilancio. Vince chi offre di più.",
  },
  {
    question: 'Quanti giocatori compra ogni squadra?',
    answer:
      'Otto, con modulo fisso 1-2-3-2: un portiere, due difensori, tre centrocampisti e due attaccanti. Niente panchina.',
  },
  {
    question: 'Cosa succede dopo l\u2019asta?',
    answer:
      "Le otto squadre giocano una coppa a eliminazione diretta: quarti, semifinali e finale, con sorteggio e rigori in caso di pareggio. La tua partita la guardi e la guidi scegliendo lo stile di gioco; se si va ai rigori scegli anche l'ordine dei rigoristi.",
  },
  {
    question: 'Posso giocare contro i miei amici?',
    answer:
      "Non ancora: gli avversari sono bot con personalità diverse. Il multiplayer è tra le idee per il futuro, insieme alle partite personalizzate.",
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
