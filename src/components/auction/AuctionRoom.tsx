import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuction } from '../../hooks/useAuction';
import { PlayerCardFifa } from './PlayerCardFifa';
import { BidControls } from './BidControls';
import { SimulationControls } from './SimulationControls';
import { BidHistory } from './BidHistory';
import { TeamsRecap } from './TeamsRecap';
import { PlayersDatabase } from './PlayersDatabase';
import { ThemeToggle } from '../ThemeToggle';
import { Icon } from '../Icon';
import { LogoMark } from '../Logo';
import { Player } from '../../types';

interface AuctionRoomProps {
  onComplete: () => void;
  onReset: () => void;
}

const ROLE_NAMES = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
};

const ROLE_SINGULAR = {
  P: 'portiere',
  D: 'difensore',
  C: 'centrocampista',
  A: 'attaccante',
};

/**
 * Stanza d'asta - stile tabellone dello stadio su carta
 */
export function AuctionRoom({ onComplete, onReset }: AuctionRoomProps) {
  const { state } = useGame();
  const {
    roundState,
    currentRole,
    currentPlayer,
    currentBid,
    currentBidderId,
    bidHistory,
    timeRemaining,
    isUserCallingTurn,
    availablePlayers,
    remainingPlayersCount,
    isComplete,
    canUserBid,
    userMaxBid,
    canSimulateLot,
    canSimulateRole,
    startAuction,
    userCallPlayer,
    userBid,
    confirmAssignment,
    continueToNextRole,
    simulateLot,
    simulateRoleCompletion,
    simulateAll,
  } = useAuction();

  const [showMobileTeams, setShowMobileTeams] = useState(false);

  const userTeam = state.teams.find(t => t.isUserTeam);
  const isUserWinning = currentBidderId === userTeam?.id;
  const currentWinner = currentBidderId ? state.teams.find(t => t.id === currentBidderId) : null;

  const handlePlayerSelect = useCallback((player: Player) => {
    if (isUserCallingTurn && roundState === 'calling') {
      userCallPlayer(player);
    }
  }, [isUserCallingTurn, roundState, userCallPlayer]);

  // Asta completata: si passa subito al torneo (il sorteggio parte da solo)
  useEffect(() => {
    if (isComplete || roundState === 'auction_complete') onComplete();
  }, [isComplete, roundState, onComplete]);
  if (isComplete || roundState === 'auction_complete') return null;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col">
      {/* Header */}
      <header className="bg-canvas border-b border-line-strong sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <h1 className="flex items-center gap-2.5 font-display text-2xl md:text-3xl font-extrabold text-pitch leading-none">
              <LogoMark className="h-8 w-8" />
              FantaClash
            </h1>

            {/* Info centrali */}
            <div className="hidden md:flex items-stretch divide-x divide-line">
              <div className="px-6 first:pl-0">
                <span className="block text-xs font-medium text-ink-muted">Fase</span>
                <p className="font-display text-xl font-bold text-pitch leading-tight">{ROLE_NAMES[currentRole]}</p>
              </div>
              <div className="px-6">
                <span className="block text-xs font-medium text-ink-muted">Budget</span>
                <p className="font-display text-xl font-bold leading-tight tabular-nums">
                  {userTeam?.credits}
                  <span className="text-ink-muted text-base font-medium"> / {userTeam?.initialCredits} Cr</span>
                </p>
              </div>
              <div className="px-6">
                <span className="block text-xs font-medium text-ink-muted">Giocatori rimasti</span>
                <p className="font-display text-xl font-bold leading-tight tabular-nums">{remainingPlayersCount}</p>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileTeams(!showMobileTeams)}
                className="lg:hidden p-2 border border-line-strong rounded-sm text-ink hover:bg-surface transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch"
                aria-label="Mostra squadre"
              >
                <Icon name="teams" className="w-5 h-5" />
              </button>
              <ThemeToggle />
              <button
                onClick={onReset}
                className="p-2 border border-danger/50 rounded-sm text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-danger"
                aria-label="Reset"
                title="Reset"
              >
                <Icon name="reset" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 max-w-[1600px] mx-auto w-full p-4">
        <div className="grid grid-cols-12 lg:divide-x lg:divide-line lg:h-full">
          
          {/* Colonna sinistra - Card giocatore e controlli */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4 lg:min-h-0 lg:overflow-y-auto space-y-6 lg:pr-6">

            {/* Simulazioni: giocatore, reparto, intera asta */}
            <SimulationControls
              currentRole={currentRole}
              canSimulateLot={canSimulateLot}
              canSimulateRole={canSimulateRole}
              onSimulateLot={simulateLot}
              onSimulateRole={simulateRoleCompletion}
              onSimulateAll={simulateAll}
            />

            {/* Stato: Idle */}
            {roundState === 'idle' && (
              <div>
                <h2 className="font-display text-4xl font-extrabold text-ink mb-2">Pronto?</h2>
                <p className="text-ink-soft mb-6">Si parte con i {ROLE_NAMES[currentRole].toLowerCase()}.</p>
                <button onClick={startAuction} className="btn-primary w-full">
                  Inizia asta
                </button>
              </div>
            )}

            {/* Stato: Calling */}
            {roundState === 'calling' && isUserCallingTurn && (
              <div>
                <h2 className="font-display text-4xl font-extrabold text-pitch mb-2">Tocca a te</h2>
                <p className="text-ink-soft">
                  Seleziona un <span className="text-pitch font-semibold">{ROLE_SINGULAR[currentRole]}</span> dal database.
                </p>
              </div>
            )}

            {/* Stato: Bot calling */}
            {roundState === 'bot_calling' && (
              <div>
                <h2 className="font-display text-3xl font-extrabold text-ink mb-2">Un bot sta scegliendo</h2>
              </div>
            )}

            {/* Stato: Role complete */}
            {roundState === 'role_complete' && (
              <div>
                <h2 className="font-display text-4xl font-extrabold text-ok mb-2">Reparto completo</h2>
                <p className="text-ink-soft mb-6">Si passa ai {ROLE_NAMES[currentRole].toLowerCase()}.</p>
                <button onClick={continueToNextRole} className="btn-primary w-full">
                  Continua
                </button>
              </div>
            )}

            {/* Card giocatore attivo */}
            {currentPlayer && (roundState === 'auction_active' || roundState === 'sold') && (
              <>
                <PlayerCardFifa
                  player={currentPlayer}
                  currentBid={currentBid}
                  timeRemaining={timeRemaining}
                  isActive={roundState === 'auction_active'}
                />

                {/* Controlli offerta */}
                {roundState === 'auction_active' && (
                  <BidControls
                    currentBid={currentBid}
                    userCredits={userTeam?.credits || 0}
                    userMaxBid={userMaxBid}
                    canBid={canUserBid}
                    isUserWinning={isUserWinning}
                    onBid={userBid}
                  />
                )}

                {/* Risultato: Venduto */}
                {roundState === 'sold' && (
                  <div>
                    <p className="text-sm font-medium text-ink-muted mb-1">Venduto a</p>
                    <p className="font-display text-4xl font-extrabold text-ok leading-none mb-1">
                      {currentWinner?.name}
                    </p>
                    <p className="font-display text-3xl font-bold text-ink tabular-nums mb-6">{currentBid} Cr</p>
                    <button onClick={confirmAssignment} className="btn-primary w-full">
                      Prossimo
                    </button>
                  </div>
                )}

                {/* Cronologia rilanci */}
                <BidHistory
                  bids={bidHistory}
                  userTeamId={userTeam?.id || ''}
                  teams={state.teams}
                />
              </>
            )}
          </div>

          {/* Colonna centrale - Database giocatori */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:px-6 mt-6 lg:mt-0">
            <PlayersDatabase
              players={availablePlayers}
              allPlayers={state.auction?.remainingPlayers || []}
              currentRole={currentRole}
              isSelectable={isUserCallingTurn && roundState === 'calling'}
              onSelectPlayer={handlePlayerSelect}
            />
          </div>

          {/* Colonna destra - Recap squadre */}
          <div className={`col-span-12 lg:col-span-3 lg:min-h-0 lg:overflow-y-auto lg:pl-6 mt-6 lg:mt-0 ${showMobileTeams ? '' : 'hidden lg:block'}`}>
            <TeamsRecap
              teams={state.teams}
              userTeamId={userTeam?.id || ''}
              currentBidderId={currentBidderId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
