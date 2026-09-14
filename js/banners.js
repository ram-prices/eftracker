// ==============================================================================
// BANNER DATABASE & RESOLUTION
// ==============================================================================
    let BANNER_DB = {};
    try {
        const cachedBanners = localStorage.getItem('efBannersDb');
        if (cachedBanners) {
            BANNER_DB = JSON.parse(cachedBanners) || {};
        }
    } catch (e) {
        BANNER_DB = {};
    }

    // The game API has historically reported this banner's poolName as the
    // bare "Drifting Raft" (older/other exports) as well as the current
    // "Drifting Raft Issue" — normalize to the latter so it groups/displays
    // consistently with every other weapon banner's "<Name> Issue" naming.
    function normalizeBannerName(name) {
        if (name === 'Drifting Raft') return 'Drifting Raft Issue';
        return name;
    }

    function getBannerInfo(poolId, bannerName = '') {
        if (!poolId && !bannerName) return null;
        let info = null;
        let infoKey = null;

        if (poolId) {
            let cleanId = poolId.toString().trim();
            let lower = cleanId.toLowerCase();
            if (BANNER_DB[cleanId]) { info = BANNER_DB[cleanId]; infoKey = cleanId; }
            else if (BANNER_DB[lower]) { info = BANNER_DB[lower]; infoKey = lower; }
            else {
                let normWep = lower.replace(/^weaponbox_/, 'weponbox_');
                if (BANNER_DB[normWep]) { info = BANNER_DB[normWep]; infoKey = normWep; }
                else {
                    let normWeap = lower.replace(/^weponbox_/, 'weaponbox_');
                    if (BANNER_DB[normWeap]) { info = BANNER_DB[normWeap]; infoKey = normWeap; }
                    else if (lower.startsWith('joint_')) {
                        info = BANNER_DB['joint_1_0_1'] || BANNER_DB['joint_1_2_2'] || null;
                        infoKey = lower;
                    }
                }
            }
        }

        if (!info && bannerName) {
            let bLower = bannerName.toString().toLowerCase().trim();
            for (const key of Object.keys(BANNER_DB)) {
                const b = BANNER_DB[key];
                if (!b) continue;
                let n = (b.name || '').toLowerCase().trim();
                let d = (b.displayEn || '').toLowerCase().trim();
                if (n === bLower || d === bLower) {
                    info = b;
                    infoKey = key;
                    break;
                }
            }
            if (!info) {
                for (const key of Object.keys(BANNER_DB)) {
                    const b = BANNER_DB[key];
                    if (!b) continue;
                    let n = (b.name || '').toLowerCase().trim();
                    let d = (b.displayEn || '').toLowerCase().trim();
                    if ((n && (bLower.includes(n) || n.includes(bLower))) ||
                        (d && (bLower.includes(d) || d.includes(bLower)))) {
                        info = b;
                        infoKey = key;
                        break;
                    }
                }
            }
        }

        if (!info) return null;

        let rUps = info.rateUpIds || info.rateupIDs || info.rateupIds || [];
        let rNames = info.rateUpName || info.rateupName || info.rateUpNames || info.rateupNames || [];
        if (typeof rNames === 'string') rNames = [rNames];
        return {
            ...info,
            id: info.id || infoKey || poolId,
            poolId: info.poolId || infoKey || poolId,
            rateUpIds: rUps,
            rateupIDs: rUps,
            rateUpName: rNames,
            rateupName: rNames,
            type: info.type || "Special"
        };
    }

    function getBannerPatchInfo(poolId, bannerName = '', bInfo = null) {
        if (!bInfo && (poolId || bannerName)) {
            bInfo = getBannerInfo(poolId, bannerName);
        }

        let candidates = [];
        if (bInfo) {
            if (bInfo.id) candidates.push(bInfo.id.toString());
            if (bInfo.poolId) candidates.push(bInfo.poolId.toString());
        }
        if (poolId) candidates.push(poolId.toString());
        if (bannerName) candidates.push(bannerName.toString());

        for (let str of candidates) {
            // Match pattern like 1_4_1, special_1_4_1, weponbox_1_4_2, 1.4
            let m = str.match(/(?:^|[^0-9])(\d+)[._](\d+)(?:[._](\d+))?(?:$|[^0-9])/);
            if (m) {
                let major = parseInt(m[1], 10);
                let minor = parseInt(m[2], 10);
                let bannerSeq = m[3] ? parseInt(m[3], 10) : null;
                return {
                    patchKey: `${major}.${minor}`,
                    patchTitle: `Patch ${major}.${minor}`,
                    major,
                    minor,
                    bannerSeq,
                    isPermanent: false
                };
            }
        }

        let bLower = (bannerName || '').toLowerCase().trim();
        for (const [key, b] of Object.entries(BANNER_DB)) {
            if (!b) continue;
            let n = (b.name || '').toLowerCase().trim();
            let d = (b.displayEn || '').toLowerCase().trim();
            if ((n && (bLower.includes(n) || n.includes(bLower))) ||
                (d && (bLower.includes(d) || d.includes(bLower)))) {
                let m = key.match(/(?:^|[^0-9])(\d+)[._](\d+)(?:[._](\d+))?/);
                if (m) {
                    let major = parseInt(m[1], 10);
                    let minor = parseInt(m[2], 10);
                    return {
                        patchKey: `${major}.${minor}`,
                        patchTitle: `Patch ${major}.${minor}`,
                        major,
                        minor,
                        bannerSeq: m[3] ? parseInt(m[3], 10) : null,
                        isPermanent: false
                    };
                }
            }
        }

        return {
            patchKey: 'Permanent',
            patchTitle: 'Standard / Constant',
            major: -1,
            minor: -1,
            bannerSeq: null,
            isPermanent: true
        };
    }

    async function syncRemoteBannersJson() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            let res = await fetch(`${EF_ASSETS_BASE}/banners.json`, { signal: controller.signal });
            if (!res.ok) res = await fetch(`${EF_ASSETS_CDN}/banners.json`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return;
            const remoteDb = await res.json();
            if (remoteDb && typeof remoteDb === 'object') {
                for (const [k, val] of Object.entries(remoteDb)) {
                    if (!val) continue;
                    let existingRateUps = BANNER_DB[k]?.rateUpIds || BANNER_DB[k]?.rateupIDs || [];
                    let newRateUps = val.rateUpIds || val.rateupIDs || val.rateupIds || [];
                    let mergedRateUps = Array.from(new Set([...existingRateUps, ...newRateUps]));

                    let existingRateUpNames = BANNER_DB[k]?.rateUpName || BANNER_DB[k]?.rateupName || [];
                    let newRateUpNames = val.rateUpName || val.rateupName || val.rateUpNames || val.rateupNames || [];
                    if (typeof newRateUpNames === 'string') newRateUpNames = [newRateUpNames];
                    if (typeof existingRateUpNames === 'string') existingRateUpNames = [existingRateUpNames];
                    let mergedRateUpNames = Array.from(new Set([...existingRateUpNames, ...newRateUpNames]));

                    let bName = val.name || BANNER_DB[k]?.name || val.displayEn || "";
                    let bDisplay = val.displayEn || val.name || BANNER_DB[k]?.displayEn || "";

                    BANNER_DB[k] = {
                        ...(BANNER_DB[k] || {}),
                        ...val,
                        rateUpIds: mergedRateUps.length ? mergedRateUps : newRateUps,
                        rateupIDs: mergedRateUps.length ? mergedRateUps : newRateUps,
                        rateUpName: mergedRateUpNames.length ? mergedRateUpNames : newRateUpNames,
                        rateupName: mergedRateUpNames.length ? mergedRateUpNames : newRateUpNames,
                        type: val.type || BANNER_DB[k]?.type || "Special",
                        displayEn: bDisplay,
                        name: bName
                    };
                }
                try {
                    localStorage.setItem('efBannersDb', JSON.stringify(BANNER_DB));
                } catch (e) {}

                if (isDataLoaded && lastLoadedData) {
                    processAndLoadData(lastLoadedData);
                }
            }
        } catch (err) {
            console.warn("Could not sync remote banners.json:", err);
        }
    }
