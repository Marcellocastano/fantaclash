import { useEffect, useRef, useState } from 'react';
import { normalizeRoomCode } from '../../multiplayer/roomCode';
import { MAX_TEAM_NAME_LENGTH, randomTeamName } from '../../mock/teamNames';
import { LEGENDS_ID, loadSeasonIndex } from '../../services/seasons';
import { ListoneMode, ListoneModePicker } from '../ListoneModePicker';
import { CUP_NAME_MAX, MAX_PLAYERS, NICKNAME_MAX } from '../../multiplayer/constants';
import { isOffensiveName } from '../../multiplayer/moderation';
import { Icon } from '../Icon';
import { loadSavedNickname, loadSavedTeamName, saveRoomProfile } from './storage';
import { CreateRoomInput, JoinOutcome, JoinRoomInput } from './RoomProvider';
import { RejectReason } from '../../multiplayer/protocol';
import { isCapacityError } from '../../multiplayer/errors';
import { TeamBadge } from '../tournament/TeamBadge';
import { CatalogKey } from '../../i18n/translate';
import { useT } from '../../i18n/I18nProvider';

/** Motivi di rifiuto mostrati come toast (name_taken e not_found restano sui campi) */
const JOIN_TOAST: Partial<Record<RejectReason | 'not_found' | 'unavailable', CatalogKey>> = {
  full: 'room.reject.full',
  started: 'room.reject.started',
  kicked: 'room.reject.kicked',
  protocol: 'room.reject.protocol',
  bad_token: 'room.reject.badToken',
  unavailable: 'room.entry.toastUnavailable',
};

/** Toast di form: fisso in basso, si chiude da solo */
function JoinToast({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50">
      <div
        role="alert"
        className="bg-ink text-canvas border-2 border-ink shadow-block px-4 py-3 font-semibold flex items-center gap-3 motion-safe:animate-drop"
      >
        <span className="w-1.5 self-stretch bg-danger" aria-hidden="true" />
        {text}
        <button type="button" aria-label={t('room.entry.closeToast')} onClick={onClose} className="ml-2 shrink-0">
          <Icon name="cross" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Schermata d'ingresso: due schede — Crea stanza / Entra con codice */
export function EntryScreen({
  initialView,
  initialCode,
  initialSpectator = false,
  hasIdentity,
  onCreate,
  onJoin,
}: {
  initialView: 'crea' | 'entra';
  initialCode: string | null;
  initialSpectator?: boolean;
  hasIdentity: boolean;
  onCreate: (input: CreateRoomInput) => Promise<void>;
  onJoin: (input: JoinRoomInput) => Promise<JoinOutcome>;
}) {
  const t = useT();
  const [view, setView] = useState<'crea' | 'entra'>(initialView);
  const [nickname, setNickname] = useState(loadSavedNickname);
  const [teamName, setTeamName] = useState(() => loadSavedTeamName() || randomTeamName());
  const [code, setCode] = useState(initialCode ?? '');
  const [season, setSeason] = useState('');
  const [mode, setMode] = useState<ListoneMode>('classic');
  const [cupName, setCupName] = useState('');
  const [asSpectator, setAsSpectator] = useState(initialSpectator);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const teamRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSeasonIndex()
      .then(list => {
        // Annata iniziale a caso: quella vera si sceglie nella lobby
        setSeason(s => s || list[Math.floor(Math.random() * list.length)].season);
      })
      .catch(() => setError(t('room.entry.seasonsFail')));
  }, [t]);

  const codeOk = normalizeRoomCode(code) !== null;

  const submitCreate = async () => {
    const listone = mode === 'legends' ? LEGENDS_ID : season;
    if (!nickname.trim() || !teamName.trim() || !listone) {
      setError(t('room.entry.needAll'));
      return;
    }
    if (cupName.trim() && isOffensiveName(cupName)) {
      setError(t('room.entry.cupOffensive'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      saveRoomProfile(nickname.trim(), teamName.trim());
      await onCreate({
        nickname: nickname.trim(),
        teamName: teamName.trim(),
        settings: { season: listone, difficulty: 'normale', cupName: cupName.trim() || undefined },
      });
    } catch (e) {
      setError(
        isCapacityError(e)
          ? t('room.entry.toastUnavailable')
          : e instanceof Error ? e.message : t('room.entry.createFail')
      );
      setBusy(false);
    }
  };

  // Esito del join: errori mirati sui campi o toast, senza lasciare il form
  const applyOutcome = (reason: RejectReason | 'not_found' | 'unavailable') => {
    if (reason === 'name_taken') {
      setTeamError(true);
      teamRef.current?.focus();
    } else if (reason === 'invalid') {
      setError(t('room.reject.invalid'));
    } else if (reason === 'not_found') {
      setCodeError(true);
      setToast(t('room.entry.toastNotFound'));
    } else {
      setToast(t(reason === 'full' && asSpectator ? 'room.entry.toastTooManySpectators' : JOIN_TOAST[reason] ?? 'room.entry.toastGeneric'));
    }
  };

  const tryJoin = async (input: JoinRoomInput) => {
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const outcome = await onJoin(input);
      if (!outcome.ok) applyOutcome(outcome.reason);
    } catch (e) {
      setError(
        isCapacityError(e)
          ? t('room.entry.toastUnavailable')
          : e instanceof Error ? e.message : t('room.entry.connectFail')
      );
    }
    setBusy(false);
  };

  const submitJoin = async () => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      setError(t('room.entry.codeInvalidFull'));
      return;
    }
    if (!asSpectator && (!nickname.trim() || !teamName.trim())) {
      setError(t('room.entry.needJoin'));
      return;
    }
    saveRoomProfile(nickname.trim(), teamName.trim());
    await tryJoin({
      code: normalized,
      nickname: nickname.trim() || t('room.entry.spectatorNick'),
      teamName: teamName.trim(),
      role: asSpectator ? 'spectator' : 'player',
    });
  };

  const ticketCls = (tab: 'crea' | 'entra') => {
    const active = view === tab;
    const activeCls = tab === 'crea' ? 'bg-pitch-deep text-canvas shadow-block -rotate-1' : 'bg-highlight text-on-highlight shadow-block rotate-1';
    return `border-2 border-ink px-4 py-3 font-display text-xl font-extrabold text-left transition-transform duration-150 ${
      active ? activeCls : 'bg-canvas text-ink-soft hover:-translate-y-0.5'
    }`;
  };

  const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-1', '-rotate-2', 'rotate-2', '-rotate-1'];
  const showRejoin = hasIdentity && initialCode && initialCode === normalizeRoomCode(code);

  return (
    <div className="relative grid lg:grid-cols-2 bg-canvas border-4 border-ink shadow-block-lg">
      {/* Dorso dell'album con le cuciture */}
      <span className="hidden lg:block absolute inset-y-0 left-1/2 w-5 -ml-2.5 bg-pitch-deep border-x-2 border-ink" aria-hidden="true">
        <span className="absolute inset-y-3 left-1/2 border-l-2 border-dashed border-canvas/40" />
      </span>

      <div className="p-5 sm:p-8 lg:pr-12">
        <p className="font-semibold text-ink-soft">{t('room.entry.subtitle', { max: MAX_PLAYERS })}</p>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.85] mt-2 break-words">
          MULTI<span className="text-pitch">PLAYER</span>
        </h1>
        <p className="text-lg text-ink-soft mt-5">
          {t('room.entry.intro')}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button type="button" aria-label={t('room.entry.createTab')} onClick={() => setView('crea')} className={ticketCls('crea')}>
            {t('room.entry.createTab')}
            <span className="block text-sm font-semibold opacity-80 font-sans">{t('room.entry.createHint')}</span>
          </button>
          <button type="button" aria-label={t('room.entry.joinTab')} onClick={() => setView('entra')} className={ticketCls('entra')}>
            {t('room.entry.joinTab')}
            <span className="block text-sm font-semibold opacity-80 font-sans">{t('room.entry.joinHint')}</span>
          </button>
        </div>

        {/* Etichetta dell'album: il form */}
        <div className="mt-4 border-2 border-ink p-1 sm:p-1.5 bg-canvas">
          <div className="border-2 border-dashed border-line-strong p-3 sm:p-5 space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="mp-nick" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                {t('room.entry.nickname')}{asSpectator && <span className="font-semibold text-sm text-ink-muted"> {t('room.entry.optional')}</span>}
              </label>
              <input
                id="mp-nick"
                type="text"
                value={nickname}
                maxLength={NICKNAME_MAX}
                disabled={busy}
                onChange={e => setNickname(e.target.value)}
                placeholder={asSpectator ? t('room.entry.spectatorNick') : t('room.entry.nickPlaceholder')}
                className="input-field"
              />
            </div>

            {!asSpectator && (
              <div>
                <label htmlFor="mp-team" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                  {t(view === 'crea' ? 'room.entry.yourTeam' : 'room.entry.teamName')}
                </label>
                <div className="relative">
                  <input
                    id="mp-team"
                    ref={teamRef}
                    type="text"
                    value={teamName}
                    maxLength={MAX_TEAM_NAME_LENGTH + 10}
                    disabled={busy}
                    aria-invalid={teamError || undefined}
                    onChange={e => {
                      setTeamName(e.target.value);
                      setTeamError(false);
                    }}
                    className={`input-field font-display text-xl sm:text-2xl font-extrabold py-2 sm:py-3 pr-10 ${teamError ? 'input-error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setTeamName(c => randomTeamName(c))}
                    title={t('room.entry.genName')}
                    aria-label={t('room.entry.genName')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink transition-colors duration-150"
                  >
                    <Icon name="reset" className="w-4 h-4" />
                  </button>
                </div>
                {teamError && <p className="mt-2 text-sm text-danger">{t('room.entry.teamTaken')}</p>}
              </div>
            )}

            {view === 'crea' ? (
              <>
                <div>
                  <label htmlFor="mp-cup" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                    {t('room.entry.cupName')} <span className="font-semibold text-sm text-ink-muted">{t('room.entry.optional')}</span>
                  </label>
                  <input
                    id="mp-cup"
                    type="text"
                    value={cupName}
                    maxLength={CUP_NAME_MAX + 10}
                    onChange={e => setCupName(e.target.value)}
                    placeholder="FantaClash Cup"
                    className="input-field"
                  />
                  <p className="mt-1.5 text-sm text-ink-muted">{t('room.entry.cupHint')}</p>
                </div>
                <div>
                  <p className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">{t('room.entry.listone')}</p>
                  <ListoneModePicker value={mode} onChange={setMode} disabled={busy} />
                  <p className="mt-1.5 text-sm text-ink-muted">{t('room.entry.listoneHint')}</p>
                </div>
                <button type="button" onClick={submitCreate} disabled={busy || (mode === 'classic' && !season)} className="btn-cta w-full text-xl sm:text-3xl py-3 sm:py-5">
                  {busy ? t('room.entry.creating') : t('room.entry.create')}
                  <Icon name="arrow" className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="mp-code" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                    {t('room.entry.code')}
                  </label>
                  <input
                    id="mp-code"
                    type="text"
                    value={code}
                    maxLength={8}
                    autoCapitalize="characters"
                    disabled={busy}
                    aria-invalid={codeError || undefined}
                    onChange={e => {
                      setCode(e.target.value.toUpperCase());
                      setCodeError(false);
                    }}
                    placeholder="ABCDE"
                    className={`input-field font-display text-3xl tracking-[0.3em] ${(code && !codeOk) || codeError ? 'input-error' : ''}`}
                  />
                  {code && !codeOk && (
                    <p className="mt-2 text-sm text-danger">{t('room.entry.codeInvalid')}</p>
                  )}
                </div>
                {showRejoin && (
                  <button
                    type="button"
                    onClick={() =>
                      void tryJoin({
                        code: initialCode,
                        nickname: nickname.trim() || 'Giocatore',
                        teamName: teamName.trim() || 'Squadra',
                        role: 'player',
                      })
                    }
                    disabled={busy}
                    className="btn-cta w-full text-xl sm:text-3xl py-3 sm:py-5"
                  >
                    {busy && <Icon name="ball" className="w-5 h-5 motion-safe:animate-spin" />}
                    {busy ? t('room.entry.joining') : t('room.entry.rejoin')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitJoin}
                  disabled={busy || !codeOk || (!asSpectator && !nickname.trim())}
                  className={showRejoin ? 'btn-ghost w-full' : 'btn-cta w-full text-xl sm:text-3xl py-3 sm:py-5'}
                >
                  {busy ? (
                    <Icon name="ball" className="w-5 h-5 motion-safe:animate-spin" />
                  ) : (
                    <Icon name="arrow" className="w-5 h-5" />
                  )}
                  {busy ? t('room.entry.joining') : asSpectator ? t('room.entry.watch') : t('room.entry.join')}
                </button>
                <button
                  type="button"
                  onClick={() => setAsSpectator(s => !s)}
                  className="w-full text-center text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  {asSpectator ? t('room.entry.asPlayer') : t('room.entry.asSpectator')}
                </button>
              </>
            )}
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            {toast && <JoinToast text={toast} onClose={() => setToast(null)} />}
          </div>
        </div>
      </div>

      {/* Pagina destra: anteprima dei posti della stanza */}
      <div className="hidden lg:block p-8 lg:pl-12">
        <h2 className="font-display text-3xl font-black">{t('room.entry.previewTitle')}</h2>
        <p className="text-ink-soft">{t('room.entry.previewSeats')}</p>
        <p className="text-ink-soft">{t('room.entry.previewListone')}</p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {TILTS.map((tilt, i) => (
            <div key={i} className={tilt}>
              <div
                className={`border-2 p-3 text-center motion-safe:animate-drop ${
                  i === 0 ? 'bg-canvas border-pitch shadow-block-sm' : i < 4 ? 'border-dashed border-ink bg-surface' : 'border-ink bg-canvas'
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {i === 0 ? (
                  <>
                    <div className="flex justify-center"><TeamBadge team={{ name: teamName || t('room.entry.yourTeamFallback'), isUserTeam: true }} size="md" /></div>
                    <p className="mt-2 font-display font-extrabold text-ink truncate" title={teamName}>{teamName || t('room.entry.yourTeamFallback')}</p>
                    <p className="text-sm font-semibold text-ink-muted truncate">{nickname.trim() || t('room.entry.you')}</p>
                  </>
                ) : i < 4 ? (
                  <>
                    <p className="font-display font-extrabold text-ink-muted">{t('room.entry.friend')}</p>
                    <p className="text-sm font-semibold text-ink-muted">{t('room.entry.freeSeat')}</p>
                  </>
                ) : (
                  <>
                    <p className="inline-block border-2 border-ink bg-surface px-1.5 font-display font-black text-ink-muted">{t('room.entry.bot')}</p>
                    <p className="mt-1.5 text-sm font-semibold text-ink-muted">{t('room.entry.botJoins')}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
