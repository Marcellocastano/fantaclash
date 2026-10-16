import { TournamentFormat } from '../domain/tournament';
import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';

const FORMAT_OPTIONS: { value: TournamentFormat; label: CatalogKey; description: CatalogKey }[] = [
  { value: 'double', label: 'setup.format.double.label', description: 'setup.format.double.desc' },
  { value: 'single', label: 'setup.format.single.label', description: 'setup.format.single.desc' },
];

interface CupFormatPickerProps {
  value: TournamentFormat;
  onChange: (value: TournamentFormat) => void;
  disabled?: boolean;
}

/** Selettore del formato della coppa, stile DifficultyPicker */
export function CupFormatPicker({ value, onChange, disabled }: CupFormatPickerProps) {
  const t = useT();
  const selected = FORMAT_OPTIONS.find(o => o.value === value);
  return (
    <div>
      <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label={t('setup.format.group')}>
        {FORMAT_OPTIONS.map((option, i) => (
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
