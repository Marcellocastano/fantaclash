import { useEffect, useState } from 'react';
import { MAX_PLAYERS, MIN_HUMANS } from '../../multiplayer/constants';
import { TOURNAMENT_NAME } from '../../domain/tournament';
import { loadSeasonIndex, SeasonInfo } from '../../services/seasons';
import { Icon } from '../Icon';
import { SeasonPicker } from '../SeasonPicker';
import { TeamBadge } from '../tournament/TeamBadge';
import { useRoom } from './RoomProvider';
import { RoomExitLink } from './RoomExitLink';

/** Inclinazioni alternate delle lettere del codice (classi letterali) */
const TILE_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-2'];

/** Lobby della stanza: biglietto col codice, posti, avvio */
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
  const [seasons, setSeasons] = useState<SeasonInfo[] | null>(null);

  // L'host sceglie l'annata nella stanza; gli altri la vedono nel chip
  useEffect(() => {
    if (!room.isHost) return;
    loadSeasonIndex()
      .then(setSeasons)
      .catch(() => setSeasons(null));
  }, [room.isHost]);

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
  const emptySeats = MAX_PLAYERS - humans;
  const canStart =
    room.isHost &&
    (import.meta.env.DEV ? humans >= 1 : humans >= MIN_HUMANS);
  const startReason =
    humans < (import.meta.env.DEV ? 1 : MIN_HUMANS)
      ? `Servono almeno ${MIN_HUMANS} giocatori`
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Biglietto stanza */}
      <section className="bg-pitch-deep text-canvas border-2 border-ink shadow-block p-5 sm:p-8 text-center">
        <p className="font-display text-lg font-extrabold text-canvas/80">Codice stanza</p>
        <p className="mt-3 flex justify-center gap-1.5 sm:gap-2" aria-label={`Codice ${state.code}`}>
          {state.code.split('').map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`w-12 h-14 sm:w-16 sm:h-20 inline-flex items-center justify-center bg-canvas text-ink border-2 border-ink shadow-block-sm font-display text-4xl sm:text-6xl font-black ${TILE_TILTS[i % TILE_TILTS.length]}`}
            >
              {ch}
            </span>
          ))}
        </p>
        <p className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-highlight text-on-highlight border-2 border-ink px-3 py-1 font-display font-extrabold text-lg">
            <Icon name="trophy" className="w-4 h-4" aria-hidden="true" />
            {state.settings.cupName ?? TOURNAMENT_NAME}
          </span>
          {(!room.isHost || !seasons) && (
            <span className="inline-block border-2 border-canvas/50 px-3 py-1 font-display font-bold text-lg text-canvas">
              Serie A {state.settings.season}
            </span>
          )}
        </p>
        {room.isHost && seasons && (
          <div className="mt-5 max-w-md mx-auto text-left">
            <p className="font-display text-lg font-extrabold text-canvas/80 mb-2 text-center">Annata del listone</p>
            {/* Le etichette interne del picker sono inchiostro: scatola crema */}
            <div className="bg-canvas border-2 border-ink p-3">
              <SeasonPicker
                seasons={seasons}
                value={state.settings.season}
                onChange={season => room.updateSettings({ season })}
                disabled={starting}
              />
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => copy('link', playerLink)}
          >
            <Icon name="copy" className="w-4 h-4" />
            {copied === 'link' ? 'Copiato' : 'Copia link d’invito'}
          </button>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            <button
              type="button"
              className="font-semibold text-canvas underline underline-offset-4 hover:text-highlight transition-colors duration-150"
              onClick={() => copy('codice', state.code)}
            >
              {copied === 'codice' ? 'Copiato' : 'Copia codice'}
            </button>
            <button
              type="button"
              className="font-semibold text-canvas underline underline-offset-4 hover:text-highlight transition-colors duration-150"
              onClick={() => copy('spett', spectatorLink)}
            >
              {copied === 'spett' ? 'Copiato' : 'Link spettatori'}
            </button>
          </div>
        </div>
        {room.isHost && (
          <p className="mt-5 text-sm text-canvas/70">
            Tieni aperta questa scheda: se la chiudi la stanza si ferma.
          </p>
        )}
      </section>

      {/* Posti */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="section-heading">
            Giocatori {humans}/{MAX_PLAYERS}
          </h2>
          <span className="text-sm text-ink-muted">Spettatori {spectatorCount}</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {state.players.map(p => {
            const mine = p.id === room.me;
            return (
              <li
                key={p.id}
                className={`border-2 px-3 py-2.5 flex items-center gap-2.5 min-w-0 ${
                  mine ? 'border-pitch bg-canvas shadow-block-sm' : 'border-ink bg-canvas'
                }`}
              >
                <TeamBadge
                  team={{ name: p.teamName, isUserTeam: mine }}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display font-extrabold text-ink truncate">{p.nickname}</span>
                    {p.id === state.hostId && (
                      <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">Host</span>
                    )}
                    {mine && (
                      <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">Tu</span>
                    )}
                  </span>
                  <span className="block text-sm text-ink-soft truncate">{p.teamName}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <span
                      className={`w-2 h-2 rounded-full ${p.connected ? 'bg-pitch' : 'bg-ink-faint'}`}
                      aria-hidden="true"
                    />
                    {p.connected ? 'online' : 'offline'}
                  </span>
                </span>
                {room.isHost && p.id !== state.hostId && (
                  <button
                    type="button"
                    onClick={() => room.kick(p.id)}
                    className="link-action shrink-0 text-danger"
                  >
                    Espelli
                  </button>
                )}
              </li>
            );
          })}
          {/* Posti liberi: scatole tratteggiate da sm in su, riga unica su mobile */}
          {Array.from({ length: emptySeats }, (_, i) => (
            <li
              key={`empty-${i}`}
              className="hidden sm:flex border-2 border-dashed border-line-strong px-3 py-2.5 flex-col items-center justify-center gap-0.5 min-h-16"
            >
              <span className="font-display font-extrabold text-ink-muted">Bot</span>
              <span className="text-xs text-ink-faint">posto libero</span>
            </li>
          ))}
        </ul>
        {emptySeats > 0 && (
          <p className="sm:hidden mt-3 text-sm text-ink-faint font-semibold">
            {emptySeats} {emptySeats === 1 ? 'posto' : 'posti'} ai bot
          </p>
        )}
      </section>

      {/* Azioni */}
      <div className="space-y-4">
        {room.isHost ? (
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
        ) : (
          <div className="panel p-5 text-center">
            <p className="inline-flex items-center gap-2 font-display font-extrabold text-ink text-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-highlight motion-safe:animate-pulse" aria-hidden="true" />
              In attesa che l'host avvii l'asta
            </p>
          </div>
        )}
        <div className="text-center">
          <RoomExitLink />
        </div>
      </div>
    </div>
  );
}
