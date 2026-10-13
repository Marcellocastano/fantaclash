import type { ReactNode } from 'react';
import type { TournamentState, TournamentTeam } from '../../domain/tournament';
import { computeStandings, currentGroupMatchday, groupMatchday } from '../../domain/tournament';
import { ROUND_LABELS, roundMatches } from '../../domain/tournament';
import { Icon } from '../Icon';
import { TeamBadge } from './TeamBadge';

interface GroupStageHubProps {
  tournament: TournamentState;
  onPlay: (matchId: string) => void;
  onSummary: () => void;
  controls?: ReactNode;
}

export function GroupStageHub({ tournament, onPlay, onSummary, controls }: GroupStageHubProps) {
  const team = (id: string | null): TournamentTeam | undefined => tournament.teams.find(candidate => candidate.id === id);
  const userId = tournament.userTeamId;
  const day = currentGroupMatchday(tournament);
  const userFixture = day === null ? undefined : groupMatchday(tournament, day).find(fixture => fixture.homeId === userId || fixture.awayId === userId);
  const userFinalFour = roundMatches(tournament.bracket, 'semifinals').concat(roundMatches(tournament.bracket, 'final'), roundMatches(tournament.bracket, 'third_place'));
  const nextUserCup = userFinalFour.find(match => (match.homeId === userId || match.awayId === userId) && !match.winnerId);
  const qualified = userFinalFour.some(match => match.round === 'semifinals' && (match.homeId === userId || match.awayId === userId));

  let hero: React.ReactNode;
  if (tournament.status === 'completed') {
    const champion = team(tournament.winnerId);
    hero = <section className="text-center"><h1 className="font-display text-5xl sm:text-7xl font-black text-ink">{champion?.id === userId ? 'Campione!' : `Coppa a ${champion?.name ?? ''}`}</h1><button onClick={onSummary} className="btn-cta mt-6">Vai al riepilogo <Icon name="arrow" className="h-6 w-6" /></button></section>;
  } else if (tournament.status === 'groups' && userFixture && day !== null) {
    const result = tournament.matches[userFixture.id];
    hero = (
      <section className="text-center">
        <p className="section-heading">Girone {userFixture.group} · Giornata {day} · {userFixture.leg}</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide team={team(userFixture.homeId)} align="right" />
          <span className="font-display text-3xl font-black text-whistle">{result ? `${result.homeScore}-${result.awayScore}` : 'VS'}</span>
          <TeamSide team={team(userFixture.awayId)} align="left" />
        </div>
        <div className="mt-6">{controls ?? (
          <button type="button" className="btn-cta" onClick={() => onPlay(userFixture.id)}>
            <Icon name="play" className="h-6 w-6" /> Scegli la formazione e gioca
          </button>
        )}</div>
      </section>
    );
  } else if (tournament.status === 'groups') {
    hero = <section className="text-center"><h1 className="font-display text-4xl font-black text-ink">La giornata è in corso</h1><p className="mt-2 text-ink-soft">Le altre partite si stanno completando.</p><div className="mt-4">{controls ?? <button onClick={onSummary} className="btn-ghost">Vai al riepilogo</button>}</div></section>;
  } else if (nextUserCup) {
    const roundName = ROUND_LABELS[nextUserCup.round];
    hero = (
      <section className="text-center">
        <p className="section-heading">{roundName}</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide team={team(nextUserCup.homeId)} align="right" />
          <span className="font-display text-3xl font-black text-whistle">VS</span>
          <TeamSide team={team(nextUserCup.awayId)} align="left" />
        </div>
        <div className="mt-6">{controls ?? (
          <button type="button" className="btn-cta" onClick={() => onPlay(nextUserCup.id)}>
            <Icon name="play" className="h-6 w-6" /> Scegli la formazione e gioca
          </button>
        )}</div>
      </section>
    );
  } else if (!qualified && tournament.status !== 'draw') {
    hero = <section className="text-center"><h1 className="font-display text-4xl font-black text-ink">Sei fuori dalla fase finale</h1><p className="mt-2 text-ink-soft">La tua squadra non è tra le prime due del girone.</p><div className="mt-6">{controls ?? <button onClick={onSummary} className="btn-cta">Vai al riepilogo</button>}</div></section>;
  } else {
    hero = <section className="text-center"><h1 className="font-display text-4xl font-black text-ink">Turno completato</h1><button onClick={onSummary} className="btn-cta mt-6">Vai al riepilogo</button></section>;
  }

  return (
    <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8">
      {hero}
      <section className="mt-10" aria-label="Classifiche dei gironi">
        <h2 className="section-heading mb-3">Classifiche</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <GroupTable tournament={tournament} group="A" team={team} />
          <GroupTable tournament={tournament} group="B" team={team} />
        </div>
      </section>
      <section className="mt-8" aria-label="Calendario e risultati">
        <h2 className="section-heading mb-3">Andata e ritorno</h2>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => index + 1).map(matchday => (
            <details key={matchday} open={matchday === day || undefined} className="border-2 border-ink bg-canvas">
              <summary className="cursor-pointer px-3 py-2 font-display text-xl font-extrabold text-ink focus-visible:outline outline-2 outline-pitch">
                Giornata {matchday} · {matchday <= 3 ? 'Andata' : 'Ritorno'}
              </summary>
              <div className="grid gap-x-5 sm:grid-cols-2 px-3 pb-3">
                {groupMatchday(tournament, matchday).map(fixture => {
                  const result = tournament.matches[fixture.id];
                  const isUser = fixture.homeId === userId || fixture.awayId === userId;
                  return (
                    <button key={fixture.id} type="button" onClick={() => isUser && !result && onPlay(fixture.id)} disabled={!isUser || !!result} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line py-2 text-sm ${isUser ? 'font-extrabold text-pitch' : 'text-ink-soft'} disabled:cursor-default`}>
                      <span className="truncate text-right">{team(fixture.homeId)?.name}</span>
                      <span className="font-display text-lg font-black tabular-nums text-ink">{result ? `${result.homeScore}-${result.awayScore}` : '—'}</span>
                      <span className="truncate">{team(fixture.awayId)?.name}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
      {(tournament.status === 'semifinals' || tournament.status === 'final' || tournament.status === 'completed') && (
        <section className="mt-8" aria-label="Fase finale">
          <h2 className="section-heading mb-3">Fase finale</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {roundMatches(tournament.bracket, 'semifinals').concat(roundMatches(tournament.bracket, 'final'), roundMatches(tournament.bracket, 'third_place')).map(match => {
              const result = tournament.matches[match.id];
              return (
                <div key={match.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-2 border-ink px-3 py-3">
                  <span className="truncate text-right text-sm font-semibold">{team(match.homeId)?.name ?? 'In attesa'}</span>
                  <span className="text-center"><span className="block font-display text-lg font-black">{result ? `${result.homeScore}-${result.awayScore}` : '—'}</span><span className="text-[10px] font-bold text-ink-muted">{match.round === 'third_place' ? '3° POSTO' : match.round === 'semifinals' ? 'SEMIFINALE' : 'FINALE'}</span></span>
                  <span className="truncate text-sm font-semibold">{team(match.awayId)?.name ?? 'In attesa'}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function TeamSide({ team, align }: { team?: TournamentTeam; align: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="md" />
      <span className={`truncate font-display text-lg sm:text-2xl font-black ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>{team?.name ?? '—'}</span>
    </div>
  );
}

function GroupTable({ tournament, group, team }: { tournament: TournamentState; group: 'A' | 'B'; team: (id: string | null) => TournamentTeam | undefined }) {
  const rows = computeStandings(tournament, group);
  return (
    <div className="min-w-0">
      <h3 className="mb-2 font-display text-2xl font-extrabold text-ink">Girone {group}</h3>
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="bg-pitch-deep text-canvas"><tr>{['#', 'Squadra', 'G', 'V', 'N', 'P', 'GF', 'GS', 'DR', 'Pt'].map(label => <th key={label} className="px-1.5 py-2 text-center font-display text-sm font-black">{label}</th>)}</tr></thead>
          <tbody>
            {rows.map(row => {
              const entry = team(row.teamId);
              return (
                <tr key={row.teamId} className={`border-t border-line ${entry?.isUserTeam ? 'bg-highlight/40 font-extrabold text-ink' : 'text-ink-soft'}`}>
                  <td className="px-2 py-2 text-center tabular-nums">{row.position}</td>
                  <td className="max-w-40 truncate px-2 py-2">{entry?.name}{row.status === 'qualified' ? ' · Qualificata' : row.status === 'eliminated' ? ' · Eliminata' : ''}</td>
                  <td className="px-1 py-2 text-center tabular-nums">{row.played}</td><td className="px-1 py-2 text-center tabular-nums">{row.wins}</td><td className="px-1 py-2 text-center tabular-nums">{row.draws}</td><td className="px-1 py-2 text-center tabular-nums">{row.losses}</td><td className="px-1 py-2 text-center tabular-nums">{row.goalsFor}</td><td className="px-1 py-2 text-center tabular-nums">{row.goalsAgainst}</td><td className="px-1 py-2 text-center tabular-nums">{row.goalDifference}</td><td className="px-2 py-2 text-center font-black tabular-nums">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
