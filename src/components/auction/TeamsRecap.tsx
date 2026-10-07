import { useState } from 'react';
import { Team, PlayerRole, ROSTER_REQUIREMENTS } from '../../types';
import { getRemainingRosterSlots } from '../../services/teamGenerator';
import { Icon } from '../Icon';

interface TeamsRecapProps {
  teams: Team[];
  userTeamId: string;
  currentBidderId: string | null;
}

const ROLE_ORDER: PlayerRole[] = ['A', 'C', 'D', 'P'];
const ROLE_REQUIREMENTS: Record<PlayerRole, number> = {
  P: ROSTER_REQUIREMENTS.P.total,
  D: ROSTER_REQUIREMENTS.D.total,
  C: ROSTER_REQUIREMENTS.C.total,
  A: ROSTER_REQUIREMENTS.A.total,
};

const ROLE_FILL: Record<PlayerRole, string> = {
  P: 'bg-role-P',
  D: 'bg-role-D',
  C: 'bg-role-C',
  A: 'bg-role-A',
};

const ROLE_LETTER: Record<PlayerRole, string> = {
  P: 'role-tag-P',
  D: 'role-tag-D',
  C: 'role-tag-C',
  A: 'role-tag-A',
};

/**
 * Recap squadre con progress per ruolo
 */
export function TeamsRecap({ teams, userTeamId, currentBidderId }: TeamsRecapProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(userTeamId);

  // Ordina: utente prima, poi bot
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.isUserTeam) return -1;
    if (b.isUserTeam) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full flex flex-col">
      <h3 className="section-heading mb-1">
        Squadre ({teams.length})
      </h3>
      
      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {sortedTeams.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            isUser={team.id === userTeamId}
            isBidding={team.id === currentBidderId}
            isExpanded={expandedTeam === team.id}
            onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TeamRowProps {
  team: Team;
  isUser: boolean;
  isBidding: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function TeamRow({ team, isUser, isBidding, isExpanded, onToggle }: TeamRowProps) {
  const remaining = getRemainingRosterSlots(team);
  
  // Conta giocatori per ruolo
  const rosterByRole: Record<PlayerRole, typeof team.roster> = {
    P: team.roster.filter(o => o.player.role === 'P'),
    D: team.roster.filter(o => o.player.role === 'D'),
    C: team.roster.filter(o => o.player.role === 'C'),
    A: team.roster.filter(o => o.player.role === 'A'),
  };

  return (
    <div 
      className={`${
        isUser 
          ? 'bg-pitch/[0.08]' 
          : isBidding
            ? 'bg-peach/35 dark:bg-peach/[0.12]'
            : ''
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
      >
        <span
          title={team.name}
          className={`font-semibold text-sm text-left min-w-0 truncate ${isUser ? 'text-pitch' : isBidding ? 'text-ink dark:text-peach' : 'text-ink'}`}
        >
          {team.name}
          {isUser && <span className="text-pitch font-normal"> (tu)</span>}
        </span>
        
        <span className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          <span className="text-xs text-ink-muted tabular-nums">{team.credits} Cr</span>
          <Icon 
            name="chevron" 
            className={`w-4 h-4 text-ink-muted transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </span>
      </button>

      {/* Progress bars compatte */}
      <div className="px-3 pb-2.5 flex gap-2">
        {ROLE_ORDER.map(role => {
          const current = ROLE_REQUIREMENTS[role] - remaining[role];
          const total = ROLE_REQUIREMENTS[role];
          const percentage = (current / total) * 100;
          
          return (
            <div key={role} className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold ${ROLE_LETTER[role]} bg-transparent`}>
                  {role}
                </span>
                <span className="text-[10px] text-ink-muted tabular-nums">{current}/{total}</span>
              </div>
              <div className="h-1 bg-line overflow-hidden">
                <div 
                  className={`h-full transition-[width] duration-300 ${ROLE_FILL[role]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dettagli espansi */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-line space-y-2">
          {ROLE_ORDER.map(role => {
            const players = rosterByRole[role];
            if (players.length === 0) return null;
            
            return (
              <div key={role}>
                <p className="text-[10px] font-medium text-ink-muted mb-1">
                  {role === 'P' ? 'Portieri' : role === 'D' ? 'Difensori' : role === 'C' ? 'Centrocampisti' : 'Attaccanti'}
                </p>
                <div className="space-y-0.5">
                  {players.map((owned, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-ink-soft truncate">{owned.player.name}</span>
                      <span className="text-ink-muted ml-2 tabular-nums">({owned.purchasePrice})</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Totale speso */}
          <div className="pt-2 border-t border-line flex justify-between text-xs">
            <span className="text-ink-muted">Speso</span>
            <span className="font-semibold text-ink tabular-nums">
              {team.initialCredits - team.credits} Cr
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
