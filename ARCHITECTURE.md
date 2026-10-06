# Architecture note

## Overview
A modular monolith: one React single-page app, one Express REST API, one MongoDB database.

```
Browser (React + Vite + Tailwind)
  RTK Query · React Router · React Hook Form + Zod · Tiptap
        │  REST / JSON  (Bearer JWT)          multipart/form-data for import
        ▼
Express API   routes → validate (Zod) → controllers → services → Mongoose
  auth middleware · central authorization · Multer · error handler · Helmet · CORS
        │
        ▼
MongoDB   users · documents · documentshares
```

## What I prioritised, and why
The brief rewards a coherent, working slice over breadth. In priority order:
1. **Correct access control**: every document operation goes through one function ([access.service.js](server/src/services/access.service.js)), so there is a single place to reason about and test.
2. **Data integrity and persistence**: content stored as structured Tiptap JSON, a unique index prevents duplicate shares, server-side validation on every boundary.
3. **A usable editing experience**: Tiptap (a mature editor) instead of a custom one, autosave with honest save state.
4. **File import that fits the product**: a file becomes a new editable document; nothing is stored as a binary.
5. **Evidence**: automated authorization/import tests, plus browser-level checks of the real UI.

Deliberately deprioritised: real-time collaboration, comments/suggestions, version history, PDF import, production-grade identity.

## Backend
`server/src`: `routes/` (wiring), `validators/` (Zod schemas), `controllers/` (HTTP only), `services/` (business rules: access, documents, shares, import), `models/` (Mongoose), `middleware/` (auth, validate, upload, errors), `config/`, `utils/`.

Responses are always `{ success, data }` or `{ success: false, error: { code, message } }`. Unknown errors are logged server-side and returned as a generic message, so no stack traces or internals leak.

## Data model (MongoDB / Mongoose)
| Collection | Fields | Notes |
|---|---|---|
| `users` | name, email (unique, lowercase), passwordHash (`select: false`) | bcrypt, cost 10 |
| `documents` | title (1–120), content (Tiptap JSON), owner → user, lastModifiedBy → user | index on owner |
| `documentversions` | document → doc, title, content (Tiptap JSON), author → user, createdAt | history snapshots; index on (document, createdAt desc); newest 30 kept per document |
| `comments` | document → doc, author → user, body (1-2000), resolved | index on (document, createdAt); deleted with the document |
| `documentshares` | document → doc, user → user, permission (`viewer` \| `editor`) | **unique index on (document, user)**; index on user |

Sharing is its own collection (not an array on the document) so "documents shared with me" is one indexed query by `user`, and duplicates are impossible even under concurrent requests (the race is caught as a duplicate-key error → `409`).

The dashboard list uses two queries total (owned; shares with populated document and owner) and excludes `content`, so there is no N+1 and no large payloads.

## Authentication
Demo-grade by design for the take-home: seeded users, bcrypt password check, a 12-hour JWT sent as `Authorization: Bearer`. Login returns the same error for a wrong password and an unknown email, and compares against a dummy hash for unknown emails so timing doesn't reveal which accounts exist. The user list endpoint was removed. Tokens live in `localStorage` (no cookies, so no CSRF surface) and are cleared, with the whole RTK Query cache, on sign-out so the next user never sees the previous user's data. A real product would use SSO/OIDC and short-lived tokens with revocation.

## Authorization
| Role | Read | Edit content | Rename | Share / revoke | Delete |
|---|---|---|---|---|---|
| Owner | ✔ | ✔ | ✔ | ✔ | ✔ |
| Editor | ✔ | ✔ | ✘ (403) | ✘ (403) | ✘ (403) |
| Viewer | ✔ | ✘ (403) | ✘ (403) | ✘ (403) | ✘ (403) |
| No access | ✘ (404) | ✘ (404) | ✘ (404) | ✘ (404) | ✘ (404) |

`authorizeDocument(id, user, action)` resolves owner → share → role, then checks the action. **Policy:** a user with no access at all gets `404`, the same as a document that doesn't exist, so ids cannot be probed (IDOR / enumeration). A user who *can* see the document but lacks permission gets `403`, which is honest and gives a better UX. The UI mirrors this (viewer toolbar hidden, editor read-only) but is never relied on. Validation runs before authorization, so malformed input is a `400` regardless of access; this reveals nothing about whether a document exists.

**Comments** use a fourth action in the same permission map: `comment` is allowed for owner, editor *and* viewer (a viewer may comment but not edit). Resolve is allowed for owner/editor or the comment's author; delete for the owner or the author. Comment and version ids are always looked up *within the document in the URL*, so an id from another document is a `404`.

## Version history, comments and presence
- **History:** before content is overwritten, the previous content is snapshotted if the newest snapshot is older than 5 minutes (so autosave does not create hundreds of versions); the empty starting document is never snapshotted; 30 newest are kept. Restore first snapshots what it replaces, so it is undoable. The author of a snapshot is the last person who saved that content (`lastModifiedBy`).
- **Presence:** deliberately minimal. Clients send a heartbeat every 10 s while the tab is visible; the API keeps `{document → user → lastSeen}` in memory and returns who was seen within 25 s. Requests are sent in order from the client (a heartbeat and a leave fired together could otherwise race), and a keepalive "leave" is sent on tab close. The trade-off is explicit: it is approximate, resets on restart and is per instance. A real-time co-editing feature would need websockets and a CRDT (e.g. Yjs); a multi-instance presence store would need Redis. Neither is justified for this scope, so neither is added.

## Rich text and persistence
Content is saved as Tiptap/ProseMirror JSON, never as trusted HTML, so formatting round-trips structurally and rendering goes through the editor's schema. Server validation requires a `doc` root and bounds request size (2 MB). Trailing empty paragraphs are trimmed on save.

**Save model:** autosave fires 1.5 s after the last edit, and Ctrl/Cmd+S saves immediately. A version counter detects edits made while a save is in flight (the status goes back to "unsaved" and a follow-up save is scheduled), and duplicate saves are blocked while one is running. Autosave can be switched off (per browser); the Save button and Ctrl/Cmd+S always work, and leaving with unsaved edits opens a Save / Don't save / Cancel modal. Concurrent editing by two people is last-write-wins; see limitations.

## File import
`Browser → multipart → Multer (memory storage, 1 MB) → type checks → parse → Tiptap JSON → new document`.
- Extension is the primary check (browsers report unreliable MIME types), MIME must be plausible, and content is verified: zip signature for `.docx`/`.xlsx`, UTF-8 and no NUL bytes for text formats.
- Markdown → HTML (`marked`) and `.docx` → HTML (`mammoth`) are converted to Tiptap JSON by `generateJSON` against the fixed schema, which drops scripts, handlers and unsafe constructs. CSV/TSV/XLSX are built directly into table JSON (no HTML), so cell values cannot inject markup. Limits: 1000 rows, 30 columns, 5 sheets.
- Files are never written to disk or executed; filenames are reduced to a base name for the title.

## Frontend
React + Vite + Tailwind; RTK Query for server state (cache tags invalidate the list after create/import/delete; saves patch the cache instead of refetching so typing is never overwritten); React Hook Form + Zod for the login and share forms; Tiptap for the editor; `docx` is loaded lazily only when exporting. Pages own their headers (home bar vs. editor menus), as in Google Docs.

## Testing
- **Server (74 tests, Vitest + Supertest):** the IDOR matrix and role behaviour, persistence round trips, share validation, import of every type including hostile files, login/token handling, CORS and headers. Each test file uses its own throwaway database.
- **Client (6 unit tests)** for trailing-paragraph trimming and API-base normalisation.
- **Browser checks (Playwright, run during development, not part of the repo):** formatting, autosave, refresh persistence, sharing and role UI, imports, downloads, shortcuts, forged/expired tokens, phone layout.

## Deployment
Frontend on Vercel, API on Render, database on MongoDB Atlas (all free tiers). For local use, `docker compose up --build` runs MongoDB, the API and an nginx container that serves the built client and proxies `/api` to the API (same origin, so no CORS); see the README. Containers are for local/demo convenience, not a production requirement, since the managed hosts build from source. Status of the live deployment is recorded in [SUBMISSION.md](SUBMISSION.md).

## Trade-offs and decisions
- **MongoDB:** documents are naturally a nested JSON structure, so storing Tiptap JSON as-is avoids an ORM mapping layer. Relationships (owner, shares) are simple references.
- **REST:** the resource model is small and CRUD-shaped; REST is easy to test and to reason about for authorization.
- **Modular monolith, not microservices:** one team, one deployable, and no independent scaling boundary exists yet. The service layer is the seam where a split could happen later.
- **No Redis, Kafka or BullMQ:** there is no asynchronous workload, fan-out or hot read path to justify them. Import is synchronous because files are capped at 1 MB and parse in milliseconds. They would be added only when a real requirement appears (background processing, high-volume workloads, distributed caching, independently scaled services).
- **No object storage (S3):** import converts a file into a document; there are no persistent attachments to store.
- **No custom editor:** Tiptap gives accessibility, IME, undo history and collaboration hooks for free.

## Scaling and evolution
Current: React → Express → MongoDB. If load or requirements grow: serve the client from a CDN; run several stateless API instances behind a load balancer (the API is already stateless); use a MongoDB replica set; add object storage if attachments become a feature; add Redis only for a measured hot path or WebSocket presence; add a queue/worker for heavy imports; adopt a CRDT provider (e.g. Yjs, which Tiptap supports) for real-time collaboration and add optimistic concurrency/version history in the meantime.

## Known limitations
See [README.md](README.md#known-limitations).
