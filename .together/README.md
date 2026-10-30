# we. — Made for two

A minimal private photo journal at `we.nightwatch.team`. Each memory has a photo, title, description, date, and optional time. There are no plan categories, counters, or completion filters. The public blog remains a separate Worker.

Memories and photos live in the existing SQLite-backed Durable Object; private content is never written to this public repository. The first authenticated list request seeds one editable “Our story begins” entry dated 14 August 2026, with no invented time or personal photograph. A persistent marker prevents it reappearing after removal. Existing entries remain intact.

Build using the existing Nightwatch esbuild dependency:

```
cd .together
node --test worker.test.mjs
node build.mjs
node preview.mjs
```

The local preview uses the development-only passphrase `local-preview`, an ignored local storage file, and no production credentials.

Production bindings: `ROOM` (`durable_object_namespace`, class `TogetherRoom`), `ROOM_PASSWORD_HASH` (secret, SHA-256 of a strong shared passphrase), and `SESSION_SECRET` (independent random secret). Initial provisioning uses a `new_sqlite_classes: ["TogetherRoom"]` migration. Preserve the namespace and secrets on later deployments; never recreate them to publish a UI update.

Authentication uses a signed, host-only, Secure, HttpOnly, SameSite=Strict session cookie. Mutations require the same Origin. Login attempts are throttled in durable storage. Pages, photos, and private API responses use `Cache-Control: no-store`. Removed memories are soft-deleted and support Undo. Edits carry a revision to prevent stale forms overwriting another device's changes; create and photo-upload retries are idempotent.

The browser resizes chosen JPEG/PNG/WebP images to a maximum dimension of 1600 pixels and re-encodes them as WebP before uploading. The server accepts at most 2 MB, validates image signatures, and stores photo bytes in 64 KB chunks. Photo reads require the same signed-in session as the journal. Photos are served from the same origin. The local preview preserves binary chunks across restarts.

The original couple illustration was generated with the built-in imagegen tool, then encoded as a small WebP for the site. Prompt: a clean flat relationship illustration of a dark-haired couple holding hands in front of a blush heart, coral/navy and mustard/dusty-rose clothing, warm ivory background, no text or UI, 4:3 composition.
