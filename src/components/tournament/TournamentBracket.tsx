import { ReactNode } from 'react';
import {
  BracketMatch,
  findMatch,
  getMatchStatus,
  getTeamOutcome,
  roundMatches,
  TournamentState,
  TournamentTeam,
} from '../../domain/tournament';
import { Icon } from '../Icon';
import { TeamBadge } from './TeamBadge';

interface TournamentBracketProps {
  tournament: TournamentState;
  /** Mostra il percorso potenziale dell'utente (es. a fine sorteggio) */
  highlightUserPath?: boolean;
  /** Azione opzionale renderizzata sotto ogni partita pronta (Simula/Gioca) */
  renderAction?: (match: BracketMatch) => ReactNode;
}

/** Id delle partite che l'utente giocherebbe vincendo sempre */
function userRoute(t: TournamentState): Set<string> {
  const route = new Set<string>();
  let m = t.bracket.find(x => x.round === 'quarterfinals' && (x.homeId === t.userTeamId || x.awayId === t.userTeamId));
  while (m) {
    route.add(m.id);
    m = m.next ? findMatch(t.bracket, m.next.matchId) : undefined;
  }
  return route;
}

/**
 * Tabellone 8 -> 4 -> 2 -> 1, riutilizzabile (sorteggio, hub, riepilogo).
 * Le linee di collegamento sono bordi: ogni coppia di partite occupa due
 * metà uguali, così i centri cadono esattamente al 25% e al 75%.
 */
export function TournamentBracket({ tournament, highlightUserPath = false, renderAction }: TournamentBracketProps) {
  const route = highlightUserPath ? userRoute(tournament) : new Set<string>();
  const qf = roundMatches(tournament.bracket, 'quarterfinals');
  const sf = roundMatches(tournament.bracket, 'semifinals');
  const final = roundMatches(tournament.bracket, 'final')[0];
  const champion = tournament.teams.find(t => t.id === tournament.winnerId);

  const box = (m: BracketMatch) => (
    <MatchBox
      key={m.id}
      match={m}
      tournament={tournament}
      onRoute={route.has(m.id)}
      action={renderAction?.(m)}
    />
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-4 gap-8 mb-3">
          {['Quarti', 'Semifinali', 'Finale', 'Campione'].map(label => (
            <p key={label} className="font-display font-bold text-lg text-ink-soft">{label}</p>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-8 min-h-[520px]">
          {/* Quarti: due gruppi, ognuno collegato a una semifinale */}
          <div className="flex flex-col">
            {[qf.slice(0, 2), qf.slice(2, 4)].map((group, i) => (
              <div key={i} className="relative flex-1 flex flex-col">
                {group.map(m => (
                  <div key={m.id} className="flex-1 flex items-center py-2">{box(m)}</div>
                ))}
                <span className="absolute -right-4 top-1/4 bottom-1/4 w-4 border-y border-r border-line-strong" />
              </div>
            ))}
          </div>

          {/* Semifinali */}
          <div className="relative flex flex-col">
            {sf.map(m => (
              <div key={m.id} className="relative flex-1 flex items-center">
                <span className="absolute -left-4 top-1/2 w-4 border-t border-line-strong" />
                {box(m)}
              </div>
            ))}
            <span className="absolute -right-4 top-1/4 bottom-1/4 w-4 border-y border-r border-line-strong" />
          </div>

          {/* Finale */}
          <div className="relative flex items-center">
            <span className="absolute -left-4 top-1/2 w-4 border-t border-line-strong" />
            {box(final)}
            <span className="absolute -right-8 top-1/2 w-8 border-t border-line-strong" />
          </div>

          {/* Campione */}
          <div className="flex items-center">
            <div
              className={`w-full border-2 p-4 ${
                champion ? (champion.isUserTeam ? 'border-pitch' : 'border-line-strong') : 'border-dashed border-line'
              }`}
            >
              <Icon name="trophy" className={`w-7 h-7 mb-2 ${champion ? 'text-pitch' : 'text-ink-faint'}`} />
              {champion ? (
                <div key={champion.id} className="motion-safe:animate-advance">
                  <TeamBadge team={champion} size="md" />
                  <p className={`mt-2 font-display text-2xl font-extrabold leading-none ${champion.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
                    {champion.name}
                  </p>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">Da decidere</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MatchBoxProps {
  match: BracketMatch;
  tournament: TournamentState;
  onRoute: boolean;
  action?: ReactNode;
}

function MatchBox({ match, tournament, onRoute, action }: MatchBoxProps) {
  const status = getMatchStatus(tournament, match);
  const result = tournament.matches[match.id];
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const isUserMatch = match.homeId === tournament.userTeamId || match.awayId === tournament.userTeamId;
  const border = isUserMatch
    ? 'border-2 border-pitch'
    : onRoute
      ? 'border-2 border-dashed border-pitch'
      : status === 'upcoming'
        ? 'border border-dashed border-line-strong'
        : 'border border-line-strong';

  return (
    <div className={`w-full ${border} ${status === 'in_progress' ? 'bg-surface' : 'bg-canvas'}`}>
      <TeamRow
        team={team(match.homeId)}
        score={result ? result.homeScore : null}
        shootout={result?.shootout?.home ?? null}
        outcome={getTeamOutcome(match, match.homeId)}
        animate={match.round !== 'quarterfinals'}
      />
      <div className="border-t border-line" />
      <TeamRow
        team={team(match.awayId)}
        score={result ? result.awayScore : null}
        shootout={result?.shootout?.away ?? null}
        outcome={getTeamOutcome(match, match.awayId)}
        animate={match.round !== 'quarterfinals'}
      />
      {action && status === 'ready' && <div className="border-t border-line">{action}</div>}
      {status === 'in_progress' && (
        <p className="border-t border-line px-2 py-1 text-xs font-semibold text-pitch">In corso</p>
      )}
    </div>
  );
}

interface TeamRowProps {
  team: TournamentTeam | undefined;
  score: number | null;
  shootout: number | null;
  outcome: 'winner' | 'eliminated' | 'pending';
  animate: boolean;
}

function TeamRow({ team, score, shootout, outcome, animate }: TeamRowProps) {
  const nameClass =
    outcome === 'eliminated'
      ? 'text-ink-muted line-through'
      : team?.isUserTeam
        ? 'text-pitch font-bold'
        : outcome === 'winner'
          ? 'text-ink font-bold'
          : 'text-ink';
  return (
    <div
      key={team?.id ?? 'vuoto'}
      className={`flex items-center gap-2 px-2 py-1.5 min-w-0 ${team && animate ? 'motion-safe:animate-advance' : ''}`}
    >
      <TeamBadge team={team} />
      <span className={`flex-1 min-w-0 truncate text-sm ${team ? nameClass : 'text-ink-faint'}`} title={team?.name}>
        {team ? team.name : 'In attesa'}
        {team?.isUserTeam && <span className="font-normal"> (tu)</span>}
      </span>
      {score !== null && (
        <span className={`font-display text-lg tabular-nums ${outcome === 'winner' ? 'font-extrabold text-ink' : 'font-bold text-ink-muted'}`}>
          {score}
          {shootout !== null && <span className="text-xs font-semibold text-ink-muted"> ({shootout})</span>}
        </span>
      )}
    </div>
  );
}
