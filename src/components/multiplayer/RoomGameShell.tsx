import { ReactNode } from 'react';
import { GamePhase } from '../../types';
import { AppNavbar, NavStat } from '../layout/AppNavbar';
import { journeyStep } from '../layout/journey';
import { RoomTopBar } from './RoomTopBar';
import { useRoom } from './RoomProvider';

const ROOM_PHASE: Record<string, GamePhase> = {
  auction: 'ASTA',
  tournament: 'TORNEO',
  final: 'FINALE',
};

/**
 * Guscio delle fasi di gioco della stanza (asta, torneo, finale):
 * lo stesso dell'app singola — navbar col percorso e main a piena
 * larghezza — più la barra sottile della stanza (codice, avviso, Esci).
 * Nessuna "Nuova partita": si esce solo dalla stanza.
 */
export function RoomGameShell({ children }: { children: ReactNode }) {
  const room = useRoom();
  const state = room.state;
  const phase = state ? ROOM_PHASE[state.phase] : undefined;
  const step = phase ? journeyStep(phase, state?.tournament?.status) : null;
  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar
        step={step}
        context={state ? <NavStat label="Annata" value={state.settings.season} /> : null}
      />
      <div className="w-full max-w-[1600px] mx-auto px-4">
        <RoomTopBar />
      </div>
      {children}
    </div>
  );
}
