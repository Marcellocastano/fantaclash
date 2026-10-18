import { TournamentFormat } from '../domain/tournament';
import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';
import { OptionTile, OptionTiles } from './OptionTiles';

const FORMAT_OPTIONS: OptionTile<TournamentFormat>[] = [
  { value: 'double', label: 'setup.format.double.label', tag: 'setup.format.double.tag', icon: 'swap', accent: 'pitch' },
  { value: 'single', label: 'setup.format.single.label', tag: 'setup.format.single.tag', icon: 'whistle', accent: 'pitch' },
];

const FORMAT_DESCRIPTIONS: Record<TournamentFormat, CatalogKey> = {
  double: 'setup.format.double.desc',
  single: 'setup.format.single.desc',
};

interface CupFormatPickerProps {
  value: TournamentFormat;
  onChange: (value: TournamentFormat) => void;
  disabled?: boolean;
}

/** Selettore del formato della coppa, stile DifficultyPicker */
export function CupFormatPicker({ value, onChange, disabled }: CupFormatPickerProps) {
  const t = useT();
  return (
    <div>
      <OptionTiles
        options={FORMAT_OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        groupLabel={t('setup.format.group')}
      />
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{FORMAT_DESCRIPTIONS[value] && t(FORMAT_DESCRIPTIONS[value])}</p>
    </div>
  );
}
