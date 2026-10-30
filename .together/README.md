# we. — a shared space

A separate Cloudflare Worker for `we.nightwatch.team`. It never imports private plans from or writes them to this repository. Plans live in one SQLite-backed Durable Object, using its transactional storage API. The public blog remains a separate Worker.

Build using the existing Nightwatch esbuild dependency:

```
cd .together
node --test worker.test.mjs
node build.mjs
node preview.mjs
```

The local preview uses the development-only passphrase `local-preview`, an ignored local storage file, and no production credentials.

Production bindings: `ROOM` (`durable_object_namespace`, class `TogetherRoom`), `ROOM_PASSWORD_HASH` (secret, SHA-256 of a strong shared passphrase), and `SESSION_SECRET` (independent random secret). Initial provisioning uses a `new_sqlite_classes: ["TogetherRoom"]` migration. Preserve the namespace and secrets on later deployments; never recreate them to publish a UI update.

Authentication uses a signed, host-only, Secure, HttpOnly, SameSite=Strict session cookie. Mutations require the same Origin. Login attempts are throttled in durable storage. Pages and private API responses use `Cache-Control: no-store`. Removed plans are soft-deleted and support Undo. Edits carry a revision to prevent stale forms overwriting another device's changes.

The original couple illustration was generated with the built-in imagegen tool, then encoded as a small WebP for the site. Prompt: a clean flat relationship illustration of a dark-haired couple holding hands in front of a blush heart, coral/navy and mustard/dusty-rose clothing, warm ivory background, no text or UI, 4:3 composition.
