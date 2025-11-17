import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist/server',
  clean: false,
  bundle: true,
  splitting: false,
  treeshake: true,
  external: [
    '@neondatabase/serverless',
    'bcrypt',
    'lightningcss',
    'esbuild',
    '@babel/preset-typescript',
    'drizzle-kit'
  ],
  noExternal: [
    /^@shared\/.*/
  ],
  esbuildOptions(options) {
    // Resolve path aliases without requiring tsconfig.json
    options.alias = {
      '@shared': resolve('./shared')
    };
  }
});
