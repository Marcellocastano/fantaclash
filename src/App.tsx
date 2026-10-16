import { lazy, Suspense, useCallback } from 'react';
import { useT } from './i18n/I18nProvider';
import { CatalogKey } from './i18n/translate';
import { Landing } from './components/Landing';
import { AppNavbar, NavStat } from './components/layout/AppNavbar';
import { GameShell } from './components/layout/GameShell';
import { journeyStep } from './components/layout/journey';
import { NAV_LINKS } from './site/navigation';
import { randomTournamentSeed } from './domain/tournament';
import { isLegends, listoneShort } from './services/seasons';
import { GameProvider, useGame, useGamePhase } from './context/GameContext';
import { useScrollToTop } from './hooks/useScrollToTop';

// Asta, torneo e riepilogo si scaricano solo quando servono (provider compresi)
const AuctionPhase = lazy(() => import('./components/phases/AuctionPhase'));
const TournamentPhase = lazy(() => import('./components/phases/TournamentPhase'));
const FinalPhase = lazy(() => import('./components/phases/FinalPhase'));

/** Navbar comune: percorso e dati del momento dipendono dalla fase */
function GameNavbar() {
  const t = useT();
  const { state, resetGame } = useGame();
  if (state.phase === 'SETUP') return <AppNavbar links={NAV_LINKS} />;
  const user = state.teams.find(t => t.isUserTeam);
  const role = state.auction?.currentRole;
  const context =
    state.phase === 'ASTA' ? (
      <>
        {role && <NavStat label={t('ui.nav.statRole')} value={t(`ui.roles.plural.${role}` as CatalogKey)} />}
        <NavStat label={t('ui.nav.statCredits')} value={user?.credits ?? 0} accent />
      </>
    ) : state.config ? (
      <NavStat label={t(isLegends(state.config.season) ? 'ui.listone.label' : 'ui.listone.season')} value={listoneShort(state.config.season)} />
    ) : null;
  return <AppNavbar step={journeyStep(state.phase, state.tournament?.status)} context={context} onNewGame={resetGame} />;
}

/**
 * Contenuto principale dell'app che cambia in base alla fase del gioco
 */
function GameContent() {
  const t = useT();
  const { dispatch, startGame, resetGame } = useGame();
  const phase = useGamePhase();
  useScrollToTop(phase);

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
            <h1 className="font-display text-5xl font-extrabold text-ink mb-4">{t('ui.game.invalidSave')}</h1>
            <p className="text-ink-soft mb-8">{t('ui.game.invalidSaveHint')}</p>
            <button onClick={resetGame} className="btn-primary">{t('ui.nav.newGame')}</button>
          </div>
        </div>
      );
  }
}

function Loading() {
  const t = useT();
  return (
    <div className="flex-1 flex items-center justify-center p-10" role="status">
      <p className="font-display text-3xl font-extrabold text-ink-muted">{t('common.loading')}</p>
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
