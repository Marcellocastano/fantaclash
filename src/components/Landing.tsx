import { GameConfig, PlayerRole } from '../types';
import { Footer } from './Footer';
import { LogoMark } from './Logo';
import { PitchSurface } from './PitchSurface';
import { SetupForm } from './SetupForm';
import { ThemeToggle } from './ThemeToggle';

interface LandingProps {
  onSubmit: (config: GameConfig) => void | Promise<void>;
}

/** Il modulo 1-2-3-2 sul campo verticale (attacco verso l'alto), in % */
const FORMATION: { role: PlayerRole; x: number; y: number }[] = [
  { role: 'P', x: 50, y: 90 },
  { role: 'D', x: 31, y: 72 },
  { role: 'D', x: 69, y: 72 },
  { role: 'C', x: 18, y: 49 },
  { role: 'C', x: 50, y: 45 },
  { role: 'C', x: 82, y: 49 },
  { role: 'A', x: 35, y: 22 },
  { role: 'A', x: 65, y: 22 },
];

const ROLE_SHORT: Record<PlayerRole, string> = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };

const STEPS = [
  {
    n: '01',
    title: 'Asta',
    text: "Scegli un'annata e sfida 7 bot con 100 crediti. A turno si chiama un giocatore, ogni rilancio riporta il timer a 5 secondi.",
  },
  {
    n: '02',
    title: 'Sorteggio',
    text: 'Le 8 rose finiscono nell\'urna: quarti, semifinali e finale a eliminazione diretta. Pareggio? Si va ai rigori.',
  },
  {
    n: '03',
    title: 'Partita',
    text: "Scendi in campo e scegli l'atteggiamento al calcio d'inizio, all'intervallo e al 75'. Le altre partite si simulano.",
  },
];

const RULES: { term: string; text: string }[] = [
  { term: 'Lega', text: '8 squadre: tu contro 7 bot, ognuno con una personalità d\'asta diversa.' },
  { term: 'Crediti', text: '100 a testa. Devi tenere almeno 1 credito per ogni posto ancora libero in rosa.' },
  { term: 'Rosa', text: '8 giocatori in un 1-2-3-2: 1 portiere, 2 difensori, 3 centrocampisti, 2 attaccanti. Niente panchina.' },
  { term: 'Asta', text: 'Per reparti, dai portieri agli attaccanti. Si parte da 1 credito e vince chi offre di più allo scadere.' },
  { term: 'Listone', text: "96 giocatori reali dell'annata, valutati con statistiche e quotazioni storiche." },
  { term: 'Partita', text: 'Contano qualità, forma del giorno, reparti e un po\' di fortuna: anche la squadra più forte può cadere.' },
  { term: 'Fretta?', text: "Puoi simulare un giocatore, un reparto o l'intera asta e passare subito al torneo." },
];

/**
 * Landing: presenta il gioco, spiega le regole e integra il form per
 * iniziare a giocare.
 */
export function Landing({ onSubmit }: LandingProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-[1200px] w-full mx-auto px-4 py-5 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2.5 font-display text-3xl font-extrabold text-pitch leading-none">
          <LogoMark className="h-9 w-9" />
          FantaClash
        </p>
        <nav className="flex items-center gap-2">
          <a href="#come-si-gioca" className="btn-ghost px-4 py-2 text-sm hidden sm:inline-flex">
            Come si gioca
          </a>
          <a href="#regole" className="btn-ghost px-4 py-2 text-sm hidden sm:inline-flex">
            Regole
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero con form integrato */}
        <section className="max-w-[1200px] mx-auto px-4 pt-6 pb-16 grid grid-cols-12 gap-x-12 gap-y-10">
          <div className="col-span-12 lg:col-span-6">
            <p className="text-sm font-semibold text-ink-soft">Serie A · 23 annate, dal 2003-04 al 2025-26</p>
            <ModuleMark />
            <h1 className="font-display text-5xl md:text-6xl font-extrabold text-ink leading-[0.95]">
              Vinci l'asta.
              <br />
              Alza la coppa.
            </h1>
            <p className="text-lg text-ink-soft mt-5 max-w-xl">
              Scegli un'annata della Serie A, batti 7 bot all'asta e costruisci il tuo 1-2-3-2 con i
              campioni di quella stagione. Poi sorteggio, eliminazione diretta e finale: simula o scendi
              in campo.
            </p>

            <div className="mt-10">
              <SetupForm onSubmit={onSubmit} />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="lg:sticky lg:top-6">
              <PitchSurface orientation="vertical" className="w-full max-w-[520px] mx-auto">
                {FORMATION.map((p, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <span
                      className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-brand-ivory text-brand-forest font-display text-2xl font-extrabold border-2 border-brand-forest"
                      style={{ borderRadius: '50%' }}
                    >
                      {p.role}
                    </span>
                    <span className="text-xs font-bold text-brand-ivory">{ROLE_SHORT[p.role]}</span>
                  </div>
                ))}
              </PitchSurface>
              <p className="text-center text-sm text-ink-muted mt-3">Il tuo undici? No: il tuo otto. Niente panchina.</p>
            </div>
          </div>
        </section>

        {/* Come si gioca */}
        <section id="come-si-gioca" className="border-y-2 border-ink scroll-mt-6">
          <div className="max-w-[1200px] mx-auto px-4 grid md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`py-8 md:px-8 ${i > 0 ? 'border-t-2 md:border-t-0 md:border-l-2 border-ink' : 'md:pl-0'}`}>
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-6xl font-extrabold text-pitch leading-none tabular-nums">{s.n}</span>
                  <h2 className="font-display text-4xl font-extrabold text-ink leading-none">{s.title}</h2>
                </div>
                <p className="text-ink-soft mt-4">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regole */}
        <section id="regole" className="max-w-[1200px] mx-auto px-4 py-16 grid grid-cols-12 gap-x-12 gap-y-6 scroll-mt-6">
          <div className="col-span-12 md:col-span-4">
            <h2 className="font-display text-5xl font-extrabold text-ink leading-none">Le regole in breve</h2>
            <p className="text-ink-soft mt-4">
              Tutto quello che serve per la prima partita. Il resto lo impari all'asta.
            </p>
          </div>
          <dl className="col-span-12 md:col-span-8 divide-y divide-line border-t-2 border-ink">
            {RULES.map(r => (
              <div key={r.term} className="grid grid-cols-[7rem_1fr] gap-4 py-3">
                <dt className="font-display text-xl font-bold text-ink">{r.term}</dt>
                <dd className="text-ink-soft">{r.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/** "1-2-3-2" gigante: il modulo è il marchio del gioco */
function ModuleMark() {
  const digits = ['1', '2', '3', '2'];
  return (
    <p className="flex items-center gap-2 md:gap-3 my-4 font-display font-extrabold text-ink leading-[0.8] text-[6.5rem] md:text-[9rem] tabular-nums" aria-label="Modulo 1-2-3-2">
      {digits.map((d, i) => (
        <span key={i} className="flex items-center gap-2 md:gap-3" aria-hidden="true">
          {i > 0 && <span className="inline-block w-6 md:w-10 h-3 md:h-5 bg-brand-peach" />}
          {d}
        </span>
      ))}
    </p>
  );
}
