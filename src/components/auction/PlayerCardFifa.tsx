import { Player } from '../../types';

interface PlayerCardFifaProps {
  player: Player;
  currentBid: number;
  timeRemaining: number;
  isActive: boolean;
}

const ROLE_NAMES = {
  P: 'Portiere',
  D: 'Difensore',
  C: 'Centrocampista',
  A: 'Attaccante',
};

const ROLE_TAG: Record<string, string> = {
  P: 'role-tag role-tag-P',
  D: 'role-tag role-tag-D',
  C: 'role-tag role-tag-C',
  A: 'role-tag role-tag-A',
};

/**
 * Scheda del giocatore all'asta, stile tabellone
 */
export function PlayerCardFifa({ player, currentBid, timeRemaining, isActive }: PlayerCardFifaProps) {
  const timerSeconds = (timeRemaining / 1000).toFixed(1);
  const timerPercentage = (timeRemaining / 5000) * 100;
  const isLowTime = timeRemaining < 2000;

  return (
    <div>
      {/* Header con ruolo e squadra */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-3">
          <span className={ROLE_TAG[player.role]}>
            {player.role}
          </span>
          <div>
            <p className="text-xs text-ink-muted">{player.team}</p>
            <p className="text-xs font-medium text-ink">{ROLE_NAMES[player.role]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Valore</p>
          <p className="font-display font-bold text-ink tabular-nums">{player.baseValue}</p>
        </div>
      </div>

      {/* Nome giocatore */}
      <h2 className="font-display text-5xl md:text-6xl font-extrabold text-ink leading-none mt-4 mb-5">
        {player.name}
      </h2>

      {/* Stats */}
      <div className="flex divide-x divide-line border-y border-line">
        <Stat label="Avg" value={player.avgRating.toFixed(1)} />
        <Stat label="Gol" value={`${Math.round(player.goalProbability * 100)}%`} />
        <Stat label="Ass" value={`${Math.round(player.assistProbability * 100)}%`} />
        <Stat label="Aff" value={`${Math.round(player.reliability * 100)}%`} />
      </div>

      {/* Prezzo attuale e timer */}
      <div className="flex items-center justify-between bg-surface px-4 py-3 mt-5">
        <div>
          <p className="text-xs font-medium text-ink-muted">Prezzo attuale</p>
          <p className="font-display text-5xl font-extrabold text-ink leading-none tabular-nums">
            {currentBid > 0 ? `${currentBid}` : '-'}
            {currentBid > 0 && <span className="text-2xl font-bold text-ink-muted"> Cr</span>}
          </p>
        </div>
        
        {isActive && (
          <div className="text-right">
            <p className="text-xs font-medium text-ink-muted">Tempo</p>
            <p className={`font-display text-3xl font-bold tabular-nums leading-none px-1.5 rounded-sm ${
              isLowTime ? 'bg-peach text-on-peach' : 'text-ink'
            }`}>
              {timerSeconds}
            </p>
          </div>
        )}
      </div>

      {/* Barra timer */}
      {isActive && (
        <div className="mt-2 h-1.5 bg-line overflow-hidden">
          <div 
            className={`h-full transition-[width] duration-100 ease-linear ${isLowTime ? 'bg-peach' : 'bg-pitch'}`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 py-3 text-center">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="font-display text-2xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}
