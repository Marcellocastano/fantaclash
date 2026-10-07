import { useState, useMemo } from 'react';
import { Player, PlayerRole } from '../../types';
import { Icon } from '../Icon';

interface PlayersDatabaseProps {
  players: Player[];
  allPlayers: Player[];
  currentRole: PlayerRole;
  isSelectable: boolean;
  onSelectPlayer: (player: Player) => void;
}

const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];

const ROLE_TAG: Record<PlayerRole, string> = {
  P: 'role-tag role-tag-P',
  D: 'role-tag role-tag-D',
  C: 'role-tag role-tag-C',
  A: 'role-tag role-tag-A',
};

type FilterState = 'TUTTI' | 'LIBERI';

/**
 * Database giocatori con filtri e tabella
 */
export function PlayersDatabase({
  players,
  allPlayers,
  currentRole,
  isSelectable,
  onSelectPlayer,
}: PlayersDatabaseProps) {
  const [roleFilter, setRoleFilter] = useState<PlayerRole | 'TUTTI'>('TUTTI');
  const [stateFilter, setStateFilter] = useState<FilterState>('TUTTI');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra giocatori
  const filteredPlayers = useMemo(() => {
    let result = roleFilter === 'TUTTI' ? allPlayers : allPlayers.filter(p => p.role === roleFilter);
    
    // Filtra per stato
    const availableIds = new Set(players.map(p => p.id));
    if (stateFilter === 'LIBERI') {
      result = result.filter(p => availableIds.has(p.id));
    }
    
    // Filtra per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.team.toLowerCase().includes(query)
      );
    }
    
    // Ordina per valore decrescente
    return result.sort((a, b) => b.baseValue - a.baseValue);
  }, [allPlayers, players, roleFilter, stateFilter, searchQuery]);

  const availableIds = new Set(players.map(p => p.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="section-heading flex items-baseline justify-between mb-3">
        <span>Database giocatori</span>
        <span className="text-sm font-normal text-ink-muted">
          {filteredPlayers.length} giocatori
        </span>
      </div>

      {/* Filtri */}
      <div className="pb-3 mb-2 border-b border-line space-y-3">
        {/* Filtri ruolo */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ink-muted w-10">Ruolo</span>
          <div className="flex">
            <FilterButton
              active={roleFilter === 'TUTTI'}
              onClick={() => setRoleFilter('TUTTI')}
            >
              Tutti
            </FilterButton>
            {ROLES.map(role => (
              <FilterButton
                key={role}
                active={roleFilter === role}
                onClick={() => setRoleFilter(role)}
                roleColor={role}
              >
                {role}
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Filtri stato + ricerca */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ink-muted w-10">Stato</span>
          <div className="flex">
            <FilterButton
              active={stateFilter === 'TUTTI'}
              onClick={() => setStateFilter('TUTTI')}
            >
              Tutti
            </FilterButton>
            <FilterButton
              active={stateFilter === 'LIBERI'}
              onClick={() => setStateFilter('LIBERI')}
            >
              Liberi
            </FilterButton>
          </div>
          
          {/* Ricerca */}
          <div className="relative flex-1 max-w-[200px] ml-auto">
            <input
              type="text"
              placeholder="Cerca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field py-1.5 text-sm pr-7"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors duration-150"
                aria-label="Cancella ricerca"
              >
                <Icon name="cross" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabella */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs font-semibold text-ink-muted border-b border-line-strong">
              <th className="px-3 py-2 w-12">Ruolo</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2 hidden md:table-cell">Squadra</th>
              <th className="px-3 py-2 text-right">Valore</th>
              <th className="px-3 py-2 text-center hidden sm:table-cell">Stato</th>
              <th className="px-3 py-2 text-right">Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredPlayers.map((player) => {
              const isAvailable = availableIds.has(player.id);
              const canSelect = isSelectable && isAvailable && player.role === currentRole;
              
              return (
                <tr
                  key={player.id}
                  onClick={() => canSelect && onSelectPlayer(player)}
                  className={`transition-colors duration-150 ${
                    canSelect 
                      ? 'hover:bg-pitch/10 cursor-pointer' 
                      : isAvailable 
                        ? 'hover:bg-surface' 
                        : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <span className={isAvailable ? ROLE_TAG[player.role] : 'role-tag text-ink-muted border-line-strong'}>
                      {player.role}
                    </span>
                  </td>
                  <td className={`px-3 py-2 ${isAvailable ? 'font-semibold text-ink' : 'font-normal text-ink-muted'}`}>
                    {player.name}
                  </td>
                  <td className="px-3 py-2 text-ink-muted hidden md:table-cell">
                    {player.team}
                  </td>
                  <td className={`px-3 py-2 text-right font-display font-bold tabular-nums ${isAvailable ? 'text-ink' : 'text-ink-muted'}`}>
                    {player.baseValue}
                  </td>
                  <td className="px-3 py-2 text-center hidden sm:table-cell">
                    {isAvailable ? (
                      <span className="text-xs font-medium text-ink">Libero</span>
                    ) : (
                      <span className="text-xs text-ink-muted">Venduto</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${isAvailable ? 'text-ink-soft' : 'text-ink-muted'}`}>
                    {player.avgRating.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredPlayers.length === 0 && (
          <div className="p-8 text-center text-ink-muted">
            Nessun giocatore trovato
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  roleColor?: PlayerRole;
}

function FilterButton({ active, onClick, children, roleColor }: FilterButtonProps) {
  const roleTextColors: Record<PlayerRole, string> = {
    P: 'text-role-P',
    D: 'text-role-D',
    C: 'text-role-C',
    A: 'text-role-A',
  };

  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-sm font-semibold border-b-2 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch ${
        active
          ? `border-pitch ${roleColor ? roleTextColors[roleColor] : 'text-pitch'}`
          : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
