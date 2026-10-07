import { useCallback } from 'react';
import { Landing } from './components/Landing';
import { AuctionRoom } from './components/auction';
import { TournamentScreen, TournamentSummaryScreen } from './components/tournament';
import { randomTournamentSeed } from './domain/tournament';
import { GameProvider, useGame, useGamePhase } from './context/GameContext';

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
        <AuctionRoom 
          onComplete={handleAuctionComplete}
          onReset={resetGame}
        />
      );
    
    case 'TORNEO':
      return <TournamentScreen />;

    case 'FINALE':
      return <TournamentSummaryScreen />;
    
    default:
      // Mai una pagina vuota: fase sconosciuta -> possibilità di ripartire
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md">
            <h1 className="font-display text-4xl font-extrabold text-ink mb-2">Salvataggio non valido</h1>
            <p className="text-ink-soft mb-6">Il salvataggio appartiene a una versione precedente del gioco.</p>
            <button onClick={resetGame} className="btn-primary">Nuova partita</button>
          </div>
        </div>
      );
  }
}

/**
 * Componente principale dell'applicazione FantaClash
 * Wrappa tutto nel GameProvider per lo stato globale
 */
function App() {
  return (
    <GameProvider>
      <div className="min-h-screen">
        <GameContent />
      </div>
    </GameProvider>
  );
}

export default App;
