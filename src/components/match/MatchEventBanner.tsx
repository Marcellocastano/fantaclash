import { formatMinute, MatchEvent, MatchResult, shortName } from '../../domain/match';
import { EventIcon } from './EventIcon';

/** Priorità degli eventi che meritano un'animazione dedicata (i rigori finali hanno il loro stage) */
const PRIORITY: Partial<Record<MatchEvent['type'], number>> = {
  goal: 10,
  own_goal: 10,
  red_card: 9,
  penalty: 8,
  penalty_missed: 7,
  chance: 5,
  save: 4,
  woodwork: 4,
  yellow_card: 3,
};

const TITLE: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'GOL!',
  own_goal: 'Autogol!',
  red_card: 'Espulso!',
  penalty: 'Rigore!',
  penalty_missed: 'Rigore fallito',
  save: 'Parata!',
  woodwork: 'Legno!',
  yellow_card: 'Ammonito',
};

/** Colore della fascia per tipo di evento */
const TONE: Partial<Record<MatchEvent['type'], string>> = {
  goal: 'bg-highlight text-on-highlight',
  own_goal: 'bg-highlight text-on-highlight',
  red_card: 'bg-card-red text-white',
  penalty: 'bg-whistle text-on-whistle',
};

interface MatchEventBannerProps {
  latest: MatchEvent[];
  result: MatchResult;
}

/**
 * Fascia dell'evento più importante del minuto, a tutta larghezza sopra il
 * campo. Viene rimontata a ogni nuovo evento (key = id), quindi
 * l'animazione parte sempre da zero.
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
    main.type === 'chance' ? (main.chanceKind === 'contropiede' ? 'Contropiede!' : 'Grande occasione') : TITLE[main.type] ?? '';
  const who = main.type === 'save' ? names.get(main.relatedPlayerId ?? '') : names.get(main.playerId ?? '');

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10">
      <div
        key={main.id}
        className={`border-y-4 border-ink px-8 ${big ? 'py-6 motion-safe:animate-stamp' : 'py-3 motion-safe:animate-pop'} ${TONE[main.type] ?? 'bg-canvas text-ink'}`}
      >
        <div className="flex items-center justify-center gap-6 text-center">
          {(!TONE[main.type] || main.type === 'goal' || main.type === 'own_goal') && (
            <EventIcon event={main} className={big ? 'w-12 h-12' : 'w-8 h-8'} />
          )}
          <p className={`font-display font-black leading-none ${big ? 'text-8xl' : 'text-4xl'}`}>{title}</p>
          <div className="text-left">
            {who && <p className={`font-display font-black leading-none ${big ? 'text-4xl' : 'text-2xl'}`}>{who}</p>}
            <p className="text-sm font-semibold opacity-80 mt-1">
              {team} · {formatMinute(main.minute, main.extra)}
              {main.type === 'goal' && assist && <> · assist {names.get(assist.playerId ?? '')}</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
