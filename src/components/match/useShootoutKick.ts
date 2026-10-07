import { useEffect, useState } from 'react';
import { MatchEvent, MatchResult } from '../../domain/match';
import { DECISIVE_EXTRA_MS, KICK_RESULT_MS, KICK_SUSPENSE_MS } from '../../hooks/useMatchPlayback';
import { playSound } from '../../services/sound';

export type KickPhase = 'runup' | 'result' | 'done';

/**
 * Rigore della lotteria in corso: il motore conosce già l'esito, la UI lo
 * nasconde per la durata della rincorsa (suspense) e poi lo rivela.
 * Il rigore decisivo ha una suspense più lunga. I tempi seguono la
 * velocità di riproduzione.
 */
export function useShootoutKick(result: MatchResult, latest: MatchEvent[], speed: number, skipped: boolean) {
  const kick = latest.find(e => e.type === 'shootout_kick') ?? null;
  const allKicks = result.events.filter(e => e.type === 'shootout_kick');
  const decisive = !!kick && allKicks[allKicks.length - 1]?.id === kick.id;
  const [state, setState] = useState<{ id: string | null; phase: KickPhase }>({ id: null, phase: 'done' });
  const phase: KickPhase = !kick || skipped ? 'done' : state.id === kick.id ? state.phase : 'runup';

  useEffect(() => {
    if (!kick || skipped) return;
    playSound('heartbeat');
    const suspense = (KICK_SUSPENSE_MS + (decisive ? DECISIVE_EXTRA_MS : 0)) / speed;
    const toResult = setTimeout(() => {
      playSound(kick.scored ? 'goal' : 'save');
      setState({ id: kick.id, phase: 'result' });
    }, suspense);
    const toDone = setTimeout(() => setState({ id: kick.id, phase: 'done' }), suspense + KICK_RESULT_MS / speed);
    return () => {
      clearTimeout(toResult);
      clearTimeout(toDone);
    };
    // Si riparte solo a un nuovo rigore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kick?.id, skipped]);

  return { kick, phase, decisive, revealed: phase !== 'runup' };
}
