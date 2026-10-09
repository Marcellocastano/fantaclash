import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTournamentController } from '../../hooks/tournamentController';
import { buildTournamentSummary, TournamentState, TournamentSummary } from '../../domain/tournament';
import { cardFileName, copyImage, downloadBlob, shareNative, whatsappShareUrl, xShareUrl } from '../../services/shareCard';
import { playSound } from '../../services/sound';
import { Footer } from '../Footer';
import { Icon, IconName } from '../Icon';
import { StreamerReserve } from '../layout/GameShell';
import { TournamentBracket } from './TournamentBracket';
import { TournamentSummaryCard } from './TournamentSummaryCard';
import { useSummaryCard } from './useSummaryCard';
import { useCountUp } from '../../hooks/useCountUp';

const PLACEMENT_TONE: Record<TournamentSummary['placement'], string> = {
  campione: 'bg-highlight text-on-highlight',
  finalista: 'bg-tier-silver-bg text-ink',
  semifinalista: 'bg-tier-bronze-bg text-ink',
  quarti: 'bg-ink text-canvas',
};

/**
 * Fine torneo: la card (immagine) con le icone di condivisione attaccate
 * sotto, l'esito in grande, i numeri del torneo e il tabellone completo.
 * Un solo pulsante: nuova partita.
 */
export function TournamentSummaryScreen() {
  const { tournament, teams, resetGame, finalLabel, finalSlot } = useTournamentController();
  const summary = useMemo(() => (tournament ? buildTournamentSummary(tournament, teams) : null), [tournament, teams]);
  if (!tournament || !summary) return null;
  return <Summary summary={summary} tournament={tournament} onNewGame={resetGame} newGameLabel={finalLabel} finalSlot={finalSlot} />;
}

interface SummaryProps {
  summary: TournamentSummary;
  tournament: TournamentState;
  onNewGame: () => void;
  newGameLabel?: string;
  /** Contenuto custom al posto di tagline+pulsante (stanza: rivincita) */
  finalSlot?: ReactNode;
}

function Summary({ summary, tournament, onNewGame, newGameLabel, finalSlot }: SummaryProps) {
  const { card, failed } = useSummaryCard(summary);
  const [notice, setNotice] = useState<string | null>(null);
  const champion = summary.placement === 'campione';

  useEffect(() => {
    if (champion) playSound('cup');
  }, [champion]);

  const download = (blob: Blob) => downloadBlob(blob, cardFileName(summary));
  const withCard = (fn: (blob: Blob) => Promise<string | null> | string | null) => async () => {
    if (!card) return;
    setNotice(await fn(card.blob));
  };
  const actions: { icon: IconName; label: string; run: () => void }[] = [
    {
      icon: 'share',
      label: 'Condividi',
      run: withCard(async blob => {
        if (await shareNative(blob, summary)) return null;
        download(blob);
        return 'Condivisione non disponibile: immagine scaricata.';
      }),
    },
    { icon: 'brand-whatsapp', label: 'WhatsApp', run: () => window.open(whatsappShareUrl(summary), '_blank', 'noopener') },
    { icon: 'brand-x', label: 'X', run: () => window.open(xShareUrl(summary), '_blank', 'noopener') },
    {
      icon: 'brand-instagram',
      label: 'Instagram',
      run: withCard(async blob => {
        if (await shareNative(blob, summary)) return null;
        download(blob);
        return 'Immagine scaricata in formato 4:5: caricala su Instagram.';
      }),
    },
    { icon: 'copy', label: 'Copia immagine', run: withCard(async blob => ((await copyImage(blob)) ? 'Immagine copiata.' : 'Il browser non permette di copiare immagini.')) },
    {
      icon: 'download',
      label: 'Scarica',
      run: withCard(blob => {
        download(blob);
        return 'Immagine scaricata.';
      }),
    },
  ];

  return (
    <StreamerReserve>
      <div className="flex-1 flex flex-col">
        {champion && <Confetti />}
        <main className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-12">
        <div className="grid grid-cols-12 gap-x-0 gap-y-10 md:gap-x-12 items-start">
          {/* Card + condivisione */}
          <div className="col-span-12 md:col-span-6 lg:col-span-5">
            <div className="max-w-[460px] mx-auto motion-safe:animate-drop">
              <TournamentSummaryCard summary={summary} url={card?.url ?? null} failed={failed} />
              <div className="flex mt-6 border-2 border-ink shadow-block-sm bg-canvas" role="group" aria-label="Condividi">
                {actions.map(a => (
                  <button
                    key={a.label}
                    onClick={a.run}
                    disabled={!card && a.label !== 'WhatsApp' && a.label !== 'X'}
                    aria-label={a.label}
                    title={a.label}
                    className="flex-1 flex justify-center py-3 border-r-2 border-ink last:border-r-0 text-ink hover:bg-highlight disabled:opacity-40 disabled:hover:bg-transparent transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-4px] outline-ink"
                  >
                    <Icon name={a.icon} className="w-6 h-6" />
                  </button>
                ))}
              </div>
              {notice && (
                <p className="text-sm text-ink-soft mt-3 text-center" role="status">
                  {notice}
                </p>
              )}
            </div>
          </div>

          {/* Esito e numeri */}
          <div className="col-span-12 md:col-span-6 lg:col-span-7">
            <p className={`inline-block px-4 py-2 border-2 border-ink shadow-block font-display text-4xl sm:text-6xl md:text-8xl font-black leading-none motion-safe:animate-stamp ${PLACEMENT_TONE[summary.placement]}`}>
              {summary.placementLabel}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black text-ink leading-none mt-8 break-words">{summary.teamName}</h1>
            <p className="text-lg text-ink-soft mt-3">
              {summary.tournamentName} · Serie A {summary.seasonId}
              {summary.championName && !champion && <> · coppa a {summary.championName}</>}
            </p>

            <StatBlocks stats={summary.stats} />
            {summary.mvp && (
              <p className="mt-6 flex w-fit max-w-full flex-wrap items-center gap-3 border-2 border-ink bg-canvas shadow-block-sm px-3 py-2">
                <span className="bg-highlight text-on-highlight border-2 border-ink px-2 font-display font-black">MVP</span>
                <span className="font-display text-2xl font-black text-ink">{summary.mvp.name}</span>
                <span className="text-ink-muted">fantavoto medio {summary.mvp.avgFantasy.toFixed(1)}</span>
              </p>
            )}

            {finalSlot ?? (
              <>
                {newGameLabel === undefined && (
                  <p className="mt-10 font-display text-2xl font-extrabold text-ink">Un'altra annata, un'altra asta?</p>
                )}
                <button onClick={onNewGame} className={`btn-cta text-2xl sm:text-3xl py-4 sm:py-5 px-8 ${newGameLabel === undefined ? 'mt-4' : 'mt-10'}`}>
                  {newGameLabel ?? 'Nuova partita'}
                  <Icon name="arrow" className="w-7 h-7" />
                </button>
              </>
            )}
          </div>
        </div>

        <section className="mt-20">
          <h2 className="section-heading mb-8">Il tuo torneo</h2>
          <TournamentBracket tournament={tournament} />
        </section>
        </main>
        <Footer linkGroups={[]} />
      </div>
    </StreamerReserve>
  );
}

const STAT_STYLE = [
  { label: 'Vittorie', cls: 'bg-pitch text-on-pitch', tilt: '-rotate-1' },
  { label: 'Gol fatti', cls: 'bg-highlight text-on-highlight', tilt: 'rotate-1' },
  { label: 'Gol subiti', cls: 'bg-whistle text-on-whistle', tilt: '-rotate-1' },
  { label: 'Porte inviolate', cls: 'bg-ink text-canvas', tilt: 'rotate-1' },
];

function StatBlocks({ stats }: { stats: TournamentSummary['stats'] }) {
  const wins = useCountUp(stats.wins);
  const gf = useCountUp(stats.goalsFor);
  const ga = useCountUp(stats.goalsAgainst);
  const cs = useCountUp(stats.cleanSheets);
  const values = [`${wins}/${stats.played}`, gf, ga, cs];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-10">
      {STAT_STYLE.map((s, i) => (
        <div key={s.label} className={s.tilt}>
          <div
            className={`border-2 border-ink shadow-block p-3 sm:p-4 motion-safe:animate-drop ${s.cls}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <dt className="text-sm font-bold opacity-80">{s.label}</dt>
            <dd className="font-display text-5xl sm:text-6xl font-black tabular-nums leading-none mt-1">{values[i]}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Pochi coriandoli quadrati, una sola volta, solo per il campione */
const CONFETTI_COLORS = ['bg-highlight', 'bg-pitch', 'bg-whistle', 'bg-canvas', 'bg-ink'];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 900,
      size: 8 + Math.random() * 10,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute top-0 border border-ink motion-safe:animate-confetti-fall ${p.color}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}ms` }}
        />
      ))}
    </div>
  );
}
