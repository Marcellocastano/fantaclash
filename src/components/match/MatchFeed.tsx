import { formatMinute, MatchEvent } from '../../domain/match';
import { EventIcon } from './EventIcon';

interface MatchFeedProps {
  events: MatchEvent[];
  userSide: 'home' | 'away';
  /** Evento da non mostrare ancora (rigore in suspense) */
  hiddenId?: string | null;
}

/** Cronaca: eventi dal più recente, i momenti forti in evidenza */
export function MatchFeed({ events, userSide, hiddenId }: MatchFeedProps) {
  const visible = events
    .filter(e => (e.type !== 'miss' || e.impact > 0) && e.id !== hiddenId && !(hiddenId && e.type === 'full_time'))
    .reverse();
  return (
    <ul className="divide-y-2 divide-line max-h-[560px] overflow-y-auto" aria-live="polite">
      {visible.length === 0 && <li className="py-4 text-ink-muted">La partita sta per iniziare.</li>}
      {visible.map(e => {
        const strong = e.impact >= 3;
        return (
          <li key={e.id} className={`flex items-start gap-3 py-2.5 motion-safe:animate-reveal ${strong ? 'bg-highlight/30 -mx-2 px-2' : ''}`}>
            <span className="w-12 shrink-0 font-display text-lg font-extrabold tabular-nums text-ink-soft leading-tight">
              {e.type === 'kickoff' ? "0'" : formatMinute(e.minute, e.extra)}
            </span>
            <EventIcon event={e} className="w-5 h-5 mt-0.5" />
            <span className={`${strong ? 'font-bold' : 'text-ink-soft'} ${strong && e.side === userSide ? 'text-pitch' : strong ? 'text-ink' : ''}`}>
              {e.description}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
