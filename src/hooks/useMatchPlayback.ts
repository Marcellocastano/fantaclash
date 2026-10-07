import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPlaybackState,
  lastTick,
  MatchEvent,
  MatchSide,
  MatchTeamInput,
  simulateMatch,
  Tactic,
  TacticChange,
  withTacticChange,
} from '../domain/match';

/**
 * ============================================================================
 * HOOK DI RIPRODUZIONE — adattatore sottile sopra il motore partita
 * ============================================================================
 *
 * Il motore genera l'intera partita (MatchResult) prima della
 * riproduzione; questo hook decide solo QUANDO mostrare il tick successivo.
 * Ai punti di decisione la riproduzione si ferma: la scelta dell'utente
 * aggiunge un TacticChange al piano e la partita viene ri-simulata.
 * Gli eventi prima del punto di decisione restano identici (Rng per tick),
 * quindi la riproduzione prosegue senza "riscrivere" il passato.
 */

export type PlaybackSpeed = 1 | 2 | 4;

/** Durata base di un minuto a velocità 1x (ms) */
const TICK_MS = 520;
/** Pausa extra dopo un evento importante, per leggere l'animazione (ms) */
const HOLD_MS: Partial<Record<MatchEvent['type'], number>> = {
  goal: 1800,
  own_goal: 1800,
  red_card: 1600,
  penalty: 1100,
  penalty_missed: 1100,
  chance: 700,
  save: 800,
  woodwork: 800,
  yellow_card: 600,
  half_time: 1200,
  shootout_start: 1400,
  shootout_kick: 1000,
};

export interface UseMatchPlaybackInput {
  home: MatchTeamInput;
  away: MatchTeamInput;
  seed: number;
  userSide: MatchSide;
}

export function useMatchPlayback({ home, away, seed, userSide }: UseMatchPlaybackInput) {
  const [plan, setPlan] = useState<TacticChange[]>([]);
  const [decided, setDecided] = useState<number[]>([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const result = useMemo(
    () => simulateMatch({ home, away, seed, options: { tactics: { [userSide]: plan } } }),
    [home, away, seed, userSide, plan]
  );
  const state = useMemo(() => getPlaybackState(result, tick), [result, tick]);
  const end = lastTick(result);

  // Punto di decisione in attesa: il prossimo tick da giocare è un tick di decisione
  const pendingDecision =
    tick < end && result.decisionTicks.includes(tick + 1) && !decided.includes(tick + 1) ? tick + 1 : null;
  const decisionIndex = pendingDecision === null ? -1 : result.decisionTicks.indexOf(pendingDecision);

  useEffect(() => {
    if (!playing || pendingDecision !== null || tick >= end) return;
    const hold = Math.max(0, ...state.latest.map(e => HOLD_MS[e.type] ?? 0));
    const t = setTimeout(() => setTick(x => Math.min(end, x + 1)), (TICK_MS + hold) / speed);
    return () => clearTimeout(t);
  }, [playing, pendingDecision, tick, end, speed, state.latest]);

  /** Conferma l'atteggiamento al punto di decisione e riprende */
  const chooseTactic = useCallback(
    (tactic: Tactic) => {
      if (pendingDecision === null) return;
      setPlan(p => withTacticChange(p, pendingDecision, tactic));
      setDecided(d => [...d, pendingDecision]);
      setPlaying(true);
    },
    [pendingDecision]
  );

  /** Modalità accelerata: va al fischio finale mantenendo la tattica corrente */
  const skipToEnd = useCallback(() => {
    setDecided(result.decisionTicks);
    setTick(end);
  }, [result.decisionTicks, end]);

  const currentTactic: Tactic = result.ticks[Math.max(tick, 1)]?.tactic[userSide] ?? 'equilibrata';

  return {
    result,
    state,
    tick,
    playing,
    speed,
    pendingDecision,
    decisionIndex,
    currentTactic,
    /** Durata base di un minuto alla velocità corrente (per le transizioni) */
    tickMs: TICK_MS / speed,
    setPlaying,
    setSpeed,
    chooseTactic,
    skipToEnd,
  };
}
