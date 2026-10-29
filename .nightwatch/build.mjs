import { build } from 'esbuild';

await build({
  entryPoints: ['worker.mjs'],
  bundle: true,
  outfile: 'dist/index.mjs',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'eof',
});
