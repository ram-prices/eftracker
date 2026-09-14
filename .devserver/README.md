# Local dev/test tooling (not part of the shipped site)

This folder exists only to let Claude (or you) load `index.html` over real
HTTP during development — `localStorage` and `fetch` don't behave reliably
against a bare `file://` URL, so this spins up a trivial static file server
instead.

## Running it

From the Claude Code browser tool: `preview_start` with name `eftracker-static`
(configured in `.claude/launch.json`), which serves the repo root at
`http://localhost:8420/`.

Manually: `powershell -File .devserver/serve.ps1 -Port 8420`

## Regression-testing a refactor

1. Load a real (or sample) `endfield_pulls_*.json` export into the running
   page via `localStorage.setItem('efTrackerData', ...)` + reload (see
   `handleFileUpload` in `index.html` for the exact shape expected).
2. Run `scripts/capture-snapshot.js` in the page to get a compact JSON
   summary of computed stats + rendered section text.
3. Save that as `before.json`.
4. Make your code change, reload, repeat step 2, save as `after.json`.
5. `perl scripts/diff-snapshots.pl before.json after.json` — any output
   means the refactor changed observable behavior, intentionally or not.

`scripts/extract-js-result.pl` is a helper for when the browser tool saves
a large JS eval result to a file instead of inlining it (it's double
JSON-encoded in that case); point it at that file to get plain JSON out.

## fixtures/

Holds a copy of a real pull-history export for local testing. Not tracked
in git (see `.gitignore`) since it's personal gacha data.
