/** Nickname e nome squadra ricordati tra una stanza e l'altra */

const NICK_KEY = 'fanta-fc-mp-nickname';
const TEAM_KEY = 'fanta-fc-mp-team';

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
export const saveRoomProfile = (nickname: string, teamName: string) => {
  write(NICK_KEY, nickname);
  write(TEAM_KEY, teamName);
};
