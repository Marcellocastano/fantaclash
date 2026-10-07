import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, PlayerRole } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { playSound } from '../../services/sound';

/** Passo dello scanner del bot (ms) e durata del "fermo" sul chiamato */
const SCAN_STEP_MS = 340;
const LOCK_MS = 750;
const OUTBID_MS = 1300;

/**
 * Scanner del listone mentre un bot sceglie: l'evidenziatore salta tra
 * alcuni candidati plausibili (solo presentazione, il motore non cambia),
 * poi si ferma sul giocatore chiamato.
 */
export function useBotScanner(active: boolean, role: PlayerRole, pool: Player[], calledId: string | null) {
  const [scanId, setScanId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const wasActive = useRef(false);

  const candidates = useMemo(() => {
    if (!active) return [];
    const top = pool
      .filter(p => p.role === role)
      .sort((a, b) => playerOverall(b) - playerOverall(a))
      .slice(0, 8);
    return top.sort(() => Math.random() - 0.5).slice(0, 5).map(p => p.id);
    // I candidati si fissano all'inizio della scelta del bot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, role]);

  useEffect(() => {
    if (!active || candidates.length === 0) return;
    let i = 0;
    setScanId(candidates[0]);
    const t = setInterval(() => {
      i = (i + 1) % candidates.length;
      setScanId(candidates[i]);
    }, SCAN_STEP_MS);
    return () => clearInterval(t);
  }, [active, candidates]);

  // Fine scelta: fermo sul chiamato
  useEffect(() => {
    if (wasActive.current && !active && calledId) {
      setScanId(null);
      setLockedId(calledId);
      const t = setTimeout(() => setLockedId(null), LOCK_MS);
      wasActive.current = active;
      return () => clearTimeout(t);
    }
    if (!active) setScanId(null);
    wasActive.current = active;
  }, [active, calledId]);

  return { scanId: active ? scanId : null, lockedId };
}

/** Pausa sul "Venduto" / "Reparto chiuso" prima di ripartire da soli (ms) */
export const AUTO_ADVANCE_MS = 2500;

/**
 * Avanzamento automatico: `stepKey` identifica il momento di attesa
 * (lotto venduto, reparto chiuso); a ogni nuovo momento, se attivo,
 * dopo AUTO_ADVANCE_MS chiama `onAdvance`.
 */
export function useAutoAdvance(enabled: boolean, stepKey: string | null, onAdvance: () => void) {
  useEffect(() => {
    if (!enabled || !stepKey) return;
    const t = setTimeout(onAdvance, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [enabled, stepKey, onAdvance]);
}

interface BidFxInput {
  active: boolean;
  bidderId: string | null;
  bid: number;
  userTeamId: string;
  timeRemaining: number;
  sold: boolean;
  soldToUser: boolean;
}

/**
 * Feedback dell'asta: suoni di rilancio e timer, "superato" quando un bot
 * scavalca l'utente, suono di aggiudicazione.
 */
export function useBidFeedback({ active, bidderId, bid, userTeamId, timeRemaining, sold, soldToUser }: BidFxInput) {
  const [outbidKey, setOutbidKey] = useState(0);
  const [outbid, setOutbid] = useState(false);
  const prevBidder = useRef<string | null>(null);
  const prevBid = useRef(0);
  const prevSecond = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      prevBidder.current = null;
      prevBid.current = 0;
      return;
    }
    if (bid !== prevBid.current && bidderId) {
      if (prevBidder.current === userTeamId && bidderId !== userTeamId) {
        playSound('outbid');
        setOutbid(true);
        setOutbidKey(k => k + 1);
      } else {
        playSound(bidderId === userTeamId ? 'bid' : 'call');
      }
    }
    if (bidderId === userTeamId) setOutbid(false);
    prevBidder.current = bidderId;
    prevBid.current = bid;
  }, [active, bid, bidderId, userTeamId]);

  useEffect(() => {
    if (!outbid) return;
    const t = setTimeout(() => setOutbid(false), OUTBID_MS);
    return () => clearTimeout(t);
  }, [outbid, outbidKey]);

  // Ticchettio negli ultimi 2 secondi
  useEffect(() => {
    if (!active) {
      prevSecond.current = null;
      return;
    }
    const second = Math.ceil(timeRemaining / 1000);
    if (timeRemaining < 2000 && second !== prevSecond.current && timeRemaining > 0) playSound('tick');
    prevSecond.current = second;
  }, [active, timeRemaining]);

  useEffect(() => {
    if (sold) playSound(soldToUser ? 'won' : 'sold');
  }, [sold, soldToUser]);

  return { outbid, outbidKey };
}
