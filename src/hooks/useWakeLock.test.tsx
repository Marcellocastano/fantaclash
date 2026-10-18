import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

const flush = () => act(() => new Promise(r => setTimeout(r, 0)));

function mockWakeLock() {
  const sentinel = { release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
  const request = vi.fn().mockResolvedValue(sentinel);
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinel };
}

describe('useWakeLock', () => {
  afterEach(() => {
    // navigator.wakeLock non esiste in jsdom: lo rimuoviamo tra i test
    delete (navigator as { wakeLock?: unknown }).wakeLock;
    vi.restoreAllMocks();
  });

  it('richiede il lock quando attivo e lo rilascia allo smontaggio', async () => {
    const { request, sentinel } = mockWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
    unmount();
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it('riacquisisce il lock quando il documento torna visibile', async () => {
    const { request } = mockWakeLock();
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('non fa nulla quando active è false', async () => {
    const { request } = mockWakeLock();
    renderHook(() => useWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it('nessun errore senza Screen Wake Lock API', async () => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
  });
});
