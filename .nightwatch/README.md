# Nightwatch Worker

Source for the existing `nightwatch-writeups` Cloudflare Worker, recovered from its deployed version and extended with GitHub-backed notes.

```sh
cd .nightwatch
pnpm install
pnpm test
pnpm build
```

`dist/index.mjs` is the bundled Worker entry point. The deployed Worker uses the existing `ASSETS` binding for its theme, CSS, icons, and browser scripts. Updating the Worker must preserve that asset collection and the binding. Use `keep_assets: true`, the existing compatibility date `2026-09-14`, and an `assets` binding named `ASSETS` when uploading a version through the Cloudflare API. This source folder does not replace the site's static asset collection.

The Worker reads public Markdown from `llsohrabll/Writeups` at runtime. It needs no GitHub token or SSH key. The deploy key used for repository maintenance is stored locally outside this repository.

`notes.mjs` implements the notes collection pages, icon, and additional CSS. `worker.mjs` imports notes and writeups in one shared snapshot so relative links can resolve across both. `.nightwatch/`, README files, and hidden files are excluded from content import.

The homepage retains the original hero, social links, search, and writeups list, with compact buttons for `/writeups/` and `/notes/`. The dedicated writeups archive retains the same search behavior.

`original-flow.mjs` preserves the seven-step component’s HTML, colors, and UI with its script and style externalized. `llm-sequence.mjs` renders the five-lane sequence diagram with selectable messages and Authorized/Blocked outcomes. `llm-visuals.mjs` combines these assets and the local authorization simulator. Markdown fences named `llm-flow`, `llm-sequence`, and `llm-checkpoint` insert the registered components. Other raw HTML remains escaped. Scripts and styles are served from the same origin, with content-versioned URLs and the existing Content Security Policy.

For local visual QA, `pnpm preview` uses local Markdown and the saved production theme in the task workspace. It does not publish content. Changes to notes on GitHub appear automatically after the import cache expires (about 10 minutes); Worker source changes require a build and deployment.
