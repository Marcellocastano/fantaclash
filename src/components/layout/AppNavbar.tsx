import { ReactNode, useEffect, useRef, useState } from 'react';
import { SUPPORT_URL } from '../../config';
import { useSoundMuted } from '../../hooks/useSound';
import { useStreamerMode } from '../../hooks/useStreamerMode';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';
import { ConfirmDialog } from './ConfirmDialog';
import { JOURNEY_STEPS } from './journey';

export interface AppNavbarProps {
  /** Tappa corrente del percorso (vedi journeyStep); null = nessun percorso */
  step?: number | null;
  /** Dati del momento a destra (crediti, annata...) */
  context?: ReactNode;
  /** Link alle sezioni del sito al posto del percorso */
  links?: { label: string; href: string }[];
  /** Partita in corso: il menu offre "Nuova partita" (con conferma) */
  onNewGame?: () => void;
  /**
   * Uscita da una sessione (stanza multiplayer): il clic sul logo apre
   * questa conferma invece di portare alla home.
   */
  sessionExit?: {
    title: string;
    message: string;
    confirmLabel: string;
    action: () => void;
  };
}

/**
 * Navbar comune: logo, percorso di gioco, dati del momento, audio e menu
 * (nuova partita con conferma, supporto).
 */
export function AppNavbar({ step = null, context, links, onNewGame, sessionExit }: AppNavbarProps) {
  const [muted, setMuted] = useSoundMuted();
  const [streamer, setStreamer] = useStreamerMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // In una sessione il logo chiede conferma come "Nuova partita" o l'uscita
  // dalla stanza; fuori sessione resta un link alla home.
  const logoSession = sessionExit ?? (onNewGame
    ? {
        title: 'Nuova partita?',
        message: 'La partita in corso verrà cancellata: asta, rose e torneo ripartono da zero.',
        confirmLabel: 'Cancella e ricomincia',
        action: onNewGame,
      }
    : undefined);

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
        {logoSession ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            aria-label="FantaClash"
            className="flex items-center gap-2.5 font-display text-2xl md:text-3xl font-extrabold leading-none shrink-0"
          >
            <LogoMark className="h-9 w-9" />
            <span className="hidden sm:inline">FantaClash</span>
            <span className="font-display text-[10px] md:text-xs font-black tracking-widest bg-highlight text-on-highlight border border-ink px-1.5 py-0.5 -rotate-3 shadow-block-sm">ALPHA</span>
          </button>
        ) : (
          <a href="/" aria-label="FantaClash — torna alla home" className="flex items-center gap-2.5 font-display text-2xl md:text-3xl font-extrabold leading-none shrink-0">
            <LogoMark className="h-9 w-9" />
            <span className="hidden sm:inline">FantaClash</span>
            <span className="font-display text-[10px] md:text-xs font-black tracking-widest bg-highlight text-on-highlight border border-ink px-1.5 py-0.5 -rotate-3 shadow-block-sm">ALPHA</span>
          </a>
        )}

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
          {SUPPORT_URL && (
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Supporta FantaClash su Ko-fi"
              className="flex items-center gap-2 px-3 py-1.5 bg-highlight text-on-highlight font-display font-extrabold text-lg leading-none border-2 border-ink shadow-block-sm hover:brightness-110 transition-all duration-150"
            >
              <Icon name="heart" className="w-5 h-5 text-whistle motion-safe:animate-heartbeat" />
              <span className="hidden sm:inline">Supporta</span>
            </a>
          )}
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
                <div className="px-4 py-3 border-t-2 border-line" role="group" aria-label="Modalità streamer">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">Modalità streamer</span>
                    <span className="flex gap-1">
                      {([true, false] as const).map(v => (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={streamer === v}
                          onClick={() => setStreamer(v)}
                          className={`px-3 py-1 font-display font-extrabold text-sm border-2 border-ink transition-colors duration-150 ${
                            streamer === v ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink'
                          }`}
                        >
                          {v ? 'Sì' : 'No'}
                        </button>
                      ))}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1.5">
                    Libera l'angolo in alto a destra per la webcam (solo su schermi larghi).
                  </p>
                </div>
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

      {confirmReset && logoSession && (
        <ConfirmDialog
          title={logoSession.title}
          message={logoSession.message}
          confirmLabel={logoSession.confirmLabel}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            logoSession.action();
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
