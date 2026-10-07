import { LineupPlayer, MatchPlayerPerformance, shortName } from '../../domain/match';
import { Icon } from '../Icon';
import { OvrBadge } from '../player/OvrBadge';

interface PlayerMatchCardProps {
  player: LineupPlayer;
  performance: MatchPlayerPerformance | undefined;
  /** Coinvolto in un evento di questo minuto: evidenziato */
  highlighted: boolean;
  sentOff: boolean;
  /** Mostra il voto live (dopo il calcio d'inizio) */
  showRating: boolean;
  /** Campo verticale su mobile: nome su una riga, tipografia più piccola */
  compact?: boolean;
}

/**
 * Giocatore in campo: overall per fascia, cognome e solo gli eventi che
 * contano (gol, assist, cartellini, parate). Il voto live cambia con gli
 * eventi.
 */
export function PlayerMatchCard({ player, performance: p, highlighted, sentOff, showRating, compact = false }: PlayerMatchCardProps) {
  const ratingTone = !p ? 'text-ink' : p.rating >= 7 ? 'text-pitch' : p.rating <= 5.5 ? 'text-danger' : 'text-ink';
  return (
    <div
      key={highlighted ? 'evidenziato' : 'normale'}
      className={`w-full flex items-stretch bg-canvas border-2 border-ink ${highlighted ? 'shadow-block-sm motion-safe:animate-flash' : ''} ${
        sentOff ? 'opacity-40' : ''
      }`}
    >
      <OvrBadge overall={player.overall} role={player.role} size="xs" />
      {/* Nome su tutta la larghezza; eventi e voto live sulla riga sotto */}
      <div className="flex-1 min-w-0 px-1.5 py-0.5">
        <p className={`${compact ? 'text-[11px] truncate' : 'text-[13px] line-clamp-2 break-words'} font-bold text-ink leading-tight ${sentOff ? 'line-through' : ''}`} title={player.name}>
          {shortName(player.name)}
        </p>
        <p className="flex items-center gap-1 h-4">
          {p && p.goals > 0 && <Badge icon="ball" count={p.goals} className="text-pitch" />}
          {p && p.assists > 0 && <Badge icon="assist" count={p.assists} className="text-ink" />}
          {p && p.saves > 0 && player.role === 'P' && <Badge icon="glove" count={p.saves} className="text-ink" />}
          {p && p.yellowCards > 0 && p.redCards === 0 && <Icon name="card" className="w-3 h-3 text-card-yellow" />}
          {p && p.redCards > 0 && <Icon name="card" className="w-3 h-3 text-card-red" />}
          {p && p.injured && <Icon name="injury" className="w-3 h-3 text-ink-muted" />}
          {showRating && p && (
            <span className={`ml-auto font-display font-black ${compact ? 'text-sm' : 'text-base'} tabular-nums leading-none ${ratingTone}`} title="Voto live">
              {p.rating.toFixed(1)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function Badge({ icon, count, className }: { icon: 'ball' | 'assist' | 'glove'; count: number; className: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-bold ${className}`}>
      <Icon name={icon} className="w-3.5 h-3.5" />
      {count > 1 && <span className="tabular-nums">{count}</span>}
    </span>
  );
}
