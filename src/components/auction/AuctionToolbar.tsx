import { useState } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { CatalogKey } from '../../i18n/translate';
import { PlayerRole } from '../../types';
import { Icon } from '../Icon';
import { ConfirmDialog } from '../layout/ConfirmDialog';
import { AutoAdvanceSwitch } from './AutoAdvance';

interface AuctionToolbarProps {
  currentRole: PlayerRole;
  canSimulateRole: boolean;
  /** false mentre il lotto è sul banco: il "salta reparto" lo mostra LotStage */
  showRoleSkip: boolean;
  onSimulateRole: () => void;
  onSimulateAll: () => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (on: boolean) => void;
}

const ROLE_NAMES: Record<PlayerRole, CatalogKey> = {
  P: 'ui.roles.pluralLower.P',
  D: 'ui.roles.pluralLower.D',
  C: 'ui.roles.pluralLower.C',
  A: 'ui.roles.pluralLower.A',
};

/**
 * Azioni "avanti" del gioco singolo, sempre visibili accanto al titolo
 * del banco (va a capo su schermi stretti). "Completa l'asta" simula
 * anche gli acquisti dell'utente: chiede conferma.
 */
export function AuctionToolbar({
  currentRole,
  canSimulateRole,
  showRoleSkip,
  onSimulateRole,
  onSimulateAll,
  autoAdvance,
  onAutoAdvanceChange,
}: AuctionToolbarProps) {
  const t = useT();
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showRoleSkip && canSimulateRole && (
        <button onClick={onSimulateRole} className="btn-primary px-3 py-2 text-base">
          <Icon name="skip" className="w-4 h-4" />
          {t('auction.ff.simRole', { role: t(ROLE_NAMES[currentRole]) })}
        </button>
      )}
      <button onClick={() => setConfirmAll(true)} className="btn-ghost px-3 py-2 text-base">
        <Icon name="forward" className="w-4 h-4" />
        {t('auction.ff.simAll')}
      </button>
      <AutoAdvanceSwitch on={autoAdvance} onChange={onAutoAdvanceChange} />
      {confirmAll && (
        <ConfirmDialog
          title={t('auction.ff.simAllConfirmTitle')}
          message={t('auction.ff.simAllHint')}
          confirmLabel={t('auction.ff.simAllConfirm')}
          onConfirm={() => {
            setConfirmAll(false);
            onSimulateAll();
          }}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </div>
  );
}
