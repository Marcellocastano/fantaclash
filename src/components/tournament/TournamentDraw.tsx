import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { drawOrder, TournamentState } from '../../domain/tournament';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useT } from '../../i18n/I18nProvider';
import { Icon } from '../Icon';
import { StreamerReserve } from '../layout/GameShell';
import { buildDrawSequence, slotOf } from './draw/drawSequence';
import { DrawBoard } from './draw/DrawBoard';
import { DrawCard } from './draw/DrawCard';
import { FLY_MS, useDrawPlayback } from './draw/useDrawPlayback';

interface TournamentDrawProps {
  tournament: TournamentState;
  /**
   * Ordine già deciso (stanza multiplayer): lo anima così com'è e non
   * chiama onDrawn. Senza la prop, l'ordine è generato con Math.random.
   */
  order?: string[];
  /** Registra il sorteggio nello stato (a fine animazione) */
  onDrawn?: (order: string[]) => void;
  /** Animazione finita: si va al tabellone (click su "Vai al torneo") */
  onDone: () => void;
}

/** Primo elemento visibile della query (i layout desktop/mobile coesistono nel DOM) */
function visibleEl(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Sorteggio a tabellone live: la figurina estratta compare sopra la
 * coppa, una luce gialla corre sugli slot liberi e si ferma su quello
 * giusto, la card ci vola dentro con un timbro. Gli slot si riempiono in
 * ordine sparso ma il tabellone finale coincide con `order`. Lo skip è
 * sempre disponibile; a tabellone completo appare il CTA "Vai al torneo".
 */
export function TournamentDraw({ tournament, order: fixedOrder, onDrawn, onDone }: TournamentDrawProps) {
  const t = useT();
  const [order] = useState(() => fixedOrder ?? drawOrder(tournament, Math.random));
  const steps = useMemo(
    () => buildDrawSequence(order, tournament.userTeamId || null),
    [order, tournament.userTeamId]
  );
  const reduced = useReducedMotion();
  const pb = useDrawPlayback({ steps, order, reduced, onDrawn });
  const [flyStyle, setFlyStyle] = useState<CSSProperties | null>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const done = pb.phase === 'done';
  const step = pb.step;
  const teamOf = (id: string | undefined) => tournament.teams.find(x => x.id === id);
  const drawnTeam = step ? teamOf(step.teamId) : undefined;

  // Volo FLIP: le misure si leggono al momento del volo (mai in cache);
  // se una delle due manca (jsdom, layout nascosto) il volo si salta.
  useLayoutEffect(() => {
    if (pb.phase !== 'fly' || !step) {
      setFlyStyle(null);
      return;
    }
    const cardEl = visibleEl('[data-draw-card]');
    const slotEl = visibleEl(`[data-draw-slot="${step.slot}"]`);
    if (!cardEl || !slotEl) {
      setFlyStyle(null);
      return;
    }
    const c = cardEl.getBoundingClientRect();
    const s = slotEl.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (c.left + c.width / 2);
    const dy = s.top + s.height / 2 - (c.top + c.height / 2);
    const scale = Math.min(1, s.width / c.width);
    setFlyStyle({
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      transition: `transform ${FLY_MS - 60}ms cubic-bezier(.35,.1,.25,1)`,
    });
  }, [pb.phase, step]);

  // A tabellone completo il focus va al CTA
  useEffect(() => {
    if (done) ctaRef.current?.focus();
  }, [done]);

  const progress = done
    ? t('tournament.draw.complete')
    : t('tournament.draw.pick', { n: Math.min(pb.stepIndex + 1, order.length), total: order.length });

  const announce = useMemo(() => {
    if (done) return t('tournament.draw.complete');
    if (pb.phase === 'land' && step) {
      const { quarter, side } = slotOf(step.slot);
      return t('tournament.draw.announce', {
        team: tournament.teams.find(x => x.id === step.teamId)?.name ?? '',
        n: quarter + 1,
        side: t(side === 'home' ? 'tournament.draw.home' : 'tournament.draw.away'),
      });
    }
    return '';
  }, [done, pb.phase, step, tournament.teams, t]);

  // Lampo sul box quando il quarto appena completato ha entrambe le squadre
  const landingQuarter = pb.phase === 'land' && step ? slotOf(step.slot).quarter : null;
  const flashQuarter =
    landingQuarter !== null && pb.placed.has(landingQuarter * 2) && pb.placed.has(landingQuarter * 2 + 1)
      ? landingQuarter
      : null;

  const onStage = pb.phase === 'reveal' || pb.phase === 'spin' || pb.phase === 'fly';
  const card =
    drawnTeam && onStage ? (
      <DrawCard
        key={pb.stepIndex}
        team={drawnTeam}
        caption={t('tournament.draw.pick', { n: pb.stepIndex + 1, total: order.length })}
        dropping={pb.phase === 'reveal'}
        style={flyStyle ?? undefined}
      />
    ) : null;

  return (
    <StreamerReserve>
      <div className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-10">
          <div>
            <p className="font-display text-2xl font-extrabold text-ink-muted">{tournament.name}</p>
            <h1 className="font-display text-4xl sm:text-6xl font-black text-ink leading-none mt-1">
              {t('tournament.draw.title')}
            </h1>
            <p className="text-lg text-ink-soft mt-3">
              {t(tournament.format === 'double' ? 'tournament.draw.formatDouble' : 'tournament.draw.formatSingle')}
            </p>
          </div>
          <div className="flex w-full items-center justify-center gap-4 sm:gap-5">
            {done ? (
              <span className="border-2 border-ink px-3 py-1.5 font-display text-lg font-extrabold leading-none shadow-block-sm bg-highlight text-on-highlight">
                {progress}
              </span>
            ) : (
              // Avanzamento: etichetta + una tacca per estrazione
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className="font-display text-lg font-extrabold leading-none text-ink">{progress}</span>
                <span className="flex gap-1" aria-hidden="true">
                  {order.map((_, i) => (
                    <span
                      key={i}
                      className={`w-4 h-2 border border-ink transition-colors duration-200 ${
                        i < pb.placed.size ? 'bg-pitch' : i === pb.stepIndex ? 'bg-highlight' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </span>
              </div>
            )}
            {!done && (
              <button onClick={pb.skip} className="btn-bid whitespace-nowrap !text-base sm:!text-lg !px-4 sm:!px-5 !py-2.5">
                {t('tournament.draw.skip')}
                <Icon name="skip" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <section aria-label={t('tournament.draw.boardAria')}>
          <DrawBoard
            tournament={tournament}
            order={order}
            placed={pb.placed}
            litSlot={pb.litSlot}
            lockedSlot={pb.lockedSlot}
            landingSlot={pb.landingSlot}
            flashQuarter={flashQuarter}
            done={done}
            card={card}
          />
        </section>

        {/* Annunci delle estrazioni per lo screen reader */}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>

        {done && (
          <div className="mt-8 sm:mt-10 flex justify-center">
            <button ref={ctaRef} onClick={onDone} className="btn-cta w-full sm:w-auto motion-safe:animate-reveal">
              {t('tournament.draw.toTournament')}
            </button>
          </div>
        )}
      </div>
    </StreamerReserve>
  );
}
