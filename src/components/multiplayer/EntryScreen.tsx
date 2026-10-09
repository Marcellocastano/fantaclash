import { useEffect, useRef, useState } from 'react';
import { normalizeRoomCode } from '../../multiplayer/roomCode';
import { MAX_TEAM_NAME_LENGTH, randomTeamName } from '../../mock/teamNames';
import { loadSeasonIndex } from '../../services/seasons';
import { CUP_NAME_MAX, MAX_PLAYERS, NICKNAME_MAX } from '../../multiplayer/constants';
import { isOffensiveName } from '../../multiplayer/moderation';
import { Icon } from '../Icon';
import { loadSavedNickname, loadSavedTeamName, saveRoomProfile } from './storage';
import { CreateRoomInput, JoinOutcome, JoinRoomInput } from './RoomProvider';
import { RejectReason } from '../../multiplayer/protocol';
import { TeamBadge } from '../tournament/TeamBadge';

/** Motivi di rifiuto mostrati come toast (name_taken e not_found restano sui campi) */
const JOIN_TOAST: Partial<Record<RejectReason | 'not_found', string>> = {
  full: 'La stanza è piena.',
  started: 'La partita è già iniziata.',
  kicked: 'Sei stato espulso da questa stanza.',
  protocol: 'La stanza usa una versione diversa: ricarica la pagina.',
  bad_token: "Questo browser ha già un'altra identità per la stanza.",
};

/** Toast di form: fisso in basso, si chiude da solo */
function JoinToast({ text, onClose }: { text: string; onClose: () => void }) {
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
        <button type="button" aria-label="Chiudi" onClick={onClose} className="ml-2 shrink-0">
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
  const [view, setView] = useState<'crea' | 'entra'>(initialView);
  const [nickname, setNickname] = useState(loadSavedNickname);
  const [teamName, setTeamName] = useState(() => loadSavedTeamName() || randomTeamName());
  const [code, setCode] = useState(initialCode ?? '');
  const [season, setSeason] = useState('');
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
      .catch(() => setError('Impossibile caricare le stagioni'));
  }, []);

  const codeOk = normalizeRoomCode(code) !== null;

  const submitCreate = async () => {
    if (!nickname.trim() || !teamName.trim() || !season) {
      setError('Servono nickname, nome squadra e annata');
      return;
    }
    if (cupName.trim() && isOffensiveName(cupName)) {
      setError('Nome della coppa non consentito: scegline un altro');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      saveRoomProfile(nickname.trim(), teamName.trim());
      await onCreate({
        nickname: nickname.trim(),
        teamName: teamName.trim(),
        settings: { season, difficulty: 'normale', cupName: cupName.trim() || undefined },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nella creazione della stanza');
      setBusy(false);
    }
  };

  // Esito del join: errori mirati sui campi o toast, senza lasciare il form
  const applyOutcome = (reason: RejectReason | 'not_found') => {
    if (reason === 'name_taken') {
      setTeamError(true);
      teamRef.current?.focus();
    } else if (reason === 'invalid') {
      setError('Nome non consentito: scegline un altro.');
    } else if (reason === 'not_found') {
      setCodeError(true);
      setToast('Codice non corretto: nessuna stanza attiva con questo codice.');
    } else {
      setToast(reason === 'full' && asSpectator ? 'Troppi spettatori in questa stanza.' : JOIN_TOAST[reason] ?? 'Non sei entrato nella stanza.');
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
      setError(e instanceof Error ? e.message : 'Errore di connessione');
    }
    setBusy(false);
  };

  const submitJoin = async () => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      setError('Codice non valido: 5 lettere/cifre (es. ABCDE)');
      return;
    }
    if (!asSpectator && (!nickname.trim() || !teamName.trim())) {
      setError('Servono nickname e nome squadra');
      return;
    }
    saveRoomProfile(nickname.trim(), teamName.trim());
    await tryJoin({
      code: normalized,
      nickname: nickname.trim() || 'Spettatore',
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
        <p className="font-semibold text-ink-soft">Fino a {MAX_PLAYERS} giocatori · asta e torneo in diretta</p>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.85] mt-2 break-words">
          MULTI<span className="text-pitch">PLAYER</span>
        </h1>
        <p className="text-lg text-ink-soft mt-5">
          Crea una stanza, manda il link agli amici e sfidatevi all'asta in diretta. I posti liberi vanno ai bot.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button type="button" aria-label="Crea stanza" onClick={() => setView('crea')} className={ticketCls('crea')}>
            Crea stanza
            <span className="block text-sm font-semibold opacity-80 font-sans">Sei l'host</span>
          </button>
          <button type="button" aria-label="Entra con codice" onClick={() => setView('entra')} className={ticketCls('entra')}>
            Entra con codice
            <span className="block text-sm font-semibold opacity-80 font-sans">Hai un codice</span>
          </button>
        </div>

        {/* Etichetta dell'album: il form */}
        <div className="mt-4 border-2 border-ink p-1 sm:p-1.5 bg-canvas">
          <div className="border-2 border-dashed border-line-strong p-3 sm:p-5 space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="mp-nick" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                Nickname{asSpectator && <span className="font-semibold text-sm text-ink-muted"> (facoltativo)</span>}
              </label>
              <input
                id="mp-nick"
                type="text"
                value={nickname}
                maxLength={NICKNAME_MAX}
                disabled={busy}
                onChange={e => setNickname(e.target.value)}
                placeholder={asSpectator ? 'Spettatore' : 'Es. Marco'}
                className="input-field"
              />
            </div>

            {!asSpectator && (
              <div>
                <label htmlFor="mp-team" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                  {view === 'crea' ? 'La tua squadra' : 'Nome squadra'}
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
                    title="Genera un nome"
                    aria-label="Genera un nome"
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink transition-colors duration-150"
                  >
                    <Icon name="reset" className="w-4 h-4" />
                  </button>
                </div>
                {teamError && <p className="mt-2 text-sm text-danger">Nome già in uso da un altro utente</p>}
              </div>
            )}

            {view === 'crea' ? (
              <>
                <div>
                  <label htmlFor="mp-cup" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                    Nome della coppa <span className="font-semibold text-sm text-ink-muted">(facoltativo)</span>
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
                  <p className="mt-1.5 text-sm text-ink-muted">Il nome del torneo: compare nel sorteggio, nel tabellone e nella card finale.</p>
                </div>
                <button type="button" onClick={submitCreate} disabled={busy || !season} className="btn-cta w-full text-xl sm:text-3xl py-3 sm:py-5">
                  {busy ? 'Creazione…' : 'Crea stanza'}
                  <Icon name="arrow" className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="mp-code" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                    Codice stanza
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
                    <p className="mt-2 text-sm text-danger">Codice non valido</p>
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
                    {busy ? 'Entro…' : 'Rientra nella stanza'}
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
                  {busy ? 'Entro…' : asSpectator ? 'Guarda la stanza' : 'Entra nella stanza'}
                </button>
                <button
                  type="button"
                  onClick={() => setAsSpectator(s => !s)}
                  className="w-full text-center text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  {asSpectator ? 'Entra come giocatore' : 'Guarda come spettatore'}
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
        <h2 className="font-display text-3xl font-black">La tua stanza</h2>
        <p className="text-ink-soft">8 posti: chi non arriva viene sostituito da un bot.</p>
        <p className="text-ink-soft">L'annata la scegli nella stanza, prima di avviare l'asta.</p>
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
                    <div className="flex justify-center"><TeamBadge team={{ name: teamName || 'La tua squadra', isUserTeam: true }} size="md" /></div>
                    <p className="mt-2 font-display font-extrabold text-ink truncate" title={teamName}>{teamName || 'La tua squadra'}</p>
                    <p className="text-sm font-semibold text-ink-muted truncate">{nickname.trim() || 'Tu'}</p>
                  </>
                ) : i < 4 ? (
                  <>
                    <p className="font-display font-extrabold text-ink-muted">Amico</p>
                    <p className="text-sm font-semibold text-ink-muted">posto libero</p>
                  </>
                ) : (
                  <>
                    <p className="inline-block border-2 border-ink bg-surface px-1.5 font-display font-black text-ink-muted">BOT</p>
                    <p className="mt-1.5 text-sm font-semibold text-ink-muted">si unisce all'avvio</p>
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
