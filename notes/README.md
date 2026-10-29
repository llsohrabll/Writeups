# Notes

Personal learning notes are published at https://nightwatch.team/notes/.

## Add a note

1. Open the collection on the website and choose **Add note on GitHub**.
2. Give the Markdown file a unique name, for example `prompt-injection.md`.
3. Replace the template with your notes, then commit the file to `main`.

The website refreshes from GitHub within about 10 minutes. Notes are separate from the main writeups archive.

LLM notes belong in `notes/llm-attacks/`. To create another collection, add a Markdown file in a new lowercase folder such as `notes/security-classes/` or `notes/academy-labs/`. Collection names are derived from the folder name.

```markdown
---
title: "My lesson title"
description: "A short summary of what I learned."
date: "2026-10-29"
tags: [llm, course-notes]
---

## Key ideas

Write your notes here.

## Examples

Add examples or code blocks.

## References

- [Course or resource](https://example.com)
```

Only `title` is recommended; frontmatter is optional, and the first `# Heading` or filename can supply the title. Dates must be quoted `YYYY-MM-DD` strings. Add `draft: true` to keep a note unpublished.

## Images and links

Use relative Markdown links, such as `![Diagram](../../images/llm/diagram.png)` or `[Related note](another-note.md)`. Notes and writeups can link to each other using relative paths. Images can also use an HTTPS URL. Raw HTML is escaped.

Each published note has an **Edit note on GitHub** link. Files named `README.md`, hidden files, and drafts are not published. Published URLs use the collection folder and the filename, unless you provide a `slug` in frontmatter. Keep filenames stable to preserve links.

The current Worker imports up to 40 Markdown documents across notes and writeups per refresh, excluding README files and hidden files. Each document can contain up to 512 KB of Markdown.
