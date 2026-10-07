import { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { buildTournamentSummary } from '../../domain/tournament';
import {
  cardFileName,
  copyImage,
  downloadBlob,
  renderSummaryCard,
  shareNative,
  whatsappShareUrl,
  xShareUrl,
} from '../../services/shareCard';
import { Footer } from '../Footer';
import { Icon, IconName } from '../Icon';
import { ThemeToggle } from '../ThemeToggle';
import { TournamentBracket } from './TournamentBracket';
import { TournamentSummaryCard } from './TournamentSummaryCard';

/**
 * Schermata celebrativa di fine torneo: card condivisibile, azioni di
 * condivisione e tabellone completo.
 */
export function TournamentSummaryScreen() {
  const { state, resetGame } = useGame();
  const tournament = state.tournament;
  const summary = useMemo(
    () => (tournament ? buildTournamentSummary(tournament, state.teams) : null),
    [tournament, state.teams]
  );
  const [notice, setNotice] = useState<string | null>(null);

  if (!tournament || !summary) return null;

  const withImage = async (fn: (blob: Blob) => Promise<string | null> | string | null) => {
    try {
      const msg = await fn(await renderSummaryCard(summary));
      setNotice(msg);
    } catch {
      setNotice("Non è stato possibile creare l'immagine.");
    }
  };

  const actions: { icon: IconName; label: string; run: () => void }[] = [
    {
      icon: 'share',
      label: 'Condividi',
      run: () =>
        withImage(async blob => {
          if (await shareNative(blob, summary)) return null;
          downloadBlob(blob, cardFileName(summary));
          return 'Condivisione non disponibile: immagine scaricata.';
        }),
    },
    { icon: 'brand-x', label: 'X', run: () => window.open(xShareUrl(summary), '_blank', 'noopener') },
    { icon: 'brand-whatsapp', label: 'WhatsApp', run: () => window.open(whatsappShareUrl(summary), '_blank', 'noopener') },
    {
      icon: 'brand-instagram',
      label: 'Instagram',
      run: () =>
        withImage(async blob => {
          if (await shareNative(blob, summary)) return null;
          downloadBlob(blob, cardFileName(summary));
          return 'Immagine scaricata in formato 4:5: caricala su Instagram.';
        }),
    },
    {
      icon: 'copy',
      label: 'Copia immagine',
      run: () => withImage(async blob => ((await copyImage(blob)) ? 'Immagine copiata.' : 'Il browser non permette di copiare immagini.')),
    },
    {
      icon: 'download',
      label: 'Scarica',
      run: () =>
        withImage(blob => {
          downloadBlob(blob, cardFileName(summary));
          return 'Immagine scaricata.';
        }),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <main className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-5 lg:col-span-4 flex justify-center md:justify-start">
            <div className="motion-safe:animate-stamp w-full max-w-[380px]">
              <TournamentSummaryCard summary={summary} />
            </div>
          </div>

          <div className="col-span-12 md:col-span-7 lg:col-span-8">
            <h1 className="font-display text-6xl font-extrabold text-pitch leading-none">{summary.placementLabel}</h1>
            <p className="text-ink-soft mt-2">
              {summary.teamName} · {summary.stats.wins} vittorie su {summary.stats.played} · {summary.stats.cleanSheets} porte inviolate
              {summary.championName && summary.placement !== 'campione' && <> · Coppa a {summary.championName}</>}
            </p>

            <h2 className="section-heading mt-8 mb-3">Condividi</h2>
            <div className="flex flex-wrap gap-2">
              {actions.map(a => (
                <button key={a.label} onClick={a.run} className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-2">
                  <Icon name={a.icon} className="w-4 h-4" />
                  {a.label}
                </button>
              ))}
            </div>
            {notice && (
              <p className="text-sm text-ink-soft mt-3" role="status">
                {notice}
              </p>
            )}

            <h2 className="section-heading mt-10 mb-4">Tabellone</h2>
            <TournamentBracket tournament={tournament} />

            <button onClick={resetGame} className="btn-primary mt-10">
              Nuova partita
            </button>
          </div>
        </div>
      </main>
      <Footer links={[]} />
    </div>
  );
}
