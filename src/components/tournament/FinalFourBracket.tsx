import type { TournamentState } from '../../domain/tournament';
import { TeamBadge } from './TeamBadge';

export function FinalFourBracket({ tournament }: { tournament: TournamentState }) {
  const team = (id: string | null) => tournament.teams.find(candidate => candidate.id === id);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tournament.bracket.filter(match => ['semifinals', 'final', 'third_place'].includes(match.round)).map(match => {
        const result = tournament.matches[match.id];
        return (
          <article key={match.id} className="border-2 border-ink bg-canvas px-3 py-3">
            <h3 className="mb-2 font-display text-lg font-black text-ink">
              {match.round === 'semifinals' ? `Semifinale ${match.index + 1}` : match.round === 'third_place' ? 'Finale per il terzo posto' : 'Finale'}
            </h3>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="flex min-w-0 items-center justify-end gap-2">
                <span className="truncate text-right text-sm font-semibold">{team(match.homeId)?.name ?? 'In attesa'}</span>
                <TeamBadge team={team(match.homeId)} size="sm" />
              </span>
              <span className="font-display text-2xl font-black tabular-nums text-ink">
                {result ? `${result.homeScore}-${result.awayScore}` : '—'}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <TeamBadge team={team(match.awayId)} size="sm" />
                <span className="truncate text-sm font-semibold">{team(match.awayId)?.name ?? 'In attesa'}</span>
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
