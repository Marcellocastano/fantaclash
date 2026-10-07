import { MatchEvent } from '../../domain/match';
import { Icon, IconName } from '../Icon';

type EventType = MatchEvent['type'];

const ICON: Partial<Record<EventType, IconName>> = {
  goal: 'ball',
  own_goal: 'ball',
  assist: 'assist',
  save: 'glove',
  miss: 'cross',
  woodwork: 'post',
  chance: 'flame',
  penalty: 'target',
  penalty_missed: 'target',
  yellow_card: 'card',
  red_card: 'card',
  injury: 'injury',
  tactic: 'tactic',
  kickoff: 'whistle',
  half_time: 'whistle',
  full_time: 'whistle',
  shootout_start: 'whistle',
  shootout_kick: 'target',
};

const COLOR: Partial<Record<EventType, string>> = {
  goal: 'text-ok',
  own_goal: 'text-danger',
  yellow_card: 'text-card-yellow',
  red_card: 'text-card-red',
  penalty_missed: 'text-ink-muted',
  miss: 'text-ink-muted',
  chance: 'text-pitch',
  save: 'text-pitch',
};

/** Icona di un evento di partita (niente emoji: set custom di Icon.tsx) */
export function EventIcon({ event, className = 'w-4 h-4' }: { event: MatchEvent; className?: string }) {
  const name = ICON[event.type] ?? 'whistle';
  const color =
    event.type === 'shootout_kick' ? (event.scored ? 'text-ok' : 'text-danger') : COLOR[event.type] ?? 'text-ink-soft';
  return <Icon name={name} className={`${className} shrink-0 ${color}`} />;
}
