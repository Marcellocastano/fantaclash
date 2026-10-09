import { Icon } from './Icon';

/** Pallone che rimbalza con l'ombra a terra: attesa delle stanze */
export function BallLoader() {
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      <span className="motion-safe:animate-ball-bounce inline-block">
        <span className="w-16 h-16 rounded-full bg-canvas border-4 border-ink flex items-center justify-center">
          <Icon name="ball" className="w-10 h-10 text-ink" />
        </span>
      </span>
      <span className="mt-3 w-14 h-2.5 rounded-full bg-ink motion-safe:animate-ball-shadow" />
    </div>
  );
}
