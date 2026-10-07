import { ReactNode } from 'react';
import { AUTO_ADVANCE_MS } from './useAuctionFx';

/** Interruttore "Avanti automatico", come riga del menu "Avanti veloce" */
export function AutoAdvanceToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-surface focus-visible:outline outline-2 -outline-offset-4 outline-ink"
    >
      <span className="flex-1 min-w-0">
        <span className="block font-display text-xl font-extrabold text-ink leading-none">Avanti automatico</span>
        <span className="block text-sm text-ink-muted mt-1">Dopo ogni aggiudicazione si passa da soli al successivo</span>
      </span>
      <span className={`relative shrink-0 w-10 h-6 border-2 border-ink transition-colors duration-150 ${on ? 'bg-pitch' : 'bg-canvas'}`}>
        <span className={`absolute top-0.5 w-4 h-4 transition-[left] duration-150 ${on ? 'left-[18px] bg-canvas' : 'left-0.5 bg-ink'}`} />
      </span>
    </button>
  );
}

interface AdvanceButtonProps {
  auto: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}

/**
 * Pulsante per andare avanti: con l'avanzamento automatico mostra una
 * barra che si svuota, ma resta cliccabile per non aspettare.
 */
export function AdvanceButton({ auto, onClick, className, children }: AdvanceButtonProps) {
  return (
    <button onClick={onClick} className={`relative overflow-hidden ${className}`}>
      {auto && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1.5 bg-highlight origin-left motion-safe:animate-drain"
          style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }}
        />
      )}
      {children}
    </button>
  );
}
