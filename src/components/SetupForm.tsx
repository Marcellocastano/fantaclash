import { useState, useCallback, useEffect } from 'react';
import { GameConfig, DifficultyLevel } from '../types';
import { LEGENDS_ID, loadSeasonIndex, SeasonInfo } from '../services/seasons';
import { LEAGUE_SIZE, INITIAL_CREDITS } from '../services/auction';
import { MAX_TEAM_NAME_LENGTH, randomTeamName } from '../mock/teamNames';
import { TournamentFormat } from '../domain/tournament';
import { Icon } from './Icon';
import { SeasonPicker } from './SeasonPicker';
import { DifficultyPicker } from './DifficultyPicker';
import { CupFormatPicker } from './CupFormatPicker';
import { ListoneMode, ListoneModePicker } from './ListoneModePicker';

interface SetupFormProps {
  /** Callback chiamata quando il form viene inviato con successo (può essere asincrona) */
  onSubmit: (config: GameConfig) => void | Promise<void>;
  /** Annata selezionata (per mostrare l'album della stagione nella landing) */
  onSeasonChange?: (season: string) => void;
}

/**
 * Form di inizio partita, integrato nella landing.
 * Lega fissa a 8 squadre e 100 crediti: l'utente sceglie nome squadra
 * (con generatore), il listone (Classica = un'annata a scelta, Legends =
 * i migliori di sempre), il formato della coppa e la difficoltà.
 * `?modalita=legends` preseleziona Legends, `?annata=` l'annata.
 */
export function SetupForm({ onSubmit, onSeasonChange }: SetupFormProps) {
  // Valori casuali solo dopo il montaggio: il primo disegno coincide con l'HTML pre-renderizzato
  const [teamName, setTeamName] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normale');
  const [mode, setMode] = useState<ListoneMode>('classic');
  const [format, setFormat] = useState<TournamentFormat>('double');
  const [season, setSeason] = useState<string>('');
  const [seasons, setSeasons] = useState<SeasonInfo[] | null>(null);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTeamName(current => current || randomTeamName());
  }, []);

  /**
   * Carica l'indice delle stagioni storiche. Si parte dall'annata indicata
   * nell'indirizzo (?annata=2015-16, dalle pagine Top 11) o da una a caso.
   */
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('annata');
    if (params.get('modalita') === LEGENDS_ID) setMode('legends');
    loadSeasonIndex()
      .then(list => {
        if (cancelled) return;
        setSeasons(list);
        if (list.length === 0) return;
        const fromUrl = list.find(s => s.season === requested);
        setSeason((fromUrl ?? list[Math.floor(Math.random() * list.length)]).season);
      })
      .catch((err) => {
        if (cancelled) return;
        setSeasons([]);
        setSeasonsError(
          err instanceof Error ? err.message : 'Impossibile caricare l\'elenco delle stagioni'
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // L'album di destra segue il listone scelto (Legends ha il suo documento)
  const listoneId = mode === 'legends' ? LEGENDS_ID : season;
  useEffect(() => {
    if (listoneId) onSeasonChange?.(listoneId);
  }, [listoneId, onSeasonChange]);

  /**
   * Valida il form e restituisce true se valido
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!teamName.trim()) {
      newErrors.teamName = 'Il nome della squadra è obbligatorio';
    } else if (teamName.trim().length < 3) {
      newErrors.teamName = 'Il nome deve avere almeno 3 caratteri';
    } else if (teamName.trim().length > MAX_TEAM_NAME_LENGTH) {
      newErrors.teamName = `Il nome non può superare i ${MAX_TEAM_NAME_LENGTH} caratteri`;
    }

    if (mode === 'classic' && !season) {
      newErrors.season = 'Seleziona una stagione';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [teamName, season, mode]);

  /**
   * Gestisce l'invio del form
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || submitting) return;
    const config: GameConfig = {
      userTeamName: teamName.trim(),
      difficulty,
      season: listoneId,
      format,
    };
    setSubmitting(true);
    try {
      await onSubmit(config);
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        submit: err instanceof Error ? err.message : 'Errore nel caricamento dei dati',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [teamName, difficulty, listoneId, format, submitting, validateForm, onSubmit]);

  const seasonsReady = mode === 'legends' || (seasons !== null && seasons.length > 0 && !seasonsError);
  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Inizia a giocare">
      {/* Nome squadra con generatore */}
      <div>
        <label htmlFor="teamName" className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5 sm:mb-2">
          La tua squadra
        </label>
        <div className="relative">
          <input
            type="text"
            id="teamName"
            value={teamName}
            maxLength={MAX_TEAM_NAME_LENGTH + 10}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Es. FC Campioni"
            className={`input-field pr-10 sm:pr-12 py-2 sm:py-3 font-display text-xl sm:text-2xl font-extrabold ${errors.teamName ? 'input-error' : ''}`}
          />
          {/* Generatore discreto dentro il campo: il dado giallo resta solo per l'annata */}
          <button
            type="button"
            onClick={() => setTeamName(current => randomTeamName(current))}
            title="Genera un nome"
            aria-label="Genera un nome"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-ink-muted hover:text-ink transition-colors duration-150 focus-visible:outline outline-2 outline-pitch"
          >
            <Icon name="reset" className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        {errors.teamName && <p className="mt-2 text-sm text-danger">{errors.teamName}</p>}
      </div>

      {/* Listone: Classica o Legends */}
      <div>
        <p className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5 sm:mb-2">Listone</p>
        <ListoneModePicker value={mode} onChange={setMode} disabled={submitting} />
      </div>

      {/* Annata (solo Classica) o Hall of Fame */}
      <div>
        {mode === 'classic' ? (
          <>
            <p className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5 sm:mb-2">Annata del listone</p>
            {seasons !== null && seasons.length > 0 && !seasonsError ? (
              <SeasonPicker seasons={seasons} value={season} onChange={setSeason} disabled={submitting} />
            ) : (
              <p className="border-2 border-ink px-4 py-5 text-ink-muted">
                {seasonsError ?? 'Caricamento stagioni…'}
              </p>
            )}
            {seasonsError && <p className="mt-2 text-sm text-danger">{seasonsError}</p>}
            {errors.season && <p className="mt-2 text-sm text-danger">{errors.season}</p>}
          </>
        ) : (
          <div className="relative border-2 border-ink bg-tier-elite-bg text-canvas px-4 sm:px-5 py-4 sm:py-5">
            <span className="absolute inset-1 border border-highlight/50 pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <Icon name="trophy" className="w-9 h-9 sm:w-11 sm:h-11 text-highlight shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-2xl sm:text-3xl font-black text-highlight leading-none">HALL OF FAME</p>
                <p className="mt-1 text-xs sm:text-sm text-canvas/75 leading-snug">
                  96 leggende delle 23 annate · una card per giocatore, nella sua stagione migliore · overall fino a 99
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formato della coppa */}
      <div>
        <p className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5 sm:mb-2">Coppa</p>
        <CupFormatPicker value={format} onChange={setFormat} disabled={submitting} />
      </div>

      {/* Difficoltà */}
      <div>
        <p className="block font-display text-lg sm:text-xl font-extrabold text-ink mb-1.5 sm:mb-2">Bot avversari</p>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} disabled={submitting} />
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting || !seasonsReady}
          className="btn-cta w-full text-xl sm:text-3xl py-3 sm:py-5"
        >
          {submitting ? 'Caricamento…' : (
            <>
              Gioca
              <Icon name="arrow" className="w-5 h-5 sm:w-7 sm:h-7" />
            </>
          )}
        </button>
        {errors.submit && <p className="mt-2 text-sm text-danger">{errors.submit}</p>}
        <p className="mt-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
          {LEAGUE_SIZE} squadre (tu + {LEAGUE_SIZE - 1} bot) · {INITIAL_CREDITS} crediti · rosa da 8, modulo 1-2-3-2
        </p>
      </div>
    </form>
  );
}
