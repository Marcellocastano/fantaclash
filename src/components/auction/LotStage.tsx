import { AuctionBid, Player, Team } from '../../types';
import { Icon } from '../Icon';
import { PlayerCard } from '../player/PlayerCard';
import { TeamBadge } from '../tournament/TeamBadge';
import { AdvanceButton } from './AutoAdvance';

interface LotStageProps {
  player: Player;
  currentBid: number;
  bidderId: string | null;
  bids: AuctionBid[];
  teams: Team[];
  userTeam: Team | undefined;
  timeRemaining: number;
  active: boolean;
  canBid: boolean;
  userMaxBid: number;
  outbid: boolean;
  outbidKey: number;
  /** Avanzamento automatico attivo: il pulsante mostra l'attesa */
  autoAdvance: boolean;
  onBid: (amount: number) => void;
  onNext: () => void;
}

const LOT_MS = 5000;
const INCREMENTS = [1, 5, 10];
const HISTORY_SIZE = 5;

/**
 * Il lotto sul banco: card del giocatore, prezzo, chi è in testa, timer,
 * rilanci. Quando sei in testa tutto il blocco prezzo diventa giallo;
 * quando ti superano lampeggia in arancio.
 */
export function LotStage(props: LotStageProps) {
  const { player, currentBid, bidderId, bids, teams, userTeam, timeRemaining, active, canBid, userMaxBid, outbid, outbidKey, autoAdvance, onBid, onNext } = props;
  const leader = teams.find(t => t.id === bidderId);
  const userLeads = !!userTeam && bidderId === userTeam.id;
  const lowTime = active && timeRemaining < 2000;
  const seconds = Math.max(0, timeRemaining / 1000);

  const priceTone = !active
    ? userLeads
      ? 'bg-highlight text-on-highlight'
      : 'bg-ink text-canvas'
    : outbid
      ? 'bg-whistle text-on-whistle'
      : userLeads
        ? 'bg-highlight text-on-highlight'
        : 'bg-canvas text-ink';

  return (
    <div className="space-y-5">
      <div key={player.id} className="relative motion-safe:animate-drop">
        <PlayerCard player={player} size="lg" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={`motion-safe:animate-stamp-tilt -rotate-12 border-4 px-6 py-2 font-display font-black text-4xl sm:text-6xl md:text-7xl leading-none shadow-block ${
                userLeads ? 'bg-highlight text-on-highlight border-ink' : 'bg-canvas text-whistle border-whistle'
              }`}
            >
              {userLeads ? 'TUO!' : 'VENDUTO'}
            </span>
          </div>
        )}
      </div>

      {/* Blocco prezzo: colore = situazione */}
      <div key={outbid ? `outbid-${outbidKey}` : 'price'} className={`border-2 border-ink ${priceTone} ${outbid ? 'motion-safe:animate-shake' : ''}`}>
        <div className="flex items-stretch">
          <div className="flex-1 px-4 py-3 min-w-0">
            <span className="block text-sm font-bold opacity-80">
              {!active ? (userLeads ? 'Aggiudicato a te' : `Aggiudicato a ${leader?.name ?? ''}`) : outbid ? `Superato da ${leader?.name ?? ''}!` : userLeads ? 'Sei in testa' : leader ? 'In testa' : 'Base d\'asta'}
            </span>
            <span className="flex items-center gap-3 mt-1 min-w-0">
              {leader && <TeamBadge team={leader} size="md" />}
              <span className="font-display text-2xl font-extrabold leading-none truncate">
                {userLeads ? 'La tua squadra' : leader?.name ?? 'Nessuna offerta'}
              </span>
            </span>
          </div>
          <div className="px-4 py-2 border-l-2 border-ink flex items-baseline gap-1 shrink-0">
            <span key={currentBid} className="font-display font-black text-5xl sm:text-7xl leading-none tabular-nums inline-block motion-safe:animate-stamp">
              {currentBid}
            </span>
            <span className="font-display text-2xl font-extrabold">Cr</span>
          </div>
        </div>
        {active && (
          <div className="h-3 border-t-2 border-ink bg-canvas">
            <div
              className={`h-full transition-[width] duration-100 ease-linear ${lowTime ? 'bg-whistle' : userLeads ? 'bg-ink' : 'bg-pitch'}`}
              style={{ width: `${(timeRemaining / LOT_MS) * 100}%` }}
            />
          </div>
        )}
      </div>

      {active ? (
        <>
          <div className="flex items-center justify-between">
            <span className="label">Tempo</span>
            <span
              key={lowTime ? Math.ceil(seconds) : 'ok'}
              className={`font-display font-black text-3xl sm:text-4xl tabular-nums leading-none inline-block ${lowTime ? 'text-whistle motion-safe:animate-tick-pulse' : 'text-ink'}`}
            >
              {seconds.toFixed(1)}
            </span>
          </div>

          {canBid ? (
            <div>
              <div className="grid grid-cols-3 gap-3">
                {INCREMENTS.map(inc => {
                  const next = currentBid + inc;
                  return (
                    <button key={inc} onClick={() => onBid(next)} disabled={userLeads || next > userMaxBid} className="btn-bid flex-col py-3">
                      <span className="text-2xl sm:text-3xl">+{inc}</span>
                      <span className="text-sm font-bold opacity-80">a {next}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-ink-muted mt-3">
                {userLeads ? 'Sei in testa: aspetta lo scadere del tempo.' : `Puoi offrire fino a ${userMaxBid} Cr.`}
              </p>
            </div>
          ) : (
            <p className="text-ink-soft">Hai già completato questo reparto: guarda come va a finire.</p>
          )}
        </>
      ) : (
        <AdvanceButton auto={autoAdvance} onClick={onNext} className="btn-primary w-full text-2xl py-4">
          Prossimo giocatore
          <Icon name="arrow" className="w-5 h-5" />
        </AdvanceButton>
      )}

      {bids.length > 0 && (
        <section aria-label="Ultimi rilanci">
          <div className="flex items-baseline justify-between pb-2 border-b-2 border-ink">
            <h3 className="font-display font-extrabold text-xl text-ink leading-none">Ultimi rilanci</h3>
            <span className="text-sm font-semibold text-ink-muted tabular-nums">
              {bids.length} {bids.length === 1 ? 'offerta' : 'offerte'}
            </span>
          </div>
          <ol className="divide-y-2 divide-line">
            {bids
              .map((b, idx) => ({ ...b, delta: idx > 0 ? b.amount - bids[idx - 1].amount : null }))
              .slice(-HISTORY_SIZE)
              .reverse()
              .map((b, i) => {
                const t = teams.find(x => x.id === b.teamId);
                const top = i === 0;
                const mine = !!t?.isUserTeam;
                return (
                  <li
                    key={`${b.teamId}-${b.amount}`}
                    className={`flex items-center gap-3 py-2 motion-safe:animate-reveal ${
                      top ? (mine ? 'bg-highlight -mx-2 px-2' : 'bg-surface -mx-2 px-2') : ''
                    }`}
                  >
                    <TeamBadge team={t} size="sm" />
                    <span className={`flex-1 min-w-0 truncate ${top ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                      {mine ? 'La tua squadra' : t?.name}
                    </span>
                    {top && (
                      <span className="shrink-0 border-2 border-ink bg-canvas px-1.5 py-0.5 font-display font-extrabold text-xs leading-none uppercase">
                        In testa
                      </span>
                    )}
                    <span className={`w-10 shrink-0 text-right text-sm font-semibold tabular-nums ${top ? 'text-ink' : 'text-ink-muted'}`}>
                      {b.delta === null ? 'apre' : `+${b.delta}`}
                    </span>
                    <span
                      className={`w-16 shrink-0 text-right font-display font-extrabold tabular-nums leading-none ${
                        top ? 'text-2xl text-ink' : 'text-lg text-ink-soft'
                      }`}
                    >
                      {b.amount} <span className="text-sm">Cr</span>
                    </span>
                  </li>
                );
              })}
          </ol>
        </section>
      )}
    </div>
  );
}
