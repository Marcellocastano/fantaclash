import { ReactNode } from 'react';
import { useStreamerMode } from '../../hooks/useStreamerMode';
import { StreamerCamZone } from './StreamerCamZone';

/**
 * Guscio delle schermate di gioco (asta, sorteggio, torneo, partita,
 * riepilogo), condiviso tra gioco singolo e stanza.
 * In modalità streamer monta il riquadro WEBCAM fisso in alto a destra;
 * `floatingCam=false` lo sopprime (nell'asta il riquadro è in flusso in
 * cima alla colonna "Squadre"). `inGame=false` (landing): nessun effetto.
 */
export function GameShell({ inGame = true, floatingCam = true, children }: {
  inGame?: boolean;
  floatingCam?: boolean;
  children: ReactNode;
}) {
  const [streamer] = useStreamerMode();
  return (
    <>
      {streamer && inGame && floatingCam && <StreamerCamZone />}
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}

/**
 * Riserva a destra la fascia della webcam (solo ≥ lg, modalità attiva):
 * usata dove l'intera schermata deve scansare il riquadro fisso
 * (hub del torneo, riepilogo finale).
 */
export function StreamerReserve({ children }: { children: ReactNode }) {
  const [streamer] = useStreamerMode();
  return (
    <div className={`flex-1 flex flex-col${streamer ? ' streamer-reserve lg:pr-[432px] 2xl:pr-[496px]' : ''}`}>
      {children}
    </div>
  );
}
