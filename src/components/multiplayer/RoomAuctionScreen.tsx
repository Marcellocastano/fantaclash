import { ReactNode, useEffect, useRef, useState } from 'react';
import { AuctionControllerProvider } from '../../hooks/auctionController';
import { AuctionRoom } from '../auction/AuctionRoom';
import { TeamBadge } from '../tournament/TeamBadge';
import { OvrBadge } from '../player/OvrBadge';
import { PitchSurface } from '../PitchSurface';
import { StreamerReserve } from '../layout/GameShell';
import { PlayerRole, Team } from '../../types';
import { RoomState } from '../../multiplayer/protocol';
import { AuctionAction, getCurrentCallerId } from '../../services/auction';
import { playerOverall, teamStrength } from '../../services/auction/teamStrength';
import { shortName } from '../../utils/playerName';
import { buildStartTournament } from '../../multiplayer/hostTournament';
import { auctionHighlights } from './auctionHighlights';
import { useRoom } from './RoomProvider';
import { useRoomAuction } from './useRoomAuction';
import { useRoomHostDriver } from './useRoomHostDriver';

/** Righe della mini formazione: attacco in alto, portiere in basso */
const FORMATION_ROWS: { role: PlayerRole; count: number }[] = [
  { role: 'A', count: 2 },
  { role: 'C', count: 3 },
  { role: 'D', count: 2 },
  { role: 'P', count: 1 },
];
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

/** Mini formazione sul campo: per ruolo i titolari con l'overall più alto */
function MiniFormation({ team }: { team: Team }) {
  return (
    <PitchSurface orientation="vertical" className="border-2 border-ink">
      <div className="h-full flex flex-col justify-between py-[6%] px-1">
        {FORMATION_ROWS.map(({ role, count }) => {
          const players = team.roster
            .filter(o => o.player.role === role)
            .sort((a, b) => playerOverall(b.player) - playerOverall(a.player))
            .slice(0, count);
          return (
            <div key={role} className="flex justify-center gap-1 min-w-0">
              {Array.from({ length: count }, (_, i) => {
                const o = players[i];
                if (!o) {
                  return <span key={i} className="w-16 h-10 opacity-0" aria-hidden="true" />;
                }
                return (
                  <span key={o.player.id} className="min-w-0 w-16 flex flex-col items-center gap-0.5">
                    <OvrBadge overall={playerOverall(o.player)} role={role} size="xs" />
                    <span className="w-full min-w-0 bg-canvas border-2 border-ink px-1 py-px text-center shadow-block-sm">
                      <span className="block text-xs font-bold text-ink leading-tight truncate">
                        {shortName(o.player.name)}
                      </span>
                      <span className="block text-[10px] tabular-nums text-ink-muted leading-tight">
                        {o.purchasePrice} Cr
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </PitchSurface>
  );
}

/** Card della classifica di forza: stemma, rosa disegnata, spesa */
function PowerCard({
  team,
  rank,
  state,
  mine,
  index,
}: {
  team: Team;
  rank: number;
  state: RoomState;
  mine: boolean;
  index: number;
}) {
  const owner = team.ownerId ? state.players.find(p => p.id === team.ownerId) : undefined;
  const spent = team.initialCredits - team.credits;
  return (
    <li
      className={`panel overflow-hidden ${mine ? 'shadow-block-lg' : ''} motion-safe:animate-drop`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        className={`flex items-center gap-3 px-3 py-2.5 border-b-2 border-ink ${
          mine ? 'bg-pitch-deep text-on-pitch' : 'bg-surface'
        }`}
      >
        <span className={`font-display text-3xl font-black leading-none ${mine ? 'text-highlight' : 'text-ink-faint'}`}>
          #{rank}
        </span>
        <TeamBadge team={mine ? { ...team, isUserTeam: true } : team} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`font-display font-extrabold truncate ${mine ? 'text-on-pitch' : 'text-ink'}`} title={team.name}>
              {team.name}
            </span>
            {mine && (
              <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">Tu</span>
            )}
          </span>
          <span className={`block text-xs truncate ${mine ? 'text-on-pitch/70' : 'text-ink-muted'}`}>
            {owner ? owner.nickname : (
              <span className="text-[10px] font-black border border-line-strong px-1 py-px text-ink-muted">BOT</span>
            )}
          </span>
        </span>
        <OvrBadge overall={Math.round(teamStrength(team))} size="sm" />
      </div>
      <div className="p-2">
        <MiniFormation team={team} />
      </div>
      <p className="px-3 pb-2.5 text-xs font-semibold text-ink-muted tabular-nums">
        Spesi {spent} Cr · Residui {team.credits} Cr
      </p>
    </li>
  );
}

/** Teglia delle tre statistiche dell'asta */
function HighlightTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-canvas text-ink border-2 border-ink p-3 sm:p-4 min-w-0">
      <p className="label">{label}</p>
      <div className="mt-1.5 min-w-0">{children}</div>
    </div>
  );
}

/** Schermata di fine asta: eroe + classifica di forza; l'host avvia il torneo */
function AuctionDoneScreen({ state }: { state: RoomState }) {
  const room = useRoom();
  const { top, bargain, strongest } = auctionHighlights(state.teams);
  const ranked = [...state.teams].sort((a, b) => teamStrength(b) - teamStrength(a));

  return (
    <StreamerReserve>
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-10">
        {/* Eroe */}
        <section className="relative bg-pitch-deep text-canvas border-2 border-ink shadow-block p-5 sm:p-8 overflow-hidden">
          <p className="label !text-canvas/70">Serie A {state.settings.season} · Asta chiusa</p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display font-black text-5xl sm:text-7xl leading-none text-canvas">
              Le rose sono fatte
            </h1>
            {/* timbro: posizione e animazione su elementi separati */}
            <div className="rotate-[-8deg]">
              <span className="inline-block border-4 border-highlight text-highlight font-display font-black text-2xl sm:text-3xl px-4 py-1 motion-safe:animate-stamp-tilt">
                ASTA CHIUSA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <HighlightTile label="Colpo dell'asta">
              {top ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="min-w-0">
                    <span className="block font-display font-extrabold text-xl leading-tight truncate">
                      {shortName(top.entry.player.name)}
                    </span>
                    <span className="block text-xs text-ink-muted truncate">{top.team.name}</span>
                  </span>
                  <span className="ml-auto shrink-0 font-display font-black text-2xl tabular-nums">
                    {top.entry.purchasePrice} Cr
                  </span>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">—</p>
              )}
            </HighlightTile>
            <HighlightTile label="L'affare">
              {bargain ? (
                <div className="flex items-center gap-2 min-w-0">
                  <OvrBadge overall={playerOverall(bargain.entry.player)} size="xs" />
                  <span className="min-w-0">
                    <span className="block font-display font-extrabold text-xl leading-tight truncate">
                      {shortName(bargain.entry.player.name)}
                    </span>
                    <span className="block text-xs text-ink-muted truncate">{bargain.team.name}</span>
                  </span>
                  <span className="ml-auto shrink-0 font-display font-black text-2xl tabular-nums">
                    {bargain.entry.purchasePrice} Cr
                  </span>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">—</p>
              )}
            </HighlightTile>
            <HighlightTile label="Rosa più forte">
              {strongest ? (
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge team={strongest.team} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-extrabold text-xl leading-tight truncate">
                      {strongest.team.name}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 font-display font-black text-2xl tabular-nums">
                    {Math.round(strongest.strength)}
                  </span>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">—</p>
              )}
            </HighlightTile>
          </div>

          <div className="mt-6">
            {room.isHost ? (
              <button
                type="button"
                onClick={() => room.dispatchRoomAction(buildStartTournament())}
                className="btn-cta px-6 py-3 text-xl"
              >
                Avvia il torneo
              </button>
            ) : (
              <p className="inline-flex items-center gap-2 font-semibold text-canvas/80">
                <span className="w-2 h-2 rounded-full bg-highlight motion-safe:animate-pulse" aria-hidden="true" />
                In attesa che l'host avvii il torneo…
              </p>
            )}
          </div>
        </section>

        {/* Classifica di forza */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="section-heading">Classifica di forza</h2>
            <p className="text-sm text-ink-muted">media overall delle rose</p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            {ranked.map((t, i) => (
              <PowerCard
                key={t.id}
                team={t}
                rank={i + 1}
                state={state}
                mine={t.ownerId !== null && t.ownerId === room.me}
                index={i}
              />
            ))}
          </ul>
        </section>
      </div>
    </StreamerReserve>
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
    <>
      {state.auction.phase === 'complete' ? (
        <AuctionDoneScreen state={state} />
      ) : (
        <>
          {import.meta.env.DEV && room.isHost && (
            <button
              type="button"
              onClick={() => setFlashing(f => !f)}
              className="fixed bottom-4 left-4 z-40 btn-ghost !py-1 text-xs"
            >
              {flashing ? 'Ferma asta lampo' : 'Asta lampo (dev)'}
            </button>
          )}
          <AuctionControllerProvider value={controller}>
            <AuctionRoom onComplete={() => {}} />
          </AuctionControllerProvider>
        </>
      )}
    </>
  );
}
