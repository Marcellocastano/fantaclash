import { useEffect, useState } from 'react';
import { TournamentSummary } from '../../domain/tournament';
import { renderSummaryCard } from '../../services/shareCard';

/** PNG della card generato una volta sola: lo stesso file si mostra e si condivide */
export function useSummaryCard(summary: TournamentSummary) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    renderSummaryCard(summary)
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [summary]);

  return { card, failed };
}

/** Descrizione testuale della card (alt dell'immagine e ripiego senza canvas) */
export function summaryAlt(summary: TournamentSummary): string {
  const results = summary.matches.map(m => `${m.roundShort} ${m.goalsFor}-${m.goalsAgainst} ${m.draw ? 'pareggio' : m.won ? 'vittoria' : 'sconfitta'} contro ${m.opponentName}`).join(', ');
  const group = summary.groupRecord ? `Girone ${summary.groupRecord.position}° con ${summary.groupRecord.points} punti. ` : '';
  return `${summary.placementLabel}: ${summary.teamName}, ${summary.tournamentName} Serie A ${summary.seasonId}. Modulo ${summary.formation}. ${group}${results}.`;
}
