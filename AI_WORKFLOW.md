# AI workflow note

## Tools
- **Claude Code (VS Code extension)**: the main engineering assistant. Used for repository discovery, planning, backend, frontend, tests, the browser-level checks, security review and these documents.
- **A second Claude Code session as an independent QA tester**: it exercised the running app (UI and API) and produced a written QA report with confirmed bugs and unverified areas, which I then triaged and fixed.
- **Playwright (not AI)** drove a real headless browser for end-to-end checks.
- **ChatGPT**: used before and alongside the build for **prompt writing and planning**: choosing the stack, drafting the master prompt that Claude Code was given, and weighing scope. It is not a code source for this repository; its output was a plan and a prompt that I then reviewed and adjusted.

## Where AI materially sped things up
- **Scaffolding and boilerplate:** Express/Mongoose structure, Zod schemas, RTK Query endpoints, Tiptap toolbar and menus.
- **Converters:** Tiptap JSON → Markdown and → `.docx`, CSV parsing, spreadsheet → table JSON.
- **Test generation:** the authorization matrix, import edge cases and hostile-file tests.
- **Parallel verification:** browser-level checks and an independent QA pass caught issues unit tests could not.

## Prompt and planning with ChatGPT, and what I changed
ChatGPT helped me turn the open-ended brief into a plan: it recommended keeping to the MERN stack I know (React + Vite + Tailwind, Express, MongoDB/Mongoose, Zod, Multer, Tiptap, RTK Query), cutting infrastructure that the workload does not justify (Kafka, Redis, BullMQ, microservices, S3), and drafted a long phase-by-phase prompt for Claude Code. I kept its core direction and changed or dropped parts of it once I saw the real project:
- **Process trimmed:** the prompt asked for a 60-section process, a full reconnaissance report and a final engineering report. The repository was empty, so I replaced that with a short phased plan with a gate at the end of each phase, and kept only the documents the brief asks for plus a dead-code audit.
- **Scope widened where the brief allowed it:** the prompt assumed `.txt`/`.md` import only. I extended import to `.html`, `.csv`, `.tsv`, `.docx` and `.xlsx` (tables for spreadsheets), and added download as `.docx`, `.md`, `.txt`, `.html` and PDF via print.
- **Auth strengthened:** the prompt suggested lightweight demo auth. I started there, then replaced it with bcrypt passwords before any public deployment.
- **Save model:** the prompt said "explicit save unless autosave is reliable". I implemented autosave with an on/off switch, an explicit Save button, a "Save changes?" modal when leaving, and race protection.
- **Decisions the prompt left open:** I chose `404` for "no access" and `403` for "insufficient permission", and owner-only rename.
- **Infrastructure rule relaxed deliberately:** the prompt said not to add Nginx. I did not use it for deployment (Vercel + Render), but the optional local Docker stack uses an nginx container to serve the built client and proxy the API.
- **Time:** the plan targeted a 4-6 hour slice; I stopped adding features once the brief's requirements were covered and spent the remaining time on testing, a security pass and documentation.

## What I directed (judgment calls)
- **Stack and scope:** kept the build to React → Express → MongoDB; rejected Kafka, Redis, BullMQ, microservices and S3 as unjustified for this workload (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Access policy:** chose `404` for "no access" and `403` for "has access but not permission"; owner-only rename (with an explanatory tooltip).
- **Auth:** the first version was passwordless demo login. Before any public deployment I replaced it with bcrypt passwords, removed the public user list, and made the demo-account shortcuts switchable with `VITE_SHOW_DEMO_ACCOUNTS`.
- **Reuse vs. rewrite:** I reviewed the existing repository you linked for reusable code. I reused its environment variable names and `vercel.json`, and rejected its flat `sharedWith` array because it cannot express viewer/editor permissions.
- **Rejected:** PDF import (fragile parsing, outside the brief), applying `npm audit fix --force` (it would downgrade `mammoth` to an ancient version), and trusting HTML content (content is stored as JSON).

## What AI got wrong, and how it was caught
| Problem | How it surfaced | Fix |
|---|---|---|
| Test files shared one database and wiped each other when run in parallel | first full test run failed | one throwaway database per test file |
| Seed script's "run directly" check never ran: the project folder name contains a special character that URL-encodes differently | login failed because users did not exist | compare with `pathToFileURL(process.argv[1])` |
| The link dialog turned `javascript:alert(1)` into `https://javascript:alert(1)` and accepted it | browser-level check | reject any explicit non-http(s)/mailto scheme |
| Opening a document marked it "unsaved", autosaved it and changed its "Edited" date (`setEditable()` on mount emits an update) | browser check showed "Unsaved changes…" on an untouched import | only call `setEditable` when the value actually changes |
| Failed login produced an unhandled promise rejection in the browser console | page-error assertion in the browser suite | try/catch in the RTK Query `onQueryStarted` |
| Document title disappeared in the phone-width header | I looked at the screenshot after a "no horizontal scroll" check passed | wrapping header with a minimum title width |
| After choosing a style, font or size from a toolbar dropdown, keyboard focus stayed on the `<select>` (Tiptap's `focus()` is deferred a frame), so quickly typed keys went to the dropdown. I introduced this regression; the independent QA session caught it | independent QA retest | move focus to the editor synchronously before applying the change; browser check types immediately after each dropdown change |
| Blank lines in `.txt` imports were stored as empty paragraphs | independent QA retest | blank lines are separators; trailing empty blocks trimmed on import |
| Tab title never changed from "Document Manager" | independent QA report | per-page `document.title` hook |
| An early "unused exports" scan reported everything as unused because the shell glob failed | implausible output | scan redone with correct quoting; the invalid result was discarded |
| Several of my own browser-test failures were test bugs: `Ctrl+A` means "line start" on macOS, instant `isVisible()` checks raced async rendering, ambiguous selectors | investigated each failure before touching app code | `ControlOrMeta+A`, explicit waits, exact selectors. In each case the app behaved correctly. |

## Verification
- **Automated:** 40 server tests (Vitest + Supertest) and 3 client unit tests; lint and production build.
- **Real-browser checks** (Playwright): create / format / autosave / reload / share / switch user / viewer read-only / unauthorized / imports / every download format / shortcuts / forged and expired tokens / phone layout.
- **Independent QA:** a separate session tested the running app and API and reported no critical or major defects; its three minor findings were fixed and its unverified items were answered by code review and new checks.
- **Source inspection** for authorization, file handling and secrets (`.env` files are git-ignored; only placeholders are committed).
- **Not verified yet:** the production deployment (see [SUBMISSION.md](SUBMISSION.md)), the Docker images (the daemon was not running; only the compose syntax and the API's production-only dependencies were checked), and keyboard commits of native dropdown popups (not drivable in headless Chromium).

The pattern throughout: AI accelerated execution; every claim was checked by running the code, and the decisions were mine.
