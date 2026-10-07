import { formatMinute, MatchPlayerPerformance, MatchResult, shortName } from '../../domain/match';
import { Icon } from '../Icon';

interface MatchEndProps {
  result: MatchResult;
  userTeamId: string;
  onContinue: () => void;
  onViewResult: () => void;
  onConclude: () => void;
}

function signed(x: number): string {
  return x > 0 ? `+${x}` : `${x}`;
}

/**
 * Fischio finale: risultato, marcatori e assist, MVP, migliore e
 * peggiore, pagella della squadra utente con bonus e malus.
 */
export function MatchEnd({ result, userTeamId, onContinue, onViewResult, onConclude }: MatchEndProps) {
  const won = result.winnerId === userTeamId;
  const userSide = result.homeTeamId === userTeamId ? 'home' : 'away';
  const names = new Map([...result.lineups.home, ...result.lineups.away].map(p => [p.playerId, shortName(p.name)]));
  const goals = result.events.filter(e => e.type === 'goal' || e.type === 'own_goal');
  const perf = (id: string) => result.playerPerformances.find(p => p.playerId === id);
  const mvp = perf(result.mvpId);
  const worst = perf(result.worstId);
  const userPerf = result.playerPerformances.filter(p => p.side === userSide);
  const best = [...userPerf].sort((a, b) => b.fantasyScore - a.fantasyScore)[0];

  return (
    <div className="motion-safe:animate-reveal">
      <div className="flex items-center gap-3 mb-1">
        <Icon name="whistle" className="w-6 h-6 text-ink-soft" />
        <p className="font-display text-2xl font-bold text-ink-soft">Fischio finale</p>
      </div>
      <p className={`font-display text-5xl font-extrabold leading-none mb-6 ${won ? 'text-ok' : 'text-ink'}`}>
        {won ? 'Passi il turno!' : 'Eliminato'}
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="section-heading mb-1">Marcatori</h3>
          <ul className="divide-y divide-line">
            {goals.length === 0 && <li className="py-2 text-sm text-ink-muted">Nessun gol nei regolamentari.</li>}
            {goals.map(g => {
              const assist = result.events.find(e => e.type === 'assist' && e.tick === g.tick && e.relatedPlayerId === g.playerId);
              return (
                <li key={g.id} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="w-12 font-display font-bold tabular-nums text-ink-soft">{formatMinute(g.minute, g.extra)}</span>
                  <span className={`flex-1 ${g.side === userSide ? 'text-pitch font-semibold' : 'text-ink'}`}>
                    {names.get(g.playerId ?? '')}
                    {g.type === 'own_goal' && ' (autogol)'}
                    {g.isPenalty && ' (rigore)'}
                    {assist && <span className="text-ink-muted font-normal"> · assist {names.get(assist.playerId ?? '')}</span>}
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    {g.score?.home} - {g.score?.away}
                  </span>
                </li>
              );
            })}
          </ul>
          {result.shootout && (
            <p className="mt-3 text-sm text-ink-soft">
              Rigori: <span className="font-semibold text-ink tabular-nums">{result.shootout.home} - {result.shootout.away}</span>
            </p>
          )}

          <dl className="mt-6 divide-y divide-line text-sm">
            <Award label="MVP" p={mvp} />
            <Award label="Migliore dei tuoi" p={best} />
            <Award label="Peggiore in campo" p={worst} />
          </dl>
        </div>

        <div>
          <h3 className="section-heading mb-1">Pagella</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted text-xs">
                <th className="text-left font-medium py-1">Giocatore</th>
                <th className="text-right font-medium">Voto</th>
                <th className="text-right font-medium">Bonus</th>
                <th className="text-right font-medium">Fantavoto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {userPerf.map(p => (
                <tr key={p.playerId}>
                  <td className="py-1.5 text-ink">{shortName(p.name)}</td>
                  <td className="text-right tabular-nums">{p.rating.toFixed(1)}</td>
                  <td className={`text-right tabular-nums ${p.bonus > 0 ? 'text-ok' : p.bonus < 0 ? 'text-danger' : 'text-ink-muted'}`}>
                    {p.bonus === 0 ? '-' : signed(p.bonus)}
                  </td>
                  <td className="text-right font-display font-bold tabular-nums">{p.fantasyScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-muted mt-2 tabular-nums">
            Totale squadra {result.teamPerformance[userSide].toFixed(1)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {won ? (
          <button onClick={onContinue} className="btn-primary sm:min-w-[240px]">
            Continua
          </button>
        ) : (
          <>
            <button onClick={onViewResult} className="btn-ghost sm:min-w-[200px]">
              Vedi risultato
            </button>
            <button onClick={onConclude} className="btn-primary sm:min-w-[240px]">
              Concludi torneo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Award({ label, p }: { label: string; p: MatchPlayerPerformance | undefined }) {
  if (!p) return null;
  return (
    <div className="flex items-baseline justify-between py-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">
        <span className="font-semibold">{shortName(p.name)}</span>
        <span className="text-ink-muted tabular-nums"> · {p.fantasyScore.toFixed(1)}</span>
      </dd>
    </div>
  );
}
