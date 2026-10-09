import { lazy, Suspense, useCallback } from 'react';
import { Landing } from './components/Landing';
import { AppNavbar, NavStat } from './components/layout/AppNavbar';
import { GameShell } from './components/layout/GameShell';
import { journeyStep } from './components/layout/journey';
import { NAV_LINKS } from './site/navigation';
import { randomTournamentSeed } from './domain/tournament';
import { GameProvider, useGame, useGamePhase } from './context/GameContext';
import { PlayerRole } from './types';

// Asta, torneo e riepilogo si scaricano solo quando servono (provider compresi)
const AuctionPhase = lazy(() => import('./components/phases/AuctionPhase'));
const TournamentPhase = lazy(() => import('./components/phases/TournamentPhase'));
const FinalPhase = lazy(() => import('./components/phases/FinalPhase'));

const ROLE_PLURAL: Record<PlayerRole, string> = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
};


/** Navbar comune: percorso e dati del momento dipendono dalla fase */
function GameNavbar() {
  const { state, resetGame } = useGame();
  if (state.phase === 'SETUP') return <AppNavbar links={NAV_LINKS} />;
  const user = state.teams.find(t => t.isUserTeam);
  const role = state.auction?.currentRole;
  const context =
    state.phase === 'ASTA' ? (
      <>
        {role && <NavStat label="Reparto" value={ROLE_PLURAL[role]} />}
        <NavStat label="I tuoi crediti" value={user?.credits ?? 0} accent />
      </>
    ) : state.config ? (
      <NavStat label="Annata" value={state.config.season} />
    ) : null;
  return <AppNavbar step={journeyStep(state.phase, state.tournament?.status)} context={context} onNewGame={resetGame} />;
}

/**
 * Contenuto principale dell'app che cambia in base alla fase del gioco
 */
function GameContent() {
  const { dispatch, startGame, resetGame } = useGame();
  const phase = useGamePhase();

  /**
   * Gestisce il completamento dell'asta e passa al torneo (sorteggio)
   */
  const handleAuctionComplete = useCallback(() => {
    dispatch({ type: 'START_TOURNAMENT', payload: { seed: randomTournamentSeed() } });
  }, [dispatch]);

  switch (phase) {
    case 'SETUP':
      return <Landing onSubmit={startGame} />;

    case 'ASTA':
      return (
        <GameShell floatingCam={false}>
          <AuctionPhase onComplete={handleAuctionComplete} />
        </GameShell>
      );

    case 'TORNEO':
      return (
        <GameShell>
          <TournamentPhase />
        </GameShell>
      );

    case 'FINALE':
      return (
        <GameShell>
          <FinalPhase />
        </GameShell>
      );

    default:
      // Mai una pagina vuota: fase sconosciuta -> possibilità di ripartire
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md">
            <h1 className="font-display text-5xl font-extrabold text-ink mb-4">Salvataggio non valido</h1>
            <p className="text-ink-soft mb-8">Il salvataggio appartiene a una versione precedente del gioco.</p>
            <button onClick={resetGame} className="btn-primary">Nuova partita</button>
          </div>
        </div>
      );
  }
}

function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center p-10" role="status">
      <p className="font-display text-3xl font-extrabold text-ink-muted">Caricamento…</p>
    </div>
  );
}

/**
 * Componente principale dell'applicazione FantaClash
 * Wrappa tutto nel GameProvider per lo stato globale
 */
function App() {
  return (
    <GameProvider>
      <div className="min-h-screen flex flex-col">
        <GameNavbar />
        <Suspense fallback={<Loading />}>
          <GameContent />
        </Suspense>
      </div>
    </GameProvider>
  );
}

export default App;
