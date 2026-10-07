import { useMemo } from 'react';
import { Team } from '../../types';
import { MatchResult, TACTIC_LABELS } from '../../domain/match';
import { findMatch, ROUND_LABELS, toMatchTeam, TournamentState } from '../../domain/tournament';
import { PlaybackSpeed, useMatchPlayback } from '../../hooks/useMatchPlayback';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { AttackIndicator } from './AttackIndicator';
import { MatchEnd } from './MatchEnd';
import { MatchEventBanner } from './MatchEventBanner';
import { MatchFeed } from './MatchFeed';
import { MatchStats } from './MatchStats';
import { PitchView } from './PitchView';
import { Scoreboard } from './Scoreboard';
import { TacticPanel } from './TacticPanel';

export type MatchExit = 'continue' | 'view' | 'conclude';

interface MatchScreenProps {
  tournament: TournamentState;
  teams: Team[];
  matchId: string;
  onFinish: (result: MatchResult, exit: MatchExit) => void;
}

const SPEEDS: PlaybackSpeed[] = [1, 2, 4];

/**
 * Schermata "Gioca": riproduce la partita generata dal motore, con
 * inerzia, animazioni degli eventi e tre momenti decisionali.
 */
export function MatchScreen({ tournament, teams, matchId, onFinish }: MatchScreenProps) {
  const match = findMatch(tournament.bracket, matchId);
  const homeTeam = teams.find(t => t.id === match?.homeId);
  const awayTeam = teams.find(t => t.id === match?.awayId);
  const home = useMemo(() => (homeTeam ? toMatchTeam(homeTeam) : null), [homeTeam]);
  const away = useMemo(() => (awayTeam ? toMatchTeam(awayTeam) : null), [awayTeam]);
  if (!match || !home || !away) return null;
  return (
    <MatchPlayer
      tournament={tournament}
      home={home}
      away={away}
      seed={match.seed}
      roundLabel={ROUND_LABELS[match.round]}
      onFinish={onFinish}
    />
  );
}

interface MatchPlayerProps {
  tournament: TournamentState;
  home: ReturnType<typeof toMatchTeam>;
  away: ReturnType<typeof toMatchTeam>;
  seed: number;
  roundLabel: string;
  onFinish: (result: MatchResult, exit: MatchExit) => void;
}

function MatchPlayer({ tournament, home, away, seed, roundLabel, onFinish }: MatchPlayerProps) {
  const userSide = home.id === tournament.userTeamId ? 'home' : 'away';
  const pb = useMatchPlayback({ home, away, seed, userSide });
  const { result, state } = pb;
  const homeT = tournament.teams.find(t => t.id === home.id);
  const awayT = tournament.teams.find(t => t.id === away.id);
  const energy = result.ticks[state.tick.index].energy[userSide];
  const opponentTactic = result.ticks[Math.max(1, state.tick.index)].tactic[userSide === 'home' ? 'away' : 'home'];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line-strong">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex items-center justify-between">
          <p className="flex items-center gap-2.5 font-display text-2xl font-extrabold text-pitch leading-none">
            <LogoMark className="h-8 w-8" />
            {tournament.name}
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 py-6">
        <Scoreboard home={homeT} away={awayT} state={state} roundLabel={roundLabel} />
        <AttackIndicator
          homeName={home.name}
          awayName={away.name}
          ball={state.tick.ball}
          transitionMs={pb.tickMs}
          homeIsUser={userSide === 'home'}
          awayIsUser={userSide === 'away'}
        />

        <div className="grid grid-cols-12 gap-6 mt-2">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {state.finished ? (
              <MatchEnd
                result={result}
                userTeamId={tournament.userTeamId}
                onContinue={() => onFinish(result, 'continue')}
                onViewResult={() => onFinish(result, 'view')}
                onConclude={() => onFinish(result, 'conclude')}
              />
            ) : (
              <>
                {/* Controlli di riproduzione */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => pb.setPlaying(!pb.playing)}
                    className="p-2 border border-line-strong text-ink hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
                    aria-label={pb.playing ? 'Pausa' : 'Riprendi'}
                  >
                    <Icon name={pb.playing ? 'pause' : 'play'} className="w-5 h-5" />
                  </button>
                  <div className="flex border border-line-strong" role="group" aria-label="Velocità">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => pb.setSpeed(s)}
                        className={`px-3 py-2 font-display font-bold text-sm transition-colors duration-150 ${
                          pb.speed === s ? 'bg-pitch text-on-pitch' : 'text-ink hover:bg-surface'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                  <button onClick={pb.skipToEnd} className="btn-ghost px-3 py-2 text-sm inline-flex items-center gap-2">
                    <Icon name="skip" className="w-4 h-4" />
                    Fischio finale
                  </button>
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="text-ink-muted">
                      Tu: <span className="font-semibold text-pitch">{TACTIC_LABELS[pb.currentTactic]}</span>
                    </span>
                    <span className="text-ink-muted">
                      Avversario: <span className="font-semibold text-ink">{TACTIC_LABELS[opponentTactic]}</span>
                    </span>
                    <span className="flex items-center gap-2 text-ink-muted">
                      Energia
                      <span className="w-20 h-1.5 bg-line inline-block">
                        <span className="block h-full bg-pitch transition-[width] duration-500" style={{ width: `${energy}%` }} />
                      </span>
                    </span>
                  </div>
                </div>

                {pb.pendingDecision !== null && (
                  <TacticPanel
                    decisionIndex={pb.decisionIndex}
                    current={pb.currentTactic}
                    energy={energy}
                    scoreLine={`${home.name} ${state.score.home} - ${state.score.away} ${away.name}`}
                    onChoose={pb.chooseTactic}
                  />
                )}

                <div className="relative">
                  <PitchView result={result} state={state} />
                  <MatchEventBanner latest={state.latest} result={result} />
                </div>
              </>
            )}
          </div>

          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <MatchStats stats={state.stats} />
            <MatchFeed events={state.events} userSide={userSide} />
          </aside>
        </div>
      </main>
    </div>
  );
}
