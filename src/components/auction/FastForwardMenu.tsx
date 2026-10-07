import { useEffect, useRef, useState } from 'react';
import { PlayerRole } from '../../types';
import { Icon } from '../Icon';
import { AutoAdvanceToggle } from './AutoAdvance';

interface FastForwardMenuProps {
  currentRole: PlayerRole;
  canSimulateLot: boolean;
  canSimulateRole: boolean;
  onSimulateLot: () => void;
  onSimulateRole: () => void;
  onSimulateAll: () => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (on: boolean) => void;
}

const ROLE_NAMES: Record<PlayerRole, string> = {
  P: 'portieri',
  D: 'difensori',
  C: 'centrocampisti',
  A: 'attaccanti',
};

/**
 * "Avanti veloce": le tre simulazioni in un unico menu, per non affollare
 * il banco d'asta.
 * - giocatore: i bot chiudono il lotto senza di te
 * - reparto: quando hai già completato il reparto
 * - intera asta: anche per la tua squadra
 */
export function FastForwardMenu({
  currentRole,
  canSimulateLot,
  canSimulateRole,
  onSimulateLot,
  onSimulateRole,
  onSimulateAll,
  autoAdvance,
  onAutoAdvanceChange,
}: FastForwardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const items = [
    { label: 'Simula questo giocatore', hint: "I bot chiudono l'asta senza di te", enabled: canSimulateLot, run: onSimulateLot },
    { label: `Simula i ${ROLE_NAMES[currentRole]}`, hint: 'Hai già completato il reparto', enabled: canSimulateRole, run: onSimulateRole },
    { label: "Simula tutta l'asta", hint: 'Anche la tua squadra, si va al torneo', enabled: true, run: onSimulateAll },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={autoAdvance ? 'Avanti automatico attivo' : undefined}
        className="btn-ghost relative px-3 py-2 text-base"
      >
        <Icon name="forward" className="w-4 h-4" />
        Avanti veloce
        {autoAdvance && (
          <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 border-ink bg-pitch" />
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 z-20 w-72 panel shadow-block motion-safe:animate-pop">
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              disabled={!item.enabled}
              onClick={run(item.run)}
              className="w-full text-left px-4 py-3 border-b-2 border-line last:border-b-0 hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <span className="block font-display text-xl font-extrabold text-ink leading-none">{item.label}</span>
              <span className="block text-sm text-ink-muted mt-1">{item.hint}</span>
            </button>
          ))}
          <div className="border-t-2 border-ink">
            <AutoAdvanceToggle on={autoAdvance} onChange={onAutoAdvanceChange} />
          </div>
        </div>
      )}
    </div>
  );
}
