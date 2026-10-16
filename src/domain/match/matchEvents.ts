import { catalog } from '../../i18n/catalog';
import { CatalogKey, TranslateParams } from '../../i18n/translate';
import { Rng } from '../../services/auction/rng';
import { ChanceKind, MatchTick, Tactic } from './matchTypes';

/**
 * Descrizione semantica di un evento: chiave di catalogo + parametri +
 * indice della variante. Il testo vero viene composto al momento del render
 * nella lingua del partecipante; qui non entra nessuna stringa localizzata,
 * così risultati e hash multiplayer restano identici in ogni lingua.
 */
export interface EventDesc {
  key: CatalogKey;
  params?: TranslateParams;
  variant?: number;
}

const ev = catalog.match.event;

/**
 * Testi della cronaca e formattazione del tempo. Le frasi sono scelte con
 * l'Rng del tick, quindi la cronaca è deterministica come il resto: lo stesso
 * rng decide l'indice della variante, identico per ogni client.
 */

export { shortName } from '../../utils/playerName';

/** Etichetta del minuto: 32', 45+2' */
export function formatMinute(minute: number, extra: number): string {
  return extra > 0 ? `${minute}+${extra}'` : `${minute}'`;
}

/** Etichetta di un tick */
export function formatTick(tick: Pick<MatchTick, 'minute' | 'extra'>): string {
  return formatMinute(tick.minute, tick.extra);
}

/** Indice deterministico della variante di cronaca (un draw di rng, come prima) */
function pickVariant(rng: Rng, count: number): number {
  return Math.floor(rng() * count);
}

/** Chiave di catalogo dell'etichetta di una tattica */
export const TACTIC_KEY: Record<Tactic, CatalogKey> = {
  attacca: 'match.tacticLabel.attacca',
  equilibrata: 'match.tacticLabel.equilibrata',
  difendi: 'match.tacticLabel.difendi',
};

export const text = {
  chance(rng: Rng, kind: ChanceKind, team: string, shooter: string): EventDesc {
    const params = { team, shooter };
    if (kind === 'contropiede') {
      return { key: 'match.event.chance.counter', variant: pickVariant(rng, ev.chance.counter.length), params };
    }
    return { key: 'match.event.chance.normal', variant: pickVariant(rng, ev.chance.normal.length), params };
  },
  goal(rng: Rng, scorer: string, kind: ChanceKind | 'rigore', gkError: boolean): EventDesc {
    if (kind === 'rigore') return { key: 'match.event.goal.penalty', params: { scorer } };
    if (gkError) return { key: 'match.event.goal.gkError', params: { scorer } };
    if (kind === 'contropiede') return { key: 'match.event.goal.counter', params: { scorer } };
    return { key: 'match.event.goal.normal', variant: pickVariant(rng, ev.goal.normal.length), params: { scorer } };
  },
  assist(passer: string, scorer: string): EventDesc {
    return { key: 'match.event.assist', params: { passer, scorer } };
  },
  save(rng: Rng, keeper: string, shooter: string): EventDesc {
    return { key: 'match.event.save', variant: pickVariant(rng, ev.save.length), params: { keeper, shooter } };
  },
  miss(rng: Rng, shooter: string, blocker: string | null): EventDesc {
    if (blocker) return { key: 'match.event.miss.blocked', params: { shooter, blocker } };
    return { key: 'match.event.miss.normal', variant: pickVariant(rng, ev.miss.normal.length), params: { shooter } };
  },
  woodwork(rng: Rng, shooter: string): EventDesc {
    return { key: 'match.event.woodwork', variant: pickVariant(rng, ev.woodwork.length), params: { shooter } };
  },
  penalty(team: string, fouled: string): EventDesc {
    return { key: 'match.event.penalty', params: { team, fouled } };
  },
  penaltyMissed(taker: string, keeper: string, saved: boolean): EventDesc {
    return saved
      ? { key: 'match.event.penaltyMissed.saved', params: { keeper, taker } }
      : { key: 'match.event.penaltyMissed.out', params: { taker } };
  },
  ownGoal(player: string): EventDesc {
    return { key: 'match.event.ownGoal', params: { player } };
  },
  yellow(player: string): EventDesc {
    return { key: 'match.event.yellow', params: { player } };
  },
  red(player: string, secondYellow: boolean): EventDesc {
    return { key: secondYellow ? 'match.event.red.second' : 'match.event.red.direct', params: { player } };
  },
  injury(player: string): EventDesc {
    return { key: 'match.event.injury', params: { player } };
  },
  tactic(team: string, tactic: Tactic): EventDesc {
    return { key: `match.event.tactic.${tactic}` as CatalogKey, params: { team } };
  },
  shootoutKick(taker: string, scored: boolean): EventDesc {
    return { key: scored ? 'match.event.shootout.kickScored' : 'match.event.shootout.kickMissed', params: { taker } };
  },
};
