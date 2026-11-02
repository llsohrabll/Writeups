import { readdir, stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export async function localRepository() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = new Map();
  async function scan(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const relative = prefix + entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(absolute, relative + '/');
      else if (entry.isFile()) files.set(relative, { absolute, size: (await stat(absolute)).size });
    }
  }
  await scan(root);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const fetcher = async input => {
    const url = String(input);
    if (url === 'https://api.github.com/repos/llsohrabll/Writeups') return Response.json({ default_branch: 'main', private: false });
    if (url.endsWith('/branches/main')) return Response.json({ commit: { sha: commit, commit: { tree: { sha: commit } } } });
    if (url.includes('/git/trees/')) return Response.json({ truncated: false, tree: [...files].map(([file, value]) => ({ path: file, type: 'blob', size: value.size })) });
    const prefix = `https://raw.githubusercontent.com/llsohrabll/Writeups/${commit}/`;
    if (url.startsWith(prefix)) {
      const file = files.get(decodeURIComponent(url.slice(prefix.length)));
      return new Response(file ? await readFile(file.absolute) : '', { status: file ? 200 : 404 });
    }
    return new Response('', { status: 404 });
  };
  return { fetcher, commit };
}
