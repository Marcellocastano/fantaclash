/**
 * Formattazione dei nomi dei calciatori. I dati storici hanno il cognome
 * in maiuscolo seguito dal nome ("HIGUAIN Gonzalo", "ETO'O Samuel"); i dati
 * di esempio sono già in forma leggibile ("Mike Maignan").
 */

const isUpperWord = (w: string) => w.length > 1 && w === w.toUpperCase() && /\p{Lu}/u.test(w);

/**
 * Maiuscola a inizio parola, dopo spazio o trattino, e dopo l'apostrofo
 * solo se prima c'è una singola lettera (elisione: D'Ambrosio, L'Aquila).
 * Così "ETO'O" -> "Eto'o" e "KAKA'" -> "Kaka'".
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/(^|[\s-])(\p{L})'(\p{L})/gu, (_, sep: string, a: string, b: string) => `${sep}${a}'${b.toUpperCase()}`);
}

/** Cognome e nome separati, entrambi leggibili */
export function splitName(name: string): { surname: string; firstName: string } {
  const words = name.trim().split(/\s+/);
  if (isUpperWord(words[0])) {
    const surname: string[] = [];
    let i = 0;
    while (i < words.length && isUpperWord(words[i])) surname.push(words[i++]);
    return { surname: titleCase(surname.join(' ')), firstName: words.slice(i).join(' ') };
  }
  if (words.length === 1) return { surname: words[0], firstName: '' };
  return { surname: words[words.length - 1], firstName: words.slice(0, -1).join(' ') };
}

/** Cognome leggibile: "HIGUAIN Gonzalo" -> "Higuain", "Mike Maignan" -> "Maignan" */
export function shortName(name: string): string {
  return splitName(name).surname;
}
