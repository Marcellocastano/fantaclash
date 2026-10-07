import { ReactNode, useEffect, useRef, useState } from 'react';
import { SUPPORT_URL } from '../../config';
import { useSoundMuted } from '../../hooks/useSound';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';
import { ConfirmDialog } from './ConfirmDialog';
import { JOURNEY_STEPS } from './journey';

interface AppNavbarProps {
  /** Tappa corrente del percorso (vedi journeyStep); null = nessun percorso */
  step?: number | null;
  /** Dati del momento a destra (crediti, annata...) */
  context?: ReactNode;
  /** Link alle sezioni del sito al posto del percorso */
  links?: { label: string; href: string }[];
  /** Partita in corso: il menu offre "Nuova partita" (con conferma) */
  onNewGame?: () => void;
}

/**
 * Navbar comune: logo, percorso di gioco, dati del momento, audio e menu
 * (nuova partita con conferma, supporto).
 */
export function AppNavbar({ step = null, context, links, onNewGame }: AppNavbarProps) {
  const [muted, setMuted] = useSoundMuted();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-pitch-deep text-canvas border-b-4 border-ink">
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center gap-6">
        <a href="/" aria-label="FantaClash — torna alla home" className="flex items-center gap-2.5 font-display text-2xl md:text-3xl font-extrabold leading-none shrink-0">
          <LogoMark className="h-9 w-9" />
          <span className="hidden sm:inline">FantaClash</span>
        </a>

        {step !== null && <JourneyTrail step={step} />}
        {links && (
          <nav aria-label="Sezioni" className="hidden md:flex items-center gap-6 ml-4">
            {links.map(l => (
              <a key={l.href} href={l.href} className="font-semibold text-canvas/80 hover:text-highlight transition-colors duration-150">
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-4">
          {context && <div className="hidden md:flex items-center gap-5">{context}</div>}
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Attiva i suoni' : 'Disattiva i suoni'}
            title={muted ? 'Attiva i suoni' : 'Disattiva i suoni'}
            className="p-2 text-canvas hover:text-highlight transition-colors duration-150 focus-visible:outline outline-2 outline-highlight"
          >
            <Icon name={muted ? 'mute' : 'sound'} className="w-6 h-6" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="p-2 text-canvas hover:text-highlight transition-colors duration-150 focus-visible:outline outline-2 outline-highlight"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-60 panel shadow-block text-ink motion-safe:animate-pop">
                {onNewGame && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmReset(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 font-semibold text-left hover:bg-surface"
                  >
                    <Icon name="reset" className="w-5 h-5" />
                    Nuova partita
                  </button>
                )}
                {SUPPORT_URL ? (
                  <a
                    role="menuitem"
                    href={SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 font-semibold hover:bg-surface border-t-2 border-line first:border-t-0"
                  >
                    <Icon name="heart" className="w-5 h-5 text-whistle" />
                    Supporta FantaClash
                  </a>
                ) : (
                  <span className="flex items-center gap-3 px-4 py-3 text-ink-muted border-t-2 border-line first:border-t-0" title="Link di supporto in arrivo">
                    <Icon name="heart" className="w-5 h-5" />
                    Supporta (in arrivo)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Nuova partita?"
          message="La partita in corso verrà cancellata: asta, rose e torneo ripartono da zero."
          confirmLabel="Cancella e ricomincia"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            onNewGame?.();
          }}
        />
      )}
    </header>
  );
}

/** Asta › Sorteggio › Quarti › Semifinale › Finale */
function JourneyTrail({ step }: { step: number }) {
  return (
    <ol aria-label="Percorso di gioco" className="hidden lg:flex items-center gap-1 font-display text-lg font-bold">
      {JOURNEY_STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex items-center gap-1">
            {i > 0 && <span className={`w-5 h-0.5 ${done || current ? 'bg-highlight' : 'bg-canvas/25'}`} aria-hidden="true" />}
            <span
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-1 px-2 py-0.5 leading-none ${
                current ? 'bg-highlight text-on-highlight' : done ? 'text-highlight' : 'text-canvas/45'
              }`}
            >
              {done && <Icon name="check" className="w-3.5 h-3.5" />}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Coppia etichetta/valore per lo slot di contesto della navbar */
export function NavStat({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="leading-none text-right">
      <span className="block text-xs font-semibold text-canvas/60">{label}</span>
      <span className={`font-display text-2xl font-extrabold tabular-nums ${accent ? 'text-highlight' : 'text-canvas'}`}>{value}</span>
    </div>
  );
}
