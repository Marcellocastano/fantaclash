import { TournamentTeam } from '../../domain/tournament';

type BadgeSize = 'sm' | 'md' | 'lg';

const SIZE: Record<BadgeSize, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-9 h-9 text-base',
  lg: 'w-14 h-14 text-2xl',
};

/**
 * Avatar della squadra: sigla di due lettere su quadrato.
 * La squadra dell'utente è piena in pitch, le altre a contorno.
 */
export function TeamBadge({ team, size = 'sm' }: { team: TournamentTeam | undefined; size?: BadgeSize }) {
  if (!team) {
    return <span className={`${SIZE[size]} shrink-0 border border-dashed border-line-strong`} aria-hidden="true" />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZE[size]} shrink-0 inline-flex items-center justify-center font-display font-extrabold leading-none ${
        team.isUserTeam ? 'bg-pitch text-on-pitch' : 'border border-line-strong text-ink'
      }`}
    >
      {team.monogram}
    </span>
  );
}
