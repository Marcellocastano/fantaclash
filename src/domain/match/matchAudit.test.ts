// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PlayerRole } from '../../types';
import { createRng, hashSeed, shuffle } from '../../services/auction/rng';
import {
  allSeasons,
  assertInvariants,
  auctionTeams,
  f2,
  f3,
  firstOfRole,
  fixedPlan,
  flat,
  medianTeam,
  meanCi,
  meanSd,
  other,
  Outcome,
  outcome,
  pct,
  play,
  possessionMismatches,
  playPolicy,
  rating,
  scoreBefore,
  seeds,
  shifted,
  SIDES,
  summarize,
  SUMMARY_HEADER,
  summaryRow,
  table,
  TACTICS,
  wilson,
  withId,
} from '../../test/matchAudit';
import { aiTactic, MatchResult, MatchSide, MatchTeamInput, simulateMatch, Tactic } from './index';

/**
 * AUDIT del motore partita (Monte Carlo, opt-in, ~2-4 minuti):
 *   MATCH_AUDIT=1 npx vitest run src/domain/match/matchAudit.test.ts
 *
 * Tutti i semi sono derivati da hashSeed('audit', scenario, i): i numeri
 * stampati sono riproducibili. Ogni partita simulata passa da
 * assertInvariants (ordine eventi, punteggio, espulsi, rigori, pagelle...).
 * Le soglie usano intervalli al 99.9% (z = 3.29) per evitare falsi allarmi
 * con molte asserzioni sullo stesso run.
 */

const RUN = process.env.MATCH_AUDIT === '1';
const Z = 3.29;
const log = (s: string) => console.log(s);
// I test lunghi cedono il controllo all'event loop tra una riga e l'altra
// (altrimenti il worker di vitest va in timeout sull'RPC)
const yieldLoop = () => new Promise(r => setImmediate(r));

describe.skipIf(!RUN)('audit motore partita', () => {
  // Rose realistiche: aste complete su 5 annate x 2 semi (80 squadre, 10 leghe da 8)
  const SEASONS = ['2005-06', '2010-11', '2015-16', '2020-21', '2024-25'];
  const teams = auctionTeams(SEASONS, 2);
  const leagues = Array.from({ length: teams.length / 8 }, (_, i) => teams.slice(i * 8, i * 8 + 8));
  const base = withId(medianTeam(teams), 'A');
  const mirror = withId(base, 'B');

  it('0. squadre d\'asta: distribuzione della forza', () => {
    const rs = teams.map(rating);
    const diffs: number[] = [];
    for (const l of leagues) for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) diffs.push(Math.abs(rating(l[i]) - rating(l[j])));
    log(`\n# squadre: ${teams.length} da ${SEASONS.join(', ')} (annate disponibili: ${allSeasons().length})`);
    log(`rating min ${Math.min(...rs)} max ${Math.max(...rs)} medio ${f2(meanSd(rs).mean)}; |divario| medio nella stessa lega ${f2(meanSd(diffs).mean)}, max ${Math.max(...diffs)}`);
    log(`squadra base (mediana): rating ${rating(base)}`);
  });

  describe('1. partite realistiche (coppie della stessa lega)', () => {
    const N = 24000;
    const rng = createRng(hashSeed('audit-pairs'));
    const results: MatchResult[] = [];
    const diffs: number[] = [];
    for (let i = 0; i < N; i++) {
      const l = leagues[i % leagues.length];
      const [h, a] = shuffle(l, rng);
      const r = simulateMatch({ home: h, away: a, seed: hashSeed('audit', 'pairs', i) });
      assertInvariants(r);
      results.push(r);
      diffs.push(rating(h) - rating(a));
    }
    const count = (f: (r: MatchResult) => number) => results.reduce((s, r) => s + f(r), 0);
    const share = (f: (r: MatchResult) => boolean) => results.filter(f).length / N;
    const ev = (r: MatchResult, t: string) => r.events.filter(e => e.type === t);

    it('1a. esiti, gol e distribuzione dei risultati', () => {
      const hw = share(r => r.homeScore > r.awayScore);
      const d = share(r => r.homeScore === r.awayScore);
      const goals = results.map(r => r.homeScore + r.awayScore);
      const g = meanSd(goals);
      const dist = new Map<string, number>();
      for (const r of results) {
        const hi = Math.max(r.homeScore, r.awayScore);
        const lo = Math.min(r.homeScore, r.awayScore);
        const k = hi >= 4 ? `${hi >= 5 ? '5+' : hi}-x` : `${hi}-${lo}`;
        dist.set(k, (dist.get(k) ?? 0) + 1);
      }
      log(`\n# 1. partite realistiche: ${N}`);
      log(`casa ${pct(hw)} pareggi ${pct(d)} ospiti ${pct(1 - hw - d)}; gol/partita ${f2(g.mean)} (sd ${f2(g.sd)}), casa ${f2(count(r => r.homeScore) / N)} ospiti ${f2(count(r => r.awayScore) / N)}`);
      log(table('risultati (vincente-perdente, a prescindere dal campo)', ['risultato', 'quota'], [...dist.entries()].sort().map(([k, v]) => [k, pct(v / N)])));
      const tot = new Map<number, number>();
      for (const x of goals) tot.set(Math.min(x, 8), (tot.get(Math.min(x, 8)) ?? 0) + 1);
      log(table('gol totali', ['gol', 'quota'], [...tot.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => [k === 8 ? '8+' : k, pct(v / N)])));
      log(`>=5 gol ${pct(share(r => r.homeScore + r.awayScore >= 5))}; partite senza occasioni ${pct(share(r => r.stats.home.chances + r.stats.away.chances === 0))}; senza occasioni per una squadra ${pct(share(r => r.stats.home.chances === 0 || r.stats.away.chances === 0))}; max gol ${Math.max(...goals)}`);
      expect(g.mean).toBeGreaterThan(1.8);
      expect(g.mean).toBeLessThan(3.6);
    });

    it('1b. occasioni, tiri, conversione e tiratori', () => {
      const kinds = { normale: [0, 0], contropiede: [0, 0], grande: [0, 0] } as Record<string, [number, number]>;
      const scorerRole: Record<PlayerRole, number> = { P: 0, D: 0, C: 0, A: 0 };
      let shots = 0;
      let onTarget = 0;
      let woodwork = 0;
      let saves = 0;
      let misses = 0;
      let blocked = 0;
      for (const r of results) {
        for (const s of SIDES) {
          shots += r.stats[s].shots;
          onTarget += r.stats[s].shotsOnTarget;
        }
        const roleOf = (side: MatchSide, id?: string) => r.lineups[side].find(p => p.playerId === id)?.role;
        for (const e of r.events) {
          if (e.type === 'goal' && !e.isPenalty) {
            kinds[e.chanceKind ?? 'normale'][0]++;
            kinds[e.chanceKind ?? 'normale'][1]++;
          }
          if ((e.type === 'save' || e.type === 'miss' || e.type === 'woodwork') && e.chanceKind) kinds[e.chanceKind][1]++;
          if (e.type === 'goal') {
            const role = roleOf(e.side, e.playerId);
            if (role) scorerRole[role]++;
          }
          if (e.type === 'woodwork') woodwork++;
          if (e.type === 'save') saves++;
          if (e.type === 'miss') {
            misses++;
            if (e.relatedPlayerId) blocked++;
          }
        }
      }
      const goalsTot = Object.values(scorerRole).reduce((a, b) => a + b, 0);
      log(`\n# 1b. occasioni/partita ${f2(count(r => r.stats.home.chances + r.stats.away.chances) / N)}, grandi occasioni ${f2(count(r => r.stats.home.bigChances + r.stats.away.bigChances) / N)}; tiri ${f2(shots / N)}, in porta ${pct(onTarget / shots)}`);
      log(table('conversione per tipo (rigori esclusi)', ['tipo', 'tiri', 'quota tiri', 'gol%'], Object.entries(kinds).map(([k, [g, n]]) => [k, n, pct(n / Object.values(kinds).reduce((s, x) => s + x[1], 0)), pct(g / n)])));
      log(`esiti dei tiri non a segno: pali ${f2(woodwork / N)}/partita, parate ${f2(saves / N)}, fuori ${f2(misses / N)} (di cui murati ${pct(blocked / misses)})`);
      log(`marcatori per ruolo: ${(['P', 'D', 'C', 'A'] as PlayerRole[]).map(r => `${r} ${pct(scorerRole[r] / goalsTot)}`).join(' ')}`);
      const conv = (k: string) => kinds[k][0] / kinds[k][1];
      expect(conv('grande')).toBeGreaterThan(conv('contropiede'));
      expect(conv('contropiede')).toBeGreaterThan(conv('normale'));
      expect(scorerRole.D).toBeGreaterThan(0);
      expect(scorerRole.C).toBeGreaterThan(0);
      expect(scorerRole.P).toBe(0);
    });

    it('1c. cartellini, espulsioni, infortuni, rigori, autogol', () => {
      const yel = results.map(r => ev(r, 'yellow_card').length);
      const reds = results.map(r => ev(r, 'red_card').length);
      const second = count(r => ev(r, 'red_card').filter(e => e.secondYellow).length);
      const inj = results.map(r => ev(r, 'injury').length);
      const pens = results.map(r => ev(r, 'penalty').length);
      const pensScored = count(r => ev(r, 'goal').filter(e => e.isPenalty).length);
      const own = results.map(r => ev(r, 'own_goal').length);
      const maxReds = Math.max(...results.flatMap(r => SIDES.map(s => r.events.filter(e => e.type === 'red_card' && e.side === s).length)));
      const gkReds = count(r => ev(r, 'red_card').filter(e => r.lineups[e.side].find(p => p.playerId === e.playerId)?.role === 'P').length);
      log(`\n# 1c. eventi rari (${N} partite)`);
      log(table('per partita', ['evento', 'media', 'P(>=1)'], [
        ['gialli', f2(meanSd(yel).mean), pct(share(r => ev(r, 'yellow_card').length > 0))],
        ['rossi', f3(meanSd(reds).mean), pct(share(r => ev(r, 'red_card').length > 0))],
        ['  di cui 2° giallo', f3(second / N), ''],
        ['  portiere espulso', f3(gkReds / N), ''],
        ['infortuni', f3(meanSd(inj).mean), pct(share(r => ev(r, 'injury').length > 0))],
        ['rigori', f3(meanSd(pens).mean), pct(share(r => ev(r, 'penalty').length > 0))],
        ['autogol', f3(meanSd(own).mean), pct(share(r => ev(r, 'own_goal').length > 0))],
      ]));
      log(`rigori trasformati ${pct(pensScored / pens.reduce((a, b) => a + b, 0))}; max espulsi per squadra ${maxReds}`);
      // Distribuzione temporale per fasce di 15' (recuperi nella fascia finale del tempo)
      const buckets = (t: string) => {
        const b = [0, 0, 0, 0, 0, 0];
        for (const r of results) for (const e of ev(r, t)) b[Math.min(5, Math.floor((Math.min(e.minute, 90) - 1) / 15))]++;
        const tot = b.reduce((x, y) => x + y, 0);
        return b.map(x => pct(x / tot));
      };
      log(table('distribuzione temporale (fasce 1-15 ... 76-90+)', ['evento', "1-15'", "16-30'", "31-45+'", "46-60'", "61-75'", "76-90+'"], ['goal', 'yellow_card', 'red_card', 'injury', 'penalty'].map(t => [t, ...buckets(t)])));
    });

    it('1d. lotteria dei rigori: frequenza, durata, lato', () => {
      const so = results.filter(r => r.shootout);
      const homeWins = so.filter(r => r.shootout!.home > r.shootout!.away).length;
      const kicks = so.map(r => r.events.filter(e => e.type === 'shootout_kick').length);
      const sudden = kicks.filter(k => k > 10).length;
      const conv = so.flatMap(r => r.events.filter(e => e.type === 'shootout_kick')).map(e => (e.scored ? 1 : 0) as number);
      const [lo, hi] = wilson(homeWins, so.length, Z);
      log(`\n# 1d. rigori finali in ${pct(so.length / N)} delle partite (${so.length}); vince la casa ${pct(homeWins / so.length)} [IC99.9 ${pct(lo)}-${pct(hi)}]; calci medi ${f2(meanSd(kicks).mean)}, max ${Math.max(...kicks)}; a oltranza ${pct(sudden / so.length)}; trasformati ${pct(meanSd(conv).mean)}`);
      expect(lo).toBeLessThan(0.5);
      expect(hi).toBeGreaterThan(0.5);
    });

    it('1e. controllo del gioco e momentum', () => {
      let ticks = 0;
      let clamped = 0;
      const ctrl: number[] = [];
      let postGoal = 0;
      let preGoal = 0;
      let nGoals = 0;
      for (const r of results) {
        for (let t = 1; t <= r.fullTimeTick; t++) {
          ticks++;
          const c = r.ticks[t].homeControl;
          ctrl.push(c);
          if (c <= 0.2 + 1e-9 || c >= 0.8 - 1e-9) clamped++;
        }
        for (const e of r.events) {
          if (e.type !== 'goal' || e.tick < 11 || e.tick > r.fullTimeTick - 10) continue;
          const own = (t: number) => (e.side === 'home' ? r.ticks[t].homeControl : 1 - r.ticks[t].homeControl);
          for (let k = 1; k <= 10; k++) {
            preGoal += own(e.tick - k);
            postGoal += own(e.tick + k);
          }
          nGoals++;
        }
      }
      const c = meanSd(ctrl);
      log(`\n# 1e. controllo casa medio ${f3(c.mean)} sd ${f3(c.sd)}; tick al limite (0.2/0.8) ${pct(clamped / ticks, 3)}`);
      log(`controllo della squadra che segna: 10' prima ${f3(preGoal / (10 * nGoals))}, 10' dopo ${f3(postGoal / (10 * nGoals))}`);
      // Rimonte: chi è sotto di 1 al 60' evita la sconfitta nei 90'?
      let behind = 0;
      let saved = 0;
      for (const r of results) {
        const t60 = r.ticks.findIndex(t => t.period === 2 && t.minute === 60);
        const d = scoreBefore(r, t60 + 1, 'home');
        if (Math.abs(d) !== 1) continue;
        const loser: MatchSide = d < 0 ? 'home' : 'away';
        behind++;
        const o = outcome(r, loser);
        if (o.reg >= 0) saved++;
      }
      log(`sotto di 1 al 60': evita la sconfitta ${pct(saved / behind)} (${behind} casi)`);
    });

    it('1f. forma del giorno e divario di forza', () => {
      const formDiff = results.map(r => meanSd(r.lineups.home.map(p => p.form)).mean - meanSd(r.lineups.away.map(p => p.form)).mean);
      const fd = meanSd(formDiff);
      const bucket = (lo: number, hi: number) => results.filter((_, i) => formDiff[i] >= lo && formDiff[i] < hi);
      const rows = [[-1, -0.04], [-0.04, -0.015], [-0.015, 0.015], [0.015, 0.04], [0.04, 1]].map(([lo, hi]) => {
        const b = bucket(lo, hi);
        return [`[${lo}, ${hi})`, b.length, pct(b.filter(r => r.winnerId === r.homeTeamId).length / b.length)];
      });
      log(`\n# 1f. differenza di forma media tra le squadre: sd ${f3(fd.sd)} (un punto di overall = 0.040 di qualità; la forma ×0.9-1.1 vale ±7-9 punti per giocatore)`);
      log(table('casa passa il turno per differenza di forma media', ['Δforma', 'n', 'casa passa'], rows));
      const dRows = [[-99, -4], [-4, -1], [-1, 2], [2, 5], [5, 99]].map(([lo, hi]) => {
        const idx = diffs.map((d, i) => (d >= lo && d < hi ? i : -1)).filter(i => i >= 0);
        const w = idx.filter(i => results[i].winnerId === results[i].homeTeamId).length;
        const [a, b] = wilson(w, idx.length);
        return [`[${lo}, ${hi})`, idx.length, `${pct(w / idx.length)} [${pct(a)}-${pct(b)}]`];
      });
      log(table('casa passa il turno per divario di rating (casa - ospiti)', ['divario', 'n', 'casa passa (IC95)'], dRows));
    });
  });

  it('2. simmetria: squadre identiche', () => {
    const N = 40000;
    const s = seeds('symmetry', N);
    const rows: (string | number)[][] = [];
    for (const adv of [0, undefined]) {
      const os = play(base, mirror, s, { options: () => (adv === 0 ? { homeAdvantage: 0 } : undefined) });
      const w = os.filter(o => o.reg === 1).length;
      const l = os.filter(o => o.reg === -1).length;
      const d = (w - l) / N;
      const se = Math.sqrt((w / N + l / N - d * d) / N);
      const adv1 = os.filter(o => o.won).length;
      const yel = (side: MatchSide) => meanSd(os.map(o => o.r.stats[side].yellowCards)).mean;
      const pens = (side: MatchSide) => meanSd(os.map(o => o.r.events.filter(e => e.type === 'penalty' && e.side === side).length)).mean;
      const inj = (side: MatchSide) => meanSd(os.map(o => o.r.events.filter(e => e.type === 'injury' && e.side === side).length)).mean;
      rows.push([
        adv === 0 ? 'senza vantaggio casa' : 'vantaggio casa 0.004',
        pct(w / N),
        pct(1 - (w + l) / N),
        pct(l / N),
        `${pct(d)} ± ${pct(Z * se)}`,
        pct(adv1 / N),
        `${f3(meanSd(os.map(o => o.gf)).mean)} / ${f3(meanSd(os.map(o => o.ga)).mean)}`,
        f2(meanSd(os.map(o => o.r.stats.home.possession)).mean),
        `${f3(yel('home'))}/${f3(yel('away'))}`,
        `${f3(pens('home'))}/${f3(pens('away'))}`,
        `${f3(inj('home'))}/${f3(inj('away'))}`,
      ]);
      if (adv === 0) expect(Math.abs(d)).toBeLessThan(Z * se);
    }
    log(table(`2. simmetria (${N} partite, stessa rosa, stessa forma)`, ['caso', 'casa V', 'N', 'ospiti V', 'V-P casa (IC99.9)', 'casa passa', 'gol casa/osp', 'poss. casa', 'gialli c/o', 'rigori c/o', 'infort. c/o'], rows));
  });

  it('3. divario di forza controllato (stessa rosa, overall spostati)', async () => {
    const N = 10000;
    const s = seeds('strength', N);
    const rows: (string | number)[][] = [];
    const advs: number[] = [];
    for (const delta of [0, 1, 2, 3, 5, 8]) {
      await yieldLoop();
      const a = shifted(base, 'A', delta);
      const sm = summarize(play(a, mirror, s, { sides: 'both' }));
      advs.push(sm.adv);
      rows.push(summaryRow(`tutti +${delta} (rating ${rating(a)} vs ${rating(mirror)})`, sm));
    }
    const roles: PlayerRole[] = ['P', 'D', 'C', 'A'];
    for (const role of roles) {
      const a = shifted(base, 'A', 5, p => p.role === role);
      rows.push(summaryRow(`reparto ${role} +5 (rating ${rating(a)})`, summarize(play(a, mirror, s, { sides: 'both' }))));
    }
    for (const role of roles) {
      for (const d of [1, 5, 10]) {
        await yieldLoop();
        const a = shifted(base, 'A', d, firstOfRole(base, role));
        rows.push(summaryRow(`un ${role} +${d} (rating ${rating(a)})`, summarize(play(a, mirror, s, { sides: 'both' }))));
      }
    }
    // Sinergia: stessa qualità, club tutti uguali vs tutti diversi
    const sameClub = { ...base, id: 'A', players: base.players.map(p => ({ ...p, team: 'Club Unico' })) };
    const allDiff = { ...base, id: 'B', name: 'B', players: base.players.map((p, i) => ({ ...p, team: `Club ${i}` })) };
    rows.push(summaryRow('sinergia: 8 dello stesso club vs 8 club diversi', summarize(play(sameClub, allDiff, s, { sides: 'both' }))));
    const weakerSame = shifted(sameClub, 'A', -1);
    rows.push(summaryRow('stesso club con overall -1 vs club diversi', summarize(play(weakerSame, allDiff, s, { sides: 'both' }))));
    const weakMid = shifted(base, 'A', -25, p => p.role === 'C');
    rows.push(summaryRow('centrocampo indebolito', summarize(play(weakMid, mirror, s, { sides: 'both' }))));
    const weakAttack = shifted(base, 'A', -25, p => p.role === 'A');
    rows.push(summaryRow('attacco indebolito', summarize(play(weakAttack, mirror, s, { sides: 'both' }))));
    log(table(`3. sensibilità alla forza (${N} semi x 2 campi, stessi semi per ogni riga)`, SUMMARY_HEADER, rows));
    for (let i = 1; i < advs.length; i++) expect(advs[i]).toBeGreaterThan(advs[i - 1]);
  });

  it('4. controllo del gioco: profili di squadra', () => {
    const N = 10000;
    const s = seeds('control', N);
    const mk = (id: string, deltas: Partial<Record<PlayerRole, number>>) =>
      ({ id, name: id, players: base.players.map(p => ({ ...p, overall: (p.overall ?? 0) + (deltas[p.role] ?? 0) })) }) as MatchTeamInput;
    const profiles: [string, MatchTeamInput][] = [
      ['centrocampo +8, attacco -8', mk('A', { C: 8, A: -8 })],
      ['attacco +8, centrocampo -8', mk('A', { A: 8, C: -8 })],
      ['difesa+portiere +8, attacco -8', mk('A', { D: 8, P: 8, A: -8 })],
      ['equilibrata (base)', mk('A', {})],
      ['tutti i reparti +4', mk('A', { P: 4, D: 4, C: 4, A: 4 })],
    ];
    const rows = profiles.map(([label, a]) => summaryRow(`${label} (rating ${rating(a)})`, summarize(play(a, mirror, s, { sides: 'both' }))));
    const midVsAtt = summarize(play(profiles[0][1], { ...profiles[1][1], id: 'B', name: 'B' }, s, { sides: 'both' }));
    rows.push(summaryRow('centrocampo+8/att-8 CONTRO att+8/centr-8', midVsAtt));
    log(table(`4. profili contro la squadra base (${N} semi x 2 campi)`, SUMMARY_HEADER, rows));
  });

  describe('5. tattiche', () => {
    const N = 5000;
    const s = seeds('tactics', N);
    const strengths: [string, MatchTeamInput][] = [
      ['pari', shifted(base, 'A', 0)],
      ['A più forte (+4)', shifted(base, 'A', 4)],
      ['A più debole (-4)', shifted(base, 'A', -4)],
    ];

    it('5a. matrice tattica a tattiche fisse per 90\'', async () => {
      // best[contesto] = tattica di A con la quota di passaggio più alta
      const best: Tactic[] = [];
      for (const [label, a] of strengths) {
        const rows: (string | number)[][] = [];
        const advBy = {} as Record<Tactic, Record<Tactic, number>>;
        for (const ta of TACTICS) {
          advBy[ta] = {} as Record<Tactic, number>;
          for (const tb of TACTICS) {
            await yieldLoop();
            const sm = summarize(
              play(a, mirror, s, {
                sides: 'both',
                options: aSide => ({ tactics: { [aSide]: fixedPlan(ta), [other(aSide)]: fixedPlan(tb) } }),
              })
            );
            rows.push(summaryRow(`A ${ta} / B ${tb}`, sm));
            advBy[ta][tb] = sm.adv;
          }
        }
        log(table(`5a. matrice (${label}, ${N} semi x 2 campi)`, SUMMARY_HEADER, rows));
        for (const tb of TACTICS) best.push([...TACTICS].sort((x, y) => advBy[y][tb] - advBy[x][tb])[0]);
      }
      log(`\n# 5a. tattica migliore di A nei 9 contesti (forza x tattica di B): ${best.join(', ')}`);
      // Nessuna tattica è la migliore in tutti i contesti
      expect(new Set(best).size).toBeGreaterThan(1);
    });

    it('5b. scelta al 46\' e al 75\' in base al punteggio (avversario IA)', async () => {
      for (const [label, a] of strengths.slice(0, 2)) {
        for (const di of [1, 2]) {
          await yieldLoop();
          // stato al punto di decisione con A equilibrata fino a lì
          const buckets = new Map<number, Record<Tactic, Outcome[]>>();
          for (const seed of s) {
            for (const aSide of SIDES) {
              const [home, away] = aSide === 'home' ? [a, mirror] : [mirror, a];
              const r0 = simulateMatch({ home, away, seed, options: { tactics: { [aSide]: [] } } });
              const k = r0.decisionTicks[di];
              const d = Math.max(-2, Math.min(2, scoreBefore(r0, k, aSide)));
              const b = buckets.get(d) ?? { attacca: [], equilibrata: [], difendi: [] };
              for (const t of TACTICS) {
                const r = simulateMatch({ home, away, seed, options: { tactics: { [aSide]: [{ fromTick: k, tactic: t }] } } });
                b[t].push(outcome(r, aSide));
              }
              buckets.set(d, b);
            }
          }
          const rows = [...buckets.entries()].sort((x, y) => x[0] - y[0]).map(([d, b]) => {
            const cells = TACTICS.map(t => {
              const n = b[t].length;
              const w = b[t].filter(o => o.won).length;
              return `${pct(w / n)} (GF ${f2(meanSd(b[t].map(o => o.gf)).mean)} GS ${f2(meanSd(b[t].map(o => o.ga)).mean)})`;
            });
            // differenza appaiata (stessi semi) migliore - equilibrata
            const paired = (t: Tactic) => b[t].map((o, i) => (o.won ? 1 : 0) - (b.equilibrata[i].won ? 1 : 0));
            const ciA = meanCi(paired('attacca'));
            const ciD = meanCi(paired('difendi'));
            return [d >= 2 ? '+2 o più' : d <= -2 ? '-2 o meno' : d > 0 ? `+${d}` : String(d), b.attacca.length, ...cells, `${pct(ciA[0])}..${pct(ciA[1])}`, `${pct(ciD[0])}..${pct(ciD[1])}`];
          });
          log(table(`5b. ${label}: scelta al ${di === 1 ? "46'" : "75'"} — A passa il turno (rigori inclusi)`, ['diff. reti A', 'n', 'attacca', 'equilibrata', 'difendi', 'att-equ (IC95 appaiato)', 'dif-equ (IC95 appaiato)'], rows));
          // Al 75': chi è sotto di uno deve attaccare, chi è sopra di uno difendere
          if (di === 2) {
            const gain = (d: number, t: Tactic) => {
              const b = buckets.get(d)!;
              return meanSd(b[t].map((o, i) => (o.won ? 1 : 0) - (b.equilibrata[i].won ? 1 : 0))).mean;
            };
            expect(gain(-1, 'attacca')).toBeGreaterThan(0);
            expect(gain(1, 'difendi')).toBeGreaterThan(0);
          }
        }
      }
    });

    it('5c. politiche complete contro l\'IA (avversario IA)', async () => {
      const M = 8000;
      const s2 = seeds('policies', M);
      const policies: [string, ((i: number, d: number) => Tactic) | null][] = [
        ['IA (stesse regole del bot)', null],
        ['sempre equilibrata', () => 'equilibrata'],
        ['sempre attacca', () => 'attacca'],
        ['sempre difendi', () => 'difendi'],
        ['attacca se sotto, altrimenti equilibrata', (_i, d) => (d < 0 ? 'attacca' : 'equilibrata')],
        ['difendi se sopra, attacca se sotto', (_i, d) => (d > 0 ? 'difendi' : d < 0 ? 'attacca' : 'equilibrata')],
      ];
      for (const [label, a] of strengths) {
        const rows: (string | number)[][] = [];
        for (const [pl, pol] of policies) {
          await yieldLoop();
          const os: Outcome[] = [];
          for (const seed of s2) {
            for (const aSide of SIDES) {
              const r = pol
                ? playPolicy(a, mirror, seed, aSide, pol)
                : simulateMatch({ home: aSide === 'home' ? a : mirror, away: aSide === 'home' ? mirror : a, seed });
              os.push(outcome(r, aSide));
            }
          }
          rows.push(summaryRow(pl, summarize(os)));
        }
        log(table(`5c. politiche di A contro l'IA (${label}, ${M} semi x 2 campi)`, SUMMARY_HEADER, rows));
      }
    });

    it('5d. energia a fine partita per tattica fissa', () => {
      const r = (t: Tactic) => simulateMatch({ home: base, away: mirror, seed: 1, options: { tactics: { home: fixedPlan(t), away: fixedPlan(t) } } });
      log(`\n# 5d. energia finale: ${TACTICS.map(t => `${t} ${r(t).ticks[r(t).fullTimeTick].energy.home}`).join(', ')}; tick giocati ${r('equilibrata').fullTimeTick}`);
      log(`IA: decisione 0 → ${aiTactic(0, 0, 0)}; 46' sotto ${aiTactic(1, -1, 0)}, +1 ${aiTactic(1, 1, 0)}, +2 ${aiTactic(1, 2, 0)}; 75' pari ${aiTactic(2, 0, 0)} (più forte di 3: ${aiTactic(2, 0, 3)}), +1 ${aiTactic(2, 1, 0)}, -1 ${aiTactic(2, -1, 0)}`);
    });
  });

  it('6. portieri e rigori (paraRigori)', () => {
    const N = 30000;
    const rng = createRng(hashSeed('audit-gk'));
    const pen: Record<string, [number, number]> = {};
    const kick: Record<string, [number, number]> = {};
    const soByDiff: Record<string, [number, number]> = {};
    const bucket = (x: number | undefined) => (x === undefined ? 'assente' : x === 0 ? '0' : x <= 0.3 ? '(0, .3]' : x <= 0.6 ? '(.3, .6]' : '> .6');
    for (let i = 0; i < N; i++) {
      const [h, a] = shuffle(leagues[i % leagues.length], rng);
      const r = simulateMatch({ home: h, away: a, seed: hashSeed('audit', 'gk', i) });
      const gkPen = (side: MatchSide) => (side === 'home' ? h : a).players.find(p => p.role === 'P')?.penaltySaveProbability;
      for (const e of r.events) {
        if (e.type === 'penalty') {
          const k = bucket(gkPen(other(e.side)));
          const scored = r.events.some(g => g.tick === e.tick && g.type === 'goal' && g.isPenalty && g.side === e.side);
          pen[k] = [(pen[k]?.[0] ?? 0) + (scored ? 1 : 0), (pen[k]?.[1] ?? 0) + 1];
        }
        if (e.type === 'shootout_kick') {
          const k = bucket(gkPen(other(e.side)));
          kick[k] = [(kick[k]?.[0] ?? 0) + (e.scored ? 1 : 0), (kick[k]?.[1] ?? 0) + 1];
        }
      }
      if (r.shootout) {
        const d = (gkPen('home') ?? 0.2) - (gkPen('away') ?? 0.2);
        const k = d <= -0.3 ? 'casa molto peggio (≤-.3)' : d < -0.05 ? 'casa peggio' : d <= 0.05 ? 'pari (±.05)' : d < 0.3 ? 'casa meglio' : 'casa molto meglio (≥.3)';
        soByDiff[k] = [(soByDiff[k]?.[0] ?? 0) + (r.shootout.home > r.shootout.away ? 1 : 0), (soByDiff[k]?.[1] ?? 0) + 1];
      }
    }
    const rowsOf = (m: Record<string, [number, number]>) => Object.entries(m).sort().map(([k, [g, n]]) => [k, n, pct(g / n)]);
    log(table(`6. rigori in partita trasformati per paraRigori del portiere (${N} partite)`, ['paraRigori', 'n', 'trasformati'], rowsOf(pen)));
    log(table('calci della lotteria trasformati per paraRigori', ['paraRigori', 'n', 'trasformati'], rowsOf(kick)));
    log(table('lotteria vinta dalla casa per differenza di paraRigori (casa - ospiti)', ['Δ', 'n', 'casa vince'], rowsOf(soByDiff)));
  });

  it('7. fantasy: portiere espulso', () => {
    const N = 40000;
    let cases = 0;
    let concededAfter = 0;
    let csWhileOff = 0;
    const rng = createRng(hashSeed('audit-fanta'));
    for (let i = 0; i < N; i++) {
      const [h, a] = shuffle(leagues[i % leagues.length], rng);
      const r = simulateMatch({ home: h, away: a, seed: hashSeed('audit', 'fanta', i) });
      for (const e of r.events) {
        if (e.type !== 'red_card') continue;
        const gk = r.lineups[e.side].find(p => p.role === 'P');
        if (!gk || gk.playerId !== e.playerId) continue;
        cases++;
        const after = r.events.filter(g => g.tick > e.tick && (g.type === 'goal' || g.type === 'own_goal') && g.side === other(e.side)).length;
        const perf = r.playerPerformances.find(p => p.side === e.side && p.playerId === gk.playerId)!;
        const before = r.events.filter(g => g.tick <= e.tick && (g.type === 'goal' || g.type === 'own_goal') && g.side === other(e.side)).length;
        if (after > 0 && perf.goalsConceded > before) concededAfter++;
        if (perf.cleanSheet) csWhileOff++;
      }
    }
    log(`\n# 7. portieri espulsi: ${cases} in ${N} partite; con gol subiti DOPO l'espulsione addebitati al portiere: ${concededAfter}; espulsi con bonus porta inviolata: ${csWhileOff}`);
  });

  it('8. robustezza e casi limite', () => {
    const cases: [string, MatchTeamInput, MatchTeamInput][] = [
      ['overall 50 vs 99', flat(base, 'A', 50), flat(base, 'B', 99)],
      ['overall 50 vs 50', flat(base, 'A', 50), flat(base, 'B', 50)],
      ['overall 120 vs 120', flat(base, 'A', 120), flat(base, 'B', 120)],
      ['overall minimo vs massimo', flat(base, 'A', 50), flat(mirror, 'B', 95)],
      ['centrocampo depotenziato', shifted(base, 'A', -20, p => p.role === 'C'), mirror],
      ['attacco depotenziato', shifted(base, 'A', -20, p => p.role === 'A'), mirror],
      ['statistiche a zero', { ...base, id: 'A', players: base.players.map(p => ({ ...p, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0, redCardProbability: 0, penaltySaveProbability: 0 })) }, mirror],
      ['paraRigori assente / 1.0', { ...base, id: 'A', players: base.players.map(p => ({ ...p, penaltySaveProbability: undefined })) }, { ...base, id: 'B', name: 'B', players: base.players.map(p => ({ ...p, penaltySaveProbability: p.role === 'P' ? 1 : undefined })) }],
      ['cartellini a raffica (prob. 1)', { ...base, id: 'A', players: base.players.map(p => ({ ...p, yellowCardProbability: 1, redCardProbability: 1 })) }, mirror],
    ];
    const rows: (string | number)[][] = [];
    for (const [label, a, b] of cases) {
      const os = play(a, b, seeds(`edge-${label}`, 2000), { sides: 'both' });
      const sm = summarize(os);
      rows.push([label, sm.n, pct(sm.win), pct(sm.draw), f2(sm.gf), f2(sm.ga), pct(os.filter(o => o.r.shootout).length / os.length), Math.max(...os.map(o => o.r.events.filter(e => e.type === 'shootout_kick').length))]);
    }
    const malformed: MatchTeamInput[] = [
      { ...base, players: [] },
      { ...base, players: base.players.filter(player => player.role !== 'P') },
      { ...base, formation: '2-2-3', players: base.players },
      { ...base, players: [...base.players, { ...base.players[0], id: 'duplicate-extra' }] },
    ];
    for (const invalid of malformed) expect(() => simulateMatch({ home: invalid, away: mirror, seed: 1 })).toThrow(/Formazione/);
    for (const seed of [0, 1, -1, 2 ** 32 - 1, 2 ** 32, Number.MAX_SAFE_INTEGER, 0.5, -123456.789]) {
      const r = simulateMatch({ home: base, away: mirror, seed });
      assertInvariants(r);
      expect(simulateMatch({ home: base, away: mirror, seed })).toEqual(r);
    }
    log(table('8. casi limite (2000 semi x 2 campi, invarianti verificate su ogni partita)', ['caso', 'n', 'A V', 'N', 'GF', 'GS', 'rigori', 'max calci'], rows));
    log(`\n# possesso: statistiche del motore ≠ riproduzione (±1) in ${possessionMismatches.count / 2} partite su ${possessionMismatches.checked} controllate`);
  });
});
