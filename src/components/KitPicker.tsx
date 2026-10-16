import { useEffect, useRef, useState } from 'react';
import { KITS, KIT_NAME_KEY, Kit, KitId, kitOf } from '../domain/teamKits';
import { useT } from '../i18n/I18nProvider';
import { Icon } from './Icon';

/** Campionario a due colori: primario con la banda secondaria in basso */
export function KitSwatch({ kit, className = '' }: { kit: Kit; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block border-2 border-ink ${className}`}
      style={{ background: `linear-gradient(to bottom, ${kit.primary} 72%, ${kit.secondary} 72%)` }}
    />
  );
}

interface KitPickerProps {
  value: KitId;
  onChange: (kit: KitId) => void;
  disabled?: boolean;
}

/**
 * Bottone-campioncino dei colori sociali: apre un popover coi 13 preset
 * (radiogroup, Esc/fuori per chiudere). Alto come il campo a fianco.
 */
export function KitPicker({ value, onChange, disabled }: KitPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const kit = kitOf({ name: '', kit: value });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        title={t('setup.kitPick')}
        aria-label={t('setup.kitCurrent', { name: t(KIT_NAME_KEY[value]) })}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-full shrink-0 border-2 border-ink bg-canvas px-1.5 shadow-block-sm flex items-center justify-center transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <KitSwatch kit={kit} className="w-6 h-8" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('setup.kitLabel')}
          className="absolute left-0 top-full z-40 mt-2 w-60 border-2 border-ink bg-canvas p-2 shadow-block motion-safe:animate-reveal"
        >
          <div role="radiogroup" aria-label={t('setup.kitPick')} className="grid grid-cols-4 gap-2">
            {KITS.map(k => {
              const selected = k.id === value;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={t(KIT_NAME_KEY[k.id])}
                  aria-label={t(KIT_NAME_KEY[k.id])}
                  onClick={() => {
                    onChange(k.id);
                    setOpen(false);
                  }}
                  className={`relative flex items-center justify-center border-2 p-1 transition-transform hover:-translate-y-0.5 ${
                    selected ? 'border-ink bg-highlight/40 shadow-block-sm' : 'border-line-strong'
                  }`}
                >
                  <KitSwatch kit={k} className="w-9 h-10" />
                  {selected && (
                    <Icon
                      name="check"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 border border-ink bg-pitch text-on-pitch p-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
