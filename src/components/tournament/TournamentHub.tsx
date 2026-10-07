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
export function TournamentHub({ tournament, revealIds = [], onPlay, onCompleteRound, onSummary }: TournamentHubProps) {
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
      <Hero title={champion?.isUserTeam ? 'Campione!' : `Coppa a ${champion?.name ?? ''}`}>
        <button onClick={onSummary} className="btn-cta">
          Vai al riepilogo
          <Icon name="arrow" className="w-7 h-7" />
        </button>
      </Hero>
    );
  } else if (isUserEliminated(tournament)) {
    hero = (
      <Hero title="Sei fuori dal torneo">
        <button onClick={onSummary} className="btn-cta">
          Vai al riepilogo
        </button>
      </Hero>
    );
  } else if (userMatch && round) {
    hero = (
      <section className="text-center">
        <p className="font-display text-2xl font-extrabold text-ink-muted">{ROUND_TITLE[round]}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8">
          <Side team={team(userMatch.homeId)} align="right" />
          <span className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-whistle leading-none">VS</span>
          <Side team={team(userMatch.awayId)} align="left" />
        </div>
        <button onClick={() => onPlay(userMatch.id)} className="btn-cta mt-8">
          <Icon name="play" className="w-7 h-7" />
          {PLAY_LABEL[round]}
        </button>
      </section>
    );
  } else {
    hero = (
      <Hero title="Gli altri devono ancora giocare">
        {othersPending && (
          <button onClick={onCompleteRound} className="btn-cta">
            Completa il turno
          </button>
        )}
      </Hero>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8">
      {hero}
      {revealIds.length > 0 && <RoundResults tournament={tournament} ids={revealIds} />}
      <section className="mt-10" aria-label="Tabellone">
        <TournamentBracket tournament={tournament} revealIds={revealIds} />
      </section>
    </div>
  );
}

function Hero({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="text-center motion-safe:animate-stamp">
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
  return (
    <section className="mt-8 flex flex-wrap items-baseline justify-center gap-x-8 gap-y-2" aria-label="Risultati degli altri campi">
      <h2 className="font-display text-xl font-extrabold text-ink-muted">Intanto sugli altri campi</h2>
      {ids.map((id, i) => {
        const m = tournament.bracket.find(x => x.id === id);
        const r = tournament.matches[id];
        if (!m || !r) return null;
        const name = (teamId: string | null) => (
          <span className={m.winnerId === teamId ? 'font-bold text-ink' : 'text-ink-muted'}>{team(teamId)?.name}</span>
        );
        return (
          <p key={id} className="flex items-baseline gap-2 motion-safe:animate-reveal" style={{ animationDelay: `${i * REVEAL_STEP_MS}ms` }}>
            {name(m.homeId)}
            <span className="font-display text-2xl font-black tabular-nums text-ink">
              {r.homeScore}-{r.awayScore}
            </span>
            {name(m.awayId)}
            {r.shootout && <span className="text-xs font-bold text-ink-muted">rig. {r.shootout.home}-{r.shootout.away}</span>}
          </p>
        );
      })}
    </section>
  );
}
