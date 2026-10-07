import { LiveTeamStats, MatchSide } from '../../domain/match';

interface MatchStatsProps {
  stats: Record<MatchSide, LiveTeamStats>;
}

const ROWS: { key: keyof LiveTeamStats; label: string }[] = [
  { key: 'shots', label: 'Tiri' },
  { key: 'shotsOnTarget', label: 'In porta' },
  { key: 'bigChances', label: 'Grandi occasioni' },
  { key: 'yellowCards', label: 'Gialli' },
  { key: 'redCards', label: 'Rossi' },
];

/** Statistiche essenziali: possesso come barra, il resto a numeri */
export function MatchStats({ stats }: MatchStatsProps) {
  return (
    <div>
      <h3 className="section-heading mb-2">Statistiche</h3>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-display font-bold tabular-nums">{stats.home.possession}%</span>
        <span className="text-ink-muted">Possesso</span>
        <span className="font-display font-bold tabular-nums">{stats.away.possession}%</span>
      </div>
      <div className="flex h-1.5 bg-line mb-3">
        <div className="bg-ink-soft transition-[width] duration-500" style={{ width: `${stats.home.possession}%` }} />
      </div>
      <dl className="divide-y divide-line text-sm">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <dd className="font-display font-bold tabular-nums w-8">{stats.home[key]}</dd>
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-display font-bold tabular-nums w-8 text-right">{stats.away[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
