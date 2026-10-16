import { MatchEvent } from '../domain/match/matchTypes';
import { CatalogKey, TFunction, TranslateParams } from './translate';

/**
 * Testo di cronaca di un evento nella lingua del chiamante.
 * Gli eventi nuovi compongono il testo da descKey/descParams/descVariant
 * (deterministico: stesso seed → stessa variante); i risultati prodotti
 * prima della localizzazione usano `description` già materializzata.
 */
export function eventDescription(e: MatchEvent, t: TFunction): string {
  if (e.descKey) return t(e.descKey as CatalogKey, e.descParams as TranslateParams | undefined, e.descVariant);
  return e.description ?? '';
}
