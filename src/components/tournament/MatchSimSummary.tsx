import { useEffect, useState } from 'react';
import { formatMinute, keyEvents, MatchResult } from '../../domain/match';
import { TournamentTeam } from '../../domain/tournament';
import { EventIcon } from '../match/EventIcon';
import { TeamBadge } from './TeamBadge';

interface MatchSimSummaryProps {
  result: MatchResult;
  home: TournamentTeam | undefined;
  away: TournamentTeam | undefined;
  onClose: () => void;
}

/** Ritmo della sintesi: un evento saliente ogni STEP_MS */
const STEP_MS = 420;

/**
 * Sintesi animata di una partita simulata: non si riproducono i 90
 * minuti, solo gli eventi salienti in sequenza e poi il risultato.
 */
export function MatchSimSummary({ result, home, away, onClose }: MatchSimSummaryProps) {
  const events = keyEvents(result);
  const [shown, setShown] = useState(0);
  const done = shown > events.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown(s => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, done]);

  return (
    <div className="fixed inset-0 z-40 bg-canvas flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Simulazione partita">
      <div className="w-full max-w-lg">
        <p className="font-display text-xl font-bold text-ink-soft mb-4">Simulazione</p>
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-line-strong">
          <TeamSide team={home} />
          <span className="font-display text-ink-muted font-bold">vs</span>
          <TeamSide team={away} alignRight />
        </div>

        <ul className="py-4 space-y-2 min-h-[10rem]">
          {events.slice(0, shown).map(e => (
            <li key={e.id} className="flex items-center gap-3 motion-safe:animate-reveal">
              <span className="w-12 font-display font-bold tabular-nums text-ink-soft">{formatMinute(e.minute, e.extra)}</span>
              <EventIcon event={e} />
              <span className={`text-sm ${e.side === 'home' ? '' : 'ml-auto text-right'}`}>{e.description}</span>
            </li>
          ))}
          {events.length === 0 && shown > 0 && <li className="text-ink-muted text-sm">Partita bloccata, poche emozioni.</li>}
        </ul>

        {done ? (
          <div className="motion-safe:animate-stamp border-t border-line-strong pt-4">
            <p className="text-sm font-medium text-ink-muted">Risultato finale</p>
            <p className="font-display text-6xl font-extrabold text-ink tabular-nums leading-none">
              {result.homeScore} - {result.awayScore}
            </p>
            {result.shootout && (
              <p className="font-display text-xl font-bold text-ink-soft mt-1 tabular-nums">
                Rigori {result.shootout.home} - {result.shootout.away}
              </p>
            )}
            <button onClick={onClose} className="btn-primary w-full mt-6">
              Continua
            </button>
          </div>
        ) : (
          <button onClick={() => setShown(events.length + 1)} className="btn-ghost w-full">
            Mostra il risultato
          </button>
        )}
      </div>
    </div>
  );
}

function TeamSide({ team, alignRight = false }: { team: TournamentTeam | undefined; alignRight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="md" />
      <span className={`font-display text-2xl font-extrabold truncate ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
        {team?.name}
      </span>
    </div>
  );
}
