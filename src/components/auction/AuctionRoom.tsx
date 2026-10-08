import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuctionController } from '../../hooks/auctionController';
import { Player, PlayerRole } from '../../types';
import { Icon } from '../Icon';
import { BotThinking } from './BotThinking';
import { FastForwardMenu } from './FastForwardMenu';
import { LotStage } from './LotStage';
import { PlayerList, SoldEntry } from './PlayerList';
import { TeamsRecap } from './TeamsRecap';
import { useAutoAdvance, useBidFeedback, useBotScanner } from './useAuctionFx';
import { AdvanceButton } from './AutoAdvance';
import { isBoolean, usePersistentState } from '../../hooks/usePersistentState';

interface AuctionRoomProps {
  onComplete: () => void;
}

const ROLE_PLURAL: Record<PlayerRole, string> = {
  P: 'portieri',
  D: 'difensori',
  C: 'centrocampisti',
  A: 'attaccanti',
};

const ROLE_SINGULAR: Record<PlayerRole, string> = {
  P: 'portiere',
  D: 'difensore',
  C: 'centrocampista',
  A: 'attaccante',
};

/**
 * Stanza d'asta: banco (giocatore chiamato, prezzo, rilanci), listone e
 * squadre. Il banco cambia aspetto con lo stato del lotto.
 */
export function AuctionRoom({ onComplete }: AuctionRoomProps) {
  const a = useAuctionController();
  const { roundState, currentRole, currentPlayer, currentBidderId } = a;
  const [showTeams, setShowTeams] = useState(false);
  const [autoAdvance, setAutoAdvance] = usePersistentState('fanta-fc-auto-advance-v2', true, isBoolean);

  const userTeam = a.myTeam;
  const caller = a.teams.find(t => t.id === a.callerId);
  const callerMeta = a.callerId ? a.teamMeta?.[a.callerId] : undefined;
  // In stanza un umano può essere il chiamante: niente animazione "bot che pensa"
  const callerIsHuman = !!caller && !!callerMeta && callerMeta.controller === 'human';
  const callSeconds =
    a.callDeadline != null ? Math.max(0, Math.ceil((a.callDeadline - a.now) / 1000)) : null;
  const isUserWinning = !!userTeam && currentBidderId === userTeam.id;
  const remaining = a.remainingPlayers;

  const sold: SoldEntry[] = useMemo(
    () => a.teams.flatMap(t => t.roster.map(o => ({ player: o.player, team: t.name, price: o.purchasePrice }))),
    [a.teams]
  );

  const { scanId, lockedId } = useBotScanner(roundState === 'bot_calling', currentRole, remaining, currentPlayer?.id ?? null);
  const { outbid, outbidKey } = useBidFeedback({
    active: roundState === 'auction_active',
    bidderId: currentBidderId,
    bid: a.currentBid,
    userTeamId: userTeam?.id ?? '',
    timeRemaining: a.timeRemaining,
    sold: roundState === 'sold',
    soldToUser: roundState === 'sold' && isUserWinning,
  });

  // Avanti automatico dopo l'aggiudicazione e alla chiusura del reparto
  const advanceKey =
    roundState === 'sold' ? `sold-${currentPlayer?.id}` : roundState === 'role_complete' ? `role-${currentRole}` : null;
  const advance = roundState === 'role_complete' ? a.continueToNextRole : a.confirmAssignment;
  useAutoAdvance(autoAdvance, advanceKey, advance);

  const handlePlayerSelect = useCallback(
    (player: Player) => {
      if (a.isUserCallingTurn && roundState === 'calling') a.userCallPlayer(player);
    },
    [a, roundState]
  );

  // Asta completata: si passa subito al torneo (il sorteggio parte da solo)
  useEffect(() => {
    if (a.isComplete || roundState === 'auction_complete') onComplete();
  }, [a.isComplete, roundState, onComplete]);
  if (a.isComplete || roundState === 'auction_complete') return null;

  const stageTitle =
    roundState === 'idle'
      ? 'Pronti?'
      : roundState === 'calling'
        ? 'Tocca a te'
        : roundState === 'bot_calling'
          ? callerIsHuman
            ? 'Attendi la chiamata'
            : 'Chiama un bot'
          : roundState === 'role_complete'
            ? 'Reparto chiuso'
            : roundState === 'sold'
              ? isUserWinning
                ? 'Colpo tuo!'
                : 'Aggiudicato'
              : 'All\'asta';

  return (
    <div className="flex-1 min-h-0 lg:h-[calc(100vh-4rem)] w-full max-w-[1600px] mx-auto px-4">
      <div className="grid grid-cols-12 lg:h-full">
        {/* Banco d'asta */}
        <section className="col-span-12 lg:col-span-5 xl:col-span-4 lg:min-h-0 lg:overflow-y-auto py-6 lg:pr-6 lg:border-r-2 lg:border-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h1 className="font-display text-4xl xl:text-5xl font-black text-ink leading-none">{stageTitle}</h1>
            {a.allowSimulation && (
              <FastForwardMenu
                currentRole={currentRole}
                canSimulateLot={a.canSimulateLot}
                canSimulateRole={a.canSimulateRole}
                onSimulateLot={a.simulateLot}
                onSimulateRole={a.simulateRoleCompletion}
                onSimulateAll={a.simulateAll}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={setAutoAdvance}
              />
            )}
          </div>

          {roundState === 'idle' && (
            <div className="py-10 text-center">
              <p className="text-xl text-ink-soft">
                Si parte dai <span className="font-bold text-ink">{ROLE_PLURAL[currentRole]}</span>. Chiami tu per primo.
              </p>
              <button onClick={a.startAuction} className="btn-cta mt-10">
                Inizia l'asta
              </button>
            </div>
          )}

          {roundState === 'calling' && a.isUserCallingTurn && (
            <div className="py-6">
              <p className="text-2xl text-ink leading-snug">
                Scegli un <span className="font-bold text-pitch">{ROLE_SINGULAR[currentRole]}</span> dal listone e chiamalo all'asta.
              </p>
              <p className="flex items-center gap-2 text-ink-muted mt-4">
                <Icon name="arrow" className="w-5 h-5 text-pitch" />
                Clicca su una riga: parte da 1 credito.
              </p>
              {callSeconds != null && (
                <p className="font-display text-2xl font-extrabold text-ink mt-4">
                  Hai {callSeconds}s per scegliere
                </p>
              )}
            </div>
          )}

          {roundState === 'bot_calling' &&
            (callerIsHuman ? (
              <div className="py-6" aria-live="polite">
                <p className="font-display text-3xl font-extrabold text-ink leading-snug">
                  {callerMeta?.nickname ?? caller.name} sta scegliendo…
                  {callSeconds != null && ` ${callSeconds}s`}
                </p>
                <p className="text-ink-soft mt-2">
                  Sta chiamando un {ROLE_SINGULAR[currentRole]} all'asta.
                </p>
              </div>
            ) : (
              <BotThinking team={caller} role={currentRole} />
            ))}

          {roundState === 'role_complete' && (
            <div className="py-10 text-center">
              <p className="text-xl text-ink-soft">
                Ora tocca ai <span className="font-bold text-ink">{ROLE_PLURAL[currentRole]}</span>.
              </p>
              {a.allowSimulation ? (
                <AdvanceButton auto={autoAdvance} onClick={a.continueToNextRole} className="btn-cta mt-10">
                  Avanti
                  <Icon name="arrow" className="w-7 h-7" />
                </AdvanceButton>
              ) : (
                <p className="text-sm text-ink-muted mt-10">Si passa al reparto successivo da soli…</p>
              )}
            </div>
          )}

          {currentPlayer && (roundState === 'auction_active' || roundState === 'sold') && (
            <LotStage
              player={currentPlayer}
              currentBid={a.currentBid}
              bidderId={currentBidderId}
              bids={a.bidHistory}
              teams={a.teams}
              userTeam={userTeam}
              timeRemaining={a.timeRemaining}
              active={roundState === 'auction_active'}
              canBid={a.canUserBid}
              userMaxBid={a.userMaxBid}
              outbid={outbid}
              outbidKey={outbidKey}
              autoAdvance={autoAdvance}
              allowSimulation={a.allowSimulation}
              onBid={a.userBid}
              onNext={a.confirmAssignment}
            />
          )}
        </section>

        {/* Listone */}
        <section className="col-span-12 lg:col-span-4 xl:col-span-5 lg:min-h-0 py-6 lg:px-6 lg:border-r-2 lg:border-ink border-t-2 border-ink lg:border-t-0 h-[80vh] lg:h-auto">
          <PlayerList
            available={remaining}
            sold={sold}
            currentRole={currentRole}
            season={a.season}
            isSelectable={a.isUserCallingTurn && roundState === 'calling'}
            onSelectPlayer={handlePlayerSelect}
            scanId={scanId}
            lockedId={lockedId}
          />
        </section>

        {/* Squadre */}
        <section className="col-span-12 lg:col-span-3 lg:min-h-0 py-6 lg:pl-6 border-t-2 border-ink lg:border-t-0">
          <button onClick={() => setShowTeams(s => !s)} className="lg:hidden btn-ghost w-full mb-4">
            <Icon name="teams" className="w-5 h-5" />
            {showTeams ? 'Nascondi squadre' : 'Mostra squadre'}
          </button>
          <div className={`${showTeams ? '' : 'hidden'} lg:block lg:h-full`}>
            <TeamsRecap
              teams={a.teams}
              userTeamId={userTeam?.id ?? ''}
              currentBidderId={currentBidderId}
              callerId={roundState === 'bot_calling' ? a.callerId : null}
              teamMeta={a.teamMeta}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
