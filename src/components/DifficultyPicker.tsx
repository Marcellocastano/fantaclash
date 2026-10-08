import { DifficultyLevel } from '../types';

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

interface DifficultyPickerProps {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
  disabled?: boolean;
}

/** Selettore della difficoltà dei bot, condiviso tra setup e lobby */
export function DifficultyPicker({ value, onChange, disabled }: DifficultyPickerProps) {
  const selected = DIFFICULTY_OPTIONS.find(o => o.value === value);
  return (
    <div>
      <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label="Difficoltà dei bot">
        {DIFFICULTY_OPTIONS.map((option, i) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`py-2 font-display text-sm sm:text-xl font-bold transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch ${
              i > 0 ? 'border-l-2 border-ink' : ''
            } ${value === option.value ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{selected?.description}</p>
    </div>
  );
}
