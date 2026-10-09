/**
 * Moderazione dei nomi di stanza (nickname e nome squadra).
 * Blocklist corta di insulti e volgarità comuni, italiani e inglesi:
 * non vuole essere esaustiva, solo filtrare i casi più evidenti.
 *
 * Prima del confronto il nome è normalizzato: minuscolo, senza accenti,
 * sostituzioni leet base (0->o, 1->i, 3->e, 4->a, 5->s, @->a, $->s).
 * Il confronto è per parola (o prefisso) per evitare falsi positivi:
 * "Scunthorpe" contiene "cunt" come sottostringa ma non va bloccato;
 * le parole lunghe (>= 6 lettere) si cercano anche nella stringa
 * compressa, per prendere le offuscazioni con caratteri in mezzo.
 */

const BLOCKLIST: readonly string[] = [
  // volgarità e insulti italiani
  'cazzo', 'merda', 'stronzo', 'troia', 'puttana', 'vaffanculo', 'fanculo',
  'culo', 'minchia', 'coglione', 'ricchione', 'frocio', 'negro', 'zingaro',
  'terrone',
  // volgarità e insulti inglesi
  'fuck', 'shit', 'bitch', 'dick', 'pussy', 'cock', 'cunt', 'nigger', 'nigga',
  'faggot', 'whore', 'slut', 'bastard', 'asshole', 'retard',
];

/**
 * Parole innocue che contengono una voce della blocklist come prefisso
 * o sottostringa: mai bloccate (nomi di squadre, cocktail, cognomi).
 */
const SAFE: readonly string[] = [
  'scunthorpe', 'negroni', 'arsenal', 'anale', 'passero', 'cassano',
  'maniche', 'cumiana', 'pisano', 'trotta', 'boscaglia',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '$': 's', '7': 't', '!': 'i',
};

/**
 * Normalizza per il confronto: lowercase, accenti rimossi, leet->lettere.
 * Restituisce i token alfabetici e la stringa compressa.
 */
export function normalizeForModeration(text: string): { tokens: string[]; collapsed: string } {
  const stripped = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map(c => LEET[c] ?? c)
    .join('');
  const tokens = stripped.split(/[^a-z]+/).filter(Boolean);
  return { tokens, collapsed: tokens.join('') };
}

/** true se il nome contiene una voce della blocklist */
export function isOffensiveName(text: string): boolean {
  const { tokens } = normalizeForModeration(text);
  // Parole sicure escluse dal confronto (es. "Negroni FC", "Scunthorpe")
  const check = tokens.filter(t => !SAFE.includes(t));
  const collapsed = check.join('');
  if (!collapsed) return false;
  return BLOCKLIST.some(word =>
    check.some(t => t === word || (word.length >= 4 && t.startsWith(word))) ||
    collapsed === word || // lettere separate da spazi ("f u c k")
    (word.length >= 5 && collapsed.includes(word))
  );
}
