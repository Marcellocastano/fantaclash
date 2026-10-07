import { useMemo, useState } from 'react';
import { Player, PlayerRole } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { usePersistentState } from '../../hooks/usePersistentState';
import { Icon } from '../Icon';
import { PlayerCard } from '../player/PlayerCard';
import { PlayerRow } from '../player/PlayerRow';

export interface SoldEntry {
  player: Player;
  team: string;
  price: number;
}

interface PlayerListProps {
  /** Giocatori ancora all'asta */
  available: Player[];
  /** Giocatori già venduti */
  sold: SoldEntry[];
  currentRole: PlayerRole;
  /** Annata del listone (es. '2025-26') */
  season?: string;
  /** L'utente sta chiamando: i liberi del reparto sono cliccabili */
  isSelectable: boolean;
  onSelectPlayer: (player: Player) => void;
  scanId?: string | null;
  lockedId?: string | null;
}

type RoleFilter = PlayerRole | 'TUTTI';
type View = 'righe' | 'card';
type Sort = 'ovr' | 'valore';

const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];
const ROLE_LABEL: Record<PlayerRole, string> = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
const isView = (v: unknown): v is View => v === 'righe' || v === 'card';

/**
 * Listone dell'asta: righe "figurina" o griglia di card, filtrato di
 * default sul reparto in corso (segue il cambio di reparto finché
 * l'utente non sceglie un altro filtro).
 */
export function PlayerList({ available, sold, currentRole, season, isSelectable, onSelectPlayer, scanId, lockedId }: PlayerListProps) {
  const [manual, setManual] = useState<{ role: RoleFilter; during: PlayerRole } | null>(null);
  const [showSold, setShowSold] = useState(false);
  const [view, setView] = usePersistentState<View>('fanta-fc-list-view', 'righe', isView);
  const [sort, setSort] = useState<Sort>('ovr');
  const [query, setQuery] = useState('');
  const role: RoleFilter = manual && manual.during === currentRole ? manual.role : currentRole;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (p: Player) =>
      (role === 'TUTTI' || p.role === role) && (!q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    const key = (p: Player) => (sort === 'ovr' ? playerOverall(p) * 1000 + p.baseValue : p.baseValue * 1000 + playerOverall(p));
    const free = available.filter(match).sort((a, b) => key(b) - key(a)).map(player => ({ player, soldTo: null as SoldEntry | null }));
    const gone = showSold ? sold.filter(s => match(s.player)).map(s => ({ player: s.player, soldTo: s })) : [];
    return [...free, ...gone];
  }, [available, sold, role, sort, query, showSold]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-end justify-between gap-3 pb-3">
        <h2 className="font-display text-3xl font-extrabold text-ink leading-none">
          Listone
          {season && <span className="text-ink-muted"> · Serie A {season}</span>}
        </h2>
        <div className="flex border-2 border-ink" role="group" aria-label="Vista">
          {(['righe', 'card'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === 'righe' ? 'Vista a righe' : 'Vista a card'}
              title={v === 'righe' ? 'Righe' : 'Card'}
              className={`p-1.5 ${view === v ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
            >
              <Icon name={v === 'righe' ? 'list' : 'grid'} className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Ruolo */}
      <div className="flex border-b-2 border-ink" role="tablist" aria-label="Ruolo">
        {[...ROLES, 'TUTTI' as const].map(r => {
          const active = role === r;
          return (
            <button
              key={r}
              role="tab"
              aria-selected={active}
              title={r === 'TUTTI' ? 'Tutti i ruoli' : ROLE_LABEL[r]}
              onClick={() => setManual(r === currentRole ? null : { role: r, during: currentRole })}
              className={`flex-1 py-2 font-display text-xl font-extrabold leading-none transition-colors duration-150 ${
                active ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink hover:bg-surface'
              }`}
            >
              {r === 'TUTTI' ? 'Tutti' : r}
              {r === currentRole && <span className={`ml-1 text-xs align-top ${active ? 'text-highlight' : 'text-pitch'}`}>in asta</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <label className="relative flex-1 min-w-[140px]">
          <Icon name="search" className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Cerca nome o club"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field py-1.5 pl-8 text-sm"
          />
        </label>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as Sort)}
          className="bg-canvas border-2 border-ink px-2 py-1.5 text-sm font-semibold"
          aria-label="Ordina"
        >
          <option value="ovr">Per overall</option>
          <option value="valore">Per valore</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft cursor-pointer select-none">
          <input type="checkbox" checked={showSold} onChange={e => setShowSold(e.target.checked)} className="w-4 h-4 accent-pitch" />
          Venduti
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {view === 'righe' ? (
          <ul className="divide-y-2 divide-line">
            {rows.map(({ player, soldTo }) => (
              <li key={player.id}>
                <PlayerRow
                  player={player}
                  soldTo={soldTo}
                  selectable={!soldTo && isSelectable && player.role === currentRole}
                  scanning={scanId === player.id}
                  locked={lockedId === player.id}
                  onSelect={() => onSelectPlayer(player)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
            {rows.map(({ player, soldTo }) => {
              const selectable = !soldTo && isSelectable && player.role === currentRole;
              const ring = lockedId === player.id || scanId === player.id ? 'outline outline-4 outline-highlight' : '';
              return (
                <li key={player.id} className={ring}>
                  {selectable ? (
                    <button
                      onClick={() => onSelectPlayer(player)}
                      className="w-full text-left transition-transform duration-100 hover:-rotate-1 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
                    >
                      <PlayerCard player={player} />
                    </button>
                  ) : (
                    <PlayerCard player={player} dimmed={!!soldTo} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rows.length === 0 && <p className="p-8 text-center text-ink-muted">Nessun giocatore trovato</p>}
      </div>
    </div>
  );
}
