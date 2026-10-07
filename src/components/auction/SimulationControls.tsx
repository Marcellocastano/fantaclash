import { PlayerRole } from '../../types';

interface SimulationControlsProps {
  currentRole: PlayerRole;
  canSimulateLot: boolean;
  canSimulateRole: boolean;
  onSimulateLot: () => void;
  onSimulateRole: () => void;
  onSimulateAll: () => void;
}

const ROLE_NAMES: Record<PlayerRole, string> = {
  P: 'portieri',
  D: 'difensori',
  C: 'centrocampisti',
  A: 'attaccanti',
};

/**
 * Barra di simulazione sopra la scheda del giocatore:
 * - lotto corrente senza rilanci dell'utente (sempre visibile)
 * - resto del reparto, quando l'utente lo ha completato
 * - intera asta, squadra utente inclusa (per i test delle fasi successive)
 */
export function SimulationControls({
  currentRole,
  canSimulateLot,
  canSimulateRole,
  onSimulateLot,
  onSimulateRole,
  onSimulateAll,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 pb-4 border-b border-line">
      <button
        onClick={onSimulateLot}
        disabled={!canSimulateLot}
        className="btn-ghost flex-1 px-3 py-2 text-sm"
        title="I bot proseguono l'asta del giocatore senza di te"
      >
        Simula giocatore
      </button>
      {canSimulateRole && (
        <button
          onClick={onSimulateRole}
          className="btn-ghost flex-1 px-3 py-2 text-sm"
          title="Completa il reparto per le altre squadre"
        >
          Simula {ROLE_NAMES[currentRole]}
        </button>
      )}
      <button
        onClick={onSimulateAll}
        className="btn-ghost flex-1 px-3 py-2 text-sm"
        title="Completa l'asta per tutte le squadre, compresa la tua"
      >
        Simula tutto
      </button>
    </div>
  );
}
