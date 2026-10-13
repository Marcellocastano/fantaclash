import { FORMATIONS, FORMATION_IDS } from '../../domain/teams/formations';
import type { FormationId } from '../../domain/teams/formations';

export function FormationPicker({ value, onChange, disabled = false }: { value: FormationId; onChange: (formation: FormationId) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 border-2 border-ink" role="radiogroup" aria-label="Modulo tattico">
      {FORMATION_IDS.map((id, index) => {
        const formation = FORMATIONS[id];
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={`min-h-20 p-2 text-left transition-colors duration-150 focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch ${index % 3 !== 0 ? 'sm:border-l-2 sm:border-ink' : ''} ${index % 2 !== 0 ? 'border-l-2 border-ink sm:border-l-0' : ''} ${index >= 2 ? 'border-t-2 border-ink' : ''} ${index >= 3 ? 'sm:border-t-2' : 'sm:border-t-0'} ${value === id ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-2xl font-black leading-none">{id}</span>
              <span className="flex h-9 w-8 items-end justify-center border border-current p-1" aria-hidden="true">
                <span className="grid grid-cols-3 gap-0.5">
                  {formation.layout.filter(slot => slot.role !== 'P').map((slot, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" style={{ gridColumn: Math.min(3, Math.max(1, Math.round(slot.x * 3))) }} />
                  ))}
                </span>
              </span>
            </span>
            <span className="mt-1 block text-[11px] font-semibold leading-tight">{formation.identity}</span>
          </button>
        );
      })}
    </div>
  );
}
