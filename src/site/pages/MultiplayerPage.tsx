import { MULTIPLAYER_ENABLED } from '../../config';
import { ContentLayout } from '../ContentLayout';
import { Icon } from '../../components/Icon';
import { MultiplayerApp } from '../../components/multiplayer/MultiplayerApp';
import { RoomProvider } from '../../components/multiplayer/RoomProvider';

/**
 * Ingresso del multiplayer. Pagina noindex; con il flag spento mostra
 * solo un avviso, senza caricare logica di rete o GameProvider
 * (l'autosave del gioco singolo non deve toccare questa rotta).
 */
export function MultiplayerPage() {
  if (!MULTIPLAYER_ENABLED) {
    return (
      <ContentLayout breadcrumbs={[{ name: 'Multiplayer', path: '/multiplayer/' }]}>
        <div className="py-16 text-center">
          <h1 className="font-display text-4xl sm:text-6xl font-black text-ink">Multiplayer non ancora disponibile</h1>
          <p className="text-lg text-ink-soft mt-5">Le stanze online stanno arrivando. Intanto puoi giocare contro i bot.</p>
          <a href="/" className="btn-cta mt-10">
            Torna alla home
            <Icon name="arrow" className="w-7 h-7" />
          </a>
        </div>
      </ContentLayout>
    );
  }
  return (
    <RoomProvider>
      <ContentLayout breadcrumbs={[{ name: 'Multiplayer', path: '/multiplayer/' }]}>
        <MultiplayerApp />
      </ContentLayout>
    </RoomProvider>
  );
}
