import { ReactNode, useState } from 'react';
import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';
import { MULTIPLAYER_ENABLED } from '../config';
import { GameConfig, Player } from '../types';
import { KitId, kitOf } from '../domain/teamKits';
import { MAX_PLAYERS } from '../multiplayer/constants';
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
const NUMBERS: { value: string; label: CatalogKey }[] = [
  { value: '8', label: 'landing.numbers.teams' },
  { value: '100', label: 'landing.numbers.credits' },
  { value: '8', label: 'landing.numbers.roster' },
  { value: '5"', label: 'landing.numbers.bid' },
  { value: '1-2-3-2', label: 'landing.numbers.module' },
];

/** Regole come figurine: il numero grande sta al posto dell'overall, il colore è quello di una fascia */
const TILTS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2'];

const RULES: { value: string; unit: CatalogKey; term: CatalogKey; text: CatalogKey; tier: Tier; tilt: string }[] = [
  { value: '5"', unit: 'landing.rules.auction.unit', term: 'landing.rules.auction.term', text: 'landing.rules.auction.text', tier: 'bronze', tilt: '-rotate-1' },
  { value: '96', unit: 'landing.rules.listone.unit', term: 'landing.rules.listone.term', text: 'landing.rules.listone.text', tier: 'silver', tilt: 'rotate-1' },
  { value: '7', unit: 'landing.rules.bots.unit', term: 'landing.rules.bots.term', text: 'landing.rules.bots.text', tier: 'gold', tilt: '-rotate-1' },
  { value: "90'", unit: 'landing.rules.match.unit', term: 'landing.rules.match.term', text: 'landing.rules.match.text', tier: 'elite', tilt: 'rotate-1' },
];

/**
 * Landing: presenta il gioco, mostra anteprime vere delle tre fasi e
 * integra il form per iniziare a giocare.
 */
export function Landing({ onSubmit }: LandingProps) {
  const t = useT();
  const [season, setSeason] = useState<string | null>(null);
  const [heroMode, setHeroMode] = useState<'solo' | 'friends'>('solo');

  /** Tile della doppia scelta in hero (stile ListoneModePicker, taglia hero) */
  const heroTile = (mode: 'solo' | 'friends', title: string, subtitle: string, badge?: string) => {
    const selected = heroMode === mode;
    return (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => setHeroMode(mode)}
        className={`relative text-left border-2 border-ink px-3 sm:px-4 py-3 sm:py-4 transition-all duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch ${
          selected ? 'bg-canvas shadow-block' : 'bg-canvas/60 hover:bg-canvas'
        }`}
      >
        {badge && (
          <span className="absolute -top-3 -right-2 -rotate-6 bg-whistle text-on-whistle border-2 border-ink px-1.5 py-0.5 font-display text-xs font-black uppercase leading-none">
            {badge}
          </span>
        )}
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-2xl sm:text-3xl font-black text-ink">{title}</span>
          {selected && <Icon name="check" className="w-5 h-5 text-pitch shrink-0" />}
        </span>
        <span className="block mt-1 text-xs sm:text-sm text-ink-muted leading-snug">{subtitle}</span>
      </button>
    );
  };
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
                <p className="font-semibold text-ink-soft">{t('landing.kicker')}</p>
                <h1 className="mt-3">
                  <span className="block font-display text-2xl md:text-3xl font-extrabold text-ink leading-tight">
                    {t('landing.titleSmall')}
                  </span>
                  <span className="block font-display text-5xl sm:text-7xl md:text-8xl font-black leading-[0.85] mt-2 break-words">
                    FANTA<span className="text-pitch">CLASH</span>
                  </span>
                </h1>
                <p className="text-lg text-ink-soft mt-5">
                  {t('landing.heroSub')}
                </p>

                {MULTIPLAYER_ENABLED && (
                  <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('landing.mp.group')}>
                    {heroTile('solo', t('landing.mp.soloTitle'), t('landing.mp.soloSub'))}
                    {heroTile('friends', t('landing.mp.friendsTitle'), t('landing.mp.friendsSub', { max: MAX_PLAYERS }), t('landing.mp.badge'))}
                  </div>
                )}

                {/* Etichetta dell'album: il form del singolo oppure il pannello multiplayer */}
                <div className={`${MULTIPLAYER_ENABLED ? 'mt-4' : 'mt-6 sm:mt-8'} border-2 border-ink p-1 sm:p-1.5 bg-canvas`}>
                  <div className="border-2 border-dashed border-line-strong p-3 sm:p-5">
                    {MULTIPLAYER_ENABLED && heroMode === 'friends' ? (
                      <div>
                        <p className="font-display text-2xl font-black text-ink">{t('landing.mp.title')}</p>
                        <p className="text-sm text-ink-soft mt-1">{t('landing.mp.sub')}</p>
                        <ul className="mt-4 space-y-2">
                          {(['landing.mp.point1', 'landing.mp.point2', 'landing.mp.point3'] as const).map(k => (
                            <li key={k} className="flex items-start gap-2 text-sm font-semibold text-ink">
                              <Icon name="check" className="w-4 h-4 mt-0.5 text-pitch shrink-0" />
                              {t(k)}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <a href="/multiplayer/?vista=crea" className="btn-primary text-center">{t('landing.mp.create')}</a>
                          <a href="/multiplayer/?vista=entra" className="btn-ghost text-center">{t('landing.mp.join')}</a>
                        </div>
                      </div>
                    ) : (
                      <SetupForm onSubmit={onSubmit} onSeasonChange={setSeason} />
                    )}
                  </div>
                </div>
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
            <h2 className="font-display text-6xl font-black text-ink leading-none">{t('landing.howTo.title')}</h2>
            <div className="grid grid-cols-12 gap-x-0 gap-y-8 sm:gap-x-8 mt-12">
              <Preview className="col-span-12 lg:col-span-7 lg:row-span-2" n="1" title={t('landing.howTo.auction.title')} text={t('landing.howTo.auction.text')}>
                <AuctionPreview />
              </Preview>
              <Preview className="col-span-12 sm:col-span-6 lg:col-span-5" n="2" title={t('landing.howTo.draw.title')} text={t('landing.howTo.draw.text')}>
                <DrawPreview />
              </Preview>
              <Preview className="col-span-12 sm:col-span-6 lg:col-span-5" n="3" title={t('landing.howTo.match.title')} text={t('landing.howTo.match.text')}>
                <MatchPreview />
              </Preview>
              <Preview className="col-span-12 lg:col-span-7" n="4" title={t('landing.howTo.tournament.title')} text={t('landing.howTo.tournament.text')}>
                <TournamentPreview />
              </Preview>
              <Preview className="col-span-12 sm:col-span-6 lg:col-span-5 lg:col-start-8" n="5" title={t('landing.howTo.share.title')} text={t('landing.howTo.share.text')}>
                <SharePreview />
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
                  <dt className="sr-only">{t(n.label)}</dt>
                  {/* Altezza fissa e cifre allineate in basso: le etichette stanno sulla stessa riga */}
                  <dd
                    className={`h-14 flex items-end justify-center font-display font-black text-highlight leading-none tabular-nums whitespace-nowrap ${
                      n.value.length > 3 ? 'text-4xl lg:text-5xl' : 'text-6xl'
                    }`}
                  >
                    {n.value}
                  </dd>
                  <dd className="text-sm font-semibold text-canvas/75 mt-2">{t(n.label)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="max-w-[1250px] mx-auto px-4 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-6xl font-black text-ink leading-none">{t('landing.rules.title')}</h2>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              {RULES.map(r => {
                const tier = TIER_CLASSES[r.tier];
                const elite = r.tier === 'elite';
                return (
                  <li key={r.term} className={`relative ${tier.bg} ${tier.ink} border-2 border-ink shadow-block p-5 ${r.tilt}`}>
                    {elite && <span className="absolute inset-1.5 border border-tier-elite-ink/60 pointer-events-none" aria-hidden="true" />}
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-5xl sm:text-6xl font-black leading-none tabular-nums">{r.value}</span>
                      <span className={`text-sm font-bold ${tier.muted}`}>{t(r.unit)}</span>
                    </p>
                    <h3 className={`font-display text-3xl sm:text-4xl font-black leading-none mt-5 ${elite ? 'text-canvas' : ''}`}>{t(r.term)}</h3>
                    <p className={`mt-3 pt-3 border-t-2 ${elite ? 'border-canvas/25 text-canvas/85' : 'border-ink/20 text-ink'}`}>{t(r.text)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Guide: i contenuti pubblicati sul sito, nel linguaggio dell'album */}
        <section className="max-w-[1250px] mx-auto px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-6xl font-black text-ink leading-none">{t('landing.guides.title')}</h2>
            <p className="font-semibold text-ink-muted">{t('landing.guides.sub')}</p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {GUIDES.map((g, i) => (
              <li key={g.slug}>
                <a
                  href={`/guida/${g.slug}/`}
                  className={`block bg-surface border-2 border-ink shadow-block p-5 h-full ${TILTS[i % TILTS.length]} transition-transform duration-150 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0`}
                >
                  <span className="block font-display text-sm font-extrabold tracking-wide text-whistle-deep">{t('landing.guides.badge')}</span>
                  <span className="block font-display text-3xl font-black text-ink leading-tight mt-2">{g.title}</span>
                  <span className="block text-ink-soft mt-3 pt-3 border-t-2 border-ink/15">{g.description}</span>
                  <span className="mt-4 inline-flex items-center gap-2 font-bold text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40">
                    {t('landing.guides.read')}
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
                  {t('landing.top11.title')}
                </span>
                <span className="block text-canvas/80 mt-3 pt-3 border-t-2 border-canvas/20">
                  {t('landing.top11.sub')}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 font-bold text-highlight underline underline-offset-4 decoration-2 decoration-highlight/40">
                  {t('landing.top11.cta')}
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
  const t = useT();
  return (
    <div className="w-full max-w-2xl pointer-events-none space-y-3 sm:space-y-4">
      {/* Intestazione del lotto: reparto, numero e timer che si svuota */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm sm:text-base font-extrabold text-ink-muted uppercase tracking-wide">{t('landing.preview.auctionHead')}</span>
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-bold text-ink-muted">{t('landing.preview.expiresIn')}</span>
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
            <span className="block text-xs sm:text-sm font-bold">{t('landing.preview.leading')}</span>
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

/** Mini stemma nei colori sociali (le anteprime sono decorative) */
function MiniBadge({ kit }: { kit: KitId }) {
  const k = kitOf({ name: 'x', kit });
  return (
    <span
      className="w-5 h-5 shrink-0 border-2 border-ink"
      style={{ background: `linear-gradient(to bottom, ${k.primary} 72%, ${k.secondary} 72%)` }}
      aria-hidden="true"
    />
  );
}

/** Riga di un mini riquadro: stemma + nome, oppure segnaposto/accesa */
function MiniRow({ name, kit, lit }: { name?: string; kit?: KitId; lit?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 min-h-[1.4rem] border-2 ${lit ? 'border-ink bg-highlight' : name ? 'border-ink bg-canvas text-ink' : 'border-dashed border-canvas/40'}`}>
      {name ? (
        <>
          <MiniBadge kit={kit!} />
          <span className="min-w-0 truncate font-display text-xs font-extrabold leading-none">{name}</span>
        </>
      ) : (
        <>
          <span className={`w-4 h-4 shrink-0 border border-dashed ${lit ? 'border-ink/50' : 'border-canvas/40'}`} />
          <span className={`text-[9px] font-semibold ${lit ? 'text-on-highlight' : 'text-canvas/50'}`}>···</span>
        </>
      )}
    </div>
  );
}

/** Mini riquadro di un incrocio: testata verde + due righe */
function MiniMatch({ tag, rows }: { tag: string; rows: { name?: string; kit?: KitId; lit?: boolean }[] }) {
  return (
    <div className="border-2 border-ink bg-pitch shadow-block-sm">
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <span className="font-display text-[10px] font-black uppercase tracking-wider text-canvas leading-none">{tag}</span>
        <span className="bg-highlight text-on-highlight px-1 text-[8px] font-black leading-none py-px">A/R</span>
      </div>
      {rows.map((r, i) => (
        <MiniRow key={i} {...r} />
      ))}
    </div>
  );
}

/** Coppa in miniatura */
function MiniCup({ size = 'w-10 h-10' }: { size?: string }) {
  return (
    <span className={`${size} rounded-full border-2 border-ink bg-highlight shadow-block-sm inline-flex items-center justify-center`}>
      <Icon name="trophy" className="w-5 h-5 text-on-highlight" />
    </span>
  );
}

/** Sorteggio a tabellone: la luce corre sugli slot mentre la card attende */
function DrawPreview() {
  return (
    <div className="w-full max-w-md bg-pitch-deep border-2 border-ink shadow-block-sm p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="space-y-2">
          <MiniMatch tag="Q1" rows={[{ name: 'La Mia Squadra', kit: 'granata' }, { lit: true }]} />
          <MiniMatch tag="Q2" rows={[{}, {}]} />
        </div>
        <MiniCup />
        <div className="space-y-2">
          <MiniMatch tag="Q3" rows={[{ name: 'Union Valle Po', kit: 'rossoblu' }, { name: 'Atletico Borgo', kit: 'viola' }]} />
          <MiniMatch tag="Q4" rows={[{ name: 'Sparta Litorale', kit: 'azzurro' }, {}]} />
        </div>
      </div>
    </div>
  );
}

/** Tabellone riempito coi risultati: il cammino dell'utente in giallo */
function TournamentPreview() {
  const win = 'La Mia Squadra';
  const row = (name: string, kit: KitId, score: string, me: boolean) => (
    <div className="flex items-center gap-1.5 px-1.5 min-h-[1.4rem] bg-canvas text-ink border-2 border-ink">
      <MiniBadge kit={kit} />
      <span className={`min-w-0 flex-1 truncate font-display text-xs font-extrabold leading-none ${me ? 'text-pitch' : ''}`}>{name}</span>
      <span className="font-display text-xs font-black tabular-nums leading-none">{score}</span>
    </div>
  );
  const bx = (tag: string, kids: ReactNode, me: boolean) => (
    <div className={`border-2 shadow-block-sm ${me ? 'border-highlight bg-pitch outline outline-1 outline-highlight' : 'border-ink bg-pitch'}`}>
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <span className="font-display text-[10px] font-black uppercase tracking-wider text-canvas leading-none">{tag}</span>
      </div>
      {kids}
    </div>
  );
  const arrow = <Icon name="arrow" className="w-4 h-4 text-canvas/40" />;
  return (
    <div className="w-full max-w-xl bg-pitch-deep border-2 border-ink shadow-block-sm p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1.5">
        {bx('Q1', <>{row(win, 'granata', '2', true)}{row('FC Stella', 'nerazzurro', '1', false)}</>, true)}
        {arrow}
        {bx('S1', <>{row(win, 'granata', '1', true)}{row('Atletico Borgo', 'viola', '0', false)}</>, true)}
        {arrow}
        {bx('Finale', <>{row(win, 'granata', '3', true)}{row('Union Valle Po', 'rossoblu', '1', false)}</>, true)}
        <MiniCup />
      </div>
    </div>
  );
}

/** Figurina del riepilogo condiviso a fine torneo */
function SharePreview() {
  const t = useT();
  const k = kitOf({ name: 'x', kit: 'granata' });
  return (
    <div className="w-full max-w-[220px] bg-pitch-deep border-2 border-ink shadow-block-sm p-3 text-center text-canvas">
      <p className="text-[9px] font-bold uppercase tracking-wider text-canvas/60">FantaClash Cup</p>
      <p className="font-display text-4xl font-black leading-none text-highlight mt-1">{t('tournament.placement.campione')}</p>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <span className="w-6 h-6 border-2 border-ink inline-block" style={{ background: `linear-gradient(to bottom, ${k.primary} 72%, ${k.secondary} 72%)` }} />
        <span className="font-display text-sm font-extrabold">La Mia Squadra</span>
      </div>
      <p className="mt-2 text-[10px] font-bold text-canvas/70 tabular-nums">QF 2-1 · SF 1-0 · F 3-1</p>
      <p className="mt-2 inline-flex items-center gap-1.5 border-2 border-ink bg-canvas text-ink px-2 py-1 text-[10px] font-bold shadow-block-sm">
        <Icon name="share" className="w-3 h-3" />
        {t('tournament.summary.share')}
      </p>
    </div>
  );
}

function MatchPreview() {
  const t = useT();
  return (
    <div className="w-full max-w-xs bg-pitch-deep text-canvas border-2 border-ink p-4 text-center">
      <p className="text-xs font-bold text-canvas/80">{t('landing.preview.finalShootout')}</p>
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
