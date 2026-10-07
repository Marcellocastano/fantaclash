import {
  BracketMatch,
  currentRound,
  findUserMatch,
  involves,
  isUserEliminated,
  ROUND_LABELS,
  TournamentState,
} from '../../domain/tournament';
import { Footer } from '../Footer';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { TeamBadge } from './TeamBadge';
import { TournamentBracket } from './TournamentBracket';

interface TournamentHubProps {
  tournament: TournamentState;
  onPlay: (matchId: string) => void;
  onSimulate: (matchId: string) => void;
  onSimulateOthers: () => void;
  onSimulateRest: () => void;
  onConclude: () => void;
  onReset: () => void;
}

/**
 * Hub del torneo: tabellone sempre visibile, azione per ogni partita
 * pronta (Gioca per l'utente, Simula per le altre) e stato del percorso.
 */
export function TournamentHub({
  tournament,
  onPlay,
  onSimulate,
  onSimulateOthers,
  onSimulateRest,
  onConclude,
  onReset,
}: TournamentHubProps) {
  const round = currentRound(tournament.status);
  const userMatch = findUserMatch(tournament);
  const eliminated = isUserEliminated(tournament);
  const completed = tournament.status === 'completed';
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const champion = team(tournament.winnerId);
  const othersReady = tournament.bracket.some(
    m => m.round === round && !m.winnerId && m.homeId && m.awayId && !involves(m, tournament.userTeamId)
  );

  const renderAction = (m: BracketMatch) =>
    involves(m, tournament.userTeamId) ? (
      <button
        onClick={() => onPlay(m.id)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-pitch text-on-pitch font-display font-bold text-lg hover:bg-pitch/90 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
      >
        <Icon name="play" className="w-4 h-4" />
        Gioca
      </button>
    ) : (
      <button
        onClick={() => onSimulate(m.id)}
        className="w-full py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
      >
        Simula
      </button>
    );

  return (
    <div className="min-h-screen">
      <header className="border-b border-line-strong">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9" />
            <div>
              <p className="font-display text-2xl font-extrabold text-pitch leading-none">{tournament.name}</p>
              <p className="text-xs text-ink-muted">Serie A {tournament.seasonId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onReset}
              className="p-2 border border-danger/50 rounded-sm text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-danger"
              aria-label="Nuova partita"
              title="Nuova partita"
            >
              <Icon name="reset" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Stato del percorso dell'utente */}
        <section className="mb-10">
          {completed ? (
            <div className="motion-safe:animate-stamp">
              <div className="flex items-center gap-3">
                <Icon name="trophy" className="w-10 h-10 text-pitch" />
                <h1 className="font-display text-5xl md:text-6xl font-extrabold text-ink leading-none">
                  {champion?.isUserTeam ? 'Campione!' : `Vince ${champion?.name}`}
                </h1>
              </div>
              <button onClick={onConclude} className="btn-primary mt-6">
                Vedi il riepilogo
              </button>
            </div>
          ) : eliminated ? (
            <div>
              <h1 className="font-display text-5xl font-extrabold text-ink leading-none">Sei fuori dal torneo</h1>
              <p className="text-ink-soft mt-2">Puoi seguire il resto del tabellone o chiudere subito.</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button onClick={onSimulateRest} className="btn-ghost">
                  Vedi risultato
                </button>
                <button onClick={onConclude} className="btn-primary">
                  Concludi torneo
                </button>
              </div>
            </div>
          ) : userMatch && round ? (
            <div>
              <p className="font-display text-2xl font-bold text-ink-soft">{ROUND_LABELS[round]}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                <MatchupTeam team={team(userMatch.homeId)} />
                <span className="font-display text-3xl font-bold text-ink-muted">vs</span>
                <MatchupTeam team={team(userMatch.awayId)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button onClick={() => onPlay(userMatch.id)} className="btn-primary text-2xl px-10 inline-flex items-center justify-center gap-3">
                  <Icon name="play" className="w-5 h-5" />
                  Gioca
                </button>
                {othersReady && (
                  <button onClick={onSimulateOthers} className="btn-ghost">
                    Simula le altre partite
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="font-display text-2xl font-bold text-ink-soft">{round ? ROUND_LABELS[round] : ''}</p>
              <p className="text-ink-soft mt-1">Hai passato il turno: attendi gli avversari.</p>
              {othersReady && (
                <button onClick={onSimulateOthers} className="btn-primary mt-4">
                  Simula le altre partite
                </button>
              )}
            </div>
          )}
        </section>

        <TournamentBracket tournament={tournament} renderAction={completed ? undefined : renderAction} />
      </main>
      <Footer links={[]} />
    </div>
  );
}

function MatchupTeam({ team }: { team: ReturnType<TournamentState['teams']['find']> }) {
  return (
    <div className="flex items-center gap-3">
      <TeamBadge team={team} size="lg" />
      <div>
        <p className={`font-display text-4xl font-extrabold leading-none ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>{team?.name}</p>
        <p className="text-sm text-ink-muted mt-1">Forza {team?.rating}</p>
      </div>
    </div>
  );
}
