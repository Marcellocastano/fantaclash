import { forwardRef } from 'react';
import { TournamentSummary } from '../../domain/tournament';
import { PlayerRole } from '../../types';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';

const ROLE_LABEL: Record<PlayerRole, string> = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };
const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];

/**
 * Card condivisibile del torneo, renderizzabile ovunque (riepilogo,
 * anteprima di condivisione). Colori fissi del marchio, uguali in
 * entrambi i temi, come il logo: l'esportazione PNG (shareCard.ts)
 * riproduce la stessa composizione.
 */
export const TournamentSummaryCard = forwardRef<HTMLDivElement, { summary: TournamentSummary }>(
  function TournamentSummaryCard({ summary }, ref) {
    const champion = summary.placement === 'campione';
    return (
      <div
        ref={ref}
        className="w-full max-w-[380px] text-brand-ivory bg-brand-forest p-6 border-4 border-brand-peach"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold">
            <LogoMark className="h-7 w-7" />
            FantaClash
          </span>
          <span className="text-xs">Serie A {summary.seasonId}</span>
        </div>

        <p className="font-display text-2xl font-bold mt-6 text-center">{summary.tournamentName}</p>
        <div className="flex flex-col items-center mt-3">
          {champion && <Icon name="trophy" className="w-14 h-14 text-brand-peach" />}
          <p className={`font-display font-extrabold leading-none text-center ${champion ? 'text-6xl text-brand-peach mt-2' : 'text-4xl'}`}>
            {summary.placementLabel}
          </p>
          <p className="font-display text-3xl font-extrabold mt-3 text-center leading-none break-words max-w-full">
            {summary.teamName}
          </p>
        </div>

        <ul className="mt-6 border-t border-brand-ivory/30">
          {summary.matches.map(m => (
            <li key={m.matchId} className="flex items-baseline gap-3 py-1.5 border-b border-brand-ivory/30 text-sm">
              <span className="w-6 font-display font-bold">{m.roundShort}</span>
              <span className="flex-1 truncate">{m.opponentName}</span>
              <span className="font-display font-bold text-base tabular-nums">
                {m.goalsFor}-{m.goalsAgainst}
                {m.shootout && <span className="text-xs font-semibold"> ({m.shootout.for}-{m.shootout.against} rig.)</span>}
              </span>
              <span className={`w-4 text-center font-display font-extrabold ${m.won ? 'text-brand-peach' : ''}`}>{m.won ? 'V' : 'P'}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-xs">MVP</p>
            <p className="font-display text-xl font-extrabold leading-tight">{summary.mvp?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs">Gol fatti / subiti</p>
            <p className="font-display text-xl font-extrabold tabular-nums leading-tight">
              {summary.stats.goalsFor} / {summary.stats.goalsAgainst}
            </p>
          </div>
          {summary.scorers.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs">Marcatori</p>
              <p className="font-semibold">{summary.scorers.slice(0, 3).map(s => `${s.name} ${s.goals}`).join(' · ')}</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-brand-ivory/30 space-y-1 text-xs">
          {ROLES.map(role => (
            <p key={role} className="flex gap-2">
              <span className="w-8 font-display font-bold text-sm">{ROLE_LABEL[role]}</span>
              <span className="truncate">
                {summary.lineup.filter(p => p.role === role).map(p => p.name).join(', ')}
              </span>
            </p>
          ))}
        </div>
      </div>
    );
  }
);
