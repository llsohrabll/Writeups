# Nightwatch Worker

Source for the `nightwatch-writeups` Cloudflare Worker.

All Nightwatch pages use the shared 130% display scale in `display-scale.mjs`. It adjusts responsive breakpoints in the existing theme and component stylesheets to match the enlarged layout, and adds narrow-screen control wrapping. The original theme still comes from the existing `ASSETS` collection. Change `displayVersion` when updating the scale so every stylesheet refreshes together. Printing stays at 100%.

```
cd .nightwatch
pnpm install
pnpm test
pnpm build
```

The homepage displays the writeups list and search, with `posts/welcome.md` in an introduction sidebar instead of the grid. The sidebar stacks above the list on smaller screens; its original article URL remains available. `/writeups/` redirects to that list; existing `/writeups/<slug>/` article URLs remain valid. `/note/` is a simple notebook populated by Markdown files in `notes/`, including editable LLM and OAuth starter posts. Both lists use a two-column grid on larger screens and one column on phones. The root [posting guide](../Readme.md) explains publishing.

`local-repository.mjs` supplies local content for builds and previews. Builds embed the current rendered content so a cold edge can respond immediately. Runtime GitHub refreshes run in the background when a bundled or stale snapshot is available; the edge cache lasts about 10 minutes. A repository-only content edit needs no Worker deployment.

`dist/index.mjs` is the bundled Worker. Deployments must preserve the existing `ASSETS` collection: use `keep_assets: true`, retain the `ASSETS` binding and its runtime configuration, and keep the compatibility date `2026-09-14`. The `.nightwatch` source does not replace that collection.

`pnpm preview` runs on `http://127.0.0.1:8787/` using local Markdown and saved theme assets. Hidden source directories and README files are excluded from content import. `.together/` belongs to the separate `we.nightwatch.team` Worker.

`notes/oauth.md` embeds the supplied animation with an empty `oauth-animation` fenced block. Keep that block when adding your own text around it. Only this note recognizes the marker; ordinary Markdown still escapes HTML. The 14 original lesson scenarios live in `oauth-lessons.mjs`; `oauth-player.mjs` supplies the compact UI and theme variables, and `oauth-player-client.mjs` handles playback. The player uses the site's theme toggle, runs locally, and loads its script and stylesheet only on `/note/oauth/`. No extra page, iframe, framework, quiz, or standalone landing page is included.

`notes/llm.md` uses an empty `llm-animation` fence for its 16 supplied lessons and 12 defended replays. Its content and playback live in `llm-lessons.mjs` and `llm-player-client.mjs`; `llm-player.mjs` shares the OAuth visual system with distinct LLM actors and a six-column sequence diagram. The Flows, Attacks, and Scanners groups stay on `/note/llm/`. Traces render as text, and the player makes no AI, tool, or exploitation requests. Keep the fence when adding Markdown around the animation.
