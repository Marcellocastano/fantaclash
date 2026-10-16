/**
 * Riconosce gli errori di capacità del trasporto Realtime (quota del
 * progetto raggiunta: troppe connessioni, messaggi o join al secondo).
 * I messaggi di Supabase cambiano nel tempo, quindi si guardano le
 * parole chiave tipiche delle risposte di rate/quota.
 */
export function isCapacityError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /too_many|overload|capacity|quota|rate.?limit|exceeds|exceeded|limit reached|timed_out|channel_error|websocket.*closed|connection.*refused|503|unavailable/i.test(msg);
}
