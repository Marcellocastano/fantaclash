import { MatchEvent, MatchResult, MatchSide, shortName } from '../../domain/match';
import { KickPhase } from './useShootoutKick';

interface ShootoutStageProps {
  result: MatchResult;
  /** Rigori già tirati fino al tick corrente */
  kicks: MatchEvent[];
  kick: MatchEvent | null;
  phase: KickPhase;
  decisive: boolean;
  userSide: MatchSide;
}

const SIDES: MatchSide[] = ['home', 'away'];

/** Angolo del tiro: solo presentazione, stabile per lo stesso rigore */
function aim(id: string): -1 | 0 | 1 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 3) - 1) as -1 | 0 | 1;
}

/**
 * Lotteria dei rigori: porta vista di fronte, rincorsa con suspense,
 * esito rivelato con timbro, e il conteggio a caselle delle due squadre.
 */
export function ShootoutStage({ result, kicks, kick, phase, decisive, userSide }: ShootoutStageProps) {
  const names = new Map([...result.lineups.home, ...result.lineups.away].map(p => [p.playerId, shortName(p.name)]));
  const revealed = phase !== 'runup';
  const shown = kicks.filter(k => revealed || k.id !== kick?.id);
  const side = kick?.side ?? 'home';
  const dir = kick ? aim(kick.id) : 0;
  // Parato o fuori: anche questo solo presentazione
  const saved = kick && !kick.scored && dir !== 0 ? aim(`${kick.id}k`) !== 1 : !!kick && !kick.scored;
  const keeperDir = !kick || !revealed ? 0 : saved ? dir : dir === 0 ? -1 : -dir;
  const ballX = !revealed ? 50 : kick?.scored ? 50 + dir * 22 : saved ? 50 + dir * 14 : 50 + (dir || 1) * 40;
  const ballY = !revealed ? 88 : kick?.scored ? 30 : saved ? 40 : 18;
  const teamName = (s: MatchSide) => (s === 'home' ? result.homeName : result.awayName);

  return (
    <div className="relative aspect-[105/68] min-w-[820px] bg-field-dark border-2 border-ink overflow-hidden select-none">
      {/* Strisce del prato */}
      <div className="absolute inset-0 grid grid-rows-6" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={i % 2 ? 'bg-field-light' : ''} />
        ))}
      </div>

      {/* Porta vista di fronte, posizionata senza transform: niente
          animazione può spostarla */}
      <div className="absolute left-[19%] top-[8%] w-[62%]" aria-hidden="true">
        <svg viewBox="0 0 100 60" className="block w-full">
          {/* Solo la rete si gonfia sul gol: pali e traversa restano fermi */}
          <g
            stroke="#E4F0DF"
            strokeOpacity="0.35"
            strokeWidth="0.4"
            className={`origin-center ${revealed && kick?.scored ? 'motion-safe:animate-ripple' : ''}`}
            style={{ transformBox: 'fill-box' }}
          >
            {Array.from({ length: 19 }, (_, i) => (
              <line key={`v${i}`} x1={5 + i * 5} y1="4" x2={5 + i * 5} y2="56" />
            ))}
            {Array.from({ length: 10 }, (_, i) => (
              <line key={`h${i}`} x1="4" y1={8 + i * 5} x2="96" y2={8 + i * 5} />
            ))}
          </g>
          <path d="M3 58V3h94v55" fill="none" stroke="#F4EEDF" strokeWidth="3" />
          <line x1="0" y1="58" x2="100" y2="58" stroke="#E4F0DF" strokeWidth="1" />
        </svg>
      </div>

      {/* Portiere */}
      <span
        className="absolute top-[34%] w-[9%] h-[30%] border-2 border-ink bg-whistle transition-transform duration-300 ease-out"
        style={{ left: '45.5%', transform: `translateX(${keeperDir * 160}%) rotate(${keeperDir * 50}deg)` }}
        aria-hidden="true"
      />

      {/* Pallone */}
      <span
        className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-canvas border-2 border-ink transition-[left,top] duration-300 ease-out ${
          phase === 'runup' ? 'motion-safe:animate-beat' : ''
        }`}
        style={{ left: `${ballX}%`, top: `${ballY}%` }}
        aria-hidden="true"
      />

      {/* Tiratore e suspense */}
      {kick && (
        <div className={`absolute inset-x-0 bottom-0 px-6 py-4 flex items-end justify-between gap-4 transition-colors duration-300 ${phase === 'runup' ? 'bg-ink/50' : ''}`}>
          <div className="text-canvas min-w-0">
            <p className="text-sm font-bold text-canvas/70 truncate">{teamName(side)}</p>
            <p className="font-display text-5xl font-black leading-none truncate">{names.get(kick.playerId ?? '')}</p>
          </div>
          <p className="font-display text-2xl font-extrabold text-highlight text-right">
            {decisive ? 'Rigore decisivo' : phase === 'runup' ? 'Rincorsa…' : ''}
          </p>
        </div>
      )}

      {/* Timbro con l'esito */}
      {kick && revealed && phase === 'result' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            key={kick.id}
            className={`motion-safe:animate-stamp-tilt -rotate-12 border-4 border-ink px-8 py-3 font-display font-black text-7xl leading-none shadow-block ${
              kick.scored ? 'bg-highlight text-on-highlight' : 'bg-card-red text-white'
            }`}
          >
            {kick.scored ? 'GOL!' : saved ? 'PARATO!' : 'FUORI!'}
          </span>
        </div>
      )}

      {/* Conteggio a caselle */}
      <div className="absolute top-3 left-3 right-3 flex justify-between gap-6">
        {SIDES.map(s => {
          const own = shown.filter(k => k.side === s);
          const slots = Math.max(5, own.length + (kick?.side === s && !revealed ? 1 : 0));
          return (
            <div key={s} className={`bg-pitch-deep/90 border-2 border-ink px-3 py-2 ${s === 'away' ? 'text-right' : ''}`}>
              <p className={`text-xs font-bold truncate max-w-[14rem] ${s === userSide ? 'text-highlight' : 'text-canvas/80'}`}>{teamName(s)}</p>
              <div className={`flex gap-1.5 mt-1 ${s === 'away' ? 'justify-end' : ''}`}>
                {Array.from({ length: slots }, (_, i) => {
                  const k = own[i];
                  const pending = !k && kick?.side === s && !revealed && i === own.length;
                  return (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                        k ? (k.scored ? 'bg-highlight border-ink text-ink' : 'bg-card-red border-ink text-white') : pending ? 'border-highlight motion-safe:animate-beat' : 'border-canvas/40'
                      }`}
                    >
                      {k && !k.scored ? '×' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {shown.length > 10 && <p className="absolute top-20 inset-x-0 text-center font-display text-xl font-extrabold text-highlight">Ad oltranza</p>}
    </div>
  );
}
