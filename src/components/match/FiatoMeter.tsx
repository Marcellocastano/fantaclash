import { useT } from '../../i18n/I18nProvider';

/** Sotto questa soglia la squadra è "stanca" */
export const TIRED_THRESHOLD = 40;

const SEGMENTS = 10;

/**
 * Fiato della squadra (energia del motore): 10 tacche. Con meno fiato le
 * occasioni create sono meno pericolose; lo stile scelto decide il consumo.
 */
export function FiatoMeter({ value, tone = 'dark' }: { value: number; tone?: 'dark' | 'light' }) {
  const t = useT();
  const filled = Math.round((value / 100) * SEGMENTS);
  const tired = value < TIRED_THRESHOLD;
  const on = tired ? 'bg-whistle' : tone === 'dark' ? 'bg-highlight' : 'bg-pitch';
  const off = tone === 'dark' ? 'bg-canvas/20' : 'bg-line';
  return (
    <span className="inline-flex items-center gap-2" title={t('match.fiato.title', { value })}>
      <span className={`text-xs font-bold ${tone === 'dark' ? 'text-canvas/70' : 'text-ink-muted'}`}>{t('match.fiato.label')}</span>
      <span className="flex gap-0.5" role="meter" aria-label={t('match.fiato.label')} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`w-2 h-3 ${i < filled ? on : off}`} />
        ))}
      </span>
      {tired && <span className="text-xs font-bold text-whistle-deep">{t('match.fiato.tired')}</span>}
    </span>
  );
}
