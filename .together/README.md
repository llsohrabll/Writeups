# we. — Made for two

A minimal photo journal at `we.nightwatch.team`. The welcome page has a single **Come in** button, with no password. Anyone with the URL can enter, view, and edit the shared journal. Each memory has a photo, title, description, date, and optional time. There are no plan categories, counters, or completion filters. The public blog remains a separate Worker.

Memories and photos live in the existing SQLite-backed Durable Object and are never written to this repository. The first journal list request seeds one editable “Our story begins” entry dated 14 August 2026, with no invented time or personal photograph. A persistent marker prevents it reappearing after removal. Existing entries remain intact.

Build using the existing Nightwatch esbuild dependency:

```
cd .together
node --test worker.test.mjs
node build.mjs
node preview.mjs
```

The local preview uses the same password-free welcome button, an ignored local storage file, and no production credentials.

Production bindings: `ROOM` (`durable_object_namespace`, class `TogetherRoom`) and `SESSION_SECRET` (independent random secret for the welcome-page session). The former `ROOM_PASSWORD_HASH` is no longer used or required. Initial provisioning uses a `new_sqlite_classes: ["TogetherRoom"]` migration. Preserve the namespace and session secret on later deployments; never recreate them to publish a UI update.

Clicking **Come in** creates a signed, host-only, Secure, HttpOnly, SameSite=Strict session cookie. This records entry into the journal; it is not a privacy or authorization boundary, since anyone can obtain it. The form also works without JavaScript using a normal POST and redirect. **Back** clears the entry cookie and returns to the welcome page. Mutations still require the same Origin. Pages, photos, and API responses use `Cache-Control: no-store`. Removed memories are soft-deleted and support Undo. Edits carry a revision to prevent stale forms overwriting another device's changes; create and photo-upload retries are idempotent.

The browser resizes chosen JPEG/PNG/WebP images to a maximum dimension of 1600 pixels and re-encodes them as WebP before uploading. The server accepts at most 2 MB, validates image signatures, and stores photo bytes in 64 KB chunks. Photo reads use the same entry session as the journal. Photos are served from the same origin. The local preview preserves binary chunks across restarts.

The original couple illustration was generated with the built-in imagegen tool, then encoded as a small WebP for the site. Prompt: a clean flat relationship illustration of a dark-haired couple holding hands in front of a blush heart, coral/navy and mustard/dusty-rose clothing, warm ivory background, no text or UI, 4:3 composition.
