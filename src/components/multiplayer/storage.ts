import { isKitId, KitId } from '../../domain/teamKits';

/** Nickname, nome squadra e colori sociali ricordati tra una stanza e l'altra */

const NICK_KEY = 'fanta-fc-mp-nickname';
const TEAM_KEY = 'fanta-fc-mp-team';
const KIT_KEY = 'fanta-fc-mp-kit';

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage non disponibile: niente da ricordare
  }
}

export const loadSavedNickname = () => read(NICK_KEY);
export const loadSavedTeamName = () => read(TEAM_KEY);
export const loadSavedKit = (): KitId | null => {
  const kit = read(KIT_KEY);
  return isKitId(kit) ? kit : null;
};
export const saveRoomProfile = (nickname: string, teamName: string, kit?: KitId) => {
  write(NICK_KEY, nickname);
  write(TEAM_KEY, teamName);
  if (kit) write(KIT_KEY, kit);
};
