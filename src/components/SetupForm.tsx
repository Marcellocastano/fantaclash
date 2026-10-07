import { useState, useCallback, useEffect } from 'react';
import { GameConfig, DifficultyLevel } from '../types';
import { loadSeasonIndex, SeasonInfo } from '../services/seasons';
import { LEAGUE_SIZE, INITIAL_CREDITS } from '../services/auction';
import { MAX_TEAM_NAME_LENGTH, randomTeamName } from '../mock/teamNames';
import { Icon } from './Icon';
import { SeasonPicker } from './SeasonPicker';

/**
 * Opzioni disponibili per il livello di difficoltà
 */
const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  {
    value: 'normale',
    label: 'Normale',
    description: 'Bot con valutazioni ragionevoli e un po\' di rumore nelle decisioni.',
  },
  {
    value: 'difficile',
    label: 'Difficile',
    description: 'Valutazioni precise, chiamate tattiche per farti spendere.',
  },
];

interface SetupFormProps {
  /** Callback chiamata quando il form viene inviato con successo (può essere asincrona) */
  onSubmit: (config: GameConfig) => void | Promise<void>;
  /** Annata selezionata (per mostrare l'album della stagione nella landing) */
  onSeasonChange?: (season: string) => void;
}

/**
 * Form di inizio partita, integrato nella landing.
 * Lega fissa a 8 squadre e 100 crediti: l'utente sceglie nome squadra
 * (con generatore), annata del listone (carosello + dado) e difficoltà.
 */
export function SetupForm({ onSubmit, onSeasonChange }: SetupFormProps) {
  // Valori casuali solo dopo il montaggio: il primo disegno coincide con l'HTML pre-renderizzato
  const [teamName, setTeamName] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normale');
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
    const requested = new URLSearchParams(window.location.search).get('annata');
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

  useEffect(() => {
    if (season) onSeasonChange?.(season);
  }, [season, onSeasonChange]);

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

    if (!season) {
      newErrors.season = 'Seleziona una stagione';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [teamName, season]);

  /**
   * Gestisce l'invio del form
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || submitting) return;
    const config: GameConfig = {
      userTeamName: teamName.trim(),
      difficulty,
      season,
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
  }, [teamName, difficulty, season, submitting, validateForm, onSubmit]);

  const seasonsReady = seasons !== null && seasons.length > 0 && !seasonsError;
  const selectedDifficulty = DIFFICULTY_OPTIONS.find(o => o.value === difficulty);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Inizia a giocare">
      {/* Nome squadra con generatore */}
      <div>
        <label htmlFor="teamName" className="block font-display text-xl font-extrabold text-ink mb-2">
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
            className={`input-field pr-12 font-display text-2xl font-extrabold ${errors.teamName ? 'input-error' : ''}`}
          />
          {/* Generatore discreto dentro il campo: il dado giallo resta solo per l'annata */}
          <button
            type="button"
            onClick={() => setTeamName(current => randomTeamName(current))}
            title="Genera un nome"
            aria-label="Genera un nome"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-ink-muted hover:text-ink transition-colors duration-150 focus-visible:outline outline-2 outline-pitch"
          >
            <Icon name="reset" className="w-5 h-5" />
          </button>
        </div>
        {errors.teamName && <p className="mt-2 text-sm text-danger">{errors.teamName}</p>}
      </div>

      {/* Annata */}
      <div>
        <p className="block font-display text-xl font-extrabold text-ink mb-2">Annata del listone</p>
        {seasonsReady ? (
          <SeasonPicker seasons={seasons} value={season} onChange={setSeason} disabled={submitting} />
        ) : (
          <p className="border-2 border-ink px-4 py-5 text-ink-muted">
            {seasonsError ?? 'Caricamento stagioni…'}
          </p>
        )}
        {seasonsError && <p className="mt-2 text-sm text-danger">{seasonsError}</p>}
        {errors.season && <p className="mt-2 text-sm text-danger">{errors.season}</p>}
      </div>

      {/* Difficoltà */}
      <div>
        <p className="block font-display text-xl font-extrabold text-ink mb-2">Bot avversari</p>
        <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label="Difficoltà dei bot">
          {DIFFICULTY_OPTIONS.map((option, i) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={difficulty === option.value}
              onClick={() => setDifficulty(option.value)}
              className={`py-2.5 font-display text-xl font-bold transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch ${
                i > 0 ? 'border-l-2 border-ink' : ''
              } ${difficulty === option.value ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">{selectedDifficulty?.description}</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting || !seasonsReady}
          className="btn-cta w-full"
        >
          {submitting ? 'Caricamento…' : (
            <>
              Gioca
              <Icon name="arrow" className="w-7 h-7" />
            </>
          )}
        </button>
        {errors.submit && <p className="mt-2 text-sm text-danger">{errors.submit}</p>}
        <p className="mt-3 text-sm text-ink-muted">
          {LEAGUE_SIZE} squadre (tu + {LEAGUE_SIZE - 1} bot) · {INITIAL_CREDITS} crediti · rosa da 8, modulo 1-2-3-2
        </p>
      </div>
    </form>
  );
}
