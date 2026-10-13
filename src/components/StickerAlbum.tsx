import { useEffect, useState } from 'react';
import { Player, PlayerRole } from '../types';
import { playerOverall } from '../services/auction/teamStrength';
import { isLegends, listoneLabel, loadSeasonPlayers, seasonShort } from '../services/seasons';
import { Icon } from './Icon';
import { PlayerCard } from './player/PlayerCard';

/** Figurine della pagina: i migliori dell'annata nel modulo 1-2-3-2, più una casella vuota al centro */
const PER_ROLE: Record<PlayerRole, number> = { P: 1, D: 2, C: 3, A: 2 };
const EMPTY_SLOTS = [4];
const SLOTS = 9;
/** Leggera inclinazione di ogni figurina, fissa per posizione */
const TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

/** I più forti dell'annata, reparto per reparto */
function albumStars(players: Player[]): Player[] {
  const best = (role: PlayerRole) =>
    players
      .filter(p => p.role === role)
      .sort((a, b) => playerOverall(b) - playerOverall(a))
      .slice(0, PER_ROLE[role]);
  return (['P', 'D', 'C', 'A'] as PlayerRole[]).flatMap(best);
}

/**
 * Pagina dell'album dell'annata scelta: le figurine dei campioni
 * attaccate un po' storte, con qualche casella ancora vuota da riempire
 * all'asta. Cambia con l'annata selezionata nel form.
 */
export function StickerAlbum({ season }: { season: string | null }) {
  const [stars, setStars] = useState<{ season: string; players: Player[] } | null>(null);

  useEffect(() => {
    if (!season) return;
    let cancelled = false;
    loadSeasonPlayers(season)
      .then(players => !cancelled && setStars({ season, players: albumStars(players) }))
      .catch(() => !cancelled && setStars({ season, players: [] }));
    return () => {
      cancelled = true;
    };
  }, [season]);

  const players = stars && stars.season === season ? stars.players : [];
  const legends = isLegends(season);
  let next = 0;

  return (
    <div>
      {legends ? (
        <div className="relative border-2 border-ink bg-tier-elite-bg px-3 py-3 text-canvas">
          <span className="absolute inset-1 border border-highlight/50 pointer-events-none" aria-hidden="true" />
          <p className="relative flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-display text-2xl sm:text-3xl font-black text-highlight leading-none">
              <Icon name="star" className="w-6 h-6 sm:w-7 sm:h-7" />
              Legends · Hall of Fame
            </span>
            <span className="hidden sm:inline text-xs font-bold text-canvas/70 uppercase tracking-wider">23 annate · overall fino a 99</span>
          </p>
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-3">
          <p className="font-display text-2xl sm:text-3xl font-black text-ink leading-none">{listoneLabel(season)}</p>
        </div>
      )}
      <ul key={season ?? 'vuoto'} className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-3 sm:gap-y-5 pt-6 motion-safe:animate-pop" aria-label={`Figurine ${listoneLabel(season)}`}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const player = EMPTY_SLOTS.includes(i) ? undefined : players[next++];
          return (
            <li key={i} className="flex flex-col min-w-0">
              {player ? (
                <PlayerCard player={player} publicStats className={TILT[i]} />
              ) : (
                <span className="flex-1 min-h-[10rem] border-2 border-dashed border-line-strong flex items-center justify-center text-center px-2">
                  <span className="font-display text-base sm:text-xl font-extrabold text-ink-muted leading-tight">
                    {EMPTY_SLOTS.includes(i) ? 'Compralo all\'asta' : ''}
                  </span>
                </span>
              )}
              <span className="text-[11px] font-semibold text-ink-muted tabular-nums mt-1.5 text-center">
                {legends && player?.season ? `${player.team} ${seasonShort(player.season)} · ` : ''}n. {String(i + 1).padStart(2, '0')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
