import { useEffect, useState } from 'react';
import { loadSeasonIndex, loadSeasonPlayers } from '../services/seasons';
import { buildSeasonData, indexEntry, Top11IndexEntry, Top11SeasonData } from './top11';

/**
 * In produzione i dati delle pagine Top 11 sono già nell'HTML (blocco
 * `page-data` scritto dal pre-rendering). In sviluppo manca: questi hook
 * caricano gli stessi JSON pubblici e calcolano gli stessi dati.
 */

export function useTop11Index(initial: Top11IndexEntry[] | null) {
  const [data, setData] = useState(initial);
  useEffect(() => {
    if (data) return;
    let alive = true;
    (async () => {
      try {
        const index = await loadSeasonIndex();
        const entries: Top11IndexEntry[] = [];
        for (const s of index) {
          const players = await loadSeasonPlayers(s.season);
          entries.push(indexEntry(s.season, players));
        }
        if (alive) setData(entries);
      } catch { /* pagina senza lista, come senza dati */ }
    })();
    return () => { alive = false; };
  }, [data]);
  return data;
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
