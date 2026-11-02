# Nightwatch Worker

Source for the `nightwatch-writeups` Cloudflare Worker.

```
cd .nightwatch
pnpm install
pnpm test
pnpm build
```

The homepage displays the writeups list and search. `/writeups/` redirects to that list; existing `/writeups/<slug>/` article URLs remain valid. `/note/` is a simple notebook populated by Markdown files in `notes/`, including editable LLM and OAuth starter posts. Both lists use a two-column grid on larger screens and one column on phones. The root [posting guide](../Readme.md) explains publishing.

`local-repository.mjs` supplies local content for builds and previews. Builds embed the current rendered content so a cold edge can respond immediately. Runtime GitHub refreshes run in the background when a bundled or stale snapshot is available; the edge cache lasts about 10 minutes. A repository-only content edit needs no Worker deployment.

`dist/index.mjs` is the bundled Worker. Deployments must preserve the existing `ASSETS` collection: use `keep_assets: true`, retain the `ASSETS` binding and its runtime configuration, and keep the compatibility date `2026-09-14`. The `.nightwatch` source does not replace that collection.

`pnpm preview` runs on `http://127.0.0.1:8787/` using local Markdown and saved theme assets. Hidden source directories and README files are excluded from content import. `.together/` belongs to the separate `we.nightwatch.team` Worker.
