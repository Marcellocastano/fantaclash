import { useEffect, useRef, useState } from 'react';
import { MAX_PLAYERS, MIN_HUMANS } from '../../multiplayer/constants';
import { TOURNAMENT_NAME } from '../../domain/tournament';
import { isLegends, LEGENDS_ID, listoneLabel, loadSeasonIndex, SeasonInfo } from '../../services/seasons';
import { useT } from '../../i18n/I18nProvider';
import { Icon } from '../Icon';
import { ListoneMode, ListoneModePicker } from '../ListoneModePicker';
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
  const t = useT();
  const room = useRoom();
  const state = room.state!;
  const [copied, setCopied] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<SeasonInfo[] | null>(null);
  // Ultima annata "vera" scelta: tornando a Classica la si ripristina
  const lastSeason = useRef(isLegends(state.settings.season) ? '' : state.settings.season);

  // L'host sceglie il listone nella stanza; gli altri lo vedono nel chip
  useEffect(() => {
    if (!room.isHost) return;
    loadSeasonIndex()
      .then(list => {
        setSeasons(list);
        lastSeason.current ||= list[Math.floor(Math.random() * list.length)]?.season ?? '';
      })
      .catch(() => setSeasons(null));
  }, [room.isHost]);

  const mode: ListoneMode = isLegends(state.settings.season) ? 'legends' : 'classic';
  const setMode = (m: ListoneMode) => {
    if (m === 'legends') {
      room.updateSettings({ season: LEGENDS_ID });
    } else if (lastSeason.current) {
      room.updateSettings({ season: lastSeason.current });
    }
  };
  const setSeason = (season: string) => {
    lastSeason.current = season;
    room.updateSettings({ season });
  };

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
      ? t('room.lobby.needPlayers', { min: MIN_HUMANS })
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Biglietto stanza */}
      <section className="bg-pitch-deep text-canvas border-2 border-ink shadow-block p-5 sm:p-8 text-center">
        <p className="font-display text-lg font-extrabold text-canvas/80">{t('room.lobby.code')}</p>
        <p className="mt-3 flex justify-center gap-1.5 sm:gap-2" aria-label={t('room.lobby.codeAria', { code: state.code })}>
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
              {listoneLabel(state.settings.season, t)}
            </span>
          )}
        </p>
        {room.isHost && seasons && (
          <div className="mt-5 max-w-md mx-auto text-left space-y-3">
            {/* Le etichette interne dei picker sono inchiostro: scatola crema */}
            <div className="bg-canvas border-2 border-ink p-3">
              <ListoneModePicker value={mode} onChange={setMode} disabled={starting} />
            </div>
            {mode === 'classic' && (
              <div className="bg-canvas border-2 border-ink p-3">
                <SeasonPicker
                  seasons={seasons}
                  value={state.settings.season}
                  onChange={setSeason}
                  disabled={starting}
                />
              </div>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => copy('link', playerLink)}
          >
            <Icon name="copy" className="w-4 h-4" />
            {copied === 'link' ? t('room.lobby.copied') : t('room.lobby.copyInvite')}
          </button>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            <button
              type="button"
              className="font-semibold text-canvas underline underline-offset-4 hover:text-highlight transition-colors duration-150"
              onClick={() => copy('codice', state.code)}
            >
              {copied === 'codice' ? t('room.lobby.copied') : t('room.lobby.copyCode')}
            </button>
            <button
              type="button"
              className="font-semibold text-canvas underline underline-offset-4 hover:text-highlight transition-colors duration-150"
              onClick={() => copy('spett', spectatorLink)}
            >
              {copied === 'spett' ? t('room.lobby.copied') : t('room.lobby.spectatorLink')}
            </button>
          </div>
        </div>
        {room.isHost && (
          <p className="mt-5 text-sm text-canvas/70">
            {t('room.lobby.keepOpen')}
          </p>
        )}
      </section>

      {/* Posti */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="section-heading">
            {t('room.lobby.players', { n: humans, max: MAX_PLAYERS })}
          </h2>
          <span className="text-sm text-ink-muted">{t('room.lobby.spectators', { n: spectatorCount })}</span>
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
                  team={{ name: p.teamName, isUserTeam: mine, kit: p.kit }}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display font-extrabold text-ink truncate">{p.nickname}</span>
                    {p.id === state.hostId && (
                      <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">{t('room.lobby.host')}</span>
                    )}
                    {mine && (
                      <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">{t('room.lobby.you')}</span>
                    )}
                  </span>
                  <span className="block text-sm text-ink-soft truncate">{p.teamName}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <span
                      className={`w-2 h-2 rounded-full ${p.connected ? 'bg-pitch' : 'bg-ink-faint'}`}
                      aria-hidden="true"
                    />
                    {p.connected ? t('room.lobby.online') : t('room.lobby.offline')}
                  </span>
                </span>
                {room.isHost && p.id !== state.hostId && (
                  <button
                    type="button"
                    onClick={() => room.kick(p.id)}
                    className="link-action shrink-0 text-danger"
                  >
                    {t('room.lobby.kick')}
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
              <span className="font-display font-extrabold text-ink-muted">{t('room.lobby.bot')}</span>
              <span className="text-xs text-ink-faint">{t('room.lobby.freeSeat')}</span>
            </li>
          ))}
        </ul>
        {emptySeats > 0 && (
          <p className="sm:hidden mt-3 text-sm text-ink-faint font-semibold">
            {t(emptySeats === 1 ? 'room.lobby.seatsOne' : 'room.lobby.seatsMany', { n: emptySeats })}
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
              {starting ? t('room.lobby.starting') : t('room.lobby.start')}
              <Icon name="arrow" className="w-5 h-5" />
            </button>
            {!canStart && startReason && <p className="mt-2 text-sm text-ink-soft">{startReason}</p>}
          </div>
        ) : (
          <div className="panel p-5 text-center">
            <p className="inline-flex items-center gap-2 font-display font-extrabold text-ink text-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-highlight motion-safe:animate-pulse" aria-hidden="true" />
              {t('room.lobby.waiting')}
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
