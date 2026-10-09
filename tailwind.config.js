/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
      full: '9999px',
    },
    extend: {
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        pitch: 'rgb(var(--c-pitch) / <alpha-value>)',
        'pitch-deep': 'rgb(var(--c-pitch-deep) / <alpha-value>)',
        'on-pitch': 'rgb(var(--c-on-pitch) / <alpha-value>)',
        whistle: 'rgb(var(--c-whistle) / <alpha-value>)',
        'whistle-deep': 'rgb(var(--c-whistle-deep) / <alpha-value>)',
        'on-whistle': 'rgb(var(--c-on-whistle) / <alpha-value>)',
        highlight: 'rgb(var(--c-highlight) / <alpha-value>)',
        'on-highlight': 'rgb(var(--c-on-highlight) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'role-P': 'rgb(var(--c-role-p) / <alpha-value>)',
        'role-D': 'rgb(var(--c-role-d) / <alpha-value>)',
        'role-C': 'rgb(var(--c-role-c) / <alpha-value>)',
        'role-A': 'rgb(var(--c-role-a) / <alpha-value>)',
        'card-yellow': 'rgb(var(--c-card-yellow) / <alpha-value>)',
        'card-red': 'rgb(var(--c-card-red) / <alpha-value>)',
        // Colori fissi del marchio: logo e card condivisibile
        brand: {
          forest: '#07492A',
          ivory: '#F4EEDF',
          peach: '#FFD23F',
        },
        // Fasce dell'overall (card stile figurina)
        tier: {
          'bronze-bg': '#D9A577',
          'bronze-ink': '#5E3410',
          'silver-bg': '#D5DADD',
          'silver-ink': '#3F474C',
          'gold-bg': '#F4CF55',
          'gold-ink': '#5A4300',
          'elite-bg': '#15201A',
          'elite-ink': '#FFD23F',
        },
        // Campo da gioco: strisce e linee
        field: {
          dark: '#1F7A45',
          light: '#2A8A51',
          line: '#E4F0DF',
        },
      },
      fontFamily: {
        display: ["'Big Shoulders'", 'sans-serif'],
        sans: ["'Public Sans'", 'sans-serif'],
      },
      // Ombra piena "adesivo": solo sugli oggetti da toccare, mai sfumata
      boxShadow: {
        block: '4px 4px 0 0 rgb(var(--c-ink))',
        'block-sm': '2px 2px 0 0 rgb(var(--c-ink))',
        'block-lg': '6px 6px 0 0 rgb(var(--c-ink))',
      },
      // Animazioni: poche e legate a un evento reale (sempre con motion-safe:)
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        stamp: {
          '0%': { opacity: '0', transform: 'scale(1.6)' },
          '60%': { opacity: '1', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'stamp-tilt': {
          '0%': { opacity: '0', transform: 'rotate(-12deg) scale(2)' },
          '60%': { opacity: '1', transform: 'rotate(-12deg) scale(0.94)' },
          '100%': { opacity: '1', transform: 'rotate(-12deg) scale(1)' },
        },
        advance: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        flash: {
          '0%': { backgroundColor: 'rgb(var(--c-highlight) / 0.9)' },
          '100%': { backgroundColor: 'rgb(var(--c-highlight) / 0)' },
        },
        // Card sbattuta sul tavolo
        drop: {
          '0%': { opacity: '0', transform: 'translateY(-40px) rotate(-4deg) scale(1.08)' },
          '70%': { opacity: '1', transform: 'translateY(3px) rotate(0.5deg) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0) scale(1)' },
        },
        // Superato all'asta
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        // Evidenziatore dello scanner del bot
        sweep: {
          '0%': { backgroundColor: 'rgb(var(--c-highlight) / 0)' },
          '35%': { backgroundColor: 'rgb(var(--c-highlight) / 1)' },
          '100%': { backgroundColor: 'rgb(var(--c-highlight) / 0.25)' },
        },
        // Sorteggio: la pallina sale dalla boccia e si apre
        'ball-rise': {
          '0%': { opacity: '0', transform: 'translateY(60px) scale(0.6)' },
          '60%': { opacity: '1', transform: 'translateY(-10px) scale(1.05)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ball-open': {
          '0%': { opacity: '0', transform: 'scaleX(0.2)' },
          '100%': { opacity: '1', transform: 'scaleX(1)' },
        },
        wobble: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(2px, -3px)' },
          '50%': { transform: 'translate(-2px, 1px)' },
          '75%': { transform: 'translate(1px, 3px)' },
        },
        // Rete che si gonfia sul gol dal dischetto
        ripple: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.06, 1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        // Suspense dei rigori
        beat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.08)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.05)' },
        },
        // Ultimi secondi del timer
        'tick-pulse': {
          '0%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        // Barra che si svuota (attesa dell'avanzamento automatico)
        drain: {
          '0%': { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
        'confetti-fall': {
          '0%': { opacity: '1', transform: 'translateY(-20vh) rotate(0deg)' },
          '100%': { opacity: '0.9', transform: 'translateY(110vh) rotate(540deg)' },
        },
        // Cuoricino del pulsante Supporta che pulsa
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
      animation: {
        reveal: 'reveal 260ms ease-out both',
        pop: 'pop 200ms ease-out both',
        stamp: 'stamp 420ms ease-out both',
        'stamp-tilt': 'stamp-tilt 480ms cubic-bezier(.2,.9,.3,1.2) both',
        advance: 'advance 450ms ease-out both',
        flash: 'flash 1200ms ease-out both',
        drop: 'drop 520ms cubic-bezier(.2,.9,.3,1.1) both',
        shake: 'shake 420ms ease-out both',
        heartbeat: 'heartbeat 1200ms ease-in-out infinite',
        sweep: 'sweep 420ms ease-out both',
        'ball-rise': 'ball-rise 520ms cubic-bezier(.2,.9,.3,1.2) both',
        'ball-open': 'ball-open 260ms ease-out both',
        wobble: 'wobble 900ms ease-in-out infinite',
        ripple: 'ripple 500ms ease-out both',
        beat: 'beat 1000ms ease-in-out infinite',
        'tick-pulse': 'tick-pulse 300ms ease-out both',
        'confetti-fall': 'confetti-fall 2600ms linear both',
        drain: 'drain 2500ms linear both',
      },
    },
  },
  plugins: [],
}
