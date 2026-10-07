import { PlayerRole } from '../../types';
import { TIER_CLASSES, tierOf } from './tier';

type BadgeSize = 'xs' | 'sm' | 'md';

const SIZE: Record<BadgeSize, { box: string; num: string; role: string }> = {
  xs: { box: 'w-8 h-8', num: 'text-base', role: 'hidden' },
  sm: { box: 'w-12 h-12', num: 'text-2xl', role: 'text-[10px]' },
  md: { box: 'w-16 h-16', num: 'text-4xl', role: 'text-xs' },
};

/** Overall in un quadrato colorato per fascia, con il ruolo sotto il numero */
export function OvrBadge({ overall, role, size = 'sm' }: { overall: number; role?: PlayerRole; size?: BadgeSize }) {
  const t = TIER_CLASSES[tierOf(overall)];
  const s = SIZE[size];
  return (
    <span
      className={`${s.box} ${t.bg} ${t.ink} shrink-0 inline-flex flex-col items-center justify-center border-2 border-ink leading-none`}
      title={`Overall ${overall}`}
    >
      <span className={`font-display font-black tabular-nums ${s.num}`}>{overall}</span>
      {role && <span className={`font-display font-extrabold ${s.role}`}>{role}</span>}
    </span>
  );
}
