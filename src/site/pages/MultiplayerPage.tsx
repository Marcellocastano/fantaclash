import { MULTIPLAYER_ENABLED } from '../../config';
import { ContentLayout } from '../ContentLayout';
import { Icon } from '../../components/Icon';
import { MultiplayerApp } from '../../components/multiplayer/MultiplayerApp';
import { RoomProvider } from '../../components/multiplayer/RoomProvider';
import { useT } from '../../i18n/I18nProvider';

/**
 * Ingresso del multiplayer. Pagina noindex; con il flag spento mostra
 * solo un avviso, senza caricare logica di rete o GameProvider
 * (l'autosave del gioco singolo non deve toccare questa rotta).
 */
export function MultiplayerPage() {
  const t = useT();
  if (!MULTIPLAYER_ENABLED) {
    return (
      <ContentLayout breadcrumbs={[{ name: t('site.common.multiplayer'), path: '/multiplayer/' }]}>
        <div className="py-16 text-center">
          <h1 className="font-display text-4xl sm:text-6xl font-black text-ink">{t('site.mpOff.title')}</h1>
          <p className="text-lg text-ink-soft mt-5">{t('site.mpOff.text')}</p>
          <a href="/" className="btn-cta mt-10">
            {t('site.common.backHome')}
            <Icon name="arrow" className="w-7 h-7" />
          </a>
        </div>
      </ContentLayout>
    );
  }
  // Il layout è scelto dentro MultiplayerApp: ContentLayout per ingresso e
  // lobby, guscio di gioco a piena larghezza da asta in poi.
  return (
    <RoomProvider>
      <MultiplayerApp />
    </RoomProvider>
  );
}
