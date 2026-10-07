import { LiveTeamStats, MatchSide } from '../../domain/match';

interface MatchStatsProps {
  stats: Record<MatchSide, LiveTeamStats>;
  homeName: string;
  awayName: string;
}

const ROWS: { key: keyof LiveTeamStats; label: string }[] = [
  { key: 'shots', label: 'Tiri' },
  { key: 'shotsOnTarget', label: 'In porta' },
  { key: 'bigChances', label: 'Grandi occasioni' },
  { key: 'yellowCards', label: 'Gialli' },
  { key: 'redCards', label: 'Rossi' },
];

/** Statistiche essenziali: possesso come barra, il resto a numeri con barra di confronto */
export function MatchStats({ stats, homeName, awayName }: MatchStatsProps) {
  return (
    <div>
      <div className="flex justify-between gap-4 text-sm font-bold text-ink-muted mb-3">
        <span className="truncate">{homeName}</span>
        <span className="truncate text-right">{awayName}</span>
      </div>
      <Row label="Possesso" home={stats.home.possession} away={stats.away.possession} suffix="%" />
      {ROWS.map(({ key, label }) => (
        <Row key={key} label={label} home={stats.home[key]} away={stats.away[key]} />
      ))}
    </div>
  );
}

function Row({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away;
  const share = total === 0 ? 50 : (home / total) * 100;
  return (
    <div className="py-2.5 border-b-2 border-line last:border-b-0">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-black tabular-nums leading-none">{home}{suffix}</span>
        <span className="text-sm font-semibold text-ink-muted">{label}</span>
        <span className="font-display text-2xl font-black tabular-nums leading-none">{away}{suffix}</span>
      </div>
      <div className="flex h-2 mt-1.5 border border-ink">
        <span className="bg-ink transition-[width] duration-500" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
