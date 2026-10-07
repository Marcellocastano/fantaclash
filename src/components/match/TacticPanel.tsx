import { Tactic, TACTIC_LABELS } from '../../domain/match';
import { Icon } from '../Icon';

const OPTIONS: { tactic: Tactic; effect: string }[] = [
  { tactic: 'attacca', effect: 'Più occasioni create, più rischi dietro, più fatica.' },
  { tactic: 'equilibrata', effect: 'Assetto standard, consumo di energia moderato.' },
  { tactic: 'difendi', effect: 'Concedi meno, ma crei poco e rischi più cartellini.' },
];

const TITLES = ["Calcio d'inizio: come partiamo?", 'Intervallo: cambi atteggiamento?', "75': ultimo quarto d'ora"];

interface TacticPanelProps {
  decisionIndex: number;
  current: Tactic;
  energy: number;
  scoreLine: string;
  onChoose: (tactic: Tactic) => void;
}

/**
 * Uno dei tre momenti decisionali della partita (1', 46', 75').
 * Poche scelte, effetti leggeri ma reali sul motore.
 */
export function TacticPanel({ decisionIndex, current, energy, scoreLine, onChoose }: TacticPanelProps) {
  return (
    <div className="border-2 border-pitch bg-canvas p-5 motion-safe:animate-pop" role="dialog" aria-label="Scelta tattica">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-display text-3xl font-extrabold text-pitch leading-none">{TITLES[decisionIndex] ?? 'Scelta tattica'}</p>
          <p className="text-sm text-ink-soft mt-1">{scoreLine}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-ink-muted">Energia</p>
          <p className="font-display text-2xl font-bold tabular-nums text-ink">{energy}%</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {OPTIONS.map(({ tactic, effect }) => (
          <button
            key={tactic}
            onClick={() => onChoose(tactic)}
            className={`text-left p-3 border transition-colors duration-150 hover:bg-surface focus-visible:outline outline-2 outline-offset-2 outline-pitch ${
              tactic === current ? 'border-pitch border-2' : 'border-line-strong'
            }`}
          >
            <span className="flex items-center gap-2 font-display text-xl font-bold text-ink">
              {tactic === current && <Icon name="check" className="w-4 h-4 text-pitch" />}
              {TACTIC_LABELS[tactic]}
            </span>
            <span className="block text-xs text-ink-soft mt-1">{effect}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
