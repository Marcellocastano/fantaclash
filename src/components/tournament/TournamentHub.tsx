import { ReactNode } from 'react';
import {
  currentRound,
  findUserMatch,
  involves,
  isUserEliminated,
  TournamentRound,
  TournamentState,
  TournamentTeam,
} from '../../domain/tournament';
import { Icon } from '../Icon';
import { StreamerReserve } from '../layout/GameShell';
import { TeamBadge } from './TeamBadge';
import { REVEAL_STEP_MS, TournamentBracket } from './TournamentBracket';

interface TournamentHubProps {
  tournament: TournamentState;
  /** Partite appena simulate (risultati rivelati in sequenza) */
  revealIds?: string[];
  onPlay: (matchId: string) => void;
  /** Simula le partite del turno rimaste (salvataggi a metà turno) */
  onCompleteRound: () => void;
  /** Chiude il torneo e va al riepilogo */
  onSummary: () => void;
  /**
   * Controlli dell'hero al posto dei pulsanti (stanza multiplayer:
   * niente "Gioca", l'host simula il turno, gli altri aspettano).
   */
  controls?: ReactNode;
}

const PLAY_LABEL: Record<TournamentRound, string> = {
  quarterfinals: 'Gioca i quarti di finale',
  semifinals: 'Gioca la semifinale',
  final: 'Gioca la finale',
};

const ROUND_TITLE: Record<TournamentRound, string> = {
  quarterfinals: 'Quarti di finale',
  semifinals: 'Semifinale',
  final: 'Finale',
};

/**
 * Hub del torneo: in alto la prossima partita con un'unica azione
 * principale, sotto il tabellone (solo da leggere). Le partite degli altri
 * si simulano da sole quando finisce la tua.
 */
export function TournamentHub({ tournament, revealIds = [], onPlay, onCompleteRound, onSummary, controls }: TournamentHubProps) {
  const round = currentRound(tournament.status);
  const userMatch = findUserMatch(tournament);
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const champion = team(tournament.winnerId);
  const othersPending = tournament.bracket.some(
    m => m.round === round && !m.winnerId && m.homeId && m.awayId && !involves(m, tournament.userTeamId)
  );

  let hero: ReactNode;
  if (tournament.status === 'completed') {
    hero = (
      <Hero kicker={tournament.name} title={champion?.isUserTeam ? 'Campione!' : `Coppa a ${champion?.name ?? ''}`}>
        {controls ?? (
          <button onClick={onSummary} className="btn-cta">
            Vai al riepilogo
            <Icon name="arrow" className="w-7 h-7" />
          </button>
        )}
      </Hero>
    );
  } else if (isUserEliminated(tournament)) {
    hero = (
      <Hero kicker={tournament.name} title="Sei fuori dal torneo">
        {controls ?? (
          <button onClick={onSummary} className="btn-cta">
            Vai al riepilogo
          </button>
        )}
      </Hero>
    );
  } else if (userMatch && round) {
    hero = (
      <section className="text-center">
        <p className="font-display text-2xl font-extrabold text-ink-muted">{tournament.name} · {ROUND_TITLE[round]}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8">
          <Side team={team(userMatch.homeId)} align="right" />
          <span className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-whistle leading-none">VS</span>
          <Side team={team(userMatch.awayId)} align="left" />
        </div>
        <div className="mt-8">
          {controls ?? (
            <button onClick={() => onPlay(userMatch.id)} className="btn-cta">
              <Icon name="play" className="w-7 h-7" />
              {PLAY_LABEL[round]}
            </button>
          )}
        </div>
      </section>
    );
  } else {
    hero = (
      <Hero kicker={tournament.name} title="Gli altri devono ancora giocare">
        {(othersPending || controls) &&
          (controls ?? (
            <button onClick={onCompleteRound} className="btn-cta">
              Completa il turno
            </button>
          ))}
      </Hero>
    );
  }

  return (
    <StreamerReserve>
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8">
        {hero}
        {revealIds.length > 0 && <RoundResults tournament={tournament} ids={revealIds} />}
        <section className="mt-10" aria-label="Tabellone">
          <TournamentBracket tournament={tournament} revealIds={revealIds} />
        </section>
      </div>
    </StreamerReserve>
  );
}

function Hero({ kicker, title, children }: { kicker?: string; title: string; children: ReactNode }) {
  return (
    <section className="text-center motion-safe:animate-stamp">
      {kicker && (
        <p className="font-display text-2xl font-extrabold text-ink-muted mb-3">{kicker}</p>
      )}
      <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black text-ink leading-none break-words">{title}</h1>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Side({ team, align }: { team: TournamentTeam | undefined; align: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-4 min-w-0 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="lg" />
      <div className="min-w-0">
        <p className={`font-display text-2xl sm:text-3xl md:text-4xl font-black leading-none break-words ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
          {team?.name}
        </p>
        <p className="text-sm font-semibold text-ink-muted mt-1">Forza {team?.rating}</p>
      </div>
    </div>
  );
}

/** Risultati delle partite simulate mentre giocavi, rivelati uno alla volta */
function RoundResults({ tournament, ids }: { tournament: TournamentState; ids: string[] }) {
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const nameCls = (teamId: string | null, won: boolean) => {
    const mine = teamId === tournament.userTeamId;
    return `truncate text-sm sm:text-base ${won ? 'font-extrabold' : 'font-semibold'} ${mine ? 'text-highlight' : won ? 'text-canvas' : 'text-canvas/50'}`;
  };
  return (
    <section className="mt-10 max-w-4xl mx-auto bg-pitch-deep border-2 border-ink shadow-block" aria-label="Risultati degli altri campi">
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-canvas/15">
        <span className="bg-whistle text-on-whistle border-2 border-ink px-2 py-0.5 font-display font-black text-lg">Flash</span>
        <h2 className="font-display text-2xl font-extrabold text-canvas">Intanto sugli altri campi</h2>
      </div>
      <ul className="divide-y-2 divide-canvas/15">
        {ids.map((id, i) => {
          const m = tournament.bracket.find(x => x.id === id);
          const r = tournament.matches[id];
          if (!m || !r) return null;
          const delay = i * REVEAL_STEP_MS;
          return (
            <li
              key={id}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 motion-safe:animate-reveal"
              style={{ animationDelay: `${delay}ms` }}
            >
              <span className="flex items-center justify-end gap-2 min-w-0">
                <span className={nameCls(m.homeId, m.winnerId === m.homeId)}>{team(m.homeId)?.name}</span>
                <TeamBadge team={team(m.homeId)} size="sm" />
              </span>
              <span className="flex flex-col items-center">
                <span className="motion-safe:animate-stamp" style={{ animationDelay: `${delay}ms` }}>
                  <span className="inline-block bg-highlight text-on-highlight border-2 border-ink shadow-block-sm px-3 py-1 font-display text-2xl sm:text-3xl font-black tabular-nums leading-none">
                    {r.homeScore}-{r.awayScore}
                  </span>
                </span>
                {r.shootout && (
                  <span className="mt-1 bg-whistle text-on-whistle border border-ink px-1.5 text-xs font-bold">
                    Rigori {r.shootout.home}-{r.shootout.away}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <TeamBadge team={team(m.awayId)} size="sm" />
                <span className={nameCls(m.awayId, m.winnerId === m.awayId)}>{team(m.awayId)?.name}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
