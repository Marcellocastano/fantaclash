import { useEffect, useState } from 'react';
import { isMuted, setMuted, subscribeMuted } from '../services/sound';

/** Stato del mute condiviso tra i componenti (es. navbar) */
export function useSoundMuted(): [boolean, (muted: boolean) => void] {
  // Letto dopo il montaggio: il primo disegno coincide con l'HTML pre-renderizzato
  const [muted, setState] = useState(false);
  useEffect(() => {
    setState(isMuted());
    return subscribeMuted(setState);
  }, []);
  return [muted, setMuted];
}
