# FantaClash

Gioco di fantacalcio sulle stagioni storiche della Serie A, dal 2003-04 al 2025-26.

Scegli un'annata, sfidi 7 bot in un'asta con 250 crediti e costruisci una rosa da 12. Prima di ogni match selezioni 8 titolari compatibili e uno dei sei moduli. Le 8 squadre giocano una coppa a eliminazione diretta oppure due gironi da quattro con andata e ritorno, semifinali, finale e finale per il terzo posto. Il modulo influenza la simulazione; guidi la partita scegliendo anche lo stile di gioco.

## Come funziona

- **Asta**: 8 squadre, 250 crediti e 12 giocatori per rosa; timer da 5 secondi e bot con strategie tattiche/economiche diverse.
- **Listone**: 144 giocatori reali per annata (12 P, 48 D, 48 C, 36 A), con overall calcolato da statistiche e quotazioni storiche.
- **Formazioni**: sei moduli selezionabili, otto titolari validati per ruolo e quattro riserve senza cambi automatici.
- **Torneo**: knockout o gironi andata/ritorno (sei partite garantite), classifica, final four; partite minuto per minuto con cronaca, statistiche, pagelle e rigori solo nelle gare a eliminazione.
- **Fine torneo**: una card riepilogativa da scaricare o condividere.
- **Multiplayer** (dietro flag): stanze con codice per giocare in 2-8 amici la stessa asta e lo stesso torneo in tempo reale, con spettatori; i posti vuoti li riempiono i bot.
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

FantaClash è un progetto amatoriale senza scopo di lucro e non ha legami con la Lega Serie A o con i club.
