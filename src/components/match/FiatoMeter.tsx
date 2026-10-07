/** Sotto questa soglia la squadra è "stanca" */
export const TIRED_THRESHOLD = 40;

const SEGMENTS = 10;

/**
 * Fiato della squadra (energia del motore): 10 tacche. Con meno fiato le
 * occasioni create sono meno pericolose; lo stile scelto decide il consumo.
 */
export function FiatoMeter({ value, tone = 'dark' }: { value: number; tone?: 'dark' | 'light' }) {
  const filled = Math.round((value / 100) * SEGMENTS);
  const tired = value < TIRED_THRESHOLD;
  const on = tired ? 'bg-whistle' : tone === 'dark' ? 'bg-highlight' : 'bg-pitch';
  const off = tone === 'dark' ? 'bg-canvas/20' : 'bg-line';
  return (
    <span className="inline-flex items-center gap-2" title={`Fiato ${value}%`}>
      <span className={`text-xs font-bold ${tone === 'dark' ? 'text-canvas/70' : 'text-ink-muted'}`}>Fiato</span>
      <span className="flex gap-0.5" role="meter" aria-label="Fiato" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`w-2 h-3 ${i < filled ? on : off}`} />
        ))}
      </span>
      {tired && <span className="text-xs font-bold text-whistle-deep">stanca</span>}
    </span>
  );
}
