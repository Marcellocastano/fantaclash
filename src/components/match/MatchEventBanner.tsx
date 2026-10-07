import { formatMinute, MatchEvent, MatchResult, shortName } from '../../domain/match';
import { EventIcon } from './EventIcon';

/** Priorità degli eventi che meritano un'animazione dedicata */
const PRIORITY: Partial<Record<MatchEvent['type'], number>> = {
  goal: 10,
  own_goal: 10,
  red_card: 9,
  penalty: 8,
  penalty_missed: 7,
  shootout_kick: 6,
  chance: 5,
  save: 4,
  woodwork: 4,
  yellow_card: 3,
};

const TITLE: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'Gol!',
  own_goal: 'Autogol!',
  red_card: 'Espulso!',
  penalty: 'Rigore!',
  penalty_missed: 'Rigore fallito',
  save: 'Parata!',
  woodwork: 'Legno!',
  yellow_card: 'Ammonito',
};

interface MatchEventBannerProps {
  latest: MatchEvent[];
  result: MatchResult;
}

/**
 * Animazione dell'evento più importante del minuto. Viene rimontata ad
 * ogni nuovo evento (key = id), quindi l'animazione parte sempre da zero.
 */
export function MatchEventBanner({ latest, result }: MatchEventBannerProps) {
  const main = [...latest]
    .filter(e => PRIORITY[e.type] && (e.type !== 'save' || e.impact >= 2))
    .sort((a, b) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0))[0];
  if (!main) return null;

  const names = new Map([...result.lineups.home, ...result.lineups.away].map(p => [p.playerId, shortName(p.name)]));
  const team = main.side === 'home' ? result.homeName : result.awayName;
  const assist = latest.find(e => e.type === 'assist');
  const big = main.type === 'goal' || main.type === 'own_goal' || main.type === 'red_card';
  const title =
    main.type === 'chance'
      ? main.chanceKind === 'contropiede' ? 'Contropiede!' : 'Grande occasione'
      : main.type === 'shootout_kick'
        ? main.scored ? 'Segna!' : 'Sbagliato!'
        : TITLE[main.type] ?? '';
  const who = main.type === 'save' ? names.get(main.relatedPlayerId ?? '') : names.get(main.playerId ?? '');

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
      <div
        key={main.id}
        className={`bg-canvas border-2 px-8 py-5 text-center ${big ? 'border-pitch motion-safe:animate-stamp' : 'border-line-strong motion-safe:animate-pop'}`}
      >
        <EventIcon event={main} className={`mx-auto mb-1 ${big ? 'w-10 h-10' : 'w-7 h-7'}`} />
        <p className={`font-display font-extrabold leading-none ${big ? 'text-6xl text-ink' : 'text-3xl text-ink'}`}>{title}</p>
        {who && <p className="font-display text-2xl font-bold text-ink mt-2">{who}</p>}
        <p className="text-sm text-ink-muted mt-1">
          {team} · {formatMinute(main.minute, main.extra)}
        </p>
        {main.type === 'goal' && assist && (
          <p className="text-sm font-semibold text-pitch mt-2">
            Assist {names.get(assist.playerId ?? '')} per {who}
          </p>
        )}
      </div>
    </div>
  );
}
