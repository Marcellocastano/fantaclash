import { ReactNode, useState } from 'react';
import { MULTIPLAYER_ENABLED } from '../config';
import { GameConfig, Player } from '../types';
import { Icon } from './Icon';
import { Footer } from './Footer';
import { GUIDES } from '../site/routes';
import { SetupForm } from './SetupForm';
import { StickerAlbum } from './StickerAlbum';
import { PlayerCard } from './player/PlayerCard';
import { Tier, TIER_CLASSES } from './player/tier';

interface LandingProps {
  onSubmit: (config: GameConfig) => void | Promise<void>;
}

/** Giocatore d'esempio per l'anteprima dell'asta (non viene dal listone) */
const SAMPLE_PLAYER: Player = {
  id: 'esempio',
  name: 'BARELLA Nicolò',
  role: 'C',
  team: 'Inter',
  baseValue: 24,
  avgRating: 6.6,
  goalProbability: 0.12,
  assistProbability: 0.21,
  yellowCardProbability: 0.25,
  redCardProbability: 0.01,
  reliability: 0.9,
  overall: 88,
};

/** Il regolamento in cifre, come su un tabellone */
const NUMBERS: { value: string; label: string }[] = [
  { value: '8', label: 'squadre' },
  { value: '100', label: 'crediti a testa' },
  { value: '8', label: 'giocatori in rosa' },
  { value: '5"', label: 'per rilanciare' },
  { value: '1-2-3-2', label: 'il modulo' },
];

/** Regole come figurine: il numero grande sta al posto dell'overall, il colore è quello di una fascia */
const TILTS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2'];

const RULES: { value: string; unit: string; term: string; text: string; tier: Tier; tilt: string }[] = [
  { value: '5"', unit: 'per rilancio', term: 'Asta', text: 'Per reparti, dai portieri agli attaccanti. Si parte da 1 credito e ogni rilancio riporta il timer a 5 secondi. Tieni almeno 1 credito per ogni posto libero.', tier: 'bronze', tilt: '-rotate-1' },
  { value: '96', unit: 'giocatori', term: 'Listone', text: "I giocatori veri dell'annata, con overall calcolato su statistiche e quotazioni storiche.", tier: 'silver', tilt: 'rotate-1' },
  { value: '7', unit: 'avversari', term: 'Bot', text: "Ognuno ha una personalità d'asta: c'è chi punta ai big e chi aspetta l'affare.", tier: 'gold', tilt: '-rotate-1' },
  { value: "90'", unit: 'più i rigori', term: 'Partita', text: "Contano qualità, forma del giorno, reparti e stile scelto. Pareggio? Rigori, e l'ordine dei rigoristi lo decidi tu.", tier: 'elite', tilt: 'rotate-1' },
];

/**
 * Landing: presenta il gioco, mostra anteprime vere delle tre fasi e
 * integra il form per iniziare a giocare.
 */
export function Landing({ onSubmit }: LandingProps) {
  const [season, setSeason] = useState<string | null>(null);
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1">
        {/* Hero: l'album dell'annata aperto sulla scrivania. A sinistra
            l'etichetta con il form, a destra la pagina delle figurine. */}
        <section className="bg-surface border-b-4 border-ink">
          <div className="max-w-[1300px] mx-auto px-4 py-12">
            <div className="relative grid lg:grid-cols-2 bg-canvas border-4 border-ink shadow-block-lg">
              {/* Dorso dell'album con le cuciture */}
              <span className="hidden lg:block absolute inset-y-0 left-1/2 w-5 -ml-2.5 bg-pitch-deep border-x-2 border-ink" aria-hidden="true">
                <span className="absolute inset-y-3 left-1/2 border-l-2 border-dashed border-canvas/40" />
              </span>

              <div className="p-5 sm:p-8 lg:pr-12">
                <p className="font-semibold text-ink-soft">Serie A · 23 annate, dal 2003-04 al 2025-26</p>
                <h1 className="mt-3">
                  <span className="block font-display text-2xl md:text-3xl font-extrabold text-ink leading-tight">
                    L'asta del fantacalcio nostalgico
                  </span>
                  <span className="block font-display text-5xl sm:text-7xl md:text-8xl font-black leading-[0.85] mt-2 break-words">
                    FANTA<span className="text-pitch">CLASH</span>
                  </span>
                </h1>
                <p className="text-lg text-ink-soft mt-5">
                  Sfida 7 bot per i campioni della stagione che scegli, costruisci il tuo 1-2-3-2 e portalo fino alla finale.
                </p>

                {/* Etichetta dell'album: il form */}
                <div className="mt-6 sm:mt-8 border-2 border-ink p-1 sm:p-1.5 bg-canvas">
                  <div className="border-2 border-dashed border-line-strong p-3 sm:p-5">
                    <SetupForm onSubmit={onSubmit} onSeasonChange={setSeason} />
                  </div>
                </div>

                {MULTIPLAYER_ENABLED && (
                  <div className="mt-4 border-2 border-ink bg-canvas p-3 sm:p-4">
                    <p className="font-display font-extrabold text-ink">Multiplayer — gioca con gli amici</p>
                    <p className="text-sm text-ink-soft mt-1">Una stanza, un link, l’asta in diretta.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href="/multiplayer/?vista=crea" className="btn-primary text-center text-sm sm:text-base py-2">
                        Crea stanza
                      </a>
                      <a href="/multiplayer/?vista=entra" className="btn-ghost text-center text-sm sm:text-base py-2">
                        Entra con codice
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-8 lg:pl-12 border-t-4 lg:border-t-0 border-ink">
                <StickerAlbum season={season} />
              </div>
            </div>
          </div>
        </section>

        {/* Come si gioca: anteprime vere delle tre fasi */}
        <section id="come-si-gioca" className="scroll-mt-20">
          <div className="max-w-[1250px] mx-auto px-4 py-20">
            <h2 className="font-display text-6xl font-black text-ink leading-none">Come si gioca</h2>
            <div className="grid grid-cols-12 gap-x-0 gap-y-8 sm:gap-x-8 mt-12">
              <Preview className="col-span-12 lg:col-span-7 lg:row-span-2" n="1" title="Asta" text="A turno si chiama un giocatore. Rilancia, resisti allo scadere e prenditi i migliori.">
                <AuctionPreview />
              </Preview>
              <Preview className="col-span-12 sm:col-span-6 lg:col-span-5" n="2" title="Sorteggio" text="Le 8 rose finiscono nella boccia: quarti, semifinali e finale secca.">
                <DrawPreview />
              </Preview>
              <Preview className="col-span-12 sm:col-span-6 lg:col-span-5" n="3" title="Partita" text="Scegli lo stile, guarda la partita e, se serve, vinci ai rigori.">
                <MatchPreview />
              </Preview>
            </div>
          </div>
        </section>

        {/* Regole */}
        <section id="regole" className="scroll-mt-20">
          <div className="bg-pitch-deep border-y-4 border-ink">
            <dl className="max-w-[1250px] mx-auto px-4 grid grid-cols-2 sm:grid-cols-5">
              {NUMBERS.map((n, i) => (
                <div key={n.label} className={`py-8 px-4 text-center border-canvas/15 ${i ? 'sm:border-l-2' : ''}`}>
                  <dt className="sr-only">{n.label}</dt>
                  {/* Altezza fissa e cifre allineate in basso: le etichette stanno sulla stessa riga */}
                  <dd
                    className={`h-14 flex items-end justify-center font-display font-black text-highlight leading-none tabular-nums whitespace-nowrap ${
                      n.value.length > 3 ? 'text-4xl lg:text-5xl' : 'text-6xl'
                    }`}
                  >
                    {n.value}
                  </dd>
                  <dd className="text-sm font-semibold text-canvas/75 mt-2">{n.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="max-w-[1250px] mx-auto px-4 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-6xl font-black text-ink leading-none">Le regole in breve</h2>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              {RULES.map(r => {
                const t = TIER_CLASSES[r.tier];
                const elite = r.tier === 'elite';
                return (
                  <li key={r.term} className={`relative ${t.bg} ${t.ink} border-2 border-ink shadow-block p-5 ${r.tilt}`}>
                    {elite && <span className="absolute inset-1.5 border border-tier-elite-ink/60 pointer-events-none" aria-hidden="true" />}
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-5xl sm:text-6xl font-black leading-none tabular-nums">{r.value}</span>
                      <span className={`text-sm font-bold ${t.muted}`}>{r.unit}</span>
                    </p>
                    <h3 className={`font-display text-3xl sm:text-4xl font-black leading-none mt-5 ${elite ? 'text-canvas' : ''}`}>{r.term}</h3>
                    <p className={`mt-3 pt-3 border-t-2 ${elite ? 'border-canvas/25 text-canvas/85' : 'border-ink/20 text-ink'}`}>{r.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Guide: i contenuti pubblicati sul sito, nel linguaggio dell'album */}
        <section className="max-w-[1250px] mx-auto px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-6xl font-black text-ink leading-none">Guide al fantacalcio</h2>
            <p className="font-semibold text-ink-muted">Per arrivare all'asta già allenato.</p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {GUIDES.map((g, i) => (
              <li key={g.slug}>
                <a
                  href={`/guida/${g.slug}/`}
                  className={`block bg-surface border-2 border-ink shadow-block p-5 h-full ${TILTS[i % TILTS.length]} transition-transform duration-150 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0`}
                >
                  <span className="block font-display text-sm font-extrabold tracking-wide text-whistle-deep">GUIDA</span>
                  <span className="block font-display text-3xl font-black text-ink leading-tight mt-2">{g.title}</span>
                  <span className="block text-ink-soft mt-3 pt-3 border-t-2 border-ink/15">{g.description}</span>
                  <span className="mt-4 inline-flex items-center gap-2 font-bold text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40">
                    Leggi la guida
                    <Icon name="arrow" className="w-4 h-4" />
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="/top-11/"
                className={`block bg-pitch-deep border-2 border-ink shadow-block p-5 h-full ${TILTS[5 % TILTS.length]} transition-transform duration-150 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0`}
              >
                <span className="block font-display text-sm font-extrabold tracking-wide text-highlight">TOP 11</span>
                <span className="block font-display text-3xl font-black text-canvas leading-tight mt-2">
                  La formazione ideale di ogni Serie A, anno dopo anno
                </span>
                <span className="block text-canvas/80 mt-3 pt-3 border-t-2 border-canvas/20">
                  I migliori giocatori di ciascuna delle 23 stagioni, schierati in campo. E se ti viene voglia, rigiochi quell'asta.
                </span>
                <span className="mt-4 inline-flex items-center gap-2 font-bold text-highlight underline underline-offset-4 decoration-2 decoration-highlight/40">
                  Sfoglia le annate
                  <Icon name="arrow" className="w-4 h-4" />
                </span>
              </a>
            </li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface PreviewProps {
  n: string;
  title: string;
  text: string;
  className: string;
  children: ReactNode;
}

/** Riquadro di una fase: anteprima disegnata con i componenti veri del gioco */
function Preview({ n, title, text, className, children }: PreviewProps) {
  return (
    <article className={`panel shadow-block flex flex-col ${className}`}>
      <div className="flex-1 bg-canvas border-b-2 border-ink p-6 flex items-center justify-center overflow-hidden" aria-hidden="true">
        {children}
      </div>
      <div className="p-4 sm:p-6 flex items-baseline gap-3 sm:gap-4">
        <span className="font-display text-4xl sm:text-5xl font-black text-whistle leading-none">{n}</span>
        <div>
          <h3 className="font-display text-3xl sm:text-4xl font-black text-ink leading-none">{title}</h3>
          <p className="text-ink-soft mt-2">{text}</p>
        </div>
      </div>
    </article>
  );
}

function AuctionPreview() {
  return (
    <div className="w-full max-w-2xl pointer-events-none space-y-3 sm:space-y-4">
      {/* Intestazione del lotto: reparto, numero e timer che si svuota */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm sm:text-base font-extrabold text-ink-muted uppercase tracking-wide">Centrocampisti · lotto 38</span>
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-bold text-ink-muted">Scade tra</span>
          <span className="block w-16 sm:w-28 h-3 border-2 border-ink bg-canvas">
            <span className="block h-full w-2/5 bg-whistle" />
          </span>
          <span className="font-display text-2xl font-black text-whistle-deep leading-none">3"</span>
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 sm:gap-8 items-center">
        <div className="relative">
          {/* Coda del listone: altre card impilate dietro quella in chiamata */}
          <span className="absolute inset-y-3 inset-x-1 border-2 border-ink bg-tier-bronze-bg rotate-1" aria-hidden="true" />
          <span className="absolute inset-y-4 inset-x-2 border-2 border-ink bg-tier-silver-bg rotate-2" aria-hidden="true" />
          <PlayerCard player={SAMPLE_PLAYER} publicStats className="relative -rotate-2" />
        </div>
        <div className="w-36 sm:w-48 space-y-2 sm:space-y-3">
          <div className="bg-highlight border-2 border-ink px-3 sm:px-4 py-2 sm:py-3 shadow-block-sm">
            <span className="block text-xs sm:text-sm font-bold">Sei in testa</span>
            <span className="font-display text-5xl sm:text-7xl font-black leading-none tabular-nums">23</span>
            <span className="font-display text-lg sm:text-xl font-extrabold"> Cr</span>
          </div>
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {['+1', '+5', '+10'].map(b => (
              <span key={b} className="bg-whistle text-on-whistle border-2 border-ink shadow-block-sm text-center font-display text-xl sm:text-2xl font-black py-2 sm:py-3">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Storico dei rilanci del lotto */}
      <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-display text-sm sm:text-base font-extrabold">
        {['RM 12', 'PB 15', 'US 18', 'RM 21'].map(b => (
          <li key={b} className="border-2 border-line-strong px-2 py-0.5 text-ink-soft">{b}</li>
        ))}
        <li className="border-2 border-ink bg-pitch px-2 py-0.5 text-on-pitch shadow-block-sm">TU 23</li>
      </ul>

      {/* Crediti residui delle otto squadre */}
      <ul className="flex flex-wrap gap-1.5 border-t-2 border-line pt-3" aria-hidden="true">
        {([
          ['TS', '77', true],
          ['PM', '64', false],
          ['US', '70', false],
          ['OL', '55', false],
          ['PB', '81', false],
          ['RM', '68', false],
          ['AM', '60', false],
          ['FS', '74', false],
        ] as [string, string, boolean][]).map(([m, cr, me]) => (
          <li key={m} className={`flex items-center gap-1.5 border-2 px-1.5 py-0.5 text-xs font-bold ${me ? 'border-ink bg-highlight' : 'border-line-strong text-ink-soft'}`}>
            <span className="w-5 h-5 border border-ink bg-canvas flex items-center justify-center font-display font-black text-[10px]">{m}</span>
            {cr} Cr
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawPreview() {
  const balls = ['TU', 'GD', 'BP', 'QA', 'TT', 'SV', 'MU', 'CL'];
  const spots = [[28, 70], [50, 78], [72, 70], [20, 46], [41, 52], [61, 52], [80, 46], [50, 26]];
  return (
    <div className="relative w-64 h-64">
      <span className="absolute inset-0 rounded-full border-4 border-ink" />
      {balls.map((b, i) => (
        <span
          key={b}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-ink flex items-center justify-center font-display text-lg font-black ${
            i === 0 ? 'bg-pitch text-on-pitch' : 'bg-highlight text-on-highlight'
          }`}
          style={{ left: `${spots[i][0]}%`, top: `${spots[i][1]}%` }}
        >
          {b}
        </span>
      ))}
    </div>
  );
}

function MatchPreview() {
  return (
    <div className="w-full max-w-xs bg-pitch-deep text-canvas border-2 border-ink p-4 text-center">
      <p className="text-xs font-bold text-canvas/80">Finale · rigori</p>
      <p className="font-display text-6xl font-black leading-none tabular-nums mt-1">
        <span className="text-highlight">1</span>
        <span className="text-canvas/40 px-2">-</span>1
      </p>
      <div className="flex justify-between mt-3">
        {[
          [true, true, false, true, true],
          [true, false, true, true, false],
        ].map((row, r) => (
          <span key={r} className="flex gap-1">
            {row.map((scored, i) => (
              <span key={i} className={`w-4 h-4 rounded-full border-2 border-ink ${scored ? 'bg-highlight' : 'bg-card-red'}`} />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
