import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';
import { DifficultyLevel } from '../types';

/**
 * Opzioni disponibili per il livello di difficoltà (chiavi di catalogo)
 */
const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: CatalogKey; description: CatalogKey }[] = [
  { value: 'normale', label: 'setup.difficulty.normale.label', description: 'setup.difficulty.normale.desc' },
  { value: 'difficile', label: 'setup.difficulty.difficile.label', description: 'setup.difficulty.difficile.desc' },
];

interface DifficultyPickerProps {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
  disabled?: boolean;
}

/** Selettore della difficoltà dei bot, condiviso tra setup e lobby */
export function DifficultyPicker({ value, onChange, disabled }: DifficultyPickerProps) {
  const t = useT();
  const selected = DIFFICULTY_OPTIONS.find(o => o.value === value);
  return (
    <div>
      <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label={t('setup.difficulty.group')}>
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
            {t(option.label)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{selected && t(selected.description)}</p>
    </div>
  );
}
