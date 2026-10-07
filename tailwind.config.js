/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
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
        'on-pitch': 'rgb(var(--c-on-pitch) / <alpha-value>)',
        peach: 'rgb(var(--c-peach) / <alpha-value>)',
        'on-peach': 'rgb(var(--c-on-peach) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'role-P': 'rgb(var(--c-role-p) / <alpha-value>)',
        'role-D': 'rgb(var(--c-role-d) / <alpha-value>)',
        'role-C': 'rgb(var(--c-role-c) / <alpha-value>)',
        'role-A': 'rgb(var(--c-role-a) / <alpha-value>)',
        'card-yellow': 'rgb(var(--c-card-yellow) / <alpha-value>)',
        'card-red': 'rgb(var(--c-card-red) / <alpha-value>)',
        // Colori fissi del marchio (uguali nei due temi): logo e card condivisibile
        brand: {
          forest: '#344B43',
          ivory: '#F5F3EE',
          peach: '#E7BFA8',
        },
        // Campo da gioco (fisso, uguale nei due temi): strisce e linee
        field: {
          dark: '#2C7148',
          light: '#367E53',
          line: '#DDEBDB',
        },
      },
      fontFamily: {
        display: ["'Big Shoulders'", 'sans-serif'],
        sans: ["'Public Sans'", 'sans-serif'],
      },
      // Animazioni del torneo: poche e legate a un evento reale
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
        advance: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        flash: {
          '0%': { backgroundColor: 'rgb(var(--c-pitch) / 0.28)' },
          '100%': { backgroundColor: 'rgb(var(--c-pitch) / 0)' },
        },
      },
      animation: {
        reveal: 'reveal 260ms ease-out both',
        pop: 'pop 200ms ease-out both',
        stamp: 'stamp 420ms ease-out both',
        advance: 'advance 450ms ease-out both',
        flash: 'flash 1200ms ease-out both',
      },
    },
  },
  plugins: [],
}
