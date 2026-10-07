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

/** Rigori: suspense della rincorsa e tempo per leggere l'esito (ms a 1x) */
export const KICK_SUSPENSE_MS = 1500;
export const KICK_RESULT_MS = 1300;
/** Suspense extra per il rigore che decide la serie */
export const DECISIVE_EXTRA_MS = 1000;

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
  shootout_kick: KICK_SUSPENSE_MS + KICK_RESULT_MS,
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
  const [skipped, setSkipped] = useState(false);
  // Ordine dei rigoristi dell'utente: null = automatico, non ancora confermato
  const [kickOrder, setKickOrder] = useState<string[] | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  // Seme sostituibile solo dal test dei rigori (sviluppo)
  const [activeSeed, setActiveSeed] = useState(seed);

  const result = useMemo(
    () =>
      simulateMatch({
        home,
        away,
        seed: activeSeed,
        options: { tactics: { [userSide]: plan }, shootoutOrder: kickOrder ? { [userSide]: kickOrder } : undefined },
      }),
    [home, away, activeSeed, userSide, plan, kickOrder]
  );
  const state = useMemo(() => getPlaybackState(result, tick), [result, tick]);
  const end = lastTick(result);

  // Punto di decisione in attesa: il prossimo tick da giocare è un tick di decisione
  const pendingDecision =
    tick < end && result.decisionTicks.includes(tick + 1) && !decided.includes(tick + 1) ? tick + 1 : null;
  const decisionIndex = pendingDecision === null ? -1 : result.decisionTicks.indexOf(pendingDecision);
  // Fine dei 90' in pareggio: si aspetta l'ordine dei rigoristi
  const pendingShootoutOrder = !!result.shootout && tick === result.fullTimeTick && !orderConfirmed;

  useEffect(() => {
    if (!playing || pendingDecision !== null || pendingShootoutOrder || tick >= end) return;
    const hold = Math.max(0, ...state.latest.map(e => HOLD_MS[e.type] ?? 0));
    const t = setTimeout(() => setTick(x => Math.min(end, x + 1)), (TICK_MS + hold) / speed);
    return () => clearTimeout(t);
  }, [playing, pendingDecision, pendingShootoutOrder, tick, end, speed, state.latest]);

  /** Conferma l'ordine dei rigoristi (id, primo = primo a tirare) e riprende */
  const confirmShootoutOrder = useCallback((order: string[]) => {
    setKickOrder(order);
    setOrderConfirmed(true);
    setPlaying(true);
  }, []);

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

  /**
   * Modalità accelerata: va al fischio finale mantenendo la tattica
   * corrente. Con un pareggio si ferma all'inizio dei rigori, che si vedono
   * comunque (prima si sceglie l'ordine dei rigoristi).
   */
  const skipToEnd = useCallback(() => {
    setDecided(result.decisionTicks);
    if (result.shootout && tick < result.fullTimeTick) {
      setTick(result.fullTimeTick);
      return;
    }
    setSkipped(true);
    setTick(end);
  }, [result.decisionTicks, result.shootout, result.fullTimeTick, tick, end]);

  /**
   * Test (solo sviluppo): cerca il primo seme successivo che finisce ai
   * rigori e riparte poco prima della fine dei regolamentari.
   */
  const jumpToShootout = useCallback(() => {
    for (let s = activeSeed + 1; s < activeSeed + 5000; s++) {
      const r = simulateMatch({ home, away, seed: s, options: { tactics: { [userSide]: plan } } });
      if (!r.shootout) continue;
      setActiveSeed(s);
      setKickOrder(null);
      setOrderConfirmed(false);
      setDecided(r.decisionTicks);
      setTick(r.fullTimeTick - 2);
      setPlaying(true);
      return;
    }
  }, [activeSeed, home, away, userSide, plan]);

  const currentTactic: Tactic = result.ticks[Math.max(tick, 1)]?.tactic[userSide] ?? 'equilibrata';

  return {
    result,
    state,
    tick,
    playing,
    speed,
    skipped,
    pendingDecision,
    decisionIndex,
    pendingShootoutOrder,
    currentTactic,
    /** Durata base di un minuto alla velocità corrente (per le transizioni) */
    tickMs: TICK_MS / speed,
    setPlaying,
    setSpeed,
    chooseTactic,
    confirmShootoutOrder,
    skipToEnd,
    jumpToShootout,
  };
}
