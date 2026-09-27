---
title: "Path Traversal in CRUNCH's JSON Save Flow"
description: "An unauthenticated save request accepted a client-controlled session path and reported successful writes to another test session and beyond the intended session directory."
date: "2026-09-27"
author: "Sohrab Kaghazian"
category: "API"
tags: [path_traversal, unauthenticated, session_isolation]
icon: "../images/crunch/icon.svg"
---

## The short version

CRUNCH, a research web application, saved JSON job settings in a directory selected by a request parameter named `sd`. The server accepted that value even when it pointed to a different session or contained `../` path components. I tested this on September 14, 2026, without signing in, using only two sessions I created myself.

The save endpoint reported success when I aimed a request at my second session. It also reported success for a traversal probe that reached an existing writable directory outside the intended session area. Nearby invalid paths failed, which showed that the result depended on the resolved filesystem location.

![Diagram of the JSON save request reaching another test session and an out-of-scope writable directory](../images/crunch/flow.svg)

## How the normal flow worked

The application issued a session identifier, then used it in a later request to save JSON settings for a job. A normal request wrote to the caller's own session directory and returned a success response.

The problem was that the client supplied the directory selector. The application did not sufficiently check its format, keep the resolved directory inside the session root, or establish that the requester owned the selected session.

## What I tested

1. I obtained two session identifiers from the application without authentication. Both belonged to my testing.
2. I saved a harmless JSON marker to my first session. The endpoint returned HTTP 200 and a success message.
3. I sent another harmless marker while setting `sd` to `../[my-second-session]`. The endpoint again returned HTTP 200 and reported a successful save. Supplying the second session identifier directly also succeeded, showing a separate session-authorization weakness.
4. I tried nonexistent directories and missing subdirectories as controls. Those returned HTTP 500. Traversal components were accepted, and one depth reached an existing writable directory outside the expected session tree. The adjacent-depth controls failed.

The request shape below is illustrative. The host, exact endpoint, session identifiers, and marker values are intentionally omitted.

```text
POST [JSON save endpoint]
sd=../[researcher-created session B]
data={"probe":"controlled test"}

Observed response: HTTP 200, save reported successful
```

| Controlled test | Observed response |
| --- | --- |
| My own valid session | HTTP 200, save reported successful |
| My second session, selected directly | HTTP 200, save reported successful |
| My second session, selected with traversal | HTTP 200, save reported successful |
| Nonexistent directory or missing subdirectory | HTTP 500 |
| Existing writable directory beyond the session area | HTTP 200 at one traversal depth; adjacent depths returned HTTP 500 |

## Why it matters

The demonstrated risk is to **integrity**: an unauthenticated client could point the save operation at another session's directory, and traversal could move it outside the intended session area. In a job-processing application, changed saved settings could affect later work, but I did **not** verify any downstream execution or changed results.

The server chose the JSON filename, and I could not read the saved file back over HTTP. This report does not establish arbitrary filename control, confidential-data access, file deletion, remote code execution, or a meaningful availability impact. The HTTP success responses and path-dependent failures are the evidence for the directory-selection flaw; they are not proof of those additional outcomes.

## How to fix it

- Keep the server-side directory path in server-side state. A client token should identify a session, not become a filesystem path.
- Bind each session to its requester or another server-side authorization mechanism before accepting a save.
- Validate the expected token format, then resolve the final path and ensure it remains within an authorized per-session directory. Format checks alone do not provide authorization.
- Reject malformed or unauthorized requests with a controlled 4xx response instead of exposing filesystem-driven 500 errors.
- Limit the web process's write permissions to directories the application genuinely needs.

All cross-session testing used researcher-created sessions. No third-party information was read or altered. The original report rated this **Medium** based on the demonstrated integrity issue; no higher-impact outcome was verified.
