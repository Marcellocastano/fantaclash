import { useEffect, useMemo, useState } from 'react';
import { Team } from '../../types';
import { MatchResult, MatchSide } from '../../domain/match';
import { findMatch, ROUND_LABELS, toMatchTeam, TournamentRound, TournamentState } from '../../domain/tournament';
import { MatchPlayback, PlaybackSpeed, useMatchPlayback } from '../../hooks/useMatchPlayback';
import { playSound } from '../../services/sound';
import { Icon } from '../Icon';
import { AttackIndicator } from './AttackIndicator';
import { MatchEnd } from './MatchEnd';
import { MatchEventBanner } from './MatchEventBanner';
import { MatchFeed } from './MatchFeed';
import { MatchStats } from './MatchStats';
import { PitchView } from './PitchView';
import { Scoreboard } from './Scoreboard';
import { ShootoutOrderPanel } from './ShootoutOrderPanel';
import { ShootoutStage } from './ShootoutStage';
import { TacticOverlay } from './TacticOverlay';
import { useShootoutKick } from './useShootoutKick';

export type MatchExit = 'continue' | 'conclude';

interface MatchScreenProps {
  tournament: TournamentState;
  teams: Team[];
  matchId: string;
  onFinish: (result: MatchResult, exit: MatchExit) => void;
}

const SPEEDS: PlaybackSpeed[] = [1, 2, 4];

/**
 * Schermata "Gioca": riproduce la partita generata dal motore, con
 * inerzia, animazioni degli eventi, tre momenti decisionali e la lotteria
 * dei rigori.
 */
export function MatchScreen({ tournament, teams, matchId, onFinish }: MatchScreenProps) {
  const match = findMatch(tournament.bracket, matchId);
  const homeTeam = teams.find(t => t.id === match?.homeId);
  const awayTeam = teams.find(t => t.id === match?.awayId);
  const home = useMemo(() => (homeTeam ? toMatchTeam(homeTeam) : null), [homeTeam]);
  const away = useMemo(() => (awayTeam ? toMatchTeam(awayTeam) : null), [awayTeam]);
  if (!match || !home || !away) return null;
  return <MatchPlayer tournament={tournament} home={home} away={away} seed={match.seed} round={match.round} onFinish={onFinish} />;
}

function MatchPlayer({ tournament, home, away, seed, round, onFinish }: MatchPlayerProps) {
  const userSide = home.id === tournament.userTeamId ? 'home' : 'away';
  const pb = useMatchPlayback({ home, away, seed, userSide });
  return (
    <MatchPlaybackView
      tournament={tournament}
      home={home}
      away={away}
      round={round}
      pb={pb}
      userSide={userSide}
      onFinish={onFinish}
    />
  );
}

interface MatchPlayerProps {
  tournament: TournamentState;
  home: ReturnType<typeof toMatchTeam>;
  away: ReturnType<typeof toMatchTeam>;
  seed: number;
  round: TournamentRound;
  onFinish: (result: MatchResult, exit: MatchExit) => void;
}

export interface RoomMatchUi {
  /** Stacca solo la vista locale, senza cambiare lo stato del torneo */
  onExit: () => void;
  /** Testo mostrato quando la partita è ferma per scelte altrui */
  waitingText?: string | null;
  /** Testo dopo l'invio della scelta (default: attesa avversario) */
  sentLabel?: string;
}

/**
 * Vista pura del playback: riceve l'oggetto del controller (locale o di
 * stanza) e non decide COME avanza la partita. In `room` mode spariscono
 * velocità, pausa e skip e i pulsanti di uscita del singolo.
 */
export function MatchPlaybackView({
  tournament,
  home,
  away,
  round,
  pb,
  userSide,
  onFinish,
  room,
}: {
  tournament: TournamentState;
  home: ReturnType<typeof toMatchTeam>;
  away: ReturnType<typeof toMatchTeam>;
  round: TournamentRound;
  pb: MatchPlayback;
  userSide: MatchSide;
  onFinish: (result: MatchResult, exit: MatchExit) => void;
  room?: RoomMatchUi;
}) {
  const { result, state } = pb;
  const [tab, setTab] = useState<'cronaca' | 'statistiche'>('cronaca');
  const tick = result.ticks[state.tick.index];
  const shoot = useShootoutKick(result, state.latest, pb.speed, pb.skipped);
  const inShootout = !!result.shootout && state.tick.index >= result.fullTimeTick;
  // Il fischio finale arriva insieme all'ultimo rigore: si aspetta che l'esito sia rivelato
  const showEnd = state.finished && shoot.phase === 'done';
  const kicks = state.events.filter(e => e.type === 'shootout_kick');
  const shootoutScore = !inShootout ? null : shoot.revealed ? state.shootout : (kicks[kicks.length - 2]?.score ?? null);

  // Suoni: gol e fischi (i rigori finali hanno i loro)
  useEffect(() => {
    if (state.latest.some(e => e.type === 'goal' || e.type === 'own_goal')) playSound('goal');
    else if (state.latest.some(e => e.type === 'half_time' || (e.type === 'full_time' && !result.shootout))) playSound('whistle');
  }, [state.latest, result.shootout]);

  return (
    <div className="flex-1">
      <Scoreboard
        home={tournament.teams.find(t => t.id === home.id)}
        away={tournament.teams.find(t => t.id === away.id)}
        state={state}
        roundLabel={ROUND_LABELS[round]}
        tactics={result.ticks[Math.max(1, state.tick.index)].tactic}
        userFiato={tick.energy[userSide]}
        userSide={userSide}
        shootout={showEnd ? state.shootout : shootoutScore}
        indicator={<AttackIndicator ball={state.tick.ball} transitionMs={pb.tickMs} homeIsUser={userSide === 'home'} />}
      />

      <div className="max-w-[1500px] mx-auto px-4 py-8">
        {showEnd ? (
          <MatchEnd
            result={result}
            userTeamId={tournament.userTeamId}
            round={round}
            onContinue={() => (room ? room.onExit() : onFinish(result, 'continue'))}
            onConclude={() => (room ? room.onExit() : onFinish(result, 'conclude'))}
            exitLabel={room ? 'Torna al tabellone' : undefined}
          />
        ) : (
          <div className="grid grid-cols-12 gap-x-0 gap-y-8 lg:gap-x-8">
            <div className="col-span-12 lg:col-span-8">
              {/* Controlli di riproduzione (solo gioco singolo) */}
              {!room && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                  onClick={() => pb.setPlaying(!pb.playing)}
                  disabled={pb.pendingDecision !== null || pb.pendingShootoutOrder}
                  className="btn-ghost px-3 py-2"
                  aria-label={pb.playing ? 'Pausa' : 'Riprendi'}
                >
                  <Icon name={pb.playing ? 'pause' : 'play'} className="w-5 h-5" />
                </button>
                <div className="flex border-2 border-ink" role="group" aria-label="Velocità">
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={() => pb.setSpeed(s)}
                      aria-pressed={pb.speed === s}
                      className={`px-3 py-2 font-display font-extrabold text-lg leading-none ${pb.speed === s ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-5">
                  {import.meta.env.DEV && !inShootout && (
                    <button onClick={pb.jumpToShootout} className="link-action text-sm" title="Solo sviluppo: rigioca con un seme che finisce ai rigori">
                      Test rigori
                    </button>
                  )}
                  <button onClick={pb.skipToEnd} className="link-action">
                    <Icon name="skip" className="w-4 h-4" />
                    Fischio finale
                  </button>
                </div>
              </div>
              )}

              <div className="relative overflow-x-auto">
                {inShootout ? (
                  <ShootoutStage result={result} kicks={kicks} kick={shoot.kick} phase={shoot.phase} decisive={shoot.decisive} userSide={userSide} />
                ) : (
                  <>
                    <PitchView result={result} state={state} />
                    <MatchEventBanner latest={state.latest} result={result} />
                  </>
                )}
                {pb.pendingShootoutOrder && (
                  <ShootoutOrderPanel
                    players={(result.shootoutOrder?.[userSide] ?? []).flatMap(id => result.lineups[userSide].filter(p => p.playerId === id))}
                    onConfirm={pb.confirmShootoutOrder}
                    deadlineSec={room ? pb.deadlineSec : undefined}
                    sent={room ? pb.choiceSent : undefined}
                    sentLabel={room?.sentLabel}
                  />
                )}
                {pb.pendingDecision !== null && (
                  <TacticOverlay
                    decisionIndex={pb.decisionIndex}
                    current={pb.currentTactic}
                    fiato={tick.energy[userSide]}
                    scoreLine={`${state.score.home}-${state.score.away}`}
                    onChoose={t => {
                      if (pb.decisionIndex === 0) playSound('whistle');
                      pb.chooseTactic(t);
                    }}
                    deadlineSec={room ? pb.deadlineSec : undefined}
                    sent={room ? pb.choiceSent : undefined}
                  />
                )}
                {room?.waitingText && pb.pendingDecision === null && !pb.pendingShootoutOrder && (
                  <div className="absolute inset-x-0 bottom-0 z-10 bg-ink/85 text-canvas text-center py-2 text-sm font-semibold">
                    {room.waitingText}
                  </div>
                )}
              </div>
            </div>

            <aside className="col-span-12 lg:col-span-4">
              <div className="flex border-b-2 border-ink mb-4" role="tablist">
                {(['cronaca', 'statistiche'] as const).map(t => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 font-display text-2xl font-extrabold capitalize ${tab === t ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'cronaca' ? (
                <MatchFeed events={state.events} userSide={userSide} hiddenId={shoot.revealed ? null : shoot.kick?.id} />
              ) : (
                <MatchStats stats={state.stats} homeName={home.name} awayName={away.name} />
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
