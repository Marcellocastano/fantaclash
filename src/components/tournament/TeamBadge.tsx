import { monogram } from '../../domain/tournament';
import { KitId, kitOf } from '../../domain/teamKits';

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<BadgeSize, string> = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-14 h-14 text-2xl sm:w-16 sm:h-16 sm:text-3xl',
  xl: 'w-24 h-24 text-5xl',
};

/** Basta il nome (e se è la squadra dell'utente): la sigla si ricava */
export interface BadgeTeam {
  id?: string;
  name: string;
  isUserTeam: boolean;
  monogram?: string;
  /** Colori sociali scelti; assente -> fallback deterministico da id/nome */
  kit?: KitId;
}

/**
 * Stemma della squadra: sigla di due lettere su quadrato bicolore nei
 * colori sociali (primario + banda secondaria in basso), bordo inchiostro.
 */
export function TeamBadge({ team, size = 'sm' }: { team: BadgeTeam | undefined; size?: BadgeSize }) {
  if (!team) {
    return <span className={`${SIZE[size]} shrink-0 border-2 border-dashed border-line-strong`} aria-hidden="true" />;
  }
  const kit = kitOf(team);
  return (
    <span
      aria-hidden="true"
      className={`${SIZE[size]} shrink-0 relative inline-flex items-center justify-center font-display font-black leading-none border-2 border-ink overflow-hidden`}
      style={{ backgroundColor: kit.primary, color: kit.on }}
    >
      <span
        className="absolute inset-x-0 bottom-0 h-[28%]"
        style={{ backgroundColor: kit.secondary }}
        aria-hidden="true"
      />
      <span className="relative">{team.monogram ?? monogram(team.name)}</span>
    </span>
  );
}
