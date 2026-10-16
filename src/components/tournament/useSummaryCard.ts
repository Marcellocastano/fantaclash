import { useEffect, useState } from 'react';
import { PLACEMENT_KEY, TournamentSummary } from '../../domain/tournament';
import { renderSummaryCard } from '../../services/shareCard';
import { listoneLabel } from '../../services/seasons';
import { t as defaultT, TFunction } from '../../i18n/translate';

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
export function summaryAlt(summary: TournamentSummary, tr: TFunction = defaultT): string {
  const results = summary.matches
    .map(m => tr('tournament.summary.cardAltMatch', { round: m.roundShort, goalsFor: m.goalsFor, goalsAgainst: m.goalsAgainst, opponent: m.opponentName }))
    .join(', ');
  return tr('tournament.summary.cardAlt', {
    placement: tr(PLACEMENT_KEY[summary.placement]),
    team: summary.teamName,
    tournament: summary.tournamentName,
    listone: listoneLabel(summary.seasonId, tr),
    results,
  });
}
