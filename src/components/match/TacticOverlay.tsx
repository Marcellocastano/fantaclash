import { Tactic, TACTIC_LABELS } from '../../domain/match';
import { Icon, IconName } from '../Icon';
import { FiatoMeter } from './FiatoMeter';

/** Effetti relativi degli stili (1-3), coerenti con TACTIC_EFFECTS del motore */
const OPTIONS: { tactic: Tactic; icon: IconName; attack: number; cover: number; fiato: number; note?: string }[] = [
  { tactic: 'attacca', icon: 'attack', attack: 3, cover: 1, fiato: 3 },
  { tactic: 'equilibrata', icon: 'balance', attack: 2, cover: 2, fiato: 2 },
  { tactic: 'difendi', icon: 'shield', attack: 1, cover: 3, fiato: 1, note: 'Più cartellini' },
];

const TITLES = ['Scegli lo stile: si parte subito', 'Intervallo', "75': ultimo quarto d'ora"];
const SUBTITLES = [
  'La partita comincia appena scegli.',
  'Cambi atteggiamento per il secondo tempo?',
  'Ultima scelta: decidi come chiudere.',
];

interface TacticOverlayProps {
  decisionIndex: number;
  current: Tactic;
  fiato: number;
  scoreLine: string;
  onChoose: (tactic: Tactic) => void;
  /** Solo stanza: secondi rimasti per scegliere (conto alla rovescia) */
  deadlineSec?: number;
  /** Solo stanza: scelta già inviata, si aspetta l'avversario */
  sent?: boolean;
  /** Solo stanza: testo mostrato dopo l'invio (default: attesa avversario) */
  sentLabel?: string;
}

/**
 * Uno dei tre momenti decisionali (1', 46', 75'), sopra il campo. Al
 * calcio d'inizio la scelta è anche il fischio d'inizio. Ogni stile mostra
 * cosa dà in attacco, quanto copre dietro e quanto fiato consuma.
 */
export function TacticOverlay({ decisionIndex, current, fiato, scoreLine, onChoose, deadlineSec, sent, sentLabel }: TacticOverlayProps) {
  const kickoff = decisionIndex === 0;
  return (
    <div className="absolute inset-0 z-20 bg-pitch-deep/95 flex overflow-y-auto px-8 py-10 motion-safe:animate-pop" role="dialog" aria-label="Scelta tattica">
      <div className="m-auto w-full max-w-3xl text-canvas">
        <div className="text-center">
          <p className="font-display text-4xl sm:text-5xl font-black leading-none">{TITLES[decisionIndex] ?? 'Scelta tattica'}</p>
          <p className="text-canvas/70 mt-3">{kickoff ? SUBTITLES[0] : `${scoreLine} · ${SUBTITLES[decisionIndex] ?? ''}`}</p>
        </div>

        {deadlineSec !== undefined && !sent && (
          <p className="mt-4 font-display text-2xl font-black tabular-nums text-whistle" role="timer">
            {deadlineSec}s
          </p>
        )}
        {sent ? (
          <p className="mt-8 font-display text-2xl font-extrabold text-canvas">
            {sentLabel ?? "Scelta inviata, in attesa dell'avversario…"}
          </p>
        ) : (
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {OPTIONS.map(o => {
            const inUse = !kickoff && o.tactic === current;
            return (
              <button
                key={o.tactic}
                onClick={() => onChoose(o.tactic)}
                className={`group text-left p-4 bg-canvas text-ink border-2 border-ink shadow-block transition-[transform,box-shadow] duration-100 hover:-translate-y-1 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline outline-4 outline-offset-2 outline-highlight ${
                  inUse ? 'outline outline-4 outline-highlight' : ''
                }`}
              >
                <span className="flex items-center justify-between">
                  <Icon name={o.icon} className="w-8 h-8 text-pitch" />
                  {inUse && <span className="text-xs font-bold bg-highlight px-1.5 py-0.5">In uso</span>}
                </span>
                <span className="block font-display text-2xl sm:text-3xl font-black leading-none mt-3">{TACTIC_LABELS[o.tactic]}</span>
                <span className="block mt-4 space-y-1.5 text-sm">
                  <Meter label="Attacco" level={o.attack} />
                  <Meter label="Copertura" level={o.cover} />
                  <Meter label="Fiato usato" level={o.fiato} warn />
                </span>
                {o.note && <span className="block text-xs text-ink-muted mt-2">{o.note}</span>}
                <span className="block mt-4 font-display text-lg font-extrabold text-pitch group-hover:underline underline-offset-4">
                  {kickoff ? "Calcio d'inizio" : inUse ? 'Continua così' : 'Scegli'}
                </span>
              </button>
            );
          })}
        </div>

        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-canvas/80">
          <FiatoMeter value={fiato} />
          <span>Lo stile decide quanto fiato consumi: con meno fiato le occasioni sono meno pericolose.</span>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, level, warn = false }: { label: string; level: number; warn?: boolean }) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className="flex gap-1" aria-label={`${label}: ${level} su 3`}>
        {[1, 2, 3].map(i => (
          <span key={i} className={`w-5 h-2.5 border border-ink ${i <= level ? (warn ? 'bg-whistle' : 'bg-pitch') : 'bg-transparent'}`} />
        ))}
      </span>
    </span>
  );
}
