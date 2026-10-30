import { build } from '../.nightwatch/node_modules/esbuild/lib/main.js';
await build({ entryPoints: ['worker.mjs'], bundle: true, outfile: 'dist/index.mjs', format: 'esm', platform: 'browser', target: 'es2022', loader: { '.css': 'text', '.webp': 'binary', '.js': 'text' }, minify: true, legalComments: 'none' });
