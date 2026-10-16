import { ReactNode } from 'react';
import {
  currentRound,
  findUserMatch,
  getMatchStatus,
  legResult,
  matchLegs,
  nextLeg,
  parseLegKey,
  tieScore,
  TournamentRound,
  TournamentState,
  TournamentTeam,
  involves,
  isUserEliminated,
} from '../../domain/tournament';
import { Icon } from '../Icon';
import { CatalogKey } from '../../i18n/translate';
import { useT } from '../../i18n/I18nProvider';
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

const ROUND_TITLE_KEY: Record<TournamentRound, CatalogKey> = {
  quarterfinals: 'tournament.bracket.quartersFull',
  semifinals: 'tournament.bracket.semi',
  final: 'tournament.bracket.final',
};

/** Pulsante principale: gara secca, andata o ritorno del confronto */
function playKey(round: TournamentRound, leg: 1 | 2 | undefined): CatalogKey {
  if (!leg) return `tournament.hub.play.${round}`;
  return leg === 1 ? `tournament.hub.playGo.${round}` : `tournament.hub.playBack.${round}`;
}

/**
 * Hub del torneo: in alto la prossima partita con un'unica azione
 * principale, sotto il tabellone (solo da leggere). Le partite degli altri
 * si simulano da sole quando finisce la tua.
 */
export function TournamentHub({ tournament, revealIds = [], onPlay, onCompleteRound, onSummary, controls }: TournamentHubProps) {
  const t = useT();
  const round = currentRound(tournament.status);
  const userMatch = findUserMatch(tournament);
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const champion = team(tournament.winnerId);
  // Confronti degli altri ancora da finire: gare pronte (andata o ritorno)
  const othersPending = tournament.bracket.some(
    m => m.round === round && !involves(m, tournament.userTeamId) && getMatchStatus(tournament, m) === 'ready'
  );

  let hero: ReactNode;
  if (tournament.status === 'completed') {
    hero = (
      <Hero kicker={tournament.name} title={champion?.isUserTeam ? t('tournament.hub.championTitle') : t('tournament.hub.cupTo', { name: champion?.name ?? '' })}>
        {controls ?? (
          <button onClick={onSummary} className="btn-cta">
            {t('tournament.hub.toSummary')}
            <Icon name="arrow" className="w-7 h-7" />
          </button>
        )}
      </Hero>
    );
  } else if (isUserEliminated(tournament)) {
    hero = (
      <Hero kicker={tournament.name} title={t('tournament.hub.eliminated')}>
        {controls ?? (
          <button onClick={onSummary} className="btn-cta">
            {t('tournament.hub.toSummary')}
          </button>
        )}
      </Hero>
    );
  } else if (userMatch && round) {
    const legs = matchLegs(userMatch);
    const leg = nextLeg(tournament, userMatch) ?? 1;
    const userMatchReady = getMatchStatus(tournament, userMatch) === 'ready';
    const userLegIsWaiting = !userMatchReady; // ritorno in attesa delle altre andate
    hero = (
      <section className="text-center">
        <p className="font-display text-2xl font-extrabold text-ink-muted">
          {tournament.name} · {t(ROUND_TITLE_KEY[round])}
          {legs === 2 && ` · ${t(leg === 1 ? 'tournament.hub.legGo' : 'tournament.hub.legBack')}`}
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8">
          <Side team={team(userMatch.homeId)} align="right" />
          <span className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-whistle leading-none">VS</span>
          <Side team={team(userMatch.awayId)} align="left" />
        </div>
        {legs === 2 && <TieTracker tournament={tournament} match={userMatch} />}
        <div className="mt-8">
          {controls ?? (
            userLegIsWaiting ? (
              <button onClick={onCompleteRound} className="btn-cta">
                <Icon name="play" className="w-7 h-7" />
                {t('tournament.hub.closeFirstLegs')}
              </button>
            ) : (
              <button onClick={() => onPlay(userMatch.id)} className="btn-cta">
                <Icon name="play" className="w-7 h-7" />
                {t(playKey(round, legs === 2 ? leg : undefined))}
              </button>
            )
          )}
        </div>
      </section>
    );
  } else {
    hero = (
      <Hero kicker={tournament.name} title={t('tournament.hub.othersWait')}>
        {(othersPending || controls) &&
          (controls ?? (
            <button onClick={onCompleteRound} className="btn-cta">
              {t('tournament.hub.completeRound')}
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
        <section className="mt-10" aria-label={t('tournament.hub.bracketAria')}>
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
  const t = useT();
  return (
    <div className={`flex items-center gap-4 min-w-0 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge team={team} size="lg" />
      <div className="min-w-0">
        <p className={`font-display text-2xl sm:text-3xl md:text-4xl font-black leading-none break-words ${team?.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
          {team?.name}
        </p>
        <p className="text-sm font-semibold text-ink-muted mt-1">{t('tournament.hub.strength', { rating: team?.rating ?? '' })}</p>
      </div>
    </div>
  );
}

/** Tracker del confronto a due gare: le due "tacche" e l'aggregato */
function TieTracker({ tournament, match }: { tournament: TournamentState; match: BracketMatchLike }) {
  const t = useT();
  const first = legResult(tournament, match, 1);
  const score = tieScore(tournament, match);
  const legBox = (label: string, r: { homeScore: number; awayScore: number } | undefined | null) => (
    <span
      className={`inline-flex flex-col items-center border-2 px-3 py-1.5 min-w-[4.5rem] ${
        r ? 'border-ink bg-canvas shadow-block-sm' : 'border-dashed border-ink-muted/50 text-ink-muted'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      <span className="font-display text-2xl font-black tabular-nums leading-none mt-0.5">
        {r ? `${r.homeScore}-${r.awayScore}` : '—'}
      </span>
    </span>
  );
  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {legBox(t('tournament.hub.legGo'), first)}
        <span className="text-ink-muted font-bold" aria-hidden="true">+</span>
        {legBox(t('tournament.hub.legBack'), legResult(tournament, match, 2))}
      </div>
      {first && (
        <p className="font-display text-lg font-extrabold text-ink tabular-nums">
          {t('tournament.hub.aggregate', { home: score.home, away: score.away })}
          {score.inProgress && t('tournament.hub.partial')}
          {score.shootout && t('tournament.hub.shootoutSuffix', { home: score.shootout.home, away: score.shootout.away })}
        </p>
      )}
    </div>
  );
}

type BracketMatchLike = TournamentState['bracket'][number];

/** Risultati delle gare simulate mentre giocavi, rivelate una alla volta */
function RoundResults({ tournament, ids }: { tournament: TournamentState; ids: string[] }) {
  const t = useT();
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const nameCls = (teamId: string | null, won: boolean) => {
    const mine = teamId === tournament.userTeamId;
    return `truncate text-sm sm:text-base ${won ? 'font-extrabold' : 'font-semibold'} ${mine ? 'text-highlight' : won ? 'text-canvas' : 'text-canvas/50'}`;
  };
  return (
    <section className="mt-10 max-w-4xl mx-auto bg-pitch-deep border-2 border-ink shadow-block" aria-label={t('tournament.hub.flashAria')}>
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-canvas/15">
        <span className="bg-whistle text-on-whistle border-2 border-ink px-2 py-0.5 font-display font-black text-lg">{t('tournament.hub.flash')}</span>
        <h2 className="font-display text-2xl font-extrabold text-canvas">{t('tournament.hub.flashTitle')}</h2>
      </div>
      <ul className="divide-y-2 divide-canvas/15">
        {ids.map((key, i) => {
          const { matchId: tieId, leg } = parseLegKey(key);
          const m = tournament.bracket.find(x => x.id === tieId);
          const r = tournament.matches[key];
          if (!m || !r) return null;
          const delay = i * REVEAL_STEP_MS;
          // Nomi in casa/fuori della gara giocata, non dei lati del tie
          const score = leg === 2 ? tieScore(tournament, m) : null;
          return (
            <li
              key={key}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 motion-safe:animate-reveal"
              style={{ animationDelay: `${delay}ms` }}
            >
              <span className="flex items-center justify-end gap-2 min-w-0">
                <span className={nameCls(r.homeTeamId, m.winnerId === r.homeTeamId)}>{team(r.homeTeamId)?.name}</span>
                <TeamBadge team={team(r.homeTeamId)} size="sm" />
              </span>
              <span className="flex flex-col items-center">
                {leg === 2 && (
                  <span className="mb-1 text-[10px] font-black uppercase tracking-wide text-canvas/60">{t('tournament.hub.rit')}</span>
                )}
                <span className="motion-safe:animate-stamp" style={{ animationDelay: `${delay}ms` }}>
                  <span className="inline-block bg-highlight text-on-highlight border-2 border-ink shadow-block-sm px-3 py-1 font-display text-2xl sm:text-3xl font-black tabular-nums leading-none">
                    {r.homeScore}-{r.awayScore}
                  </span>
                </span>
                {score && (
                  <span className="mt-1 bg-canvas/15 text-canvas border border-canvas/30 px-1.5 text-xs font-bold tabular-nums">
                    {t('tournament.hub.aggShort', { home: score.home, away: score.away })}
                  </span>
                )}
                {r.shootout && (
                  <span className="mt-1 bg-whistle text-on-whistle border border-ink px-1.5 text-xs font-bold">
                    {t('tournament.hub.shootoutShort', { home: r.shootout.home, away: r.shootout.away })}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <TeamBadge team={team(r.awayTeamId)} size="sm" />
                <span className={nameCls(r.awayTeamId, m.winnerId === r.awayTeamId)}>{team(r.awayTeamId)?.name}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
