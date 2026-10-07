import { useEffect, useRef, useState } from 'react';
import { SeasonInfo } from '../services/seasons';
import { Icon } from './Icon';

interface SeasonPickerProps {
  seasons: SeasonInfo[];
  value: string;
  onChange: (season: string) => void;
  disabled?: boolean;
}

/** Durata dell'estrazione col dado e cadenza dei cambi (ms) */
const ROLL_MS = 750;
const ROLL_STEP_MS = 60;

/**
 * Scelta dell'annata: carosello con l'annata in grande, frecce avanti e
 * indietro (anche da tastiera), linea del tempo cliccabile e un dado che
 * estrae un'annata a caso con un breve effetto slot machine.
 */
export function SeasonPicker({ seasons, value, onChange, disabled = false }: SeasonPickerProps) {
  const [rolling, setRolling] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const index = Math.max(0, seasons.findIndex(s => s.season === value));
  const shown = rolling ?? value;
  const busy = disabled || rolling !== null || seasons.length === 0;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = (delta: number) => {
    if (busy) return;
    const next = (index + delta + seasons.length) % seasons.length;
    onChange(seasons[next].season);
  };

  const roll = () => {
    if (busy) return;
    const pick = () => seasons[Math.floor(Math.random() * seasons.length)].season;
    for (let t = ROLL_STEP_MS; t < ROLL_MS; t += ROLL_STEP_MS) {
      timers.current.push(setTimeout(() => setRolling(pick()), t));
    }
    timers.current.push(
      setTimeout(() => {
        let final = pick();
        if (seasons.length > 1) while (final === value) final = pick();
        setRolling(null);
        onChange(final);
      }, ROLL_MS)
    );
  };

  const [startYear, endYear] = shown ? shown.split('-') : ['', ''];

  return (
    <div>
      <div
        className="flex items-stretch border-2 border-ink bg-canvas"
        role="group"
        aria-label="Annata"
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={busy}
          aria-label="Annata precedente"
          className="px-2 sm:px-3 text-ink hover:bg-surface disabled:opacity-40 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
        >
          <Icon name="arrow" className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
        </button>
        <div className="flex-1 text-center py-2 select-none" aria-live="polite">
          <span className="block text-xs font-bold text-ink-muted">Serie A</span>
          <span
            key={rolling ? 'rolling' : shown}
            className={`block font-display text-4xl sm:text-6xl font-black leading-none tabular-nums text-ink ${rolling ? '' : 'motion-safe:animate-pop'}`}
          >
            {startYear}
            <span className="text-ink-muted">-{endYear}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={busy}
          aria-label="Annata successiva"
          className="px-2 sm:px-3 text-ink hover:bg-surface disabled:opacity-40 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
        >
          <Icon name="arrow" className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          type="button"
          onClick={roll}
          disabled={busy}
          title="Annata a caso"
          className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 border-l-2 border-ink bg-highlight text-on-highlight hover:bg-canvas disabled:opacity-40 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch"
        >
          <Icon name="dice" className={`w-5 h-5 sm:w-6 sm:h-6 ${rolling ? 'motion-safe:animate-spin' : ''}`} />
          <span className="text-[10px] font-bold hidden sm:block">Random</span>
        </button>
      </div>

      {/* Linea del tempo: una tacca per annata */}
      <div className="flex gap-0.5 mt-2" aria-hidden="true">
        {seasons.map(s => (
          <button
            key={s.season}
            type="button"
            tabIndex={-1}
            title={s.label}
            disabled={busy}
            onClick={() => onChange(s.season)}
            className={`flex-1 h-2 transition-colors duration-150 ${s.season === shown ? 'bg-ink' : 'bg-line-strong/50 hover:bg-line-strong'}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-ink-muted tabular-nums" aria-hidden="true">
        <span>{seasons[0]?.season}</span>
        <span>{seasons[seasons.length - 1]?.season}</span>
      </div>
    </div>
  );
}
