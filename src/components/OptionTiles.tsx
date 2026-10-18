import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';
import { Icon, IconName } from './Icon';

export interface OptionTile<V extends string> {
  value: V;
  label: CatalogKey;
  tag: CatalogKey;
  icon: IconName;
  accent: 'pitch' | 'whistle';
}

interface OptionTilesProps<V extends string> {
  options: OptionTile<V>[];
  value: V;
  onChange: (value: V) => void;
  disabled?: boolean;
  groupLabel: string;
}

/**
 * Scelta tra opzioni come tile grafiche separate: badge con icona,
 * etichetta + tag, stato selezionato colorato (verde pitch o rosso
 * whistle). L'aria-label espone solo l'etichetta: il tag è un dettaglio.
 * La tag sotto i 640px è nascosta perché le tile diventerebbero troppo
 * strette (grid a 2 colonne fisse).
 */
export function OptionTiles<V extends string>({ options, value, onChange, disabled, groupLabel }: OptionTilesProps<V>) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={groupLabel}>
      {options.map(option => {
        const selected = value === option.value;
        const whistle = option.accent === 'whistle';
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(option.label)}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center gap-2 sm:gap-3 text-left border-2 border-ink px-2 sm:px-3 py-2.5 transition-all duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch ${
              selected
                ? `${whistle ? 'bg-whistle text-on-whistle' : 'bg-pitch text-on-pitch'} shadow-block-sm -translate-y-0.5`
                : 'bg-canvas text-ink hover:bg-highlight/25'
            }`}
          >
            <span
              className={`w-8 h-8 sm:w-10 sm:h-10 border-2 border-ink flex items-center justify-center shrink-0 ${
                selected ? 'bg-highlight text-on-highlight' : 'bg-surface text-ink-soft'
              }`}
              aria-hidden="true"
            >
              <Icon name={option.icon} className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base sm:text-xl font-extrabold leading-none">{t(option.label)}</span>
              <span
                className={`hidden sm:block text-[11px] sm:text-xs font-semibold mt-1 ${
                  selected ? (whistle ? 'text-on-whistle/85' : 'text-on-pitch/80') : 'text-ink-muted'
                }`}
              >
                {t(option.tag)}
              </span>
            </span>
            {selected && <Icon name="check" className="hidden sm:block absolute top-1.5 right-1.5 w-4 h-4 text-highlight" />}
          </button>
        );
      })}
    </div>
  );
}
