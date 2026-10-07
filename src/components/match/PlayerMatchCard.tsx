import { LineupPlayer, MatchPlayerPerformance, shortName } from '../../domain/match';
import { PlayerRole } from '../../types';
import { Icon } from '../Icon';

const ROLE_TAG: Record<PlayerRole, string> = {
  P: 'role-tag role-tag-P',
  D: 'role-tag role-tag-D',
  C: 'role-tag role-tag-C',
  A: 'role-tag role-tag-A',
};

interface PlayerMatchCardProps {
  player: LineupPlayer;
  performance: MatchPlayerPerformance | undefined;
  /** Coinvolto in un evento di questo minuto: evidenziato */
  highlighted: boolean;
  sentOff: boolean;
  /** Mostra il voto live (dopo il calcio d'inizio) */
  showRating: boolean;
}

/**
 * Giocatore in campo: nome, ruolo, overall e solo gli eventi che contano
 * (gol, assist, cartellini, parate). Il voto live cambia con gli eventi.
 */
export function PlayerMatchCard({ player, performance: p, highlighted, sentOff, showRating }: PlayerMatchCardProps) {
  const ratingColor = !p ? 'text-ink' : p.rating >= 7 ? 'text-ok' : p.rating <= 5.5 ? 'text-ink-muted' : 'text-ink';
  return (
    <div
      key={highlighted ? 'evidenziato' : 'normale'}
      className={`w-full px-2 py-1.5 border ${highlighted ? 'border-pitch motion-safe:animate-flash' : 'border-line'} bg-canvas ${
        sentOff ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`${ROLE_TAG[player.role]} !w-5 !h-5 !text-xs`}>{player.role}</span>
        <span className={`flex-1 min-w-0 truncate text-sm font-semibold text-ink ${sentOff ? 'line-through' : ''}`} title={player.name}>
          {shortName(player.name)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className="text-xs text-ink-muted tabular-nums">{player.overall}</span>
        <span className="flex items-center gap-1">
          {p && p.goals > 0 && <Badge icon="ball" count={p.goals} className="text-ok" />}
          {p && p.assists > 0 && <Badge icon="assist" count={p.assists} className="text-pitch" />}
          {p && p.saves > 0 && player.role === 'P' && <Badge icon="glove" count={p.saves} className="text-pitch" />}
          {p && p.yellowCards > 0 && p.redCards === 0 && <Icon name="card" className="w-3 h-3 text-card-yellow" />}
          {p && p.redCards > 0 && <Icon name="card" className="w-3 h-3 text-card-red" />}
          {p && p.injured && <Icon name="injury" className="w-3 h-3 text-ink-muted" />}
          {showRating && p && (
            <span className={`font-display font-bold text-base tabular-nums leading-none ${ratingColor}`} title="Voto live">
              {p.rating.toFixed(1)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function Badge({ icon, count, className }: { icon: 'ball' | 'assist' | 'glove'; count: number; className: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold ${className}`}>
      <Icon name={icon} className="w-3 h-3" />
      {count > 1 && <span className="tabular-nums">{count}</span>}
    </span>
  );
}
