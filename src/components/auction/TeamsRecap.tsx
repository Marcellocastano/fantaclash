import { useState } from 'react';
import { Team, PlayerRole, ROSTER_REQUIREMENTS } from '../../types';
import { shortName } from '../../utils/playerName';
import { Icon } from '../Icon';
import { TeamBadge } from '../tournament/TeamBadge';
import { ROLE_TAG } from '../player/tier';

interface TeamsRecapProps {
  teams: Team[];
  userTeamId: string;
  currentBidderId: string | null;
  /** Squadra che sta chiamando (bot che sceglie) */
  callerId: string | null;
}

const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];

const ROLE_FILL: Record<PlayerRole, string> = {
  P: 'bg-role-P',
  D: 'bg-role-D',
  C: 'bg-role-C',
  A: 'bg-role-A',
};

/** Rose delle 8 squadre: crediti e 8 caselle colorate per ruolo */
export function TeamsRecap({ teams, userTeamId, currentBidderId, callerId }: TeamsRecapProps) {
  const [expanded, setExpanded] = useState<string | null>(userTeamId);
  const sorted = [...teams].sort((a, b) => (a.isUserTeam ? -1 : b.isUserTeam ? 1 : a.name.localeCompare(b.name)));

  return (
    <div className="h-full flex flex-col">
      <h2 className="font-display text-3xl font-extrabold text-ink leading-none pb-3 border-b-2 border-ink">Squadre</h2>
      <ul className="flex-1 overflow-y-auto divide-y-2 divide-line">
        {sorted.map(team => (
          <TeamRow
            key={team.id}
            team={team}
            isUser={team.id === userTeamId}
            isBidding={team.id === currentBidderId}
            isCalling={team.id === callerId}
            expanded={expanded === team.id}
            onToggle={() => setExpanded(expanded === team.id ? null : team.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface TeamRowProps {
  team: Team;
  isUser: boolean;
  isBidding: boolean;
  isCalling: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function TeamRow({ team, isUser, isBidding, isCalling, expanded, onToggle }: TeamRowProps) {
  const byRole = (role: PlayerRole) => team.roster.filter(o => o.player.role === role);
  const status = isBidding ? (isUser ? 'in testa' : 'rilancia') : isCalling ? 'chiama' : null;
  const tone = isBidding ? (isUser ? 'bg-highlight' : 'bg-whistle/15') : isCalling ? 'bg-surface' : '';

  return (
    <li className={`transition-colors duration-150 ${tone}`}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full px-2 py-3 text-left focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
      >
        <span className="flex items-center gap-3">
          <TeamBadge team={team} size="md" />
          <span className="flex-1 min-w-0">
            <span className={`block font-semibold truncate ${isUser ? 'text-pitch' : 'text-ink'}`} title={team.name}>
              {isUser ? 'La tua squadra' : team.name}
            </span>
            {status ? (
              <span className={`text-xs font-bold ${isBidding && !isUser ? 'text-whistle-deep' : 'text-ink'}`}>{status}</span>
            ) : (
              isUser && <span className="text-xs text-ink-muted truncate block">{team.name}</span>
            )}
          </span>
          <span className="text-right leading-none shrink-0">
            <span className="block font-display text-2xl font-extrabold tabular-nums text-ink">{team.credits}</span>
            <span className="text-[11px] font-semibold text-ink-muted">crediti</span>
          </span>
          <Icon name="chevron" className={`w-4 h-4 text-ink-muted transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        </span>

        {/* Una casella per ogni posto in rosa */}
        <span className="flex gap-1 mt-2.5" aria-label={`${team.roster.length} giocatori su 8`}>
          {ROLE_ORDER.flatMap(role =>
            Array.from({ length: ROSTER_REQUIREMENTS[role].total }, (_, i) => (
              <span
                key={`${role}${i}`}
                className={`flex-1 h-2.5 border border-ink ${i < byRole(role).length ? ROLE_FILL[role] : 'bg-transparent'}`}
                title={role}
              />
            ))
          )}
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-3 space-y-1 motion-safe:animate-reveal">
          {team.roster.length === 0 && <p className="text-sm text-ink-muted">Ancora nessun giocatore.</p>}
          {ROLE_ORDER.flatMap(role =>
            byRole(role).map(o => (
              <div key={o.player.id} className="flex items-center gap-2 text-sm">
                <span className={`${ROLE_TAG[role]} !w-5 !h-5 !text-xs`}>{role}</span>
                <span className="flex-1 truncate text-ink">{shortName(o.player.name)}</span>
                <span className="font-display font-bold tabular-nums text-ink-soft">{o.purchasePrice}</span>
              </div>
            ))
          )}
          {team.roster.length > 0 && (
            <p className="flex justify-between text-xs text-ink-muted pt-1 border-t border-line">
              <span>Spesi</span>
              <span className="font-semibold tabular-nums">{team.initialCredits - team.credits} Cr</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}
