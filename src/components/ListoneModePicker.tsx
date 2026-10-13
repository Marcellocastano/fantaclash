import { Icon } from './Icon';

export type ListoneMode = 'classic' | 'legends';

interface ListoneModePickerProps {
  value: ListoneMode;
  onChange: (mode: ListoneMode) => void;
  disabled?: boolean;
}

/**
 * Le due modalità del listone, a tile identiche: "Classica" (un'annata)
 * e "Legends" (i migliori di sempre). Condivisa tra il setup della
 * landing e la creazione/impostazioni della stanza.
 */
export function ListoneModePicker({ value, onChange, disabled }: ListoneModePickerProps) {
  const tile = (mode: ListoneMode, title: string, subtitle: string) => {
    const selected = value === mode;
    return (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => onChange(mode)}
        className={`relative text-left border-2 border-ink px-3 sm:px-4 py-3 sm:py-4 transition-all duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch ${
          selected ? 'bg-canvas shadow-block' : 'bg-canvas/60 hover:bg-canvas'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-xl sm:text-2xl font-extrabold text-ink">{title}</span>
          {selected && <Icon name="check" className="w-5 h-5 text-pitch shrink-0" />}
        </span>
        <span className="block mt-1 text-xs sm:text-sm text-ink-muted leading-snug">{subtitle}</span>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Listone">
      {tile('classic', 'Classica', "Un'annata a scelta, 96 giocatori veri")}
      {tile('legends', 'Legends', 'I più forti di 23 annate, overall fino a 99')}
    </div>
  );
}
