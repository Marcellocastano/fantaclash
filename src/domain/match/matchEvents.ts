import { Rng } from '../../services/auction/rng';
import { ChanceKind, MatchTick, Tactic } from './matchTypes';

/**
 * Testi della cronaca e formattazione del tempo. Le frasi sono scelte con
 * l'Rng del tick, quindi la cronaca è deterministica come il resto.
 */

/** Cognome leggibile: "HIGUAIN Gonzalo" -> "Higuain", "Mike Maignan" -> "Maignan" */
export function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  const isUpper = (w: string) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w);
  if (isUpper(words[0])) {
    const surname: string[] = [];
    for (const w of words) {
      if (!isUpper(w)) break;
      surname.push(w);
    }
    return surname
      .join(' ')
      .toLowerCase()
      .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  return words[words.length - 1];
}

/** Etichetta del minuto: 32', 45+2' */
export function formatMinute(minute: number, extra: number): string {
  return extra > 0 ? `${minute}+${extra}'` : `${minute}'`;
}

/** Etichetta di un tick */
export function formatTick(tick: Pick<MatchTick, 'minute' | 'extra'>): string {
  return formatMinute(tick.minute, tick.extra);
}

function pick(rng: Rng, options: string[]): string {
  return options[Math.floor(rng() * options.length)];
}

export const TACTIC_LABELS: Record<Tactic, string> = {
  attacca: 'Attacca',
  equilibrata: 'Equilibrata',
  difendi: 'Difendi',
};

export const text = {
  chance(rng: Rng, kind: ChanceKind, team: string, shooter: string): string {
    if (kind === 'contropiede') {
      return pick(rng, [
        `Contropiede ${team}! ${shooter} lanciato verso la porta.`,
        `Ripartenza fulminea, ${shooter} se ne va in campo aperto.`,
      ]);
    }
    return pick(rng, [
      `Grande occasione ${team}! ${shooter} riceve in area.`,
      `${shooter} si libera al limite dell'area: occasione enorme!`,
      `Palla filtrante per ${shooter}, tutto solo davanti al portiere.`,
    ]);
  },
  goal(rng: Rng, scorer: string, kind: ChanceKind | 'rigore', gkError: boolean): string {
    if (kind === 'rigore') return `Rigore trasformato da ${scorer}.`;
    if (gkError) return `Papera del portiere! ${scorer} ringrazia e segna.`;
    if (kind === 'contropiede') return `Gol in contropiede di ${scorer}!`;
    return pick(rng, [
      `Gol di ${scorer}!`,
      `${scorer} non perdona: gol!`,
      `Rete! ${scorer} trova l'angolo giusto.`,
    ]);
  },
  assist(passer: string, scorer: string): string {
    return `Assist di ${passer} per ${scorer}.`;
  },
  save(rng: Rng, keeper: string, shooter: string): string {
    return pick(rng, [
      `Parata di ${keeper} sul tiro di ${shooter}.`,
      `${keeper} vola e respinge la conclusione di ${shooter}.`,
      `Tiro di ${shooter}, ${keeper} blocca a terra.`,
    ]);
  },
  miss(rng: Rng, shooter: string, blocker: string | null): string {
    if (blocker) return `Tiro di ${shooter} murato da ${blocker}.`;
    return pick(rng, [
      `${shooter} calcia alto.`,
      `Conclusione di ${shooter} a lato.`,
      `${shooter} ci prova da fuori, fuori misura.`,
    ]);
  },
  woodwork(rng: Rng, shooter: string): string {
    return pick(rng, [`Palo di ${shooter}!`, `Traversa piena di ${shooter}!`]);
  },
  penalty(team: string, fouled: string): string {
    return `Rigore per ${team}! Atterrato ${fouled} in area.`;
  },
  penaltyMissed(taker: string, keeper: string, saved: boolean): string {
    return saved ? `${keeper} para il rigore di ${taker}!` : `${taker} calcia il rigore fuori!`;
  },
  ownGoal(player: string): string {
    return `Autogol di ${player}.`;
  },
  yellow(player: string): string {
    return `Ammonito ${player}.`;
  },
  red(player: string, secondYellow: boolean): string {
    return secondYellow ? `Secondo giallo per ${player}: espulso!` : `Rosso diretto per ${player}!`;
  },
  injury(player: string): string {
    return `${player} resta a terra: stringe i denti e rimane in campo.`;
  },
  tactic(team: string, tactic: Tactic): string {
    const verb: Record<Tactic, string> = {
      attacca: 'si sbilancia in avanti',
      equilibrata: 'torna su un assetto equilibrato',
      difendi: 'abbassa il baricentro',
    };
    return `${team} ${verb[tactic]}.`;
  },
  shootoutKick(taker: string, scored: boolean): string {
    return scored ? `${taker} segna.` : `${taker} sbaglia!`;
  },
};
