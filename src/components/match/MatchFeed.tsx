import { formatMinute, MatchEvent } from '../../domain/match';
import { EventIcon } from './EventIcon';

interface MatchFeedProps {
  events: MatchEvent[];
  userSide: 'home' | 'away';
}

/** Cronaca: eventi dal più recente, i gol in evidenza */
export function MatchFeed({ events, userSide }: MatchFeedProps) {
  const visible = events.filter(e => e.type !== 'miss' || e.impact > 0).slice().reverse();
  return (
    <div>
      <h3 className="section-heading mb-1">Cronaca</h3>
      <ul className="divide-y divide-line max-h-[420px] overflow-y-auto" aria-live="polite">
        {visible.length === 0 && <li className="py-3 text-sm text-ink-muted">La partita sta per iniziare.</li>}
        {visible.map(e => {
          const strong = e.impact >= 3;
          return (
            <li key={e.id} className="flex items-start gap-3 py-2 motion-safe:animate-reveal">
              <span className="w-12 shrink-0 font-display font-bold tabular-nums text-ink-soft">
                {e.type === 'kickoff' ? "0'" : formatMinute(e.minute, e.extra)}
              </span>
              <EventIcon event={e} className="w-4 h-4 mt-0.5" />
              <span
                className={`text-sm ${strong ? 'font-semibold text-ink' : 'text-ink-soft'} ${
                  e.side === userSide && strong ? 'text-pitch' : ''
                }`}
              >
                {e.description}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
