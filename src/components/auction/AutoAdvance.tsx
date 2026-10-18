import { ReactNode } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { AUTO_ADVANCE_MS } from './useAuctionFx';

/** Interruttore compatto "Auto" nella barra delle azioni del banco */
export function AutoAdvanceSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = useT();
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={t('auction.autoAdvance.label')}
      title={t('auction.autoAdvance.hint')}
      onClick={() => onChange(!on)}
      className="flex items-center gap-2 border-2 border-ink bg-canvas px-2.5 py-2 font-display font-extrabold text-base leading-none text-ink hover:bg-surface focus-visible:outline outline-2 outline-offset-2 outline-ink"
    >
      {t('auction.autoAdvance.short')}
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
