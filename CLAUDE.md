# eftracker

Client-side gacha pull-history tracker for Arknights: Endfield. No backend,
no build step — plain static files deployed as-is via GitHub Pages from
`main`. All state lives in the browser's `localStorage`; there is no
account system or server component.

## Architecture

`index.html` holds structure + all CSS (inline `<style>`), and loads
`js/*.js` as classic (non-module) `<script src>` tags in a fixed order —
they share one global scope, same as if it were still one big inline
script. That means:
- Function/variable declarations can be reordered freely between files.
- The only real ordering constraint is top-level (non-function-body)
  statements that execute immediately — currently just the `BANNER_DB`
  init block and the `pmf_char_any`/`pmf_weap_any`/`pmf_joint_any =
  buildPMF(...)` assignments in `js/pity-math.js` (kept in the same file
  as `buildPMF`'s definition for that reason). Everything else only runs
  after `DOMContentLoaded`, by which point every script has loaded.
- Do **not** add `type="module"`, `defer`, or `async` to these tags —
  that changes scoping and will break the shared-global-scope assumption
  most of the code relies on.

Module layout (in load order):

| File | Owns |
|---|---|
| `js/config.js` | Constants, cross-cutting mutable state (`charBannerBoxes`, `advStats`, `lastLoadedData`, etc.), `getEfConfig`/`updateEfConfig`/`deleteEfConfigKeys`/`migrateOldConfig` |
| `js/banners.js` | `BANNER_DB` (fetched from `ef-assets`), banner name/ID resolution (`getBannerInfo`, `getBannerPatchInfo`), `normalizeBannerName` |
| `js/pity-math.js` | `buildPMF`/`convolve` (PMF/CDF pity math), `generateCDFGraph` |
| `js/data-pipeline.js` | Pull parsing (`analyzeData`), the load pipeline (`processAndLoadData`), rate-up matching (`checkRateUpWon`) |
| `js/patch-stats.js` | Per-patch aggregation (`buildPatchStatsData`) — pure data, no DOM |
| `js/render-dashboard.js` | Character/Weapon tab rendering (`renderDashboard`, `renderOverviews`), banner image/icon helpers |
| `js/render-patch-stats.js` | Stats tab rendering (`renderPatchStats`) |
| `js/render-summary.js` | Summary strip + its expand/collapse animation state machine |
| `js/planner.js` | Pull Planner tab |
| `js/ui-tabs.js` | Tab switching/animation, expand/filter UI |
| `js/settings.js` | Settings tab: export/import, image upload, config toggles |
| `js/main.js` | `DOMContentLoaded` bootstrap — the composition root |

**Adding a new tab**: add its id to `SECTION_ORDER` in `js/config.js`,
add a tab `<button>` + `<div id="X-section">` in `index.html`, add it to
the "show hidden tabs" list in `processAndLoadData` (`js/data-pipeline.js`)
if it needs loaded data, and hook its render call into `switchTab`
(`js/ui-tabs.js`). See the Pull Planner for a worked example.

## Data sourcing — this matters

`BANNER_DB` (banner names, rate-up character/weapon IDs, patch mapping) is
fetched at runtime from `ram-prices/ef-assets`'s `banners.json`, **not**
hardcoded here. If you find yourself hardcoding a banner name, ID, or
rate-up mapping in `eftracker` to work around wrong/missing data, the
correct fix is almost always to **fix `ef-assets/banners.json` instead**
and delete the local workaround — see the commit history around
"Remove hardcoded banner-name/id patches" for the reasoning and a worked
example (including when a local workaround is legitimately needed instead:
`normalizeBannerName` in `js/banners.js`, which compensates for the game's
*own* API reporting a banner's name inconsistently — not an `ef-assets`
data problem at all).

`ef-assets` is a separate sibling repo — clone it alongside this one if
you need to edit `banners.json` or inspect `operators`/`arsenals` asset
filenames.

## Known gotchas

- **`buildPMF`'s `startingPity` must be `< hardPity6Star`, never equal.**
  Seeding it at exactly `hardPity6Star` silently produces an all-zero PMF
  (that DP index is outside the loop's range) rather than erroring. Not
  reachable through the existing UI, but a real trap if you add another
  caller with user-editable pity input — see `js/planner.js`'s clamping
  for the workaround (which also happens to be the domain-correct
  constraint: pity always resets on hit, so `startingPity === hardPity`
  can't represent a real game state anyway).
- **Two separate pity counters for char banners**: `endPity` (6★ pity,
  resets on any 6★) vs `endRateUpPity` (pity toward the 120-pull rate-up
  hard guarantee specifically, resets only on winning the rate-up, and
  does **not** carry over between different-named banners even within the
  same "Chartered Headhunting" category). Conflating them under-counts
  how close someone is to their guarantee. Weapon banners don't have this
  split — `currentWeaponPity` serves both roles, and the 80-pull weapon
  guarantee is measured from the current banner's own pull count.
- **Windows/Bash quirk in this dev environment**: `git core.autocrlf=true`
  will silently re-normalize line endings on `git add`, which can make a
  file with no real content change show as a full-file diff. If a diff
  looks suspiciously total for a small edit, check line endings before
  assuming real content changed.

## Local dev workflow

No `node`/`python` available in this environment's shell — only `perl`
(with `JSON::PP`) and PowerShell. Tooling under `.devserver/` accounts for
this:

- `.devserver/serve.ps1` (launch via `preview_start` name
  `eftracker-static`, port 8420) — plain static file server, needed
  because `file://` breaks `localStorage`/`fetch`.
- `.devserver/scripts/capture-snapshot.js` — paste into the running page
  (after data is loaded) to get a JSON snapshot of computed stats +
  rendered section text, for before/after regression comparison.
- `.devserver/scripts/diff-snapshots.pl` / `extract-js-result.pl` — diff
  two snapshots; unwrap an oversized browser-tool JS-eval result (it
  comes back double-JSON-encoded when the browser tool saves it to a file
  instead of inlining it).
- `.devserver/fixtures/` — gitignored; holds a real sample pull-history
  export for local testing. Not present in a fresh clone — ask the user
  for a sample `endfield_pulls_*.json` (their own, or anonymized) before
  relying on this workflow, or fetch pull data through the exported flow.

**Verification loop for any change**: reload → `read_console_messages`
(onlyErrors) → capture + diff snapshot against the last known-good one →
only then commit. This caught a real off-by-one edge case in `buildPMF`
during Pull Planner development that pure code review would have missed.

## Git workflow in this environment

Work on a feature/refactor branch, verify each step, commit with a
message that explains *why* not just *what*, merge to `main` with
`--no-ff` once verified end-to-end, push. The user has said they're fine
with this whole loop (including pushing to `main`) happening without a
check-in at each step — but always verify before committing, and stop to
ask if a change is genuinely ambiguous rather than guessing.
