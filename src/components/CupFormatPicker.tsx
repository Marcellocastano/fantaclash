import { TournamentFormat } from '../domain/tournament';

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
  {
    value: 'double',
    label: 'Andata e ritorno',
    description: 'Quarti e semifinali su due partite, finale secca: fino a 5 partite. A parità di gol complessivi, rigori.',
  },
  {
    value: 'single',
    label: 'Gara secca',
    description: 'Una partita per turno: dentro o fuori, come le coppe di una volta.',
  },
];

interface CupFormatPickerProps {
  value: TournamentFormat;
  onChange: (value: TournamentFormat) => void;
  disabled?: boolean;
}

/** Selettore del formato della coppa, stile DifficultyPicker */
export function CupFormatPicker({ value, onChange, disabled }: CupFormatPickerProps) {
  const selected = FORMAT_OPTIONS.find(o => o.value === value);
  return (
    <div>
      <div className="grid grid-cols-2 border-2 border-ink" role="radiogroup" aria-label="Formato della coppa">
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
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{selected?.description}</p>
    </div>
  );
}
