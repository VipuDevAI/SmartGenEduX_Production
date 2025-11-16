import { defineConfig } from 'tsup';
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
  tsconfig: 'tsconfig.json'
});
