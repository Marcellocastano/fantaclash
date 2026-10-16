import { ReactNode } from 'react';
import { TournamentState, TournamentTeam } from '../../../domain/tournament';
import { kitOf } from '../../../domain/teamKits';
import { useT } from '../../../i18n/I18nProvider';
import { Icon } from '../../Icon';
import { TeamBadge } from '../TeamBadge';

/**
 * Tabellone del sorteggio che si riempie in diretta: stessa composizione
 * dell'hub (quarti ai lati, semifinali e finale tenui, coppa al centro),
 * replicata qui per non rischiare regressioni sul tabellone del torneo.
 * Ogni slot dei quarti ha data-draw-slot={j} per la misura del volo;
 * la card estratta è in scena sopra la coppa. Desktop: griglia a specchio
 * a 5 colonne. Mobile: palco in alto e i 4 quarti in griglia 2x2.
 */

interface DrawBoardProps {
  tournament: TournamentState;
  /** order[j] = squadra dello slot j (casa/trasferta del Quarto floor(j/2)) */
  order: string[];
  placed: ReadonlySet<number>;
  /** Slot acceso dalla roulette */
  litSlot: number | null;
  /** Destinazione raggiunta: lampeggia due volte prima del volo */
  lockedSlot: number | null;
  /** Slot in fase di timbro */
  landingSlot: number | null;
  /** Quarto appena completato (entrambe le squadre): lampo sul box */
  flashQuarter: number | null;
  done: boolean;
  /** Figurina in scena sopra la coppa (renderizzata in entrambi i layout) */
  card: ReactNode;
}

export function DrawBoard(props: DrawBoardProps) {
  const { tournament, order, placed, done } = props;
  const teamAt = (slot: number): TournamentTeam | undefined =>
    placed.has(slot) ? tournament.teams.find(x => x.id === order[slot]) : undefined;
  const userQuarter = tournament.userTeamId ? Math.floor(order.indexOf(tournament.userTeamId) / 2) : -1;

  const qb = (i: number) => (
    <QuarterBox
      key={i}
      index={i}
      tournament={tournament}
      home={teamAt(i * 2)}
      away={teamAt(i * 2 + 1)}
      litSlot={props.litSlot}
      lockedSlot={props.lockedSlot}
      landingSlot={props.landingSlot}
      flash={props.flashQuarter === i}
      highlight={done && userQuarter === i}
    />
  );

  /** Due quarti che confluiscono in una semifinale, specchiati a destra */
  const half = (side: 'left' | 'right', quarters: number[], userSide: boolean) => {
    const outer = side === 'left' ? '-right-4 border-r-2' : '-left-4 border-l-2';
    const inner = side === 'left' ? '-left-4' : '-right-4';
    const toFinal = side === 'left' ? '-right-4' : '-left-4';
    const tone = done && userSide ? 'border-highlight' : 'border-canvas/30';
    const quartersCol = (
      <div key={`${side}-qf`} className="relative flex flex-col justify-around">
        {quarters.map(qb)}
        <span className={`absolute ${outer} top-[calc(25%-1px)] bottom-[calc(25%-1px)] w-4 border-y-2 ${tone}`} aria-hidden="true" />
      </div>
    );
    const semiCol = (
      <div key={`${side}-sf`} className="relative flex items-center">
        <span className={`absolute ${inner} top-[calc(50%-1px)] w-4 border-t-2 ${tone}`} aria-hidden="true" />
        <GhostBox />
        <span className={`absolute ${toFinal} top-[calc(50%-1px)] w-4 border-t-2 ${tone}`} aria-hidden="true" />
      </div>
    );
    return side === 'left' ? [quartersCol, semiCol] : [semiCol, quartersCol];
  };

  const [qfLeft, sfLeft] = half('left', [0, 1], userQuarter === 0 || userQuarter === 1);
  const [sfRight, qfRight] = half('right', [2, 3], userQuarter === 2 || userQuarter === 3);

  return (
    <>
      {/* Mobile: palco in alto, quarti in griglia 2x2, resto sintetizzato */}
      <div className="md:hidden bg-pitch-deep border-2 border-ink shadow-block p-4 text-canvas">
        <div className="relative flex items-center justify-center min-h-[12rem]">
          <DrawStage card={props.card} small />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">{[0, 1, 2, 3].map(qb)}</div>
        <ThenSemis />
      </div>

      {/* Desktop: tabellone a specchio come nell'hub */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div className="relative min-w-[980px] bg-pitch-deep border-2 border-ink shadow-block px-6 pt-5 pb-7 text-canvas">
          <span className="absolute inset-y-0 left-1/2 w-0.5 bg-canvas/10" aria-hidden="true" />

          <DesktopHeader />
          <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 min-h-[380px]">
            <span className="absolute left-1/2 top-1/2 w-56 h-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas/10" aria-hidden="true" />
            {qfLeft}
            {sfLeft}

            {/* Centro: la finale sta a metà altezza come nell'hub (allineata
                ai collegamenti delle semifinali), la coppa le sta sopra */}
            <div className="relative flex items-center min-w-0">
              <div className="absolute inset-x-0 bottom-[calc(50%+5rem)] flex justify-center">
                <DrawStage />
              </div>
              <FinalBox />
            </div>

            {sfRight}
            {qfRight}

            {/* Figurina in scena al centro del tabellone: da qui vola nello slot */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" aria-hidden="true">
              {props.card}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Intestazione delle colonne del tabellone desktop */
function DesktopHeader() {
  const t = useT();
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 mb-4 font-display text-lg font-extrabold text-canvas/60 text-center">
      <span>{t('tournament.bracket.quarters')}</span>
      <span>{t('tournament.bracket.semi')}</span>
      <span className="text-highlight">{t('tournament.bracket.final')}</span>
      <span>{t('tournament.bracket.semi')}</span>
      <span>{t('tournament.bracket.quarters')}</span>
    </div>
  );
}

/** Coppa del sorteggio; su mobile funge anche da palco della figurina estratta */
function DrawStage({ card, small = false }: { card?: ReactNode; small?: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        data-draw-cup
        className={`rounded-full border-2 border-ink bg-highlight shadow-block-sm flex items-center justify-center ${
          small ? 'w-16 h-16' : 'w-24 h-24'
        }`}
      >
        <Icon name="trophy" className={`${small ? 'w-8 h-8' : 'w-12 h-12'} text-on-highlight`} />
      </div>
      {card && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" aria-hidden="true">
          {card}
        </div>
      )}
    </div>
  );
}

interface QuarterBoxProps {
  index: number;
  tournament: TournamentState;
  home: TournamentTeam | undefined;
  away: TournamentTeam | undefined;
  litSlot: number | null;
  lockedSlot: number | null;
  landingSlot: number | null;
  /** Entrambe le squadre appena sorteggiate: lampo sul box */
  flash: boolean;
  /** Quarto dell'utente a sorteggio completato: cornice gialla */
  highlight: boolean;
}

function QuarterBox({ index, tournament, home, away, litSlot, lockedSlot, landingSlot, flash, highlight }: QuarterBoxProps) {
  const t = useT();
  const double = tournament.format === 'double';
  const filled = Boolean(home || away);
  // Box: vuoto = tratteggio sul verde; con squadre = testata verde prato;
  // quarto dell'utente a sorteggio finito = testata gialla
  const box = highlight
    ? 'border-highlight bg-ink outline outline-2 outline-highlight'
    : filled
      ? 'border-ink bg-pitch shadow-block-sm'
      : 'border-canvas/40';
  const head = highlight ? 'bg-highlight text-on-highlight' : filled ? 'text-canvas' : 'text-canvas/60';
  const chip = highlight
    ? 'bg-ink text-canvas'
    : filled
      ? 'bg-highlight text-on-highlight'
      : 'border border-canvas/40 text-canvas/50';
  return (
    <div className={`w-full border-2 ${box} ${flash ? 'motion-safe:animate-flash' : ''}`}>
      <div className={`flex items-center justify-between gap-2 px-2 py-1 transition-colors duration-200 ${head}`}>
        <span className="font-display text-sm font-black uppercase tracking-wider leading-none">
          {t('tournament.draw.quarterShort', { n: index + 1 })}
        </span>
        {double && (
          <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider leading-none ${chip}`}>
            {t('tournament.bracket.twoLegsShort')}
          </span>
        )}
      </div>
      <DrawSlot
        slot={index * 2}
        team={home}
        lit={litSlot === index * 2}
        locked={lockedSlot === index * 2}
        landing={landingSlot === index * 2}
      />
      <div className="border-t border-canvas/20" aria-hidden="true" />
      <DrawSlot
        slot={index * 2 + 1}
        team={away}
        lit={litSlot === index * 2 + 1}
        locked={lockedSlot === index * 2 + 1}
        landing={landingSlot === index * 2 + 1}
      />
    </div>
  );
}

interface DrawSlotProps {
  slot: number;
  team: TournamentTeam | undefined;
  lit: boolean;
  locked: boolean;
  landing: boolean;
}

function DrawSlot({ slot, team, lit, locked, landing }: DrawSlotProps) {
  const t = useT();
  const tone = lit ? 'border-ink bg-highlight' : team ? 'border-ink bg-canvas' : 'border-dashed border-canvas/30';
  return (
    <div
      data-draw-slot={slot}
      className={`relative flex items-center gap-2 border-2 px-2 min-h-[2.5rem] transition-[background-color,transform] duration-200 ${tone} ${
        lit ? 'scale-[1.04] motion-safe:animate-slot-lit' : ''
      } ${locked ? 'motion-safe:animate-slot-flash' : ''}`}
    >
      {team ? (
        <div className={`flex items-center gap-2 min-w-0 ${landing ? 'motion-safe:animate-stamp' : ''}`}>
          <span
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ backgroundColor: kitOf(team).primary }}
            aria-hidden="true"
          />
          <span className="ml-1 shrink-0 inline-flex">
            <TeamBadge team={team} size="sm" />
          </span>
          <span
            className={`flex-1 min-w-0 truncate font-display text-lg font-extrabold leading-none ${
              team.isUserTeam ? 'text-pitch' : 'text-ink'
            }`}
            title={team.name}
          >
            {team.name}
          </span>
        </div>
      ) : (
        <>
          <span
            className={`w-7 h-7 shrink-0 border-2 border-dashed ${lit ? 'border-ink/50' : 'border-canvas/30'}`}
            aria-hidden="true"
          />
          <span className={`text-sm font-semibold truncate ${lit ? 'text-on-highlight' : 'text-canvas/50'}`}>
            {t('tournament.draw.slotEmpty')}
          </span>
        </>
      )}
    </div>
  );
}

/** Box vuoto tenue per semifinali e finale (decorativo) */
function GhostBox({ label, tag }: { label?: string; tag?: string }) {
  const t = useT();
  return (
    <div className="w-full border-2 border-dashed border-canvas/30" aria-hidden="true">
      {(label || tag) && (
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <span className="font-display text-xs font-black uppercase tracking-wider text-canvas/40">{label}</span>
          {tag && (
            <span className="border border-canvas/30 px-1 text-[9px] font-black uppercase tracking-wider text-canvas/40">
              {tag}
            </span>
          )}
        </div>
      )}
      {[0, 1].map(i => (
        <div key={i} className="flex items-center gap-2 px-2 min-h-[2.5rem]">
          <span className="w-7 h-7 shrink-0 border-2 border-dashed border-canvas/20" aria-hidden="true" />
          <span className="text-sm text-canvas/40">{t('tournament.bracket.waiting')}</span>
        </div>
      ))}
    </div>
  );
}

function FinalBox() {
  const t = useT();
  return <GhostBox label={t('tournament.bracket.final')} tag={t('tournament.draw.finalSingle')} />;
}

function ThenSemis() {
  const t = useT();
  return <p className="mt-3 text-center text-xs font-semibold text-canvas/50">{t('tournament.draw.thenSemis')}</p>;
}
