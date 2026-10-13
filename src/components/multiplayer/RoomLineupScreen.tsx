import { useEffect, useMemo, useState } from 'react';
import { autoLineup } from '../../domain/teams/formations';
import { LineupScreen } from '../lineup/LineupScreen';
import { useRoom } from './RoomProvider';

export function RoomLineupScreen() {
  const room = useRoom();
  const state = room.state;
  const window = state?.lineupWindow;
  const team = state?.teams.find(candidate => candidate.ownerId === room.me);
  const [now, setNow] = useState(() => room.hostNow());
  const [sent, setSent] = useState(false);
  const windowKey = window ? `${window.kind}:${window.deadline}` : '';

  useEffect(() => {
    setSent(false);
  }, [windowKey]);

  useEffect(() => {
    if (!window) return;
    setNow(room.hostNow());
    const timer = setInterval(() => setNow(room.hostNow()), 250);
    return () => clearInterval(timer);
  }, [room, window]);

  const initialLineup = useMemo(() => {
    if (!team) return undefined;
    return team.lineup ?? autoLineup(team.roster, team.botConfig?.preferredFormation ?? '2-3-2');
  }, [team]);

  if (!window || !team || !window.teamIds.includes(team.id) || !initialLineup) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16 text-center">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Formazioni in corso</h1>
          <p className="mt-3 text-ink-soft">L’host attende le scelte prima di avviare il turno.</p>
        </div>
      </main>
    );
  }

  const seconds = Math.max(0, Math.ceil((window.deadline - now) / 1000));
  return (
    <LineupScreen
      team={team}
      initialLineup={initialLineup}
      title={window.kind === 'post_auction' ? 'Scegli la formazione predefinita' : 'Prepara la partita'}
      description={`Conferma il modulo e gli otto titolari. La scelta sarà salvata e riutilizzata nelle partite successive. Tempo rimasto: ${seconds}s.`}
      submitLabel="Invia formazione"
      readOnly={sent}
      submitDisabled={sent || seconds === 0}
      sentLabel={sent ? 'Formazione inviata · in attesa delle altre squadre' : undefined}
      onConfirm={lineup => {
        room.sendIntent({ type: 'LINEUP', lineup });
        setSent(true);
      }}
    />
  );
}
