import { PlayerRole, ROSTER_REQUIREMENTS, Team } from '../../types';
import { useT } from '../../i18n/I18nProvider';
import { CatalogKey, tParts } from '../../i18n/translate';
import { CALL_TIMEOUT_MS } from '../../multiplayer/constants';
import { Icon } from '../Icon';
import { TeamBadge } from '../tournament/TeamBadge';
import { ROLE_TAG } from '../player/tier';

interface UserCallingProps {
  team: Team | undefined;
  role: PlayerRole;
  maxBid: number;
  callSeconds: number | null;
}

const ROLE_SINGULAR: Record<PlayerRole, CatalogKey> = {
  P: 'ui.roles.singular.P',
  D: 'ui.roles.singular.D',
  C: 'ui.roles.singular.C',
  A: 'ui.roles.singular.A',
};

const TIMER_SECONDS = CALL_TIMEOUT_MS / 1000;

/**
 * "Tocca a te": la chiamata dell'utente, vivace come il bot che pensa —
 * stemma che batte, carta del reparto con i conti utili, poi l'indizio
 * verso il listone e il conto alla rovescia nelle stanze.
 */
export function UserCalling({ team, role, maxBid, callSeconds }: UserCallingProps) {
  const t = useT();
  const missing = team ? ROSTER_REQUIREMENTS[role].total - team.roster.filter(o => o.player.role === role).length : 0;
  const stats: [number, CatalogKey][] = [
    [missing, 'auction.call.missing'],
    [team?.credits ?? 0, 'auction.call.credits'],
    [maxBid, 'auction.call.maxBid'],
  ];
  const low = callSeconds != null && callSeconds <= 5;
  const fill = callSeconds != null ? Math.min(1, Math.max(0, callSeconds / TIMER_SECONDS)) : 0;

  return (
    <div className="py-6 motion-safe:animate-drop" aria-live="polite">
      <div className="flex items-center gap-4">
        <span className="p-1 shrink-0">
          <span className="block motion-safe:animate-beat">
            <TeamBadge team={team} size="lg" />
          </span>
        </span>
        <div className="min-w-0">
          <span className="inline-block bg-highlight text-on-highlight border-2 border-ink px-2 py-0.5 font-display font-black text-xs uppercase -rotate-2">
            {t('auction.call.kicker')}
          </span>
          <h2 className="font-display text-4xl xl:text-5xl font-black text-pitch leading-none mt-2 truncate" title={team?.name}>
            {team?.name}
          </h2>
        </div>
      </div>

      <div className="mt-6 bg-pitch text-on-pitch border-2 border-ink shadow-block p-5 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <span className={`${ROLE_TAG[role]} !w-14 !h-14 !text-3xl shrink-0`}>{role}</span>
          <p className="font-display text-3xl font-black leading-tight">
            {tParts(t, 'auction.call.pick', { role: '' }, 'role').map((part, i) =>
              i === 1 ? (
                <span key="role" className="text-highlight">{t(ROLE_SINGULAR[role])}</span>
              ) : (
                <span key="pre">{part}</span>
              )
            )}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="absolute -right-4 -bottom-10 font-display font-black text-[10rem] text-on-pitch/10 leading-none select-none"
        >
          {role}
        </span>

        <div className="grid grid-cols-3 gap-2 mt-5 relative">
          {stats.map(([value, label]) => (
            <div key={label} className="bg-canvas text-ink border-2 border-ink px-2 py-2 text-center">
              <p className="font-display text-2xl font-black tabular-nums leading-none">{value}</p>
              <p className="text-[11px] font-bold text-ink-muted uppercase mt-1">{t(label)}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-3 font-semibold text-ink">
        <span className="w-9 h-9 bg-highlight border-2 border-ink flex items-center justify-center shrink-0">
          <Icon name="arrow" className="w-5 h-5 rotate-90 lg:rotate-0 motion-safe:animate-beat" />
        </span>
        <span className="hidden lg:inline">{t('auction.call.hintSide')}</span>
        <span className="lg:hidden">{t('auction.call.hintBelow')}</span>
      </p>

      {callSeconds != null && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="label">{t('auction.call.timer')}</span>
            <span
              key={callSeconds}
              className={`font-display text-3xl font-black tabular-nums leading-none ${
                low ? 'text-whistle motion-safe:animate-tick-pulse' : 'text-ink'
              }`}
            >
              {callSeconds}
            </span>
          </div>
          <div className="h-3 border-2 border-ink bg-canvas mt-2">
            <div
              className={`h-full transition-[width] duration-500 ease-linear ${low ? 'bg-whistle' : 'bg-pitch'}`}
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
