import { useT } from '../i18n/I18nProvider';
import { CatalogKey } from '../i18n/translate';
import { DifficultyLevel } from '../types';
import { OptionTile, OptionTiles } from './OptionTiles';

/**
 * Opzioni disponibili per il livello di difficoltà (chiavi di catalogo)
 */
const DIFFICULTY_OPTIONS: OptionTile<DifficultyLevel>[] = [
  { value: 'normale', label: 'setup.difficulty.normale.label', tag: 'setup.difficulty.normale.tag', icon: 'balance', accent: 'pitch' },
  { value: 'difficile', label: 'setup.difficulty.difficile.label', tag: 'setup.difficulty.difficile.tag', icon: 'flame', accent: 'whistle' },
];

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, CatalogKey> = {
  normale: 'setup.difficulty.normale.desc',
  difficile: 'setup.difficulty.difficile.desc',
};

interface DifficultyPickerProps {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
  disabled?: boolean;
}

/** Selettore della difficoltà dei bot, condiviso tra setup e lobby */
export function DifficultyPicker({ value, onChange, disabled }: DifficultyPickerProps) {
  const t = useT();
  return (
    <div>
      <OptionTiles
        options={DIFFICULTY_OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        groupLabel={t('setup.difficulty.group')}
      />
      <p className="mt-2 text-xs sm:text-sm text-ink-soft">{DIFFICULTY_DESCRIPTIONS[value] && t(DIFFICULTY_DESCRIPTIONS[value])}</p>
    </div>
  );
}
