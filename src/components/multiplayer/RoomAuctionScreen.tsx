import { useEffect, useRef, useState } from 'react';
import { AuctionControllerProvider } from '../../hooks/auctionController';
import { AuctionRoom } from '../auction/AuctionRoom';
import { TeamBadge } from '../tournament/TeamBadge';
import { PlayerRole, Team } from '../../types';
import { RoomState } from '../../multiplayer/protocol';
import { AuctionAction, getCurrentCallerId } from '../../services/auction';
import { buildStartTournament } from '../../multiplayer/hostTournament';
import { useRoom } from './RoomProvider';
import { useRoomAuction } from './useRoomAuction';
import { useRoomHostDriver } from './useRoomHostDriver';
import { RoomTopBar } from './RoomTopBar';

const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];
/** ~20 azioni al secondo per restare nel budget di messaggi Realtime */
const FLASH_STEP_MS = 50;

/**
 * Prossima azione d'asta valida da stato corrente, come nextAuctionAction
 * nei test di integrazione. Solo per "Asta lampo" in sviluppo.
 */
function nextRoomAuctionAction(state: RoomState | null): AuctionAction | null {
  const a = state?.auction;
  if (!a) return null;
  switch (a.phase) {
    case 'calling': {
      const callerId = getCurrentCallerId(a);
      const player = a.remainingPlayers.find(p => p.role === a.currentRole);
      if (!callerId || !player) return null;
      return { type: 'CALL_PLAYER', teamId: callerId, playerId: player.id, now: Date.now(), seed: (Math.random() * 2 ** 31) | 0 };
    }
    case 'bidding':
      return { type: 'CLOSE_LOT', now: a.lot?.deadline ?? Date.now() };
    case 'sold':
      return { type: 'ADVANCE' };
    case 'role_complete':
      return { type: 'CONTINUE' };
    default:
      return null;
  }
}

/** Una rosa completata: stemma, nome, proprietario, giocatori */
function RosterCard({ team, state }: { team: Team; state: RoomState }) {
  const owner = team.ownerId ? state.players.find(p => p.id === team.ownerId) : undefined;
  return (
    <li className="panel p-3">
      <div className="flex items-center gap-2 min-w-0">
        <TeamBadge team={team} size="sm" />
        <span className="font-display font-extrabold text-ink truncate">{team.name}</span>
        <span className="ml-auto shrink-0 text-xs text-ink-muted">
          {owner?.nickname ?? 'Bot'}
        </span>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {ROLE_ORDER.flatMap(role =>
          team.roster
            .filter(o => o.player.role === role)
            .map(o => (
              <li key={o.player.id} className="flex items-center gap-2 min-w-0">
                <span className="w-4 shrink-0 text-center text-[10px] font-bold text-ink-muted">{role}</span>
                <span className="truncate">{o.player.name}</span>
                <span className="ml-auto shrink-0 tabular-nums text-ink-muted">{o.purchasePrice}</span>
              </li>
            ))
        )}
        {team.roster.length === 0 && <li className="text-ink-muted">Rosa vuota</li>}
      </ul>
    </li>
  );
}

/** Schermata di fine asta: tutte le rose; l'host avvia il torneo */
function AuctionDoneScreen({ state }: { state: RoomState }) {
  const room = useRoom();
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="font-display text-4xl sm:text-5xl font-black text-ink text-center">Asta completata</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
        {state.teams.map(t => (
          <RosterCard key={t.id} team={t} state={state} />
        ))}
      </ul>
      <div className="text-center mt-8">
        {room.isHost ? (
          <button
            type="button"
            onClick={() => room.dispatchRoomAction(buildStartTournament())}
            className="btn-primary px-6 py-3"
          >
            Avvia il torneo
          </button>
        ) : (
          <p className="text-sm text-ink-muted">In attesa che l'host avvii il torneo…</p>
        )}
      </div>
    </div>
  );
}

/**
 * Asta live della stanza: lo stesso AuctionRoom del gioco singolo,
 * alimentato dal controller remoto. Il driver autorevole gira solo
 * sull'host (dentro useRoomHostDriver).
 */
export function RoomAuctionScreen() {
  const room = useRoom();
  const state = room.state;
  const [flashing, setFlashing] = useState(false);
  useRoomHostDriver(flashing);
  const controller = useRoomAuction();

  // "Asta lampo" (dev): dispatcha azioni d'asta valide a ritmo fisso.
  // Ref sullo stato: il valore del context cambia a ogni revisione.
  const roomRef = useRef(room);
  roomRef.current = room;
  const failures = useRef(0);
  useEffect(() => {
    if (!flashing || !room.isHost) return;
    const timer = setInterval(() => {
      const s = roomRef.current.state;
      const action = nextRoomAuctionAction(s);
      if (!action || failures.current > 5) {
        setFlashing(false);
        return;
      }
      const ok = roomRef.current.dispatchRoomAction({ type: 'AUCTION', action });
      failures.current = ok ? 0 : failures.current + 1;
      if (s?.auction && nextRoomAuctionAction(s) === null) setFlashing(false);
    }, FLASH_STEP_MS);
    return () => clearInterval(timer);
  }, [flashing, room.isHost]);

  if (!state?.auction) return null;
  return (
    <div className="px-1">
      <RoomTopBar />
      {state.auction.phase === 'complete' ? (
        <AuctionDoneScreen state={state} />
      ) : (
        <>
          {import.meta.env.DEV && room.isHost && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setFlashing(f => !f)}
                className="btn-ghost !py-1 text-xs"
              >
                {flashing ? 'Ferma asta lampo' : 'Asta lampo (dev)'}
              </button>
            </div>
          )}
          <AuctionControllerProvider value={controller}>
            <AuctionRoom onComplete={() => {}} />
          </AuctionControllerProvider>
        </>
      )}
    </div>
  );
}
