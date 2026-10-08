import { useEffect, useState } from 'react';
import { DifficultyLevel } from '../../types';
import { normalizeRoomCode } from '../../multiplayer/roomCode';
import { MAX_TEAM_NAME_LENGTH, randomTeamName } from '../../mock/teamNames';
import { loadSeasonIndex, SeasonInfo } from '../../services/seasons';
import { NICKNAME_MAX } from '../../multiplayer/constants';
import { DifficultyPicker } from '../DifficultyPicker';
import { SeasonPicker } from '../SeasonPicker';
import { Icon } from '../Icon';
import { loadSavedNickname, loadSavedTeamName, saveRoomProfile } from './storage';
import { CreateRoomInput, JoinRoomInput } from './RoomProvider';

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
  onJoin: (input: JoinRoomInput) => Promise<void>;
}) {
  const [view, setView] = useState<'crea' | 'entra'>(initialView);
  const [nickname, setNickname] = useState(loadSavedNickname);
  const [teamName, setTeamName] = useState(() => loadSavedTeamName() || randomTeamName());
  const [code, setCode] = useState(initialCode ?? '');
  const [season, setSeason] = useState('');
  const [seasons, setSeasons] = useState<SeasonInfo[] | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normale');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [asSpectator, setAsSpectator] = useState(initialSpectator);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonIndex()
      .then(list => {
        setSeasons(list);
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
    setBusy(true);
    setError(null);
    try {
      saveRoomProfile(nickname.trim(), teamName.trim());
      await onCreate({
        nickname: nickname.trim(),
        teamName: teamName.trim(),
        settings: { season, difficulty, fillWithBots },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nella creazione della stanza');
      setBusy(false);
    }
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
    setBusy(true);
    setError(null);
    try {
      saveRoomProfile(nickname.trim(), teamName.trim());
      await onJoin({
        code: normalized,
        nickname: nickname.trim() || 'Spettatore',
        teamName: teamName.trim(),
        role: asSpectator ? 'spectator' : 'player',
      });
      // se la sessione non è entrata, lo stato lo mostra il contenitore
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di connessione');
      setBusy(false);
    }
  };

  const cardCls = (active: boolean) =>
    `w-full text-left p-4 border-2 font-display font-extrabold text-lg transition-colors duration-150 ${
      active ? 'border-ink bg-ink text-canvas' : 'border-ink/30 text-ink-soft hover:border-ink'
    }`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setView('crea')} className={cardCls(view === 'crea')}>
          Crea stanza
        </button>
        <button type="button" onClick={() => setView('entra')} className={cardCls(view === 'entra')}>
          Entra con codice
        </button>
      </div>

      <div className="panel p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="mp-nick" className="block font-display text-lg font-extrabold text-ink mb-1.5">
            Nickname
          </label>
          <input
            id="mp-nick"
            type="text"
            value={nickname}
            maxLength={NICKNAME_MAX}
            onChange={e => setNickname(e.target.value)}
            placeholder="Es. Marco"
            className="input-field"
          />
        </div>

        {!asSpectator && (
          <div>
            <label htmlFor="mp-team" className="block font-display text-lg font-extrabold text-ink mb-1.5">
              {view === 'crea' ? 'La tua squadra' : 'Nome squadra'}
            </label>
            <div className="relative">
              <input
                id="mp-team"
                type="text"
                value={teamName}
                maxLength={MAX_TEAM_NAME_LENGTH + 10}
                onChange={e => setTeamName(e.target.value)}
                className="input-field pr-10"
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
          </div>
        )}

        {view === 'crea' ? (
          <>
            <div>
              <p className="block font-display text-lg font-extrabold text-ink mb-1.5">Annata del listone</p>
              {seasons ? (
                <SeasonPicker seasons={seasons} value={season} onChange={setSeason} />
              ) : (
                <p className="border-2 border-ink px-4 py-5 text-ink-muted">Caricamento stagioni…</p>
              )}
            </div>
            <div>
              <p className="block font-display text-lg font-extrabold text-ink mb-1.5">Bot avversari</p>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} disabled={busy} />
            </div>
            <label className="flex items-center gap-3 font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={fillWithBots}
                onChange={e => setFillWithBots(e.target.checked)}
                className="w-5 h-5 accent-[rgb(var(--c-pitch))]"
              />
              Completa con bot i posti liberi
            </label>
            <button type="button" onClick={submitCreate} disabled={busy} className="btn-cta w-full text-xl py-3">
              {busy ? 'Creazione…' : 'Crea stanza'}
              <Icon name="arrow" className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="mp-code" className="block font-display text-lg font-extrabold text-ink mb-1.5">
                Codice stanza
              </label>
              <input
                id="mp-code"
                type="text"
                value={code}
                maxLength={8}
                autoCapitalize="characters"
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                className={`input-field font-display text-2xl tracking-[0.3em] ${code && !codeOk ? 'input-error' : ''}`}
              />
              {code && !codeOk && (
                <p className="mt-2 text-sm text-danger">Codice non valido</p>
              )}
            </div>
            {hasIdentity && initialCode && (
              <p className="text-sm text-ink-soft">
                Hai già partecipato a questa stanza: entrando riprendi il tuo posto.
              </p>
            )}
            <button
              type="button"
              onClick={submitJoin}
              disabled={busy || !codeOk || (!asSpectator && !nickname.trim())}
              className="btn-cta w-full text-xl py-3"
            >
              {busy ? 'Entro…' : 'Entra nella stanza'}
              <Icon name="arrow" className="w-5 h-5" />
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
      </div>
    </div>
  );
}
