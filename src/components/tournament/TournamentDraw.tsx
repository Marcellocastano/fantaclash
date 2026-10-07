import { useEffect, useRef, useState } from 'react';
import { drawOrder, ROUND_LABELS, TournamentState, TournamentTeam } from '../../domain/tournament';
import { LogoMark } from '../Logo';
import { Icon } from '../Icon';
import { TeamBadge } from './TeamBadge';
import { TournamentBracket } from './TournamentBracket';

interface TournamentDrawProps {
  tournament: TournamentState;
  /** Registra il sorteggio nello stato (chiamata a fine animazione) */
  onDrawn: (order: string[]) => void;
  /** CTA finale: inizia i quarti */
  onStart: () => void;
}

/** Durata dell'estrazione di ogni squadra e pausa tra le estrazioni (ms) */
const ROLL_MS = 900;
const ROLL_STEP_MS = 70;
const PAUSE_MS = 350;
/** Attesa prima della prima estrazione: si vede l'urna piena e il tabellone vuoto */
const INTRO_MS = 1200;

type DrawStage = 'intro' | 'drawing' | 'done';

/**
 * Sorteggio dei quarti come evento: urna con le 8 squadre, estrazioni una
 * alla volta con il nome che "gira" prima di fermarsi, accoppiamenti
 * rivelati progressivamente. Parte da solo appena si entra nel torneo;
 * l'ordine è deciso al montaggio (drawOrder) e registrato nello stato solo
 * a fine animazione.
 */
export function TournamentDraw({ tournament, onDrawn, onStart }: TournamentDrawProps) {
  const alreadyDrawn = tournament.status !== 'draw';
  const [stage, setStage] = useState<DrawStage>(alreadyDrawn ? 'done' : 'intro');
  const [order] = useState<string[]>(() => (alreadyDrawn ? [] : drawOrder(tournament, Math.random)));
  const [revealed, setRevealed] = useState(0);
  const [rolling, setRolling] = useState<string | null>(null);
  const committed = useRef(alreadyDrawn);

  const teamById = (id: string | undefined) => tournament.teams.find(t => t.id === id);

  // Avvio automatico del sorteggio dopo una breve presentazione
  useEffect(() => {
    if (stage !== 'intro') return;
    const t = setTimeout(() => setStage('drawing'), INTRO_MS);
    return () => clearTimeout(t);
  }, [stage]);

  // Estrazione progressiva: ad ogni passo il nome gira tra le squadre ancora nell'urna
  useEffect(() => {
    if (stage !== 'drawing') return;
    if (revealed >= order.length) {
      if (!committed.current) {
        committed.current = true;
        onDrawn(order);
      }
      const t = setTimeout(() => setStage('done'), 500);
      return () => clearTimeout(t);
    }
    const pot = order.slice(revealed);
    let i = 0;
    let pause: ReturnType<typeof setTimeout> | undefined;
    const roll = setInterval(() => {
      i++;
      setRolling(pot[i % pot.length]);
    }, ROLL_STEP_MS);
    const stop = setTimeout(() => {
      clearInterval(roll);
      setRolling(order[revealed]);
      pause = setTimeout(() => {
        setRolling(null);
        setRevealed(r => r + 1);
      }, PAUSE_MS);
    }, ROLL_MS);
    return () => {
      clearInterval(roll);
      clearTimeout(stop);
      clearTimeout(pause);
      setRolling(null);
    };
  }, [stage, revealed, order, onDrawn]);

  const skip = () => {
    setStage('drawing');
    setRevealed(order.length);
  };

  if (stage === 'done') {
    const userTeam = tournament.teams.find(t => t.isUserTeam);
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <DrawHeader season={tournament.seasonId} />
        <div className="motion-safe:animate-stamp mb-6">
          <p className="font-display text-4xl font-extrabold text-ok leading-none">Sorteggio completato</p>
          <p className="text-ink-soft mt-2">
            Il percorso di <span className="font-semibold text-pitch">{userTeam?.name}</span> è evidenziato nel tabellone.
          </p>
        </div>
        <TournamentBracket tournament={tournament} highlightUserPath />
        <button onClick={onStart} className="btn-primary mt-8 w-full sm:w-auto inline-flex items-center justify-center gap-2">
          <Icon name="play" className="w-4 h-4" />
          Inizia i quarti
        </button>
      </div>
    );
  }

  const drawnIds = new Set(order.slice(0, revealed));
  const pairs = [0, 1, 2, 3].map(i => [order[i * 2], order[i * 2 + 1]]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <DrawHeader season={tournament.seasonId} />

      <div className="grid grid-cols-12 gap-8">
        {/* Urna */}
        <div className="col-span-12 md:col-span-5">
          <h3 className="section-heading mb-3">Squadre nell'urna</h3>
          <ul className="divide-y divide-line">
            {tournament.teams.map(team => {
              const out = drawnIds.has(team.id);
              const isRolling = rolling === team.id;
              return (
                <li
                  key={team.id}
                  className={`flex items-center gap-3 py-2.5 px-2 ${isRolling ? 'bg-surface' : ''} ${out ? 'text-ink-faint' : ''}`}
                >
                  <TeamBadge team={team} />
                  <span className={`flex-1 truncate ${out ? 'line-through' : team.isUserTeam ? 'text-pitch font-semibold' : 'text-ink'}`}>
                    {team.name}
                    {team.isUserTeam && <span className="font-normal"> (tu)</span>}
                  </span>
                  <span className="text-xs text-ink-muted tabular-nums">Forza {team.rating}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="font-display text-2xl font-bold text-ink min-h-[2rem]" aria-live="polite">
              {stage === 'intro'
                ? 'Il sorteggio sta per iniziare'
                : rolling
                  ? teamById(rolling)?.name
                  : revealed < order.length
                    ? 'Estrazione...'
                    : 'Fatto'}
            </p>
            <button onClick={skip} className="btn-ghost px-3 py-2 text-sm">
              Salta animazione
            </button>
          </div>
        </div>

        {/* Accoppiamenti */}
        <div className="col-span-12 md:col-span-7">
          <h3 className="section-heading mb-3">{ROUND_LABELS.quarterfinals}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {pairs.map(([home, away], i) => (
              <div key={i} className="border border-line-strong">
                <p className="px-3 pt-2 text-xs font-medium text-ink-muted">Quarto {i + 1}</p>
                <DrawSlot team={revealed > i * 2 ? teamById(home) : undefined} />
                <p className="px-3 font-display font-bold text-ink-muted">vs</p>
                <DrawSlot team={revealed > i * 2 + 1 ? teamById(away) : undefined} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawHeader({ season }: { season: string }) {
  return (
    <header className="flex items-center gap-4 mb-8">
      <LogoMark className="h-14 w-14" />
      <div>
        <h1 className="font-display text-5xl md:text-6xl font-extrabold text-pitch leading-none">FantaClash Cup</h1>
        <p className="text-ink-soft mt-1">Serie A {season} · 8 squadre, eliminazione diretta</p>
      </div>
    </header>
  );
}

function DrawSlot({ team }: { team: TournamentTeam | undefined }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 min-h-[3rem]">
      {team ? (
        <div key={team.id} className="flex items-center gap-3 min-w-0 motion-safe:animate-stamp">
          <TeamBadge team={team} size="md" />
          <span className={`font-display text-xl font-extrabold truncate ${team.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
            {team.name}
          </span>
        </div>
      ) : (
        <>
          <TeamBadge team={undefined} size="md" />
          <span className="text-ink-faint">Da sorteggiare</span>
        </>
      )}
    </div>
  );
}
