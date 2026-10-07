import { GuideBody } from './types';
import { body as comeFunziona } from './come-funziona';
import { body as strategie } from './strategie';
import { body as simulatore } from './simulatore';
import { body as stagioni } from './stagioni';
import { body as bonusMalus } from './bonus-malus';

/**
 * Registro dei corpi delle guide: ogni slug ha il suo file di testo in
 * src/site/content/guides/<slug>.tsx. Import statici: il pre-rendering deve
 * scrivere il testo completo nell'HTML.
 */
export const GUIDE_BODIES: Record<string, GuideBody> = {
  'come-funziona-asta-fantacalcio': comeFunziona,
  'strategie-asta-fantacalcio': strategie,
  'simulatore-asta-fantacalcio': simulatore,
  'fantacalcio-stagioni-passate': stagioni,
  'bonus-malus-fantacalcio': bonusMalus,
};
