import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useStreamerMode } from '../../hooks/useStreamerMode';
import { GameShell, StreamerReserve } from './GameShell';
import { StreamerCamZone } from './StreamerCamZone';
import { AppNavbar } from './AppNavbar';

const KEY = 'fanta-fc-streamer-mode';

// jsdom qui non espone localStorage: stub minimale
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});

function Probe() {
  const [on, setOn] = useStreamerMode();
  return (
    <button onClick={() => setOn(!on)}>{on ? 'ON' : 'OFF'}</button>
  );
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe('useStreamerMode', () => {
  it('predefinito false, persistenza su localStorage', () => {
    render(<Probe />);
    expect(screen.getByText('OFF')).toBeTruthy();
    fireEvent.click(screen.getByText('OFF'));
    expect(screen.getByText('ON')).toBeTruthy();
    expect(localStorage.getItem(KEY)).toBe('true');
  });

  it('legge la preferenza salvata dopo il mount', () => {
    localStorage.setItem(KEY, 'true');
    render(<Probe />);
    expect(screen.getByText('ON')).toBeTruthy();
  });

  it('valore corrotto → false', () => {
    localStorage.setItem(KEY, 'boh');
    render(<Probe />);
    expect(screen.getByText('OFF')).toBeTruthy();
  });

  it('sincronizza più componenti nella stessa scheda', () => {
    render(<div><Probe /><Probe /></div>);
    const buttons = screen.getAllByText('OFF');
    fireEvent.click(buttons[0]);
    expect(screen.getAllByText('ON')).toHaveLength(2);
  });

  it("sincronizza via evento 'storage' (altre schede)", () => {
    render(<Probe />);
    act(() => {
      localStorage.setItem(KEY, 'true');
      window.dispatchEvent(new Event('storage'));
    });
    expect(screen.getByText('ON')).toBeTruthy();
  });
});

describe('GameShell', () => {
  it('modalità attiva: riquadro WEBCAM fisso, nessuna riserva globale', () => {
    localStorage.setItem(KEY, 'true');
    const { container } = render(
      <GameShell><div>gioco</div></GameShell>
    );
    expect(document.querySelector('[aria-hidden="true"].fixed.pointer-events-none')).toBeTruthy();
    expect(container.querySelector('.streamer-reserve')).toBeNull();
  });

  it('floatingCam=false: nessun riquadro fisso (asta usa quello in flusso)', () => {
    localStorage.setItem(KEY, 'true');
    render(<GameShell floatingCam={false}><div>asta</div></GameShell>);
    expect(document.querySelector('[aria-hidden="true"].fixed')).toBeNull();
  });

  it('modalità spenta: nessun riquadro', () => {
    render(<GameShell><div>gioco</div></GameShell>);
    expect(document.querySelector('[aria-hidden="true"].pointer-events-none')).toBeNull();
  });

  it('inGame=false (landing): nessun effetto anche se attiva', () => {
    localStorage.setItem(KEY, 'true');
    render(<GameShell inGame={false}><div>landing</div></GameShell>);
    expect(document.querySelector('[aria-hidden="true"].pointer-events-none')).toBeNull();
  });

  it('StreamerReserve applica la riserva solo se attiva', () => {
    localStorage.setItem(KEY, 'true');
    const { container } = render(<StreamerReserve><div>hub</div></StreamerReserve>);
    expect(container.querySelector('.streamer-reserve')).toBeTruthy();
    cleanup();
    localStorage.removeItem(KEY);
    render(<StreamerReserve><div>hub</div></StreamerReserve>);
    expect(document.querySelector('.streamer-reserve')).toBeNull();
  });

  it('StreamerCamZone inline: blocco in flusso, non fisso', () => {
    render(<StreamerCamZone inline />);
    const el = document.querySelector('[aria-hidden="true"]');
    expect(el?.className).toContain('w-full');
    expect(el?.className).not.toContain('fixed');
  });
});

describe('AppNavbar', () => {
  it('toggle "Modalità streamer" nel menu cambia la preferenza', () => {
    render(<AppNavbar />);
    fireEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByText('Modalità streamer')).toBeTruthy();
    expect(screen.getByText(/Libera l'angolo in alto a destra/)).toBeTruthy();
    const yes = screen.getByText('Sì');
    fireEvent.click(yes);
    expect(localStorage.getItem(KEY)).toBe('true');
    expect(yes.getAttribute('aria-pressed')).toBe('true');
  });
});
