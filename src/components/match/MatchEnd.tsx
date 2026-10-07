import { useEffect } from 'react';
import { formatMinute, LineupPlayer, MatchPlayerPerformance, MatchResult, shortName } from '../../domain/match';
import { TournamentRound } from '../../domain/tournament';
import { playSound } from '../../services/sound';
import { Icon } from '../Icon';
import { OvrBadge } from '../player/OvrBadge';

interface MatchEndProps {
  result: MatchResult;
  userTeamId: string;
  round: TournamentRound;
  onContinue: () => void;
  onConclude: () => void;
}

const NEXT_LABEL: Record<TournamentRound, string> = {
  quarterfinals: 'Avanti: semifinale',
  semifinals: 'Avanti: finale',
  final: 'Alla premiazione',
};

const signed = (x: number) => (x > 0 ? `+${x}` : `${x}`);

/**
 * Fischio finale: esito, marcatori, MVP e pagella della squadra
 * dell'utente. Un solo pulsante: avanti se hai vinto, chiudi il torneo se
 * hai perso.
 */
export function MatchEnd({ result, userTeamId, round, onContinue, onConclude }: MatchEndProps) {
  const won = result.winnerId === userTeamId;
  const champion = won && round === 'final';
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
        <p className="font-display text-7xl md:text-8xl font-black leading-none motion-safe:animate-stamp">
          {champion ? 'CAMPIONE!' : won ? 'PASSI IL TURNO' : 'ELIMINATO'}
        </p>
        <p className="font-display text-3xl font-extrabold mt-3 tabular-nums">
          {result.homeName} {result.homeScore}-{result.awayScore} {result.awayName}
          {result.shootout && <span className="block text-xl">rigori {result.shootout.home}-{result.shootout.away}</span>}
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-10 mt-10">
        {/* Marcatori */}
        <section className="md:col-span-4">
          <h3 className="section-heading mb-3">Marcatori</h3>
          <ul className="space-y-2">
            {goals.length === 0 && <li className="text-ink-muted">Nessun gol nei regolamentari.</li>}
            {goals.map(g => {
              const assist = result.events.find(e => e.type === 'assist' && e.tick === g.tick && e.relatedPlayerId === g.playerId);
              return (
                <li key={g.id} className="flex items-baseline gap-3">
                  <span className="w-12 font-display text-xl font-black tabular-nums text-ink-soft">{formatMinute(g.minute, g.extra)}</span>
                  <span className={`flex-1 ${g.side === userSide ? 'font-bold text-pitch' : 'text-ink'}`}>
                    {name(g.playerId)}
                    {g.type === 'own_goal' && ' (autogol)'}
                    {g.isPenalty && ' (rigore)'}
                    {assist && <span className="block text-sm text-ink-muted font-normal">assist {name(assist.playerId)}</span>}
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
          <h3 className="section-heading mb-3">MVP</h3>
          {mvp && <MvpCard perf={mvp} player={lineup.get(mvp.playerId)} />}
        </section>

        {/* Pagella */}
        <section className="md:col-span-5">
          <h3 className="section-heading mb-3">La tua pagella</h3>
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
            <span>Voto · bonus · fantavoto</span>
            <span className="tabular-nums">Totale {result.teamPerformance[userSide].toFixed(1)}</span>
          </p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <button onClick={won ? onContinue : onConclude} className="btn-cta">
          {won ? NEXT_LABEL[round] : 'Concludi torneo'}
          <Icon name="arrow" className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

function MvpCard({ perf, player }: { perf: MatchPlayerPerformance; player: LineupPlayer | undefined }) {
  return (
    <div className="panel shadow-block p-4">
      <div className="flex items-center gap-3">
        {player && <OvrBadge overall={player.overall} role={player.role} size="md" />}
        <div className="min-w-0">
          <p className="font-display text-3xl font-black leading-none truncate">{shortName(perf.name)}</p>
          <p className="text-sm text-ink-muted mt-1">
            {perf.goals > 0 && `${perf.goals} gol `}
            {perf.assists > 0 && `${perf.assists} assist`}
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-baseline justify-between border-t-2 border-line pt-3">
        <span className="text-sm font-semibold text-ink-muted">Fantavoto</span>
        <span className="font-display text-5xl font-black tabular-nums leading-none text-pitch">{perf.fantasyScore.toFixed(1)}</span>
      </p>
    </div>
  );
}
