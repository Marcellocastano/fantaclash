import { TournamentSummary } from '../../domain/tournament';
import { summaryAlt } from './useSummaryCard';

interface TournamentSummaryCardProps {
  summary: TournamentSummary;
  url: string | null;
  failed: boolean;
}

/**
 * La card condivisibile come immagine (1080x1350): ciò che si vede è
 * esattamente ciò che si scarica. Finché il PNG non è pronto resta lo
 * spazio con le stesse proporzioni.
 */
export function TournamentSummaryCard({ summary, url, failed }: TournamentSummaryCardProps) {
  if (url) return <img src={url} alt={summaryAlt(summary)} className="block w-full h-auto border-2 border-ink shadow-block-lg" />;
  return (
    <div className="aspect-[4/5] w-full border-2 border-ink bg-pitch-deep text-canvas flex items-center justify-center p-6 text-center" role="img" aria-label={summaryAlt(summary)}>
      <p className="font-display text-3xl font-extrabold">{failed ? summary.placementLabel : 'Preparo la card…'}</p>
    </div>
  );
}
