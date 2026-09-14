// Paste into the browser console (or run via an MCP javascript_tool call)
// against a page that has already loaded pull data and rendered its tabs.
// Produces a compact, deterministic snapshot of the app's computed output
// for before/after regression comparison during refactors.
//
// Output via JSON.stringify(window.__snapshot) — save the result with
// extract-js-result.pl if the browser tool truncates it inline.

function stripBox(box) {
    const { pmfs, allPulls, ...rest } = box;
    const notable = allPulls
        .filter(p => p.rarity === '6' || p.rarity === '5')
        .map(({ graphHTML, timestamp, ...p }) => p);
    return { ...rest, allPulls: undefined, notablePulls: notable, allPullsCount: allPulls.length };
}

function mapToObj(box) {
    const out = {};
    for (const [k, v] of Object.entries(box)) out[k] = stripBox(v);
    return out;
}

const norm = s => s.replace(/\s+/g, ' ').trim();

window.__snapshot = {
    advStats,
    summaryChars: summaryChars.map(s => ({ ...s })),
    summaryWeaps: summaryWeaps.map(s => ({ ...s })),
    charBannerBoxes: mapToObj(charBannerBoxes),
    weapBannerBoxes: mapToObj(weapBannerBoxes),
    charSectionText: norm(document.getElementById('char-section').textContent),
    weapSectionText: norm(document.getElementById('weap-section').textContent),
    statsSectionText: norm(document.getElementById('stats-section').textContent)
};

JSON.stringify(window.__snapshot);
