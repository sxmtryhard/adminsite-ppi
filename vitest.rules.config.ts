import { defineConfig } from 'vitest/config';

/** Pruebas de firestore.rules contra el emulador (npm run test:rules lo levanta). */
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
