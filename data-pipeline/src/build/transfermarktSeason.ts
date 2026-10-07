// Costruisce public/data/seasons/<YYYY-YY>.json da transfermarkt-datasets (CC0).
// Uso: node data-pipeline/src/build/transfermarktSeason.ts 2015

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsvGz, toRecords, ROOT } from './tmCsv.ts';
import { computeOveralls } from '../derive/overall.ts';
import type { PlayerAgg, Role } from '../derive/overall.ts';
import { concededShare, isCleanSheetAppearance, pickMainClub } from '../derive/aggregate.ts';
import { toGamePlayer } from '../derive/toGamePlayer.ts';

const COMPETITION_ID = 'IT1';

const POSITION_TO_ROLE: Record<string, Role> = {
  Goalkeeper: 'P',
  Defender: 'D',
  Midfield: 'C',
  Attack: 'A',
};

function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

function num(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

type ClubStats = { games: number; points: number; goalsAgainst: number };

async function main(): Promise<void> {
  const yearArg = process.argv[2];
  const year = parseInt(yearArg ?? '', 10);
  if (!Number.isFinite(year)) {
    throw new Error('Uso: node src/build/transfermarktSeason.ts <anno inizio stagione> (es. 2015)');
  }
  const label = seasonLabel(year);

  const [games, apps, playersCsv, clubsCsv] = await Promise.all([
    loadCsvGz('games.csv.gz'),
    loadCsvGz('appearances.csv.gz'),
    loadCsvGz('players.csv.gz'),
    loadCsvGz('clubs.csv.gz'),
  ]);

  const clubName = new Map<string, string>();
  for (const c of toRecords(clubsCsv)) clubName.set(c.club_id, c.name);

  // Partite di Serie A della stagione
  type GameInfo = { homeClub: string; awayClub: string; homeGoals: number; awayGoals: number };
  const gameInfo = new Map<string, GameInfo>();
  const clubStats = new Map<string, ClubStats>();
  const bump = (clubId: string, pts: number, ga: number) => {
    let s = clubStats.get(clubId);
    if (!s) clubStats.set(clubId, (s = { games: 0, points: 0, goalsAgainst: 0 }));
    s.games++;
    s.points += pts;
    s.goalsAgainst += ga;
  };
  for (const g of toRecords(games)) {
    if (g.competition_id !== COMPETITION_ID || g.season !== String(year)) continue;
    const hg = num(g.home_club_goals);
    const ag = num(g.away_club_goals);
    gameInfo.set(g.game_id, {
      homeClub: g.home_club_id,
      awayClub: g.away_club_id,
      homeGoals: hg,
      awayGoals: ag,
    });
    const hp = hg > ag ? 3 : hg === ag ? 1 : 0;
    bump(g.home_club_id, hp, ag);
    bump(g.away_club_id, hg === ag ? 1 : hg < ag ? 3 : 0, hg);
  }
  console.log(`partite IT1 stagione ${year}: ${gameInfo.size}`);

  // Aggregazione per giocatore sulle apparizioni delle partite di lega
  type Agg = PlayerAgg & {
    playerId: string;
    clubMinutes: Map<string, number>;
    clubs: Set<string>;
  };
  const perPlayer = new Map<string, Agg>();
  let skippedApps = 0;
  for (const a of toRecords(apps)) {
    const g = gameInfo.get(a.game_id);
    if (!g) continue;
    if (a.competition_id && a.competition_id !== COMPETITION_ID) continue;
    const minutes = num(a.minutes_played);
    const clubId = a.player_club_id;
    const oppGoals = clubId === g.homeClub ? g.awayGoals : clubId === g.awayClub ? g.homeGoals : 0;

    let agg = perPlayer.get(a.player_id);
    if (!agg) {
      perPlayer.set(a.player_id, (agg = {
        playerId: a.player_id,
        role: 'C',
        apps: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        goalsConceded: 0,
        cleanSheets: 0,
        teamPPG: 0,
        teamGA: 0,
        clubMinutes: new Map(),
        clubs: new Set(),
      }));
    }
    agg.apps++;
    agg.minutes += minutes;
    agg.goals += num(a.goals);
    agg.assists += num(a.assists);
    agg.yellow += num(a.yellow_cards);
    agg.red += num(a.red_cards);
    // approssimazione documentata: gol subiti pesati sui minuti giocati
    agg.goalsConceded += concededShare(oppGoals, minutes);
    if (isCleanSheetAppearance(oppGoals, minutes)) agg.cleanSheets++;
    agg.clubs.add(clubId);
    agg.clubMinutes.set(clubId, (agg.clubMinutes.get(clubId) ?? 0) + minutes);
    void skippedApps;
  }

  // Ruolo e nome da players.csv
  const playerInfo = new Map<string, { name: string; role: Role }>();
  const knownIds = new Set<string>();
  const unmappedIds = new Set<string>();
  let skippedNoPosition = 0;
  let skippedMissing = 0;
  for (const p of toRecords(playersCsv)) {
    knownIds.add(p.player_id);
    const role = POSITION_TO_ROLE[p.position];
    if (!role) {
      unmappedIds.add(p.player_id);
      continue;
    }
    const name = p.name?.trim() || `${p.first_name} ${p.last_name}`.trim();
    playerInfo.set(p.player_id, { name, role });
  }

  let multiClub = 0;
  const inputs: (PlayerAgg & { playerId: string; name: string; clubName: string })[] = [];
  for (const [playerId, agg] of perPlayer) {
    const info = playerInfo.get(playerId);
    if (!info) {
      if (unmappedIds.has(playerId)) skippedNoPosition++;
      else if (!knownIds.has(playerId)) skippedMissing++;
      else skippedNoPosition++;
      continue;
    }
    if (agg.clubs.size > 1) multiClub++;
    const mainClub = pickMainClub(agg.clubMinutes);
    const cs = clubStats.get(mainClub);
    inputs.push({
      ...agg,
      role: info.role,
      name: info.name,
      clubName: clubName.get(mainClub) ?? mainClub,
      teamPPG: cs && cs.games > 0 ? cs.points / cs.games : 0,
      teamGA: cs && cs.games > 0 ? cs.goalsAgainst / cs.games : 0,
    });
  }

  const overalls = computeOveralls(inputs);
  const players = inputs.map((p, i) =>
    toGamePlayer({ ...p, overall: overalls[i], seasonLabel: label })
  );
  players.sort((a, b) => b.overall! - a.overall! || a.name.localeCompare(b.name));

  // Scrittura output
  const outDir = join(ROOT, '..', 'public', 'data', 'seasons');
  mkdirSync(outDir, { recursive: true });
  const seasonDoc = {
    season: label,
    label: `Serie A ${label}`,
    source: 'transfermarkt-datasets (CC0)',
    generatedAt: new Date().toISOString(),
    players,
  };
  writeFileSync(join(outDir, `${label}.json`), JSON.stringify(seasonDoc));

  const indexPath = join(outDir, 'index.json');
  let index: { season: string; label: string; playerCount: number }[] = [];
  if (readFileSyncSafe(indexPath)) {
    index = JSON.parse(readFileSyncSafe(indexPath)!);
  }
  index = index.filter(e => e.season !== label);
  index.push({ season: label, label: `Serie A ${label}`, playerCount: players.length });
  index.sort((a, b) => a.season.localeCompare(b.season));
  writeFileSync(indexPath, JSON.stringify(index, null, 2));

  // Report
  const counts: Record<Role, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const p of players) counts[p.role]++;
  console.log(`\n=== ${label} ===`);
  console.log(`giocatori: ${players.length} (P${counts.P} D${counts.D} C${counts.C} A${counts.A})`);
  console.log(`scartati (posizione mancante/non mappata): ${skippedNoPosition}; assenti da players.csv: ${skippedMissing}`);
  console.log(`giocatori multi-club (cambiati a gennaio): ${multiClub}`);

  for (const role of ['P', 'D', 'C', 'A'] as Role[]) {
    console.log(`\nTOP 10 ${role}`);
    const top = players.filter(p => p.role === role).slice(0, 10);
    for (const p of top) {
      const s = p.stats!;
      const extra =
        role === 'P'
          ? `subiti ${s.goalsConceded?.toFixed(1)}, cs ${s.cleanSheets}`
          : `gol ${s.goals}, assist ${s.assists}`;
      console.log(
        `  ${p.name} (${p.team}) app ${s.appearances} min ${s.minutes} ${extra} | overall ${p.overall} base ${p.baseValue}`
      );
    }
  }

  const hist = (values: number[], edges: [number, number][]) =>
    edges.map(([lo, hi]) => values.filter(v => v >= lo && v <= hi).length).join('/');
  for (const role of ['P', 'D', 'C', 'A'] as Role[]) {
    const group = players.filter(p => p.role === role);
    console.log(
      `${role}: overall[50-59/60-69/70-79/80-89/90-95] ` +
        hist(group.map(p => p.overall!), [[50, 59], [60, 69], [70, 79], [80, 89], [90, 95]]) +
        ` | base[1/2-5/6-10/11-20/21-35/36+] ` +
        hist(group.map(p => p.baseValue), [[1, 1], [2, 5], [6, 10], [11, 20], [21, 35], [36, 999]])
    );
  }
}

function readFileSyncSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

await main();
