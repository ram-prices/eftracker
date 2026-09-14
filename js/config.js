// ==============================================================================
// CONFIGURATIONS & ASSET DATABASE
// ==============================================================================
const EF_ASSETS_BASE = "https://raw.githubusercontent.com/ram-prices/ef-assets/main";
const EF_ASSETS_CDN = "https://cdn.jsdelivr.net/gh/ram-prices/ef-assets@main";

const MAX_PULLS = 1500;
const SECTION_ORDER = ['char', 'weap', 'stats', 'settings', 'about'];

let visitedTabs = new Set();
let isDataLoaded = false;

// Config management
function getEfConfig() {
    try {
        const config = localStorage.getItem('efConfig');
        const parsed = config ? JSON.parse(config) : {};
        // Defaults
        if (parsed.summaryMaxRows === undefined) parsed.summaryMaxRows = 3;
        if (parsed.summaryBannerLimit === undefined) parsed.summaryBannerLimit = 999;
        if (parsed.summaryExpandedByDefault === undefined) parsed.summaryExpandedByDefault = false;
        return parsed;
    } catch (e) {
        return { summaryMaxRows: 3, summaryBannerLimit: 999, summaryExpandedByDefault: false };
    }
}

function updateEfConfig(key, value) {
    const config = getEfConfig();
    config[key] = value;
    localStorage.setItem('efConfig', JSON.stringify(config));
}

function migrateOldConfig() {
    const config = getEfConfig();
    let migrated = false;
    const keys = {
        'efShowTimestamps': 'showTimestamps',
        'efBannerBlur': 'bannerBlur',
        'efBannerPos': 'bannerPos',
        'efManualUser': 'manualUser',
        'efTrackerUser': 'trackerUser',
        'efCustomAvatar': 'customAvatar',
        'efCustomBanner': 'customBanner'
    };

    for (const [oldKey, newKey] of Object.entries(keys)) {
        const val = localStorage.getItem(oldKey);
        if (val !== null) {
            config[newKey] = (val === 'true' || val === 'false') ? (val === 'true') : val;
            localStorage.removeItem(oldKey);
            migrated = true;
        }
    }

    if (migrated) {
        localStorage.setItem('efConfig', JSON.stringify(config));
    }
}

let summaryChars = [], summaryWeaps = [];
let charBannerTimeline = [], weapBannerTimeline = [];
let charBannerBoxes = {}, weapBannerBoxes = {};
let uniqueChars = new Map(), uniqueWeaps = new Map();
let lastLoadedData = null;
let pmf_char_any = [], pmf_weap_any = [], pmf_joint_any = [];
let advStats = {
    char: { pulls: 0, s6: 0, s5: 0, rateUpWins: 0, rateUpLosses: 0 },
    weap: { pulls: 0, s6: 0, s5: 0, rateUpWins: 0, rateUpLosses: 0 }
};

// Tracks whether row-1 animation is still running for each summary type.
// While true, overflow items must not be revealed yet.
// (Read by both js/ui-tabs.js's switchTab and js/render-summary.js's several
// functions, so it lives here rather than in either of those files.)
let summaryRow1Animating = { char: false, weap: false };
