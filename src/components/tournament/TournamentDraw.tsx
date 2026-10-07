import { useEffect, useRef, useState } from 'react';
import { drawOrder, TournamentState, TournamentTeam } from '../../domain/tournament';
import { playSound } from '../../services/sound';
import { TeamBadge } from './TeamBadge';

interface TournamentDrawProps {
  tournament: TournamentState;
  /** Registra il sorteggio nello stato (a fine animazione) */
  onDrawn: (order: string[]) => void;
  /** Animazione finita: si va al tabellone */
  onDone: () => void;
}

/** Tempi dell'estrazione (ms) */
const INTRO_MS = 900;
const RISE_MS = 550;
const SHOW_MS = 800;
const USER_MOMENT_MS = 1800;
const OUTRO_MS = 900;

/** Posizioni delle palline nella boccia (% del contenitore) */
const BALL_SPOTS = [
  [30, 70], [50, 74], [70, 70], [20, 52], [40, 55], [60, 54], [80, 52], [50, 36],
];

type Stage = 'intro' | 'rise' | 'show' | 'user' | 'outro';

/**
 * Sorteggio stile UEFA: le palline escono una alla volta dalla boccia, si
 * aprono e la squadra finisce nel suo posto dei quarti. Quando il tuo
 * accoppiamento è completo c'è un momento dedicato al tuo avversario.
 * L'ordine è deciso al montaggio e registrato nello stato solo alla fine.
 */
export function TournamentDraw({ tournament, onDrawn, onDone }: TournamentDrawProps) {
  const [order] = useState(() => drawOrder(tournament, Math.random));
  const [placed, setPlaced] = useState(0);
  const [stage, setStage] = useState<Stage>('intro');
  const committed = useRef(false);
  // Callback sempre aggiornati senza riavviare i timer quando il genitore si ridisegna
  const callbacks = useRef({ onDrawn, onDone });
  callbacks.current = { onDrawn, onDone };
  const team = (id: string | undefined) => tournament.teams.find(t => t.id === id);
  const current = team(order[placed]);
  const userPair = Math.floor(order.indexOf(tournament.userTeamId) / 2);

  useEffect(() => {
    const next = (s: Stage, ms: number, after?: () => void) =>
      setTimeout(() => {
        after?.();
        setStage(s);
      }, ms);
    let t: ReturnType<typeof setTimeout>;
    switch (stage) {
      case 'intro':
        t = next('rise', INTRO_MS);
        break;
      case 'rise':
        playSound('draw-ball');
        t = next('show', RISE_MS);
        break;
      case 'show': {
        const done = placed + 1;
        const pairComplete = done % 2 === 0 && Math.floor(placed / 2) === userPair;
        t = next(done >= order.length ? 'outro' : pairComplete ? 'user' : 'rise', SHOW_MS, () => setPlaced(done));
        break;
      }
      case 'user':
        t = next('rise', USER_MOMENT_MS);
        break;
      case 'outro':
        if (!committed.current) {
          committed.current = true;
          callbacks.current.onDrawn(order);
        }
        t = setTimeout(() => callbacks.current.onDone(), OUTRO_MS);
        break;
    }
    return () => clearTimeout(t);
  }, [stage, placed, order, userPair]);

  const skip = () => {
    setPlaced(order.length);
    setStage('outro');
  };

  const inBowl = order.slice(placed + (stage === 'rise' || stage === 'show' ? 1 : 0));
  const opponent = team(order[userPair * 2] === tournament.userTeamId ? order[userPair * 2 + 1] : order[userPair * 2]);

  return (
    <div className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-6xl font-black text-ink leading-none">Il sorteggio</h1>
          <p className="text-lg text-ink-soft mt-3">8 squadre, eliminazione diretta. Pareggio? Si va ai rigori.</p>
        </div>
        {stage !== 'outro' && (
          <button onClick={skip} className="link-action">
            Salta il sorteggio
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-10 items-start">
        {/* Boccia + pallina estratta */}
        <div className="col-span-12 md:col-span-5">
          <div className="relative aspect-square max-w-[420px] mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-ink bg-canvas" />
            <div className="absolute inset-[6%] rounded-full border-2 border-line-strong" aria-hidden="true" />
            {inBowl.map(id => {
              const t = team(id);
              const [x, y] = BALL_SPOTS[order.indexOf(id) % BALL_SPOTS.length];
              return (
                <span
                  key={id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <span className={`block ${stage !== 'intro' ? 'motion-safe:animate-wobble' : ''}`} style={{ animationDelay: `${(order.indexOf(id) * 110) % 900}ms` }}>
                    <Ball team={t} />
                  </span>
                </span>
              );
            })}

            {/* Pallina appena estratta, sopra la boccia */}
            {current && (stage === 'rise' || stage === 'show') && (
              <div key={current.id} className="absolute inset-0 flex items-center justify-center">
                {stage === 'rise' ? (
                  <span className="motion-safe:animate-ball-rise">
                    <Ball team={current} big />
                  </span>
                ) : (
                  <div className="panel shadow-block-lg px-6 py-4 flex items-center gap-4 motion-safe:animate-ball-open max-w-[90%]">
                    <TeamBadge team={current} size="lg" />
                    <span className="font-display text-4xl font-black leading-none text-ink break-words">{current.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-center font-display text-2xl font-extrabold text-ink-soft mt-6 min-h-[2rem]" aria-live="polite">
            {stage === 'intro' ? 'Si mescola…' : stage === 'outro' ? 'Sorteggio completato' : `Estrazione ${Math.min(placed + 1, 8)} di 8`}
          </p>
        </div>

        {/* Quarti */}
        <div className="col-span-12 md:col-span-7">
          <h2 className="section-heading mb-6">Quarti di finale</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`border-2 ${i === userPair && placed > i * 2 + 1 ? 'border-pitch shadow-block-sm' : 'border-ink'}`}>
                <p className="px-3 py-1.5 text-sm font-bold text-ink-muted border-b-2 border-line">Quarto {i + 1}</p>
                <Slot team={placed > i * 2 ? team(order[i * 2]) : undefined} />
                <Slot team={placed > i * 2 + 1 ? team(order[i * 2 + 1]) : undefined} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Momento della tua squadra */}
      {stage === 'user' && opponent && (
        <div className="fixed inset-x-0 top-1/3 z-40 bg-highlight border-y-4 border-ink py-8 motion-safe:animate-stamp" role="status">
          <div className="max-w-[1300px] mx-auto px-4 flex flex-wrap items-center justify-center gap-6 text-on-highlight">
            <span className="font-display text-3xl font-extrabold">Il tuo avversario:</span>
            <TeamBadge team={opponent} size="lg" />
            <span className="font-display text-6xl font-black leading-none">{opponent.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Ball({ team, big = false }: { team: TournamentTeam | undefined; big?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full border-2 border-ink font-display font-black leading-none shadow-block-sm ${
        big ? 'w-32 h-32 text-5xl' : 'w-16 h-16 text-2xl'
      } ${team?.isUserTeam ? 'bg-pitch text-on-pitch' : 'bg-highlight text-on-highlight'}`}
    >
      {team?.monogram}
    </span>
  );
}

function Slot({ team }: { team: TournamentTeam | undefined }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-h-[3.75rem]">
      {team ? (
        <div key={team.id} className="flex items-center gap-3 min-w-0 motion-safe:animate-stamp">
          <TeamBadge team={team} size="md" />
          <span className={`font-display text-2xl font-extrabold leading-none truncate ${team.isUserTeam ? 'text-pitch' : 'text-ink'}`}>
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
