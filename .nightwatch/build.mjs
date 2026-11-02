import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { loadRepository } from './worker.mjs';
import { localRepository } from './local-repository.mjs';

const { fetcher } = await localRepository();
const initial = await loadRepository(fetcher);
await build({
  stdin: {
    contents: `import worker from './worker.mjs';\nexport { loadRepository } from './worker.mjs';\nconst initial = ${JSON.stringify(initial)};\nexport default {fetch(request,env,ctx){return worker.fetch(request,{...env,INITIAL_SNAPSHOT:initial},ctx)}};`,
    resolveDir: fileURLToPath(new URL('.', import.meta.url)),
    sourcefile: 'entry.mjs',
  },
  bundle: true,
  outfile: 'dist/index.mjs',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'eof',
});
console.log(`Built ${initial.posts.length} writeups and ${initial.notes.length} notes.`);
