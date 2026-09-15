// ==============================================================================
// PULL PLANNER
// ==============================================================================
// Forward calculator: "if I do N more pulls, what's my chance of getting the
// rate-up?" Reuses buildPMF/generateCDFGraph from pity-math.js (the same math
// driving the luck graphs on individual pulls) with a user-editable starting
// pity instead of the fixed startingPity:0 the precomputed pmf_*_any arrays use.
let plannerRendered = false;

const PLANNER_PROFILES = {
    char: { hardPity: 80, softPity: 65, baseRate: 0.008, rateUpProb: 0.50, hardGuarantee: 120, hasRateUpPity: true },
    joint: { hardPity: 80, softPity: 65, baseRate: 0.008, rateUpProb: 1.0, hardGuarantee: null, hasRateUpPity: false },
    weap: { hardPity: 40, softPity: 40, baseRate: 0.04, rateUpProb: 0.25, hardGuarantee: 80, hasRateUpPity: false }
};

// Real banners the user has pulled on for the chosen profile, sourced from
// charBannerBoxes/weapBannerBoxes (published by analyzeData) rather than
// re-deriving pity state -- these already carry the exact end-of-banner pity.
// Only "char" (Chartered Headhunting) tracks a separate rate-up-pity counter
// toward the 120-pull hard guarantee (per banner, does not carry across
// different-named banners -- see analyzeData in data-pipeline.js); joint
// banners have no guarantee mechanic (rateUpProb is already 1.0) and weapon
// banners' 80-pull guarantee is measured from the current banner's own pull
// count, not a separately-tracked field.
function getPlannerBannerOptions(bannerType) {
    const options = [];
    if (bannerType === 'weap') {
        for (const [name, box] of Object.entries(weapBannerBoxes)) {
            options.push({ name, pity: box.currentWeaponPity || 0, rateUpPity: 0, alreadyHave: !!box.hasPulledRateUp });
        }
    } else {
        const matchesCategory = bannerType === 'joint'
            ? c => (c || '').startsWith('Joint Headhunting')
            : c => c === 'Chartered Headhunting';
        for (const [name, box] of Object.entries(charBannerBoxes)) {
            if (!matchesCategory(box.category)) continue;
            options.push({ name, pity: box.endPity || 0, rateUpPity: box.endRateUpPity || 0, alreadyHave: !!box.endHasPulledRateUp });
        }
    }
    return options;
}

// Default selection: the most recently pulled banner of this type, i.e. the
// user's actual current live pity -- not just the first one alphabetically.
function getPlannerLatestBanner(bannerType) {
    const timeline = bannerType === 'weap' ? weapBannerTimeline : charBannerTimeline;
    const options = getPlannerBannerOptions(bannerType);
    for (let i = timeline.length - 1; i >= 0; i--) {
        const match = options.find(o => o.name === timeline[i]);
        if (match) return match;
    }
    return options[0] || null;
}

function computePlannerProbability(bannerType, startingPity, startingRateUpPity, alreadyHave, pulls) {
    if (alreadyHave) return { probability: 1, pmf: null, clampedPulls: 0 };
    const profile = PLANNER_PROFILES[bannerType];
    // buildPMF's DP only ever reads pity indices below hardPity6Star (pity
    // always resets the instant it hits hard pity, so a "starting" pity of
    // exactly hardPity can't occur in real game state -- and numerically,
    // seeding buildPMF's dp array at exactly hardPity6Star produces an
    // all-zero PMF, since its loop never reads that index).
    const clampedPity = Math.min(Math.max(startingPity, 0), profile.hardPity - 1);
    const clampedPulls = Math.min(Math.max(pulls, 0), MAX_PULLS);

    // The 120-pull guarantee counts pulls since it last reset, not the 6-star
    // pity dimension buildPMF seeds via startingPity -- shift when it fires
    // by however much rate-up-pity is already banked.
    let hardGuarantee = profile.hardGuarantee;
    if (profile.hasRateUpPity && hardGuarantee !== null) {
        const bankedRateUpPity = Math.min(Math.max(startingRateUpPity, 0), hardGuarantee);
        hardGuarantee = Math.max(1, hardGuarantee - bankedRateUpPity);
    }

    const pmf = buildPMF(MAX_PULLS, profile.hardPity, profile.softPity, profile.baseRate, profile.rateUpProb, hardGuarantee, clampedPity);
    let probability = 0;
    for (let i = 0; i <= clampedPulls && i < pmf.length; i++) probability += pmf[i];
    return { probability: Math.min(probability, 1), pmf, clampedPulls };
}

function updatePlannerRateUpPityVisibility() {
    const bannerType = document.getElementById('plannerType').value;
    const field = document.getElementById('plannerRateUpPityField');
    field.style.display = PLANNER_PROFILES[bannerType].hasRateUpPity ? 'flex' : 'none';
}

function updatePlannerOutput() {
    const bannerType = document.getElementById('plannerType').value;
    const startingPity = parseInt(document.getElementById('plannerPity').value) || 0;
    const startingRateUpPity = parseInt(document.getElementById('plannerRateUpPity').value) || 0;
    const alreadyHave = document.getElementById('plannerAlreadyHave').checked;
    const pulls = parseInt(document.getElementById('plannerPulls').value) || 0;

    const { probability, pmf, clampedPulls } = computePlannerProbability(bannerType, startingPity, startingRateUpPity, alreadyHave, pulls);

    document.getElementById('plannerResult').innerText = (probability * 100).toFixed(1) + '%';
    document.getElementById('plannerGraph').innerHTML = alreadyHave ? '' : generateCDFGraph(pmf, clampedPulls);
}

function applyPlannerBannerSelection(option) {
    document.getElementById('plannerPity').value = option ? option.pity : 0;
    document.getElementById('plannerRateUpPity').value = option ? option.rateUpPity : 0;
    document.getElementById('plannerAlreadyHave').checked = option ? option.alreadyHave : false;
    updatePlannerOutput();
}

function onPlannerTypeChange() {
    const bannerType = document.getElementById('plannerType').value;
    const select = document.getElementById('plannerBannerSelect');
    const options = getPlannerBannerOptions(bannerType);

    select.innerHTML = '<option value="__custom">Custom (start from 0)</option>' +
        options.map(o => `<option value="${o.name.replace(/"/g, '&quot;')}">${o.name}</option>`).join('');

    document.getElementById('plannerPity').max = PLANNER_PROFILES[bannerType].hardPity - 1;
    updatePlannerRateUpPityVisibility();

    const latest = getPlannerLatestBanner(bannerType);
    if (latest) {
        select.value = latest.name;
        applyPlannerBannerSelection(latest);
    } else {
        select.value = '__custom';
        applyPlannerBannerSelection(null);
    }
}

function onPlannerBannerChange() {
    const bannerType = document.getElementById('plannerType').value;
    const select = document.getElementById('plannerBannerSelect');
    if (select.value === '__custom') {
        applyPlannerBannerSelection(null);
        return;
    }
    const match = getPlannerBannerOptions(bannerType).find(o => o.name === select.value);
    applyPlannerBannerSelection(match || null);
}

function renderPlanner() {
    const container = document.getElementById('plannerContent');
    if (!container) return;

    container.innerHTML = `
        <div class="banner-box planner-box">
            <h3>Chance Calculator</h3>
            <div class="pity-box planner-row">
                <div class="planner-field">
                    <label class="planner-label">Banner Type</label>
                    <select id="plannerType" class="planner-input" onchange="onPlannerTypeChange()">
                        <option value="char">Character (Chartered)</option>
                        <option value="joint">Character (Joint)</option>
                        <option value="weap">Arsenal</option>
                    </select>
                </div>
                <div class="planner-field planner-field-wide">
                    <label class="planner-label">Auto-Fill From Banner</label>
                    <select id="plannerBannerSelect" class="planner-input" onchange="onPlannerBannerChange()"></select>
                </div>
            </div>
            <div class="pity-box planner-row">
                <div class="planner-field">
                    <label class="planner-label">Starting Pity</label>
                    <input id="plannerPity" type="number" min="0" class="planner-input" value="0" oninput="updatePlannerOutput()">
                </div>
                <div class="planner-field" id="plannerRateUpPityField">
                    <label class="planner-label">Rate-Up Pity (of 120)</label>
                    <input id="plannerRateUpPity" type="number" min="0" max="120" class="planner-input" value="0" oninput="updatePlannerOutput()">
                </div>
                <div class="planner-field">
                    <label class="planner-label">Already Have It</label>
                    <input id="plannerAlreadyHave" type="checkbox" class="planner-checkbox" onchange="updatePlannerOutput()">
                </div>
                <div class="planner-field">
                    <label class="planner-label">Pulls To Simulate</label>
                    <input id="plannerPulls" type="number" min="0" max="1500" class="planner-input" value="80" oninput="updatePlannerOutput()">
                </div>
            </div>
            <div class="planner-output">
                <div class="planner-output-value" id="plannerResult">0%</div>
                <div class="planner-output-label">chance of getting the rate-up within that many pulls</div>
                <div id="plannerGraph" class="planner-graph"></div>
            </div>
        </div>
    `;

    onPlannerTypeChange();
}
