import { useState } from 'react';
import { LineupPlayer, shortName } from '../../domain/match';
import { Icon } from '../Icon';
import { OvrBadge } from '../player/OvrBadge';

/** Rigori della serie regolare: dopo si va ad oltranza */
const REGULAR_KICKS = 5;

interface ShootoutOrderPanelProps {
  /** Giocatori in campo nell'ordine proposto (automatico) */
  players: LineupPlayer[];
  onConfirm: (order: string[]) => void;
  /** Solo stanza: secondi rimasti per confermare */
  deadlineSec?: number;
  /** Solo stanza: ordine già inviato, si aspetta l'avversario */
  sent?: boolean;
  /** Solo stanza: testo mostrato dopo l'invio (default: attesa avversario) */
  sentLabel?: string;
}

/** Sposta l'elemento da `from` a `to` restituendo un nuovo array */
function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Scelta dei rigoristi prima della lotteria: si riordinano trascinando le
 * righe (o con le frecce, che funzionano anche su touch e da tastiera).
 * I primi 5 tirano la serie regolare, gli altri ad oltranza.
 */
export function ShootoutOrderPanel({ players, onConfirm, deadlineSec, sent, sentLabel }: ShootoutOrderPanelProps) {
  const [order, setOrder] = useState(players);
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <div className="absolute inset-0 z-20 bg-pitch-deep/95 flex overflow-y-auto px-8 py-10 motion-safe:animate-pop" role="dialog" aria-label="Ordine dei rigoristi">
      <div className="m-auto w-full max-w-xl text-canvas">
        <div className="text-center">
          <p className="font-display text-4xl font-black leading-none">Si va ai rigori</p>
          <p className="text-canvas/70 mt-2">Scegli l'ordine dei tuoi rigoristi: trascina le righe o usa le frecce.</p>
          {deadlineSec !== undefined && !sent && (
            <p className="mt-3 font-display text-2xl font-black tabular-nums text-whistle" role="timer">
              {deadlineSec}s
            </p>
          )}
        </div>

        {sent ? (
          <p className="mt-8 text-center font-display text-2xl font-extrabold text-canvas">
            {sentLabel ?? "Scelta inviata, in attesa dell'avversario…"}
          </p>
        ) : (
          <>
        <ol className="mt-6 bg-canvas text-ink border-2 border-ink shadow-block">
          {order.map((p, i) => (
            <li
              key={p.playerId}
              draggable
              onDragStart={e => {
                setDragging(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={e => {
                e.preventDefault();
                if (dragging === null || dragging === i) return;
                setOrder(o => move(o, dragging, i));
                setDragging(i);
              }}
              onDragEnd={() => setDragging(null)}
              className={`flex items-center gap-3 pl-4 pr-2 py-1.5 cursor-grab active:cursor-grabbing select-none ${
                i === REGULAR_KICKS ? 'border-t-4 border-ink' : i > 0 ? 'border-t-2 border-line' : ''
              } ${dragging === i ? 'bg-highlight' : 'hover:bg-surface'}`}
            >
              <span className="w-7 font-display text-2xl font-black tabular-nums text-ink-muted">{i + 1}</span>
              <Icon name="menu" className="w-4 h-4 text-ink-faint" />
              <OvrBadge overall={p.overall} role={p.role} size="xs" />
              <span className="flex-1 min-w-0 font-bold truncate">{shortName(p.name)}</span>
              {i === REGULAR_KICKS && <span className="text-xs font-bold text-ink-muted">ad oltranza</span>}
              <span className="flex">
                <button
                  onClick={() => setOrder(o => move(o, i, i - 1))}
                  disabled={i === 0}
                  aria-label={`Sposta ${shortName(p.name)} su`}
                  className="p-1.5 text-ink hover:bg-surface disabled:opacity-25"
                >
                  <Icon name="chevron" className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => setOrder(o => move(o, i, i + 1))}
                  disabled={i === order.length - 1}
                  aria-label={`Sposta ${shortName(p.name)} giù`}
                  className="p-1.5 text-ink hover:bg-surface disabled:opacity-25"
                >
                  <Icon name="chevron" className="w-4 h-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 text-center">
          <button onClick={() => onConfirm(order.map(p => p.playerId))} className="btn-cta px-6 sm:px-8 py-3 sm:py-4 text-2xl sm:text-3xl bg-highlight text-on-highlight hover:bg-canvas">
            Conferma e si tira
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
