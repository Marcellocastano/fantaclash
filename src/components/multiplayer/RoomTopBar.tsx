import { useRoom } from './RoomProvider';

/** Barra sottile in testa alle fasi di stanza: codice, avviso host, uscita */
export function RoomTopBar() {
  const room = useRoom();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-ink/10 pb-2 mb-2 text-sm">
      <span className="font-mono font-bold text-ink tracking-widest">{room.state?.code}</span>
      {room.isHost && (
        <span className="text-ink-muted">Tieni aperta questa scheda: se la chiudi la stanza si ferma</span>
      )}
      <button type="button" onClick={() => void room.leave()} className="ml-auto btn-ghost !py-1 text-sm">
        Esci
      </button>
    </div>
  );
}
