import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // il flag multiplayer non deve dipendere dal .env.local del dev
    env: { VITE_MULTIPLAYER: '' },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'data-pipeline/**'],
  },
});
