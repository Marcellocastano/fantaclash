/**
 * Effetti sonori sintetizzati con Web Audio (nessun file esterno).
 * Il contesto audio nasce al primo suono dopo un gesto dell'utente; senza
 * Web Audio (jsdom, browser vecchi) ogni funzione non fa nulla.
 * Il mute è una preferenza del dispositivo: sta in localStorage, non nel
 * GameState.
 */

export type SoundName =
  | 'bid'
  | 'outbid'
  | 'tick'
  | 'sold'
  | 'won'
  | 'call'
  | 'draw-ball'
  | 'whistle'
  | 'goal'
  | 'kick'
  | 'save'
  | 'heartbeat'
  | 'cup';

const STORAGE_KEY = 'fanta-fc-sound';
const MASTER_VOLUME = 0.22;

let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  try {
    // Solo nel browser (in Node, durante il pre-rendering, non c'è un localStorage utile)
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'off' : 'on');
  } catch {
    // preferenza non salvabile: resta solo in memoria
  }
  listeners.forEach(l => l(value));
}

export function subscribeMuted(listener: (muted: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  /** Frequenza finale (glissando) */
  to?: number;
  start?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

function tones(list: Tone[]): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of list) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const t0 = now + (t.start ?? 0);
    osc.type = t.type ?? 'square';
    osc.frequency.setValueAtTime(t.freq, t0);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, t0 + t.dur);
    const peak = MASTER_VOLUME * (t.gain ?? 1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + t.dur + 0.02);
  }
}

/** Rumore filtrato (folla, rete, tiro) */
function noise(dur: number, freq: number, gain = 1, start = 0): void {
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = MASTER_VOLUME * gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

const SOUNDS: Record<SoundName, () => void> = {
  bid: () => tones([{ freq: 660, to: 990, dur: 0.09, gain: 0.7 }]),
  outbid: () =>
    tones([
      { freq: 520, to: 300, dur: 0.16, type: 'sawtooth', gain: 0.6 },
      { freq: 300, to: 180, dur: 0.18, start: 0.14, type: 'sawtooth', gain: 0.5 },
    ]),
  tick: () => tones([{ freq: 1200, dur: 0.04, gain: 0.45 }]),
  sold: () => {
    noise(0.08, 300, 1.2);
    tones([{ freq: 180, to: 90, dur: 0.12, type: 'triangle', gain: 1 }]);
  },
  won: () =>
    tones([
      { freq: 523, dur: 0.1, gain: 0.6 },
      { freq: 659, dur: 0.1, start: 0.09, gain: 0.6 },
      { freq: 784, dur: 0.1, start: 0.18, gain: 0.6 },
      { freq: 1047, dur: 0.22, start: 0.27, gain: 0.6 },
    ]),
  call: () => tones([{ freq: 440, to: 660, dur: 0.08, type: 'triangle', gain: 0.6 }]),
  'draw-ball': () => {
    noise(0.12, 2400, 0.5);
    tones([{ freq: 880, to: 1320, dur: 0.12, type: 'triangle', gain: 0.6 }]);
  },
  whistle: () =>
    tones([
      { freq: 2600, dur: 0.18, type: 'sine', gain: 0.5 },
      { freq: 2600, dur: 0.35, start: 0.24, type: 'sine', gain: 0.5 },
    ]),
  goal: () => {
    noise(1.2, 900, 1.4);
    tones([
      { freq: 392, dur: 0.14, gain: 0.5 },
      { freq: 523, dur: 0.14, start: 0.12, gain: 0.5 },
      { freq: 659, dur: 0.3, start: 0.24, gain: 0.5 },
    ]);
  },
  kick: () => {
    noise(0.06, 500, 1.4);
    tones([{ freq: 140, to: 60, dur: 0.1, type: 'sine', gain: 1 }]);
  },
  save: () => {
    noise(0.15, 1500, 0.8);
    tones([{ freq: 300, to: 200, dur: 0.2, type: 'triangle', gain: 0.6 }]);
  },
  heartbeat: () =>
    tones([
      { freq: 70, to: 50, dur: 0.12, type: 'sine', gain: 1.4 },
      { freq: 70, to: 50, dur: 0.12, start: 0.22, type: 'sine', gain: 1.1 },
    ]),
  cup: () => {
    noise(2, 800, 1.2);
    tones([
      { freq: 523, dur: 0.18, gain: 0.5 },
      { freq: 659, dur: 0.18, start: 0.16, gain: 0.5 },
      { freq: 784, dur: 0.18, start: 0.32, gain: 0.5 },
      { freq: 1047, dur: 0.5, start: 0.48, gain: 0.5 },
    ]);
  },
};

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    SOUNDS[name]();
  } catch {
    // l'audio non deve mai rompere il gioco
  }
}
