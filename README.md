# Document Manager

A lightweight collaborative document editor inspired by Google Docs, built as a MERN monolith for the Ajaia AI-Native Full Stack Developer assignment.

**React + Vite + Tailwind → RTK Query → Express REST → Zod → Mongoose → MongoDB**, with Tiptap for rich text and Multer for file import.

- Live URL, demo accounts and a 5-minute reviewer path: [SUBMISSION.md](SUBMISSION.md)
- Design and trade-offs: [ARCHITECTURE.md](ARCHITECTURE.md)
- How AI was used: [AI_WORKFLOW.md](AI_WORKFLOW.md)
- Cleanup audit: [DEAD_CODE_AND_UNUSED.md](DEAD_CODE_AND_UNUSED.md)

## Features
- Create, rename, edit, save and reopen documents; content persists in MongoDB as Tiptap JSON.
- Rich text: bold, italic, underline, strikethrough, headings 1–3, font family and size, text colour, highlight, links, alignment, bulleted / numbered / checklist lists, quotes, code blocks, tables, horizontal rules, undo/redo, clear formatting. Full menu bar (File, Edit, View, Insert, Format, Tools, Help), zoom, word count, viewing mode.
- **Autosave** after a pause in typing, with an **Autosave on/off switch** (remembered per browser), a **Save** button, and Ctrl/Cmd+S. Autosave is **on by default**; turning it off is remembered per browser. "Saved" is shown only after the server confirms.
- **Leaving with unsaved changes** (logo link, File menu, switching user) opens a **Save changes?** modal: Save, Don't save or Cancel. A failed save keeps the modal open so nothing is lost. Closing the browser tab uses the browser's own warning.
- Dashboard: list-first view (grid optional, remembered), live search (press `/` to focus, Esc or the X to clear), owner and modified columns.
- **File import** into a new editable document (click the tile or drag a file onto it); blank lines in `.txt` files are paragraph separators, not stored as empty paragraphs: `.txt`, `.md`, `.html`, `.csv`, `.tsv`, `.docx`, `.xlsx`. Maximum 1 MB. Spreadsheets and CSVs become tables (up to 1000 rows × 30 columns, 5 sheets).
- **Download as…** modal: choose a **file name** and a **format** (`.docx`, PDF, `.md`, `.txt`, `.html`). PDF uses the browser's print dialog, with the chosen name as the default file name.
- **Sharing** by email with `viewer` or `editor` permission, from the editor's Share button or the **⋮ menu on any dashboard row**; owner can list and revoke. The dashboard separates **My documents** from **Shared with me** (with owner and role).
- Server-side authorization on every document route; a user with no access gets `404` (existence is not revealed), a user with insufficient permission gets `403`.

## Run with Docker (local)
One command starts MongoDB, the API and the web app (nginx serves the built client and proxies `/api`, so there is no CORS setup):
```bash
cp .env.example .env          # set JWT_SECRET (e.g. `openssl rand -hex 32`); WEB_PORT / API_PORT are optional
docker compose up --build     # first build takes a few minutes
```
Open **http://localhost:8080** and sign in with a demo account below. The API is also on http://localhost:4000. The API container runs the seed on every start (this resets the 3 demo users' password to the documented one; documents are untouched). Data lives in the `mongo-data` volume: `docker compose down` keeps it, `docker compose down -v` deletes it.
Files: [docker-compose.yml](docker-compose.yml), [server/Dockerfile](server/Dockerfile), [client/Dockerfile](client/Dockerfile), [client/nginx.conf](client/nginx.conf). This stack is for local/demo use; production deployment is Render + Vercel (below).
> Status: the compose file is syntax-checked, both lockfiles pass `npm ci`, and the API's production-only dependency set was run and exercised outside Docker. The images themselves have **not been built or run yet** (the Docker daemon was not running when this was added).

## Prerequisites
- Node.js (developed and tested on Node 26; other versions not tested)
- A MongoDB instance: local `mongod` or a free MongoDB Atlas cluster

## Setup
```bash
# 1. API
cd server
cp .env.example .env          # then edit: set JWT_SECRET to a long random string
npm install
npm run seed                  # creates the 3 demo users (idempotent)
npm run dev                   # http://localhost:4000

# 2. Client (new terminal)
cd client
cp .env.example .env          # optional in dev: the Vite dev server proxies /api to :4000
npm install
npm run dev                   # http://localhost:5173
```

### Environment variables
| Where | Variable | Purpose |
|---|---|---|
| server | `MONGO_URI` | MongoDB connection string (required) |
| server | `JWT_SECRET` | Token signing secret (required) |
| server | `CLIENT_URL` | Allowed browser origin(s) for CORS, comma-separated (default `http://localhost:5173`) |
| server | `PORT` | API port (default `4000`) |
| server | `SEED_DEMO_USERS` | `true` creates/refreshes the 3 demo users at startup, for hosts with no shell (e.g. Render free tier). Resets their password to the documented one |
| client | `VITE_B_URL` | API base URL, e.g. `https://<api>.onrender.com/api` (default `/api`) |
| client | `VITE_SHOW_DEMO_ACCOUNTS` | `false` hides the demo-account shortcuts on the login page (default: shown) |

`.env` files are git-ignored; only `.env.example` placeholders are committed.

### Demo accounts
Created by `npm run seed`. All use the password **`Demo@1234`** (published on purpose so reviewers can test sharing; re-running the seed resets it).

| Name | Email |
|---|---|
| Alice Anderson | `alice@example.com` |
| Bob Brown | `bob@example.com` |
| Carol Clark | `carol@example.com` |

## Testing
```bash
cd server && npm test   # 40 tests (Vitest + Supertest) against a local MongoDB
cd client && npm test   # 3 unit tests
cd client && npm run lint && npm run build
```
Server tests need a reachable MongoDB (default `mongodb://127.0.0.1:27017`; override the base with `MONGODB_URI_TEST`). Each test file creates and drops its own database, so your data is never touched.

The server suite covers: document lifecycle and persistence, the IDOR matrix (stranger / viewer / editor / owner), share validation, extended-content round trips, import of every supported type including hostile inputs, password login and token handling, CORS and security headers.

## Production build and deployment
- API: any Node host (developed for Render). Root `server`, build `npm install`, start `npm start` (`node index.js` also works), set the server variables above. Seed the demo users with `npm run seed`, or set `SEED_DEMO_USERS=true`. Point `MONGO_URI` at a database dedicated to this app.
- Client: any static host (developed for Vercel). Root `client`, build `npm run build`, output `dist`, set `VITE_B_URL`. [client/vercel.json](client/vercel.json) rewrites all routes to `index.html` for client-side routing.
- Database: MongoDB Atlas free tier.
- `CLIENT_URL` on the API must equal the deployed client origin exactly (no trailing slash).
- The free Render tier sleeps when idle; the first request can take up to a minute.

## API summary
All routes are under `/api`; responses are `{ "success": true, "data": … }` or `{ "success": false, "error": { "code", "message" } }`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | current user |
| GET / POST | `/documents` | list `{ owned, shared }` / create |
| POST | `/documents/import` | multipart field `file` |
| GET / PATCH / DELETE | `/documents/:id` | PATCH takes `title` (owner) and/or `content` (owner, editor); DELETE owner only |
| GET / POST | `/documents/:id/shares` | owner only; POST `{ email, permission }` |
| DELETE | `/documents/:id/shares/:userId` | owner only |

## Known limitations
- No real-time collaboration; concurrent edits are last-write-wins (no version check).
- Authentication is demo-grade: seeded users with a shared password, a 12-hour JWT kept in `localStorage`, no server-side revocation, no login rate limiting, no sign-up.
- Delete is permanent (no trash).
- The browser Back button is not intercepted, so going back with unsaved changes (autosave off) does not show the Save changes? modal; leaving via the app's own controls does.
- Import: no PDF or legacy `.doc`/`.xls`. Spreadsheets over 1000 rows, 30 columns or 5 sheets are rejected, not truncated.
- `npm audit` reports a moderate advisory in `sprintf-js`, a transitive dependency of `mammoth`; the suggested fix is a major downgrade, so it is not applied. Exposure is limited by the 1 MB upload cap.
- Only the owner can rename (editors can edit content).

## Future improvements
Real-time presence and collaboration, optimistic concurrency control and version history, comments and suggestions, PDF import, per-document activity log, rate limiting, proper identity (SSO/OIDC), object storage for attachments.
