import { useEffect, useState } from 'react';
import { loadSeasonIndex, loadSeasonPlayers } from '../services/seasons';
import { buildSeasonData, indexEntry, Top11IndexEntry, Top11SeasonData } from './top11';

/**
 * In produzione i dati delle pagine Top 11 sono già nell'HTML (blocco
 * `page-data` scritto dal pre-rendering). In sviluppo manca: questi hook
 * caricano gli stessi JSON pubblici e calcolano gli stessi dati.
 */

export function useTop11Index(initial: Top11IndexEntry[] | null) {
  const [entries, setEntries] = useState<Top11IndexEntry[]>(initial ?? []);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(initial !== null);
  useEffect(() => {
    if (done) return;
    let alive = true;
    (async () => {
      try {
        const index = await loadSeasonIndex();
        if (!alive) return;
        setTotal(index.length);
        // Le annate arrivano in parallelo e compaiono appena pronte
        const acc: (Top11IndexEntry | undefined)[] = new Array(index.length);
        await Promise.all(
          index.map(async (s, i) => {
            const players = await loadSeasonPlayers(s.season);
            acc[i] = indexEntry(s.season, players);
            if (alive) setEntries(acc.filter((e): e is Top11IndexEntry => !!e));
          })
        );
        if (alive) setDone(true);
      } catch { if (alive) setDone(true); }
    })();
    return () => { alive = false; };
  }, [done]);
  return { entries, loading: !done, total };
}

export function useTop11SeasonData(season: string, initial: Top11SeasonData | null) {
  const [data, setData] = useState(initial);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (data) return;
    let alive = true;
    (async () => {
      try {
        const index = await loadSeasonIndex();
        const info = index.find(s => s.season === season);
        if (!info) { if (alive) setFailed(true); return; }
        const players = await loadSeasonPlayers(season);
        if (alive) setData(buildSeasonData(season, info.label, players, index.map(s => s.season)));
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [season, data]);
  return { data, loading: !data && !failed, failed };
}
