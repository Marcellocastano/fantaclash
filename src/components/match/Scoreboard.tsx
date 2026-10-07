import { PlaybackPhase, PlaybackState } from '../../domain/match';
import { TournamentTeam } from '../../domain/tournament';
import { TeamBadge } from '../tournament/TeamBadge';

const PHASE_LABEL: Record<PlaybackPhase, string> = {
  prepartita: 'Prepartita',
  primo_tempo: 'Primo tempo',
  intervallo: 'Intervallo',
  secondo_tempo: 'Secondo tempo',
  rigori: 'Rigori',
  finale: 'Finale',
};

interface ScoreboardProps {
  home: TournamentTeam | undefined;
  away: TournamentTeam | undefined;
  state: PlaybackState;
  roundLabel: string;
}

/** Tabellone in stile broadcast: squadre, punteggio, minuto */
export function Scoreboard({ home, away, state, roundLabel }: ScoreboardProps) {
  const lastGoal = [...state.latest].reverse().find(e => e.type === 'goal' || e.type === 'own_goal');
  return (
    <div className="border-b border-line-strong pb-4">
      <p className="text-center text-sm font-medium text-ink-muted mb-2">{roundLabel}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamName team={home} />
        <div className="text-center">
          <p className="font-display text-6xl md:text-7xl font-extrabold text-ink tabular-nums leading-none">
            <span key={`h${state.score.home}`} className={lastGoal?.side === 'home' ? 'inline-block motion-safe:animate-stamp' : ''}>
              {state.score.home}
            </span>
            <span className="text-ink-muted px-2">-</span>
            <span key={`a${state.score.away}`} className={lastGoal?.side === 'away' ? 'inline-block motion-safe:animate-stamp' : ''}>
              {state.score.away}
            </span>
          </p>
          {state.shootout && (
            <p className="font-display text-xl font-bold text-ink-soft tabular-nums">
              Rigori {state.shootout.home} - {state.shootout.away}
            </p>
          )}
        </div>
        <TeamName team={away} alignRight />
      </div>
      <div className="flex items-baseline justify-center gap-3 mt-2">
        <span className="font-display text-3xl font-bold tabular-nums text-ink">{state.tick.index === 0 ? "0'" : state.clock}</span>
        <span className="text-sm font-medium text-ink-muted">{PHASE_LABEL[state.phase]}</span>
      </div>
    </div>
  );
}

function TeamName({ team, alignRight = false }: { team: TournamentTeam | undefined; alignRight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="lg" />
      <div className="min-w-0">
        <p className={`font-display text-2xl md:text-4xl font-extrabold leading-none truncate ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
          {team?.name}
        </p>
        <p className="text-xs text-ink-muted mt-1">Forza {team?.rating}</p>
      </div>
    </div>
  );
}
