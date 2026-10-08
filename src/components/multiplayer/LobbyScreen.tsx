import { useState } from 'react';
import { DifficultyLevel } from '../../types';
import { MAX_PLAYERS, MIN_HUMANS } from '../../multiplayer/constants';
import { DifficultyPicker } from '../DifficultyPicker';
import { Icon } from '../Icon';
import { useRoom } from './RoomProvider';


/** Lobby della stanza: codice, posti, impostazioni, ready, avvio */
export function LobbyScreen({
  spectatorCount,
  onStart,
  starting,
}: {
  spectatorCount: number;
  onStart: () => void;
  starting: boolean;
}) {
  const room = useRoom();
  const state = room.state!;
  const [copied, setCopied] = useState<string | null>(null);
  const me = state.players.find(p => p.id === room.me);
  const isPlayer = room.role === 'player' || room.isHost;

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard non disponibile
    }
  };

  const playerLink = `${window.location.origin}/multiplayer/?codice=${state.code}`;
  const spectatorLink = `${playerLink}&vista=spettatore`;

  const humans = state.players.length;
  const canStart =
    room.isHost &&
    (import.meta.env.DEV ? humans >= 1 : humans >= MIN_HUMANS) &&
    (state.settings.fillWithBots || humans >= MAX_PLAYERS);
  const startReason = !state.settings.fillWithBots && humans < MAX_PLAYERS
    ? `Servono ${MAX_PLAYERS} giocatori oppure attiva "Completa con bot"`
    : humans < (import.meta.env.DEV ? 1 : MIN_HUMANS)
      ? `Servono almeno ${MIN_HUMANS} giocatori`
      : null;

  const setReady = (ready: boolean) => room.sendIntent({ type: 'READY', ready });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {room.isHost && (
        <p className="text-sm text-ink-soft border-l-4 border-highlight pl-3" role="note">
          Tieni aperta questa scheda: se la chiudi la stanza si ferma.
        </p>
      )}

      {/* Codice e inviti */}
      <div className="panel p-4 sm:p-6 text-center space-y-3">
        <p className="label">Codice stanza</p>
        <p className="font-display text-5xl sm:text-7xl font-black tracking-[0.2em] text-ink">{state.code}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={() => copy('codice', state.code)}>
            {copied === 'codice' ? 'Copiato' : 'Copia codice'}
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => copy('link', playerLink)}>
            {copied === 'link' ? 'Copiato' : 'Copia link giocatori'}
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => copy('spett', spectatorLink)}>
            {copied === 'spett' ? 'Copiato' : 'Copia link spettatori'}
          </button>
        </div>
      </div>

      {/* Posti */}
      <div className="panel p-4 sm:p-6">
        <p className="label mb-3">Giocatori {humans}/{MAX_PLAYERS} · Spettatori {spectatorCount}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {state.players.map(p => (
            <li key={p.id} className="border-2 border-ink/20 px-3 py-2 flex items-center gap-2 min-h-12">
              <span
                className={`w-2.5 h-2.5 shrink-0 rounded-full ${p.connected ? 'bg-pitch' : 'bg-ink-faint'}`}
                title={p.connected ? 'Connesso' : 'Disconnesso'}
              />
              <span className="font-display font-extrabold text-ink truncate">
                {p.nickname}
                {p.id === state.hostId && (
                  <span className="ml-1 shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">Host</span>
                )}
              </span>
              <span className="text-sm text-ink-soft truncate">{p.teamName}</span>
              {p.ready && (
                <span className="ml-auto shrink-0 text-xs font-bold bg-pitch text-canvas px-2 py-0.5">Pronto</span>
              )}
              {room.isHost && p.id !== state.hostId && (
                <button
                  type="button"
                  onClick={() => room.kick(p.id)}
                  className={`${p.ready ? '' : 'ml-auto '}shrink-0 text-xs font-bold text-danger hover:underline`}
                >
                  Espelli
                </button>
              )}
            </li>
          ))}
        </ul>
        {/* Posti vuoti: una sola riga riassuntiva */}
        {humans < MAX_PLAYERS && (
          <p className="mt-3 text-sm text-ink-faint font-semibold">
            {state.settings.fillWithBots
              ? `${MAX_PLAYERS - humans} ${MAX_PLAYERS - humans === 1 ? 'posto' : 'posti'} ai bot`
              : `${MAX_PLAYERS - humans} ${MAX_PLAYERS - humans === 1 ? 'posto libero' : 'posti liberi'}`}
          </p>
        )}
      </div>

      {/* Impostazioni */}
      <div className="panel p-4 sm:p-6 space-y-4">
        <p className="label">Impostazioni</p>
        <div className="flex items-baseline gap-3">
          <span className="font-semibold text-ink-soft w-28">Annata</span>
          <span className="font-display font-extrabold text-ink text-xl">Serie A {state.settings.season}</span>
        </div>
        <div>
          <p className="font-semibold text-ink-soft mb-1.5">Bot avversari</p>
          {room.isHost ? (
            <DifficultyPicker
              value={state.settings.difficulty}
              onChange={(d: DifficultyLevel) => room.updateSettings({ difficulty: d })}
            />
          ) : (
            <p className="font-display font-extrabold text-ink text-xl capitalize">{state.settings.difficulty}</p>
          )}
        </div>
        <label className={`flex items-center gap-3 font-semibold text-ink ${room.isHost ? 'cursor-pointer' : ''}`}>
          <input
            type="checkbox"
            checked={state.settings.fillWithBots}
            disabled={!room.isHost}
            onChange={e => room.updateSettings({ fillWithBots: e.target.checked })}
            className="w-5 h-5 accent-[rgb(var(--c-pitch))]"
          />
          Completa con bot i posti liberi
        </label>
      </div>

      {/* Azioni */}
      <div className="space-y-3">
        {isPlayer && me && (
          <button
            type="button"
            onClick={() => setReady(!me.ready)}
            className={`${me.ready ? 'btn-ghost' : 'btn-primary'} w-full text-xl py-3`}
          >
            {me.ready ? 'Pronto — tocca per annullare' : 'Sono pronto'}
          </button>
        )}
        {room.isHost && (
          <div>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart || starting}
              className="btn-cta w-full text-xl py-3"
            >
              {starting ? 'Caricamento listone…' : 'Avvia l’asta'}
              <Icon name="arrow" className="w-5 h-5" />
            </button>
            {!canStart && startReason && <p className="mt-2 text-sm text-ink-soft">{startReason}</p>}
          </div>
        )}
        <button type="button" onClick={() => void room.leave()} className="btn-ghost w-full text-sm">
          Esci dalla stanza
        </button>
      </div>
    </div>
  );
}
