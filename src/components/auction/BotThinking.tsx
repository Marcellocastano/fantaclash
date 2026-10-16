import { BotArchetype, PlayerRole, Team } from '../../types';
import { useT } from '../../i18n/I18nProvider';
import { CatalogKey } from '../../i18n/translate';
import { TeamBadge } from '../tournament/TeamBadge';

const ARCHETYPE: Record<BotArchetype, { name: CatalogKey; line: CatalogKey }> = {
  aggressivo: { name: 'auction.bot.archetype.aggressivo.name', line: 'auction.bot.archetype.aggressivo.line' },
  parsimonioso: { name: 'auction.bot.archetype.parsimonioso.name', line: 'auction.bot.archetype.parsimonioso.line' },
  stratega: { name: 'auction.bot.archetype.stratega.name', line: 'auction.bot.archetype.stratega.line' },
  cacciatore: { name: 'auction.bot.archetype.cacciatore.name', line: 'auction.bot.archetype.cacciatore.line' },
  equilibrato: { name: 'auction.bot.archetype.equilibrato.name', line: 'auction.bot.archetype.equilibrato.line' },
};

const ROLE_SINGULAR: Record<PlayerRole, CatalogKey> = {
  P: 'ui.roles.singular.P',
  D: 'ui.roles.singular.D',
  C: 'ui.roles.singular.C',
  A: 'ui.roles.singular.A',
};

/**
 * Il bot sta scegliendo chi chiamare: stemma che "respira", personalità e
 * un mazzo di card coperte che si mescolano. Nel listone, intanto,
 * l'evidenziatore scorre sui candidati (vedi useBotScanner).
 */
export function BotThinking({ team, role }: { team: Team | undefined; role: PlayerRole }) {
  const t = useT();
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
            <span className="font-semibold text-ink">{t(archetype.name)}</span> {t(archetype.line)}
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
      <p className="text-center font-display text-2xl font-extrabold text-ink-soft mt-4">{t('auction.bot.choosing', { role: t(ROLE_SINGULAR[role]) })}</p>
    </div>
  );
}
