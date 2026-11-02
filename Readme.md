# Posting on Nightwatch

Writeups appear on [nightwatch.team](https://nightwatch.team/). Notes appear on [/note/](https://nightwatch.team/note/).

## Add a note

1. Create `notes/my-first-note.md` on GitHub. Use a lowercase filename with hyphens.
2. Paste this template and replace its text:

```markdown
---
title: "My first note"
description: "A short summary of what I learned."
date: "2026-11-02"
tags: [learning, security]
---

## What I learned

Write your note here. Use **bold**, lists, links, and fenced code blocks.
```

3. Commit the file to `main`. It appears at `/note/my-first-note/` after the site refreshes, usually within 10 minutes. Reload after the refresh.

## Add a writeup

Use the same template in `posts/my-writeup.md`. It appears on the homepage and at `/writeups/my-writeup/`.

## Images, drafts, and editing

- Upload images to `images/`. From a note or writeup, use `![Caption](../images/my-photo.png)`.
- Add `draft: true` above the closing `---` to keep a file unpublished. Change it to `false` when ready.
- Dates use quoted `YYYY-MM-DD` format. `title`, `description`, and `tags` also go between the `---` lines.
- Optional `slug: my-custom-url` sets the URL independently of the filename. Keep it unique within notes or writeups.
- Edit the Markdown file on GitHub and commit to update it. Remove the file to unpublish it after the next refresh.
- Each file may contain up to 512 KB of Markdown. README files are documentation and are never published as posts.
