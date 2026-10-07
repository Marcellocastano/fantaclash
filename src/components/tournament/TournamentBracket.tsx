import {
  BracketMatch,
  getMatchStatus,
  getTeamOutcome,
  roundMatches,
  TournamentState,
  TournamentTeam,
} from '../../domain/tournament';
import { Icon } from '../Icon';
import { TeamBadge } from './TeamBadge';

interface TournamentBracketProps {
  tournament: TournamentState;
  /** Partite appena simulate: il risultato compare con un timbro, in sequenza */
  revealIds?: string[];
}

/** Ritardo tra un risultato e il successivo nella rivelazione (ms) */
export const REVEAL_STEP_MS = 650;

type Side = 'left' | 'right';

/**
 * Tabellone a specchio su "lavagna" verde: quarti alle estremità,
 * semifinali verso il centro, finale e coppa al centro. Ogni metà ha due
 * quarti che confluiscono in una semifinale, così sta tutto in poca
 * altezza. Il percorso dell'utente (partite e collegamenti) è giallo.
 */
export function TournamentBracket({ tournament, revealIds = [] }: TournamentBracketProps) {
  const qf = roundMatches(tournament.bracket, 'quarterfinals');
  const sf = roundMatches(tournament.bracket, 'semifinals');
  const final = roundMatches(tournament.bracket, 'final')[0];
  const champion = tournament.teams.find(t => t.id === tournament.winnerId);
  const userId = tournament.userTeamId;
  /** Collegamento in giallo se l'utente ha vinto la partita da cui parte */
  const lineTone = (matches: BracketMatch[]) => (matches.some(m => m.winnerId === userId) ? 'border-highlight' : 'border-canvas/30');

  const box = (m: BracketMatch) => {
    const order = revealIds.indexOf(m.id);
    return <MatchBox key={m.id} match={m} tournament={tournament} revealDelay={order >= 0 ? order * REVEAL_STEP_MS : null} />;
  };

  /** Due quarti che confluiscono in una semifinale, specchiati a destra */
  const half = (side: Side, quarters: BracketMatch[], semi: BracketMatch) => {
    const outer = side === 'left' ? '-right-4 border-r-2' : '-left-4 border-l-2';
    const inner = side === 'left' ? '-left-4' : '-right-4';
    const toFinal = side === 'left' ? '-right-4' : '-left-4';
    const quartersCol = (
      <div className="relative flex flex-col justify-around">
        {quarters.map(box)}
        <span className={`absolute ${outer} top-[calc(25%-1px)] bottom-[calc(25%-1px)] w-4 border-y-2 ${lineTone(quarters)}`} aria-hidden="true" />
      </div>
    );
    const semiCol = (
      <div className="relative flex items-center">
        <span className={`absolute ${inner} top-[calc(50%-1px)] w-4 border-t-2 ${lineTone(quarters)}`} aria-hidden="true" />
        {box(semi)}
        <span className={`absolute ${toFinal} top-[calc(50%-1px)] w-4 border-t-2 ${lineTone([semi])}`} aria-hidden="true" />
      </div>
    );
    return side === 'left' ? [quartersCol, semiCol] : [semiCol, quartersCol];
  };

  const [qfLeft, sfLeft] = half('left', qf.slice(0, 2), sf[0]);
  const [sfRight, qfRight] = half('right', qf.slice(2, 4), sf[1]);

  return (
    <>
      {/* Mobile: tabellone verticale a blocchi, niente scroll orizzontale */}
      <MobileBracket tournament={tournament} revealIds={revealIds} />
      {/* Desktop: tabellone a specchio */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div className="relative min-w-[980px] bg-pitch-deep border-2 border-ink shadow-block px-6 pt-5 pb-7 text-canvas">
        {/* Linee del campo in trasparenza */}
        <span className="absolute inset-y-0 left-1/2 w-0.5 bg-canvas/10" aria-hidden="true" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 mb-4 font-display text-lg font-extrabold text-canvas/60 text-center">
          <span>Quarti</span>
          <span>Semifinale</span>
          <span className="text-highlight">Finale</span>
          <span>Semifinale</span>
          <span>Quarti</span>
        </div>

        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 min-h-[290px]">
          <span className="absolute left-1/2 top-1/2 w-56 h-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas/10" aria-hidden="true" />
          {qfLeft}
          {sfLeft}

          {/* Centro: la finale sta esattamente a metà altezza (allineata ai
              collegamenti delle semifinali), coppa e campione sopra */}
          <div className="relative flex items-center">
            <div className="absolute inset-x-0 bottom-[calc(50%+3.5rem)] flex justify-center">
              {champion ? (
                <div
                  key={champion.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 border-2 border-ink motion-safe:animate-stamp ${
                    champion.isUserTeam ? 'bg-highlight text-on-highlight shadow-block-sm' : 'bg-canvas text-ink'
                  }`}
                >
                  <Icon name="trophy" className="w-8 h-8 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">Campione</span>
                    <span className="block font-display text-2xl font-black leading-none truncate">{champion.name}</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-canvas/60">
                  <Icon name="trophy" className="w-12 h-12 text-highlight" />
                  <span className="text-sm font-semibold mt-1">Da decidere</span>
                </div>
              )}
            </div>
            {box(final)}
          </div>

          {sfRight}
          {qfRight}
        </div>
      </div>
    </div>
    </>
  );
}

interface MatchBoxProps {
  match: BracketMatch;
  tournament: TournamentState;
  revealDelay: number | null;
}

/** Tabellone compatto per mobile: tre blocchi verticali (quarti, semifinali, finale) */
function MobileBracket({ tournament, revealIds = [] }: TournamentBracketProps) {
  const qf = roundMatches(tournament.bracket, 'quarterfinals');
  const sf = roundMatches(tournament.bracket, 'semifinals');
  const final = roundMatches(tournament.bracket, 'final')[0];
  const champion = tournament.teams.find(t => t.id === tournament.winnerId);
  const box = (m: BracketMatch) => {
    const order = revealIds.indexOf(m.id);
    return <MatchBox key={m.id} match={m} tournament={tournament} revealDelay={order >= 0 ? order * REVEAL_STEP_MS : null} />;
  };
  return (
    <div className="md:hidden bg-pitch-deep border-2 border-ink shadow-block p-4 text-canvas">
      {champion && (
        <div className="mb-4 flex items-center gap-3 border-2 border-ink bg-highlight px-3 py-2 text-on-highlight">
          <Icon name="trophy" className="w-7 h-7 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide">Campione</p>
            <p className="font-display text-2xl font-black leading-none truncate">{champion.name}</p>
          </div>
        </div>
      )}

      <section>
        <h3 className="font-display text-lg font-extrabold text-canvas/60 mb-2">Quarti di finale</h3>
        <div className="grid sm:grid-cols-2 gap-2">{qf.map(box)}</div>
      </section>

      <section className="mt-4">
        <h3 className="font-display text-lg font-extrabold text-canvas/60 mb-2">Semifinali</h3>
        <div className="grid sm:grid-cols-2 gap-2">{sf.map(box)}</div>
      </section>

      <section className="mt-4">
        <h3 className="font-display text-lg font-extrabold text-highlight mb-2">Finale</h3>
        <div>{box(final)}</div>
      </section>

      {!champion && (
        <div className="mt-4 flex flex-col items-center justify-center text-canvas/60">
          <Icon name="trophy" className="w-10 h-10 text-highlight" />
          <span className="mt-1 text-sm font-semibold">Coppa da assegnare</span>
        </div>
      )}
    </div>
  );
}

function MatchBox({ match, tournament, revealDelay }: MatchBoxProps) {
  const status = getMatchStatus(tournament, match);
  const result = tournament.matches[match.id];
  const team = (id: string | null) => tournament.teams.find(t => t.id === id);
  const isUserMatch = match.homeId === tournament.userTeamId || match.awayId === tournament.userTeamId;
  const empty = status === 'upcoming' && !match.homeId && !match.awayId;
  const tone = empty ? 'border-dashed border-canvas/30 bg-transparent' : isUserMatch ? 'border-highlight bg-canvas' : 'border-ink bg-canvas';
  const row = (id: string | null, side: 'home' | 'away') => (
    <TeamRow
      team={team(id)}
      score={result ? (side === 'home' ? result.homeScore : result.awayScore) : null}
      shootout={result?.shootout?.[side] ?? null}
      outcome={getTeamOutcome(match, id)}
      revealDelay={revealDelay}
      onDark={empty}
    />
  );

  return (
    <div className={`w-full border-2 ${tone} ${isUserMatch ? 'outline outline-2 outline-highlight' : ''}`}>
      {row(match.homeId, 'home')}
      <div className={`border-t-2 ${empty ? 'border-dashed border-canvas/30' : 'border-line'}`} />
      {row(match.awayId, 'away')}
    </div>
  );
}

interface TeamRowProps {
  team: TournamentTeam | undefined;
  score: number | null;
  shootout: number | null;
  outcome: 'winner' | 'eliminated' | 'pending';
  revealDelay: number | null;
  /** Riga dentro un riquadro vuoto sul verde: segnaposto chiari */
  onDark: boolean;
}

function TeamRow({ team, score, shootout, outcome, revealDelay, onDark }: TeamRowProps) {
  const reveal = revealDelay !== null;
  const revealStyle = reveal ? { animationDelay: `${revealDelay}ms` } : undefined;
  const nameClass =
    outcome === 'eliminated'
      ? 'text-ink-muted line-through decoration-2'
      : team?.isUserTeam
        ? 'text-pitch font-bold'
        : outcome === 'winner'
          ? 'text-ink font-bold'
          : 'text-ink';
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 min-w-0 min-h-[2.5rem]">
      {team ? (
        <TeamBadge team={team} />
      ) : (
        <span className={`w-7 h-7 shrink-0 border-2 border-dashed ${onDark ? 'border-canvas/30' : 'border-line-strong'}`} aria-hidden="true" />
      )}
      <span
        className={`flex-1 min-w-0 truncate text-sm ${team ? nameClass : onDark ? 'text-canvas/50' : 'text-ink-faint'} ${reveal ? 'motion-safe:animate-reveal' : ''}`}
        style={revealStyle}
        title={team?.name}
      >
        {team ? team.name : 'In attesa'}
      </span>
      {score !== null && (
        <span
          className={`font-display text-xl leading-none tabular-nums ${outcome === 'winner' ? 'font-black text-ink' : 'font-bold text-ink-muted'} ${
            reveal ? 'inline-block motion-safe:animate-stamp' : ''
          }`}
          style={revealStyle}
        >
          {score}
          {shootout !== null && <span className="text-xs font-bold text-ink-muted"> ({shootout})</span>}
        </span>
      )}
    </div>
  );
}
