# FantaClash

Gioco di fantacalcio sulle stagioni storiche della Serie A, dal 2003-04 al 2025-26.

Scegli un'annata (o il listone Legends con i migliori di sempre), sfidi 7 bot in un'asta con 100 crediti e costruisci una rosa di 8 giocatori con modulo 1-2-3-2. Poi le 8 squadre si giocano una coppa a eliminazione diretta: quarti, semifinali e finale, a gara secca o con andata e ritorno. La tua partita la guardi e la guidi scegliendo lo stile di gioco; le altre si simulano.

## Come funziona

- **Asta**: per reparti, dai portieri agli attaccanti. Ogni rilancio riporta il timer a 5 secondi. I bot hanno personalità diverse. Puoi simulare un giocatore, un reparto o l'intera asta.
- **Listone**: 96 giocatori reali per annata, con un overall calcolato da statistiche e quotazioni storiche. In alternativa c'è il listone **Legends**: i 96 più forti delle 23 stagioni, una card per giocatore nella sua annata migliore, overall riscritti da 84 a 99.
- **Torneo**: sorteggio, tabellone, partite simulate minuto per minuto con cronaca, statistiche, pagelle e lotteria dei rigori (l'ordine dei rigoristi lo scegli tu). Nel formato **andata e ritorno** quarti e semifinali si giocano su due partite — prima tutte le andate, poi i ritorni a casa invertita — e passa l'aggregato migliore; a parità, rigori al ritorno. La finale è sempre secca.
- **Fine torneo**: una card riepilogativa da scaricare o condividere.
- **Multiplayer** (dietro flag): stanze con codice per giocare in 2-8 amici la stessa asta e lo stesso torneo in tempo reale, con spettatori; i posti vuoti li riempiono i bot. Il listone Legends è selezionabile anche nelle stanze (sempre a gara secca).
- **Modalità streamer**: dal menu si attiva un riquadro webcam fisso e il layout gli lascia spazio.

Il gioco singolo gira tutto nel browser, senza backend: la partita in corso viene salvata nel `localStorage`. Le stanze multiplayer usano Supabase Realtime come trasporto (l'host è il browser di chi crea la stanza; nessun database).

## Requisiti

- Node.js 20 o successivo
- npm

## Avvio

```bash
npm install
npm run dev
```

L'app è su `http://localhost:5173`.

## Comandi

```bash
npm run dev        # server di sviluppo
npm run build      # typecheck, build e pre-rendering delle pagine pubbliche
npm run preview    # anteprima della build
npm run test:run   # test
npm run lint       # eslint
npm run seo:check  # controlli SEO su dist/ (dopo la build)
```

## Configurazione

Variabili facoltative in `.env.local`:

```bash
VITE_SUPPORT_URL=https://...        # link del pulsante "Supporta" (default: ko-fi.com/fantaclash)
VITE_GOATCOUNTER_CODE=fantaclash    # analytics senza cookie (vuoto = nessuno script)
VITE_MULTIPLAYER=1                  # attiva /multiplayer/ (richiede le due variabili sotto)
VITE_SUPABASE_URL=https://....supabase.co
VITE_SUPABASE_ANON_KEY=...          # chiave anon pubblica di Supabase
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Vitest e Testing Library.

## Struttura

```
src/
  components/    interfaccia (landing, asta, torneo, partita)
  domain/        motore della partita e del torneo (TypeScript puro)
  multiplayer/   stanze multiplayer: protocollo, sessioni, trasporto (TypeScript puro)
  services/      motore d'asta, dati delle stagioni, salvataggio, card
  hooks/         collegamento tra motori e interfaccia
  site/          rotte, meta tag e pagine pubbliche pre-renderizzate
public/data/     listoni delle 23 stagioni in JSON
data-pipeline/   script che generano i listoni
```

## Dati

I listoni in `public/data/seasons/` sono generati dalla pipeline in `data-pipeline/` a partire da statistiche storiche. I dati sorgente non fanno parte del repository.

Il listone Legends si rigenera dai JSON delle annate (serve prima averli tutti):

```bash
node data-pipeline/src/build/legends.ts
```

FantaClash è un progetto amatoriale senza scopo di lucro e non ha legami con la Lega Serie A o con i club.
