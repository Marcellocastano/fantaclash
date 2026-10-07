import { BotArchetype, PlayerRole, Team } from '../../types';
import { TeamBadge } from '../tournament/TeamBadge';

const ARCHETYPE: Record<BotArchetype, { name: string; line: string }> = {
  aggressivo: { name: "L'Aggressivo", line: 'punta dritto ai big' },
  parsimonioso: { name: 'Il Parsimonioso', line: 'cerca un affare' },
  stratega: { name: 'Lo Stratega', line: 'fa due conti sui crediti' },
  cacciatore: { name: 'Il Cacciatore', line: 'ha già in mente il suo pupillo' },
  equilibrato: { name: "L'Equilibrato", line: 'valuta con calma' },
};

const ROLE_SINGULAR: Record<PlayerRole, string> = {
  P: 'portiere',
  D: 'difensore',
  C: 'centrocampista',
  A: 'attaccante',
};

/**
 * Il bot sta scegliendo chi chiamare: stemma che "respira", personalità e
 * un mazzo di card coperte che si mescolano. Nel listone, intanto,
 * l'evidenziatore scorre sui candidati (vedi useBotScanner).
 */
export function BotThinking({ team, role }: { team: Team | undefined; role: PlayerRole }) {
  const archetype = ARCHETYPE[team?.botConfig?.archetype ?? 'equilibrato'];
  return (
    <div className="py-6" aria-live="polite">
      <div className="flex items-center gap-4">
        {/* Padding = ampiezza del wobble, così il bordo non viene tagliato */}
        <span className="p-1 shrink-0">
          <span className="block motion-safe:animate-wobble">
            <TeamBadge team={team} size="lg" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-display text-4xl font-extrabold text-ink leading-none truncate">{team?.name}</p>
          <p className="text-ink-soft mt-2">
            <span className="font-semibold text-ink">{archetype.name}</span> {archetype.line}
          </p>
        </div>
      </div>

      {/* Mazzo coperto che si mescola */}
      <div className="relative h-56 mt-8 flex items-center justify-center" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span key={i} className="absolute" style={{ transform: `rotate(${(i - 1) * 8}deg) translateX(${(i - 1) * 22}px)` }}>
            <span
              className="w-36 h-48 bg-pitch-deep border-2 border-ink shadow-block motion-safe:animate-wobble flex items-center justify-center"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <span className="w-24 h-36 border-2 border-highlight/60 flex items-center justify-center font-display font-black text-5xl text-highlight">
                ?
              </span>
            </span>
          </span>
        ))}
      </div>
      <p className="text-center font-display text-2xl font-extrabold text-ink-soft mt-4">Sta scegliendo un {ROLE_SINGULAR[role]}…</p>
    </div>
  );
}
