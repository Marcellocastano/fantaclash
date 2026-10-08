/**
 * Lista di nomi divertenti per le squadre bot
 */
export const BOT_TEAM_NAMES = [
  "50 SFUMATURE DI GIGIO",
  "99 EBOSSE",
  "ABATE BORISOV",
  "AC CIUGHINA",
  "AL D'HILAL",
  "AMBRA ANJORIN",
  "ARMERO TU NELL'UNIVERSO",
  "AS MATIC",
  "AVELLINO BANFI",
  "BARCOLA MA NON MOLLA",
  "BASCHIRUTTO",
  "BASTONI E CAROTA",
  "BILLY BALLO TOURE",
  "BORUSSIA PORKMUND",
  "BUGS BURNLEY",
  "CAMBIA LA TUA VITA CON UN GLIK",
  "CAMERUN DIAZ",
  "CAPRARI SPRITZ",
  "CIAO DARWIN NUNEZ",
  "COCA KOLAROV",
  "COLO KOLO MUANI",
  "CORTO MUSAH",
  "COSENZA SOLDI",
  "CUGINI DI ZAMPAGNA",
  "DJIMSITI LIFE",
  "DRAGON BALLOTTA",
  "DYBALA COI LUPI",
  "FINO AL PALACIO",
  "FIUMI DI PAROLO",
  "FREY'S ANATOMY",
  "GABBIA DI MATTI",
  "GATTI RANDAGI",
  "GIANFRANCO NZOLA",
  "GILA LA RUOTA",
  "GIROUD'ITALIA",
  "GRAN BIRAGHI",
  "HANNO UCCISO L'UOMO CRAGNO",
  "HAPOEL KANN",
  "HERTHA VERNELLO",
  "IL MIO GROSSO GRASSO MATRIMONIO DZEKO",
  "IL SESTO ASENSIO",
  "IL TEMPO DELLE MAEHLE",
  "KEAN SHIRO",
  "KILL BILLING",
  "KOULIBALY FUNICULA'",
  "KUHN FU PANDA",
  "JE SO PAZ",
  "LA PASSIONE DI KRSTOVIC",
  "LACAZETTE IN CANADA",
  "LINO BANFIELD",
  "LIONEL RICCI",
  "LU SOLE, LU MARE, LUKAKU",
  "MANCHESTER SIMY",
  "MANU THIAW",
  "MASIELLOW SUBMARINE",
  "MASTERCHEF UNITED",
  "ME GUSTA LA BATURINA",
  "MEGLIO ICARDI CHE MAI",
  "MESSI MALEN",
  "MILAN E SHIRO",
  "I NERES PER CASO",
  "NOTTE PRIMA DI ALEESAMI",
  "O SOLET MIO",
  "OSTIA LIEDHOLM",
  "PARACEZANIOLO",
  "PATETICO MINEIRO",
  "PERDER BREMA",
  "PJACA GRANDE",
  "PIU' NO KESSIE'",
  "POCHI MA BONNY",
  "POGGIOREAL",
  "POGGISBRONZI",
  "QUATTRO AMICI AL VAR",
  "RONALDO GIOVANNI E GIACOMO",
  "ROONEY TUNES",
  "SABELLI DENTRO",
  "SALAH PERCHE' TI AMO",
  "SANCHO SUBITO",
  "SBRAGA",
  "SBROCCA JUNIORS",
  "SE MI LASCI TI CANCELO",
  "SMELLS LIKE TEEN STRINIC",
  "SPAL LETTI",
  "SPARTAK MOOSECA",
  "SPERA EBBASTA",
  "SVERKO E SAMBIA",
  "TANTO PE' KANTE'",
  "TEMPTATION ALLAN",
  "THIAW, BUONGIORNO, ADOPO",
  "TODA JOYA TODA STREFEZZA",
  "TOTTINHAM",
  "TRUMPZONSPOR",
  "UNA NOTTE DA LEONI",
  "UNA SETTIMANA DA DIAO",
  "UNO SU MILIK CE LA FA",
  "VERETOUT MI PIACI TU",
  "VINICIUS CAPOSSELA",
  "VOJVODKA RED BULL",
  "WALKER TEXAS RANGERS",
];

/**
 * Seleziona nomi casuali per le squadre bot, escludendo il nome dell'utente
 */
export function getRandomBotNames(count: number, userTeamName: string | string[]): string[] {
  // Nomi da escludere (case-insensitive): accetta uno o più nomi già presi
  const taken = new Set(
    (Array.isArray(userTeamName) ? userTeamName : [userTeamName])
      .map(n => n.trim().toUpperCase())
  );

  // Filtra i nomi che non corrispondono a quelli già presi
  const availableNames = BOT_TEAM_NAMES.filter(
    name => !taken.has(name.toUpperCase())
  );
  
  // Mescola l'array
  const shuffled = [...availableNames].sort(() => Math.random() - 0.5);
  
  // Prendi i primi 'count' nomi
  return shuffled.slice(0, count);
}

/** Lunghezza massima del nome squadra dell'utente (validata dal form) */
export const MAX_TEAM_NAME_LENGTH = 30;

/**
 * Generatore di nomi per la squadra dell'utente: pesca dalla stessa lista
 * dei bot (solo nomi validi per il form), evitando di ripetere il nome
 * attuale.
 */
export function randomTeamName(current = '', rng: () => number = Math.random): string {
  const pool = BOT_TEAM_NAMES.filter(
    name => name.length <= MAX_TEAM_NAME_LENGTH && name !== current.trim().toUpperCase()
  );
  return pool[Math.floor(rng() * pool.length)];
}
