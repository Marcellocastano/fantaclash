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
}

/**
 * Form di inizio partita, integrato nella landing.
 * Lega fissa a 8 squadre e 100 crediti: l'utente sceglie nome squadra
 * (con generatore), annata del listone (carosello + dado) e difficoltà.
 */
export function SetupForm({ onSubmit }: SetupFormProps) {
  const [teamName, setTeamName] = useState(() => randomTeamName());
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normale');
  const [season, setSeason] = useState<string>('');
  const [seasons, setSeasons] = useState<SeasonInfo[] | null>(null);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Carica l'indice delle stagioni storiche; il default è la più recente
   */
  useEffect(() => {
    let cancelled = false;
    loadSeasonIndex()
      .then(list => {
        if (cancelled) return;
        setSeasons(list);
        if (list.length > 0) setSeason(list[list.length - 1].season);
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
        <label htmlFor="teamName" className="block text-sm font-semibold text-ink mb-2">
          La tua squadra
        </label>
        <div className="flex">
          <input
            type="text"
            id="teamName"
            value={teamName}
            maxLength={MAX_TEAM_NAME_LENGTH + 10}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Es. FC Campioni"
            className={`input-field !border-2 font-display text-xl font-bold ${errors.teamName ? 'input-error' : ''}`}
          />
          <button
            type="button"
            onClick={() => setTeamName(current => randomTeamName(current))}
            title="Genera un nome"
            className="shrink-0 inline-flex items-center gap-2 px-4 border-2 border-l-0 border-line-strong text-ink font-semibold text-sm hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
          >
            <Icon name="dice" className="w-5 h-5" />
            <span className="hidden sm:inline">Genera</span>
          </button>
        </div>
        {errors.teamName && <p className="mt-2 text-sm text-danger">{errors.teamName}</p>}
      </div>

      {/* Annata */}
      <div>
        <p className="block text-sm font-semibold text-ink mb-2">Annata del listone</p>
        {seasonsReady ? (
          <SeasonPicker seasons={seasons} value={season} onChange={setSeason} disabled={submitting} />
        ) : (
          <p className="border-2 border-line-strong px-4 py-5 text-ink-muted">
            {seasonsError ?? 'Caricamento stagioni…'}
          </p>
        )}
        {seasonsError && <p className="mt-2 text-sm text-danger">{seasonsError}</p>}
        {errors.season && <p className="mt-2 text-sm text-danger">{errors.season}</p>}
      </div>

      {/* Difficoltà */}
      <div>
        <p className="block text-sm font-semibold text-ink mb-2">Bot avversari</p>
        <div className="grid grid-cols-2 border-2 border-line-strong" role="radiogroup" aria-label="Difficoltà dei bot">
          {DIFFICULTY_OPTIONS.map((option, i) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={difficulty === option.value}
              onClick={() => setDifficulty(option.value)}
              className={`py-2.5 font-display text-xl font-bold transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch ${
                i > 0 ? 'border-l-2 border-line-strong' : ''
              } ${difficulty === option.value ? 'bg-pitch text-on-pitch' : 'text-ink hover:bg-surface'}`}
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
          className="btn-primary w-full text-2xl py-4 inline-flex items-center justify-center gap-3"
        >
          {submitting ? 'Caricamento…' : (
            <>
              Gioca
              <Icon name="arrow" className="w-6 h-6" />
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
