/**
 * Riquadro che marca la zona della webcam in modalità streamer.
 * `fixed` (predefinito): in alto a destra sotto la navbar.
 * `inline`: blocco in flusso largo quanto la colonna che lo contiene
 * (usato in cima alla colonna "Squadre" dell'asta).
 * Solo su schermi ≥ lg: sotto, la modalità non ha effetto.
 */
export function StreamerCamZone({ inline = false }: { inline?: boolean }) {
  const cls = inline
    ? 'pointer-events-none relative hidden lg:block w-full aspect-video'
    : 'pointer-events-none fixed top-20 right-6 z-20 hidden lg:block w-96 2xl:w-[28rem] aspect-video';
  return (
    <div aria-hidden="true" className={`${cls} border-4 border-dashed border-danger bg-danger/10`}>
      <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-black tracking-[0.3em] text-danger/70">
        WEBCAM
      </span>
    </div>
  );
}
