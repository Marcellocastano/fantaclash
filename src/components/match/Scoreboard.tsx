import { ReactNode } from 'react';
import { PlaybackPhase, PlaybackState, Tactic, TACTIC_KEY } from '../../domain/match';
import { TournamentTeam } from '../../domain/tournament';
import { CatalogKey } from '../../i18n/translate';
import { useT } from '../../i18n/I18nProvider';
import { TeamBadge } from '../tournament/TeamBadge';
import { FiatoMeter } from './FiatoMeter';

const PHASE_KEY: Record<PlaybackPhase, CatalogKey> = {
  prepartita: 'match.phase.prepartita',
  primo_tempo: 'match.phase.primo_tempo',
  intervallo: 'match.phase.intervallo',
  secondo_tempo: 'match.phase.secondo_tempo',
  rigori: 'match.phase.rigori',
  finale: 'match.phase.finale',
};

interface ScoreboardProps {
  home: TournamentTeam | undefined;
  away: TournamentTeam | undefined;
  state: PlaybackState;
  roundLabel: string;
  tactics: Record<'home' | 'away', Tactic>;
  /** Fiato della squadra dell'utente (solo il suo lato lo mostra) */
  userFiato: number;
  userSide: 'home' | 'away';
  /** Risultato dei rigori da mostrare (null finché la serie è in corso) */
  shootout: { home: number; away: number } | null;
  /** Ritorno: gol dell'andata dai lati di questa partita (pill "Agg.") */
  firstLeg?: { home: number; away: number };
  /** Indicatore d'attacco sul fondo della fascia */
  indicator: ReactNode;
}

/** Fascia tabellone in stile broadcast: squadre, punteggio, minuto, stile e fiato */
export function Scoreboard({ home, away, state, roundLabel, tactics, userFiato, userSide, shootout, firstLeg, indicator }: ScoreboardProps) {
  const t = useT();
  const lastGoal = [...state.latest].reverse().find(e => e.type === 'goal' || e.type === 'own_goal');
  const digit = (side: 'home' | 'away') => (
    <span
      key={`${side}${state.score[side]}`}
      className={`inline-block ${lastGoal?.side === side ? 'text-highlight motion-safe:animate-stamp' : ''}`}
    >
      {state.score[side]}
    </span>
  );
  const side = (s: 'home' | 'away', team: TournamentTeam | undefined) => (
    <TeamSide team={team} alignRight={s === 'away'} tactic={tactics[s]} fiato={s === userSide ? userFiato : null} />
  );

  return (
    <section className="bg-pitch-deep text-canvas border-b-4 border-ink">
      <div className="max-w-[1500px] mx-auto px-4 pt-5 pb-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
          {side('home', home)}
          <div className="text-center">
            <p className="text-xs md:text-sm font-bold text-canvas/60">{roundLabel}</p>
            <p className="font-display text-5xl md:text-8xl font-black tabular-nums leading-none mt-1">
              {digit('home')}
              <span className="text-canvas/40 px-2 md:px-3">-</span>
              {digit('away')}
            </p>
            {firstLeg && (
              <p
                key={`agg${state.score.home + firstLeg.home}-${state.score.away + firstLeg.away}`}
                className="inline-block mt-1 bg-highlight text-on-highlight border-2 border-ink px-2 py-0.5 font-display text-sm md:text-base font-extrabold tabular-nums motion-safe:animate-pop"
              >
                {t('match.scoreboard.aggregate', { home: state.score.home + firstLeg.home, away: state.score.away + firstLeg.away })}
              </p>
            )}
            {shootout && (
              <p className="font-display text-lg md:text-xl font-extrabold text-highlight tabular-nums">
                {t('match.scoreboard.shootout', { home: shootout.home, away: shootout.away })}
              </p>
            )}
            <p className="flex items-baseline justify-center gap-1.5 md:gap-2 mt-1">
              <span className="font-display text-2xl md:text-3xl font-black tabular-nums">{state.tick.index === 0 ? "0'" : state.clock}</span>
              <span className="text-xs md:text-sm font-semibold text-canvas/60">{t(PHASE_KEY[state.phase])}</span>
            </p>
          </div>
          {side('away', away)}
        </div>

        {/* Mobile: stili e fiato in una riga sotto (nelle colonne laterali non ci stanno) */}
        <div className="md:hidden mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-canvas/70">
          <span className="truncate">{t('match.scoreboard.style')} {t(TACTIC_KEY[tactics.home])}</span>
          <FiatoMeter value={userFiato} />
          <span className="truncate">{t('match.scoreboard.style')} {t(TACTIC_KEY[tactics.away])}</span>
        </div>

        <div className="mt-4 md:mt-5">{indicator}</div>
      </div>
    </section>
  );
}

interface TeamSideProps {
  team: TournamentTeam | undefined;
  alignRight: boolean;
  tactic: Tactic;
  fiato: number | null;
}

function TeamSide({ team, alignRight, tactic, fiato }: TeamSideProps) {
  const t = useT();
  return (
    <div className={`flex items-center gap-2.5 md:gap-4 min-w-0 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="lg" />
      <div className="min-w-0">
        <p className={`font-display text-2xl md:text-4xl font-black leading-none truncate ${team?.isUserTeam ? 'text-highlight' : ''}`}>{team?.name}</p>
        <p className={`hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm ${alignRight ? 'justify-end' : ''}`}>
          <span className="text-canvas/70">
            {t('match.scoreboard.style')} <span className="font-bold text-canvas">{t(TACTIC_KEY[tactic])}</span>
          </span>
          {fiato !== null && <FiatoMeter value={fiato} />}
        </p>
      </div>
    </div>
  );
}
