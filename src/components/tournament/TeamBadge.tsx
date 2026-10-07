import { monogram } from '../../domain/tournament';

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<BadgeSize, string> = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-16 h-16 text-3xl',
  xl: 'w-24 h-24 text-5xl',
};

/** Basta il nome (e se è la squadra dell'utente): la sigla si ricava */
export interface BadgeTeam {
  name: string;
  isUserTeam: boolean;
  monogram?: string;
}

/**
 * Stemma della squadra: sigla di due lettere su quadrato con bordo
 * inchiostro. La squadra dell'utente è verde pieno, le altre crema.
 */
export function TeamBadge({ team, size = 'sm' }: { team: BadgeTeam | undefined; size?: BadgeSize }) {
  if (!team) {
    return <span className={`${SIZE[size]} shrink-0 border-2 border-dashed border-line-strong`} aria-hidden="true" />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZE[size]} shrink-0 inline-flex items-center justify-center font-display font-black leading-none border-2 border-ink ${
        team.isUserTeam ? 'bg-pitch text-on-pitch' : 'bg-canvas text-ink'
      }`}
    >
      {team.monogram ?? monogram(team.name)}
    </span>
  );
}
