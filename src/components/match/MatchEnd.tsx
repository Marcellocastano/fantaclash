import { useEffect } from 'react';
import { formatMinute, LineupPlayer, MatchPlayerPerformance, MatchResult, shortName } from '../../domain/match';
import { TournamentRound } from '../../domain/tournament';
import { CatalogKey } from '../../i18n/translate';
import { useT } from '../../i18n/I18nProvider';
import { playSound } from '../../services/sound';
import { Icon } from '../Icon';
import { OvrBadge } from '../player/OvrBadge';

interface MatchEndProps {
  result: MatchResult;
  userTeamId: string;
  round: TournamentRound;
  /** Gara del confronto a due: 1 = andata (il pari vale), 2 = ritorno */
  leg?: 1 | 2;
  /** Risultato dell'andata dai lati del tie (solo al ritorno) */
  firstLeg?: MatchResult;
  onContinue: () => void;
  onConclude: () => void;
  /** Stanza: sostituisce i due pulsanti con un'unica uscita locale */
  exitLabel?: string;
}

const NEXT_KEY: Record<TournamentRound, CatalogKey> = {
  quarterfinals: 'match.end.next.quarterfinals',
  semifinals: 'match.end.next.semifinals',
  final: 'match.end.next.final',
};

const signed = (x: number) => (x > 0 ? `+${x}` : `${x}`);

/**
 * Fischio finale: esito, marcatori, MVP e pagella della squadra
 * dell'utente. Un solo pulsante: avanti se hai vinto, chiudi il torneo se
 * hai perso.
 */
export function MatchEnd({ result, userTeamId, round, leg, firstLeg, onContinue, onConclude, exitLabel }: MatchEndProps) {
  const t = useT();
  // All'andata non c'è un vincitore del confronto: conta solo chi è avanti
  const firstLegDone = leg === 1;
  const won = result.winnerId === userTeamId;
  const champion = !firstLegDone && won && round === 'final';
  const ahead = firstLegDone && result.winnerId === userTeamId;
  const behind = firstLegDone && result.winnerId !== null && result.winnerId !== userTeamId;
  const headline = firstLegDone
    ? t('match.end.firstLeg')
    : champion
      ? t('match.end.champion')
      : won
        ? t('match.end.advance')
        : t('match.end.out');
  const subtitle = firstLegDone
    ? t(ahead ? 'match.end.aheadSub' : behind ? 'match.end.behindSub' : 'match.end.evenSub')
    : null;
  // Al ritorno: le due gare e l'aggregato sotto il punteggio
  const tieLine =
    leg === 2 && firstLeg
      ? t('match.end.tieLine', {
          l1h: firstLeg.homeScore,
          l1a: firstLeg.awayScore,
          l2h: result.homeScore,
          l2a: result.awayScore,
          ah: firstLeg.homeScore + result.awayScore,
          aa: firstLeg.awayScore + result.homeScore,
        })
      : null;
  const userSide = result.homeTeamId === userTeamId ? 'home' : 'away';
  const lineup = new Map([...result.lineups.home, ...result.lineups.away].map(p => [p.playerId, p]));
  const name = (id: string | undefined) => shortName(lineup.get(id ?? '')?.name ?? '');
  const goals = result.events.filter(e => e.type === 'goal' || e.type === 'own_goal');
  const mvp = result.playerPerformances.find(p => p.playerId === result.mvpId);
  const userPerf = result.playerPerformances.filter(p => p.side === userSide);

  useEffect(() => {
    playSound(champion ? 'cup' : won ? 'won' : 'whistle');
  }, [champion, won]);

  return (
    <div className="motion-safe:animate-reveal">
      {/* Esito */}
      <div className={`border-2 border-ink shadow-block px-6 py-6 text-center ${won ? 'bg-highlight text-on-highlight' : 'bg-ink text-canvas'}`}>
        <p className="font-display text-5xl md:text-8xl font-black leading-none motion-safe:animate-stamp break-words">
          {headline}
        </p>
        {subtitle && <p className="mt-2 font-bold text-lg opacity-80">{subtitle}</p>}
        <p className="font-display text-2xl sm:text-3xl font-extrabold mt-3 tabular-nums break-words">
          {result.homeName} {result.homeScore}-{result.awayScore} {result.awayName}
          {result.shootout && (
            <span className="block text-xl">
              {t('match.end.shootoutScore', { home: result.shootout.home, away: result.shootout.away })}
            </span>
          )}
        </p>
        {tieLine && <p className="mt-1 text-sm font-semibold tabular-nums opacity-80">{tieLine}</p>}
      </div>

      <div className="grid md:grid-cols-12 gap-10 mt-10">
        {/* Marcatori */}
        <section className="md:col-span-4">
          <h3 className="section-heading mb-3">{t('match.end.scorers')}</h3>
          <ul className="space-y-2">
            {goals.length === 0 && <li className="text-ink-muted">{t('match.end.noGoals')}</li>}
            {goals.map(g => {
              const assist = result.events.find(e => e.type === 'assist' && e.tick === g.tick && e.relatedPlayerId === g.playerId);
              return (
                <li key={g.id} className="flex items-baseline gap-3">
                  <span className="w-12 font-display text-xl font-black tabular-nums text-ink-soft">{formatMinute(g.minute, g.extra)}</span>
                  <span className={`flex-1 ${g.side === userSide ? 'font-bold text-pitch' : 'text-ink'}`}>
                    {name(g.playerId)}
                    {g.type === 'own_goal' && ` ${t('match.end.ownGoal')}`}
                    {g.isPenalty && ` ${t('match.end.pen')}`}
                    {assist && <span className="block text-sm text-ink-muted font-normal">{t('match.end.assist', { name: name(assist.playerId) })}</span>}
                  </span>
                  <span className="font-display text-xl font-extrabold tabular-nums">
                    {g.score?.home}-{g.score?.away}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* MVP */}
        <section className="md:col-span-3">
          <h3 className="section-heading mb-3">{t('match.end.mvp')}</h3>
          {mvp && <MvpCard perf={mvp} player={lineup.get(mvp.playerId)} />}
        </section>

        {/* Pagella */}
        <section className="md:col-span-5">
          <h3 className="section-heading mb-3">{t('match.end.reportCard')}</h3>
          <ul className="divide-y-2 divide-line">
            {userPerf.map(p => (
              <li key={p.playerId} className="flex items-center gap-3 py-1.5">
                <span className="flex-1 truncate">{shortName(p.name)}</span>
                <span className="w-10 text-right tabular-nums text-ink-soft">{p.rating.toFixed(1)}</span>
                <span className={`w-10 text-right tabular-nums font-semibold ${p.bonus > 0 ? 'text-pitch' : p.bonus < 0 ? 'text-danger' : 'text-ink-faint'}`}>
                  {p.bonus === 0 ? '-' : signed(p.bonus)}
                </span>
                <span className="w-12 text-right font-display text-xl font-black tabular-nums">{p.fantasyScore.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between text-sm text-ink-muted mt-2">
            <span>{t('match.end.cols')}</span>
            <span className="tabular-nums">{t('match.end.total', { score: result.teamPerformance[userSide].toFixed(1) })}</span>
          </p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <button onClick={firstLegDone || won ? onContinue : onConclude} className="btn-cta">
          {exitLabel ?? (firstLegDone ? t('match.end.nextLeg') : won ? t(NEXT_KEY[round]) : t('match.end.endTournament'))}
          <Icon name="arrow" className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

function MvpCard({ perf, player }: { perf: MatchPlayerPerformance; player: LineupPlayer | undefined }) {
  const t = useT();
  return (
    <div className="panel shadow-block p-4">
      <div className="flex items-center gap-3">
        {player && <OvrBadge overall={player.overall} role={player.role} size="md" />}
        <div className="min-w-0">
          <p className="font-display text-2xl sm:text-3xl font-black leading-none truncate">{shortName(perf.name)}</p>
          <p className="text-sm text-ink-muted mt-1">
            {perf.goals > 0 && `${t('match.end.mvpGoals', { n: perf.goals })} `}
            {perf.assists > 0 && t('match.end.mvpAssists', { n: perf.assists })}
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-baseline justify-between border-t-2 border-line pt-3">
        <span className="text-sm font-semibold text-ink-muted">{t('match.end.fantasy')}</span>
        <span className="font-display text-5xl font-black tabular-nums leading-none text-pitch">{perf.fantasyScore.toFixed(1)}</span>
      </p>
    </div>
  );
}
