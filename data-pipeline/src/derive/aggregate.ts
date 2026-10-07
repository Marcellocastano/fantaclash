// Helper puri per l'aggregazione delle apparizioni transfermarkt.

/** Gol subiti attribuiti a una singola apparizione: gol avversari × min/90 (max 90'). */
export function concededShare(opponentGoals: number, minutes: number): number {
  return (opponentGoals * Math.min(minutes, 90)) / 90;
}

/** L'apparizione conta come clean sheet: squadra a reti inviolate e >= 60' giocati. */
export function isCleanSheetAppearance(opponentGoals: number, minutes: number): boolean {
  return minutes >= 60 && opponentGoals === 0;
}

/** Club con più minuti giocati (per chi ha cambiato squadra a gennaio). */
export function pickMainClub(clubMinutes: Map<string, number>): string {
  let best = '';
  let bestMin = -1;
  for (const [clubId, m] of clubMinutes) {
    if (m > bestMin) {
      bestMin = m;
      best = clubId;
    }
  }
  return best;
}
