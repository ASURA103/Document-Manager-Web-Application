# Submission: Document Manager (Ajaia AI-Native Full Stack Developer Assignment)

Candidate: Rahul Rana

## Review in 5 minutes
1. Open the **Live URL** below (the free Render API sleeps when idle, so the first request after a pause can take up to a minute).
2. Sign in as **Alice** (`alice@example.com` / `Demo@1234`) using the demo-account button. Click **New document**, type, use the toolbar and menus. Edits autosave; refresh to see them persist.
3. Rename the document by clicking its title. Back on the home page, click **Import file** (accepts `.txt .md .html .csv .tsv .docx .xlsx`, max 1 MB). Try a CSV: it becomes a table.
4. Open the document, click **Share**, enter `bob@example.com`, choose **Viewer**, and share.
5. Use the avatar menu → **Switch user**, sign in as **Bob**. The document appears under **Shared with me** with its owner and role. Open it: the editor is read-only ("View only").
6. As Alice, change Bob's access to an editor (remove, then share again as Editor): Bob can now edit content but cannot rename or share.
7. Sign in as **Carol** and open Alice's document URL directly: "Document not found, or you do not have access" (the API returns 404).

## Links
- **Live URL:** https://document-manager-web-application.vercel.app (client, Vercel)
- **API URL:** https://document-manager-web-application.onrender.com/api (Render; health check at `/api/health`)
- **Walkthrough video:** see [WALKTHROUGH_URL.txt](WALKTHROUGH_URL.txt)
- **Source:** this folder (`client/`, `server/`)

> Deployment status: **deployed and verified.** On 2026-10-06 a real-browser test ran against the live site: login with the demo accounts, autosave and persistence after refresh, Markdown and CSV import, a named download, sharing to a viewer (viewer is read-only and the API returns 403 for its write), a stranger getting 404, and CORS allowing only the Vercel origin. The test documents were deleted afterwards.

## Demo accounts
All three use the password `Demo@1234`, created by `npm run seed`. They are published on purpose so reviewers can test sharing.

| User | Email |
|---|---|
| Alice Anderson | `alice@example.com` |
| Bob Brown | `bob@example.com` |
| Carol Clark | `carol@example.com` |

## What is included
| File | Purpose |
|---|---|
| [README.md](README.md) | Local setup, environment, tests, deployment, API summary, limitations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | What was prioritised and why, data model, authorization, trade-offs, scaling |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | AI tools used, where they helped, what they got wrong, how it was verified |
| [DEAD_CODE_AND_UNUSED.md](DEAD_CODE_AND_UNUSED.md) | Cleanup audit with evidence |
| [WALKTHROUGH_URL.txt](WALKTHROUGH_URL.txt) | Link to the walkthrough video |
| `client/`, `server/` | Source code (React + Vite; Express + Mongoose) |
| `docker-compose.yml`, `*/Dockerfile`, `client/nginx.conf` | Optional one-command local stack (not yet built or run, see README) |
| `server/tests/` | Automated tests |

## What works end to end (verified locally)
- Create, rename (owner), edit, autosave/save, reopen; persistence after refresh with formatting preserved.
- Rich text: bold, italic, underline, strikethrough, headings, font family/size, colour, highlight, links, alignment, bulleted/numbered/check lists, quotes, code, tables, undo/redo.
- File import into a new document (`.txt .md .html .csv .tsv .docx .xlsx`), with clear errors for unsupported, empty, fake or oversized files. The supported types and the 1 MB limit are shown in the UI and README.
- Download through a **Download as…** modal (file name + format): `.docx`, PDF (via print), `.md`, `.txt`, `.html`.
- Autosave on/off switch, explicit Save, and a **Save changes?** modal (Save / Don't save / Cancel) when leaving with unsaved edits.
- Sharing by email with viewer/editor roles; owner can revoke; "My documents" and "Shared with me" are visually separate; roles enforced by the API (stranger 404, viewer/editor 403 where applicable).
- Validation and error handling at the API boundary and in the UI.

## Testing
- `cd server && npm test`: 40 tests (Vitest + Supertest), including the IDOR matrix (stranger / viewer / editor / owner), persistence, share validation, hostile-file import, login and token handling.
- `cd client && npm test`: 3 unit tests. `npm run lint` and `npm run build` pass.
- Browser-level checks (Playwright, run during development) and an independent QA pass covering the full user journey, shortcuts, forged and expired tokens, and a phone-width layout. They are not committed to the repo.
- Production deployment: verified as described above. Not verified: the optional Docker images (the Docker daemon was not running) and keyboard commits of native dropdown popups (not drivable in headless Chromium).

## Optional stretch (the brief's list)
| Stretch item | Status |
|---|---|
| Export to PDF or Markdown | **Done.** *File → Download as…* asks for a file name and a format: Word `.docx`, Markdown `.md`, plain text, web page, and PDF. PDF uses the browser's print dialog ("Save as PDF") with the chosen name; the other formats are generated in the browser. |
| Role-based sharing beyond basic access | **Done.** Viewer and editor roles, plus owner-only actions (rename, share, revoke, delete), enforced on the server and covered by tests. |
| Real-time collaboration indicators | Not built yet. |
| Commenting or suggestion mode | Not built yet. The *Viewing mode* toggle is read-only viewing, not suggestions. |
| Document version history | Not built yet. Concurrent edits are last-write-wins. |

## Intentionally deprioritised
Real-time collaboration and presence, comments/suggestions, version history, PDF import, production-grade identity (SSO), rate limiting, object storage, Redis/queues (no workload justifies them; see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Known limitations
See [README.md](README.md#known-limitations). The main ones: last-write-wins concurrent editing, demo-grade authentication (shared demo password, no server-side token revocation), permanent delete, and a moderate `npm audit` advisory in a transitive dependency of `mammoth`.

## What I would build next (2–4 hours)
1. Optimistic concurrency (document version) with a "someone else edited this" conflict prompt, then version history.
2. Real-time presence indicators, then collaborative editing with Yjs.
3. Comments and suggestion mode.
4. Rate limiting and account lockout; real identity provider.
5. A committed browser test suite (Playwright) running in CI.
