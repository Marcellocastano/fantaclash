import { LineupPlayer, MatchResult, MatchSide, PlaybackState } from '../../domain/match';
import { FORMATIONS } from '../../domain/teams/formations';
import { PlayerRole } from '../../types';
import { PitchSurface } from '../PitchSurface';
import { PlayerMatchCard } from './PlayerMatchCard';
/** Sul campo verticale (mobile): ospiti in alto col portiere a bordo, casa in basso */
const AWAY_ROWS: PlayerRole[] = ['P', 'D', 'C', 'A'];
const HOME_ROWS: PlayerRole[] = ['A', 'C', 'D', 'P'];
const ROLE_ROW_WIDTH: Record<number, string> = { 1: 'w-[32%]', 2: 'w-[32%]', 3: 'w-[32%]', 4: 'w-[23%]' };

interface PitchViewProps {
  result: MatchResult;
  state: PlaybackState;
}

/**
 * Le due formazioni sul campo, una per metà: casa a sinistra
 * (portiere verso il bordo), ospiti a destra, specchiati.
 */
export function PitchView({ result, state }: PitchViewProps) {
  // Un evento può coinvolgere giocatori di entrambi i lati (parata, autogol)
  const involved = new Set(
    state.latest
      .filter(e => e.type !== 'tactic')
      .flatMap(e => [e.playerId, e.relatedPlayerId])
      .filter(Boolean)
      .flatMap(id => [`home:${id}`, `away:${id}`])
  );
  const perf = new Map(state.performances.map(p => [`${p.side}:${p.playerId}`, p]));

  const card = (side: MatchSide, p: LineupPlayer, compact = false) => (
    <PlayerMatchCard
      key={p.playerId}
      player={p}
      performance={perf.get(`${side}:${p.playerId}`)}
      highlighted={involved.has(`${side}:${p.playerId}`)}
      sentOff={state.sentOff.has(p.playerId)}
      showRating={state.tick.index > 0}
      compact={compact}
    />
  );

  const positioned = (side: MatchSide) => {
    const byRole: Record<PlayerRole, LineupPlayer[]> = {
      P: result.lineups[side].filter(player => player.role === 'P'),
      D: result.lineups[side].filter(player => player.role === 'D'),
      C: result.lineups[side].filter(player => player.role === 'C'),
      A: result.lineups[side].filter(player => player.role === 'A'),
    };
    const indexes: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
    return FORMATIONS[result.formations[side]].layout.flatMap(slot => {
      const player = byRole[slot.role][indexes[slot.role]++];
      const progress = 1 - slot.y;
      return player ? [{ player, x: side === 'home' ? 0.05 + progress * 0.57 : 0.95 - progress * 0.57, y: side === 'home' ? slot.x : 1 - slot.x }] : [];
    });
  };

  /** Mobile: fila verticale di un reparto, i giocatori uno accanto all'altro */
  const row = (side: MatchSide, role: PlayerRole) => {
    const players = result.lineups[side].filter(p => p.role === role);
    return (
      <div key={`${side}-${role}`} className="flex items-center justify-center gap-1">
        {players.map(p => (
          <div key={p.playerId} className={`${ROLE_ROW_WIDTH[players.length] ?? 'w-[23%]'} min-w-0`}>
            {card(side, p, true)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile: campo verticale, tutta la formazione senza scroll */}
      <div className="md:hidden">
        <p className="mb-2 text-center text-xs font-bold text-ink-muted">Casa {result.formations.home} · Ospite {result.formations.away}</p>
        <PitchSurface orientation="vertical">
          <div className="absolute inset-0 grid grid-rows-8 gap-0.5 px-1 py-2">
            {AWAY_ROWS.map(role => row('away', role))}
            {HOME_ROWS.map(role => row('home', role))}
          </div>
        </PitchSurface>
      </div>

      {/* Desktop/tablet: campo orizzontale */}
      <div className="hidden md:block overflow-x-auto">
        <PitchSurface orientation="horizontal" className="min-w-[820px]">
          <div className="absolute inset-x-2 top-1 z-10 flex justify-between px-[8%] font-display text-sm font-black text-canvas/90" aria-label={`Casa ${result.formations.home}, ospite ${result.formations.away}`}>
            <span>CASA · {result.formations.home}</span>
            <span>OSPITE · {result.formations.away}</span>
          </div>
          <div className="absolute inset-0">
            {(['home', 'away'] as const).flatMap(side => positioned(side).map(({ player, x, y }) => (
              <div key={`${side}:${player.playerId}`} className="absolute z-10 w-[15%] min-w-[84px] max-w-[132px] -translate-x-1/2 -translate-y-1/2" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
                {card(side, player, true)}
              </div>
            )))}
          </div>
        </PitchSurface>
      </div>
    </>
  );
}
