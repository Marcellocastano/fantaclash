import type { CompetitionFormat } from '../types';

const OPTIONS: { value: CompetitionFormat; label: string; description: string }[] = [
  {
    value: 'knockout',
    label: 'Eliminazione diretta',
    description: '8 squadre · quarti, semifinale e finale. Da 1 a 3 partite garantite.',
  },
  {
    value: 'groups',
    label: 'Gironi + fase finale',
    description: '2 gironi da 4, andata e ritorno. 6 partite garantite, fino a 8 per chi arriva alla finale.',
  },
];

interface CompetitionPickerProps {
  value: CompetitionFormat;
  onChange: (value: CompetitionFormat) => void;
  disabled?: boolean;
}

export function CompetitionPicker({ value, onChange, disabled }: CompetitionPickerProps) {
  const selected = OPTIONS.find(option => option.value === value);
  return (
    <div>
      <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label="Formato competizione">
        {OPTIONS.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`px-2 py-2 font-display text-sm sm:text-lg font-bold transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch ${index > 0 ? 'border-l-2 border-ink' : ''} ${value === option.value ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{selected?.description}</p>
    </div>
  );
}
