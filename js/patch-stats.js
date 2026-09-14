// ==============================================================================
// PATCH / UPDATE STATISTICS ENGINE
// ==============================================================================
    let patchCategoryFilter = 'all';
    let patchSortMode = 'latest';

    function buildPatchStatsData() {
        if (!lastLoadedData) return { patches: [], grandTotal: 0, peakPatch: null, avgPulls: 0, total6: 0, activePatchesCount: 0 };

        let patchMap = new Map();

        function getOrCreatePatch(patchKey, patchTitle, major, minor, isPermanent) {
            if (!patchMap.has(patchKey)) {
                patchMap.set(patchKey, {
                    patchKey,
                    patchTitle,
                    major,
                    minor,
                    isPermanent,
                    totalPulls: 0,
                    charPulls: 0,
                    weapPulls: 0,
                    sixStars: [],
                    fiveStars: 0,
                    fourStars: 0,
                    threeStars: 0,
                    banners: new Map()
                });
            }
            return patchMap.get(patchKey);
        }

        function cleanPoolId(id) {
            return (id || '').toString().toLowerCase().trim().replace(/^weaponbox_/, 'weponbox_');
        }

        function fuzzyBannerKey(name) {
            return (name || '').toLowerCase()
                .replace(/\s+(issue|headhunting|banner|operation)$/i, '')
                .replace(/[^a-z0-9]/g, '');
        }

        function findPatchBanner(patch, poolId, bName) {
            let cleanPool = cleanPoolId(poolId);
            let normTarget = fuzzyBannerKey(bName);

            for (let entry of patch.banners.values()) {
                let entryCleanPool = cleanPoolId(entry.poolId);
                if (cleanPool && entryCleanPool && cleanPool !== 'special' && cleanPool !== 'weapon' && cleanPool !== 'unknown') {
                    if (cleanPool === entryCleanPool) return entry;
                }
                if (entry.bannerName && bName && entry.bannerName.toLowerCase().trim() === bName.toLowerCase().trim()) {
                    return entry;
                }
                let entryNorm = fuzzyBannerKey(entry.bannerName);
                if (normTarget && entryNorm && (normTarget === entryNorm || normTarget.includes(entryNorm) || entryNorm.includes(normTarget))) {
                    return entry;
                }
            }
            return null;
        }

        // 1. Pre-populate banners from BANNER_DB so patches reflect banners that appeared in that update
        for (const [dbKey, dbVal] of Object.entries(BANNER_DB)) {
            if (!dbVal) continue;
            let pInfo = getBannerPatchInfo(dbKey, dbVal.name || dbVal.displayEn || '', dbVal);
            if (pInfo && !pInfo.isPermanent) {
                let patch = getOrCreatePatch(pInfo.patchKey, pInfo.patchTitle, pInfo.major, pInfo.minor, false);
                let bName = normalizeBannerName(dbVal.name || dbVal.displayEn || dbKey);
                let isWeap = dbKey.toLowerCase().startsWith('weponbox') || dbKey.toLowerCase().startsWith('weaponbox');
                let existing = findPatchBanner(patch, dbKey, bName);
                if (!existing) {
                    patch.banners.set(dbKey, {
                        bannerName: bName,
                        poolId: dbKey,
                        bannerInfo: dbVal,
                        prefix: isWeap ? 'weap' : 'char',
                        totalPulls: 0,
                        sixStars: [],
                        fiveStars: 0,
                        rateUpWon: false,
                        isOfficial: true
                    });
                }
            }
        }

        // 2. Aggregate Character Banners from charBannerBoxes
        for (const [bName, bBox] of Object.entries(charBannerBoxes)) {
            let pInfo = getBannerPatchInfo(bBox.poolId, bName, getBannerInfo(bBox.poolId, bName));
            let patch = getOrCreatePatch(pInfo.patchKey, pInfo.patchTitle, pInfo.major, pInfo.minor, pInfo.isPermanent);

            let bannerEntry = findPatchBanner(patch, bBox.poolId, bName);
            if (!bannerEntry) {
                bannerEntry = {
                    bannerName: bName,
                    poolId: bBox.poolId,
                    bannerInfo: getBannerInfo(bBox.poolId, bName),
                    prefix: 'char',
                    totalPulls: 0,
                    sixStars: [],
                    fiveStars: 0,
                    rateUpWon: false,
                    isOfficial: false
                };
                patch.banners.set(bBox.poolId || bName, bannerEntry);
            } else {
                bannerEntry.bannerName = bName;
                if (bBox.poolId && !bannerEntry.poolId) bannerEntry.poolId = bBox.poolId;
            }

            let pullsOnThisBanner = bBox.totalPulls || 0;
            bannerEntry.totalPulls = pullsOnThisBanner;
            bannerEntry.rateUpWon = !!bBox.hasPulledRateUp;

            patch.charPulls += pullsOnThisBanner;
            patch.totalPulls += pullsOnThisBanner;

            (bBox.allPulls || []).forEach(p => {
                if (p.rarity === "6") {
                    let item = {
                        name: p.name,
                        enName: p.enName,
                        id: p.itemId,
                        rarity: "6",
                        pity: p.pityAtPull,
                        isRateUpItem: !!p.isRateUpItem,
                        bannerName: bName,
                        prefix: 'char',
                        timestamp: p.timestamp
                    };
                    bannerEntry.sixStars.push(item);
                    patch.sixStars.push(item);
                } else if (p.rarity === "5") {
                    bannerEntry.fiveStars++;
                    patch.fiveStars++;
                } else if (p.rarity === "4") {
                    patch.fourStars++;
                } else if (p.rarity === "3") {
                    patch.threeStars++;
                }
            });
        }

        // 3. Aggregate Weapon Banners from weapBannerBoxes
        for (let [bName, bBox] of Object.entries(weapBannerBoxes)) {
            bName = normalizeBannerName(bName);
            let pInfo = getBannerPatchInfo(bBox.poolId, bName, getBannerInfo(bBox.poolId, bName));
            let patch = getOrCreatePatch(pInfo.patchKey, pInfo.patchTitle, pInfo.major, pInfo.minor, pInfo.isPermanent);

            let bannerEntry = findPatchBanner(patch, bBox.poolId, bName);
            if (!bannerEntry) {
                bannerEntry = {
                    bannerName: bName,
                    poolId: bBox.poolId,
                    bannerInfo: getBannerInfo(bBox.poolId, bName),
                    prefix: 'weap',
                    totalPulls: 0,
                    sixStars: [],
                    fiveStars: 0,
                    rateUpWon: false,
                    isOfficial: false
                };
                patch.banners.set(bBox.poolId || bName, bannerEntry);
            } else {
                bannerEntry.bannerName = bName;
                if (bBox.poolId && !bannerEntry.poolId) bannerEntry.poolId = bBox.poolId;
            }

            let pullsOnThisBanner = bBox.totalPulls || 0;
            bannerEntry.totalPulls = pullsOnThisBanner;
            bannerEntry.rateUpWon = !!bBox.hasPulledRateUp;

            patch.weapPulls += pullsOnThisBanner;
            patch.totalPulls += pullsOnThisBanner;

            (bBox.allPulls || []).forEach(p => {
                if (p.rarity === "6") {
                    let item = {
                        name: p.name,
                        enName: p.enName,
                        id: p.itemId,
                        rarity: "6",
                        pity: p.pityAtPull,
                        isRateUpItem: !!p.isRateUpItem,
                        bannerName: bName,
                        prefix: 'weap',
                        timestamp: p.timestamp
                    };
                    bannerEntry.sixStars.push(item);
                    patch.sixStars.push(item);
                } else if (p.rarity === "5") {
                    bannerEntry.fiveStars++;
                    patch.fiveStars++;
                } else if (p.rarity === "4") {
                    patch.fourStars++;
                } else if (p.rarity === "3") {
                    patch.threeStars++;
                }
            });
        }

        // 4. Deduplicate any duplicate banner entries within each patch
        patchMap.forEach(patch => {
            let uniqueList = [];
            for (let b of patch.banners.values()) {
                b.bannerName = normalizeBannerName(b.bannerName);

                let matchIdx = uniqueList.findIndex(existing => {
                    let pA = cleanPoolId(existing.poolId);
                    let pB = cleanPoolId(b.poolId);
                    if (pA && pB && pA !== 'special' && pA !== 'weapon' && pA !== 'unknown' && pA === pB) return true;
                    let nA = fuzzyBannerKey(existing.bannerName);
                    let nB = fuzzyBannerKey(b.bannerName);
                    return (nA && nB && (nA === nB || nA.includes(nB) || nB.includes(nA)));
                });

                if (matchIdx !== -1) {
                    let existing = uniqueList[matchIdx];
                    if (b.totalPulls > 0 && existing.totalPulls === 0) {
                        existing.bannerName = b.bannerName;
                        existing.totalPulls = b.totalPulls;
                        existing.rateUpWon = b.rateUpWon;
                    } else if (b.bannerName.toLowerCase().includes('issue') && !existing.bannerName.toLowerCase().includes('issue')) {
                        existing.bannerName = b.bannerName;
                    }
                    if (b.sixStars && b.sixStars.length) {
                        existing.sixStars = Array.from(new Set([...existing.sixStars, ...b.sixStars]));
                    }
                    existing.fiveStars = Math.max(existing.fiveStars, b.fiveStars);
                } else {
                    uniqueList.push(b);
                }
            }
            patch.banners = new Map(uniqueList.map((b, idx) => [b.poolId || b.bannerName || idx, b]));
        });

        let patchesList = Array.from(patchMap.values());
        // Remove empty permanent patch if 0 pulls in both
        patchesList = patchesList.filter(p => !p.isPermanent || (p.charPulls > 0 || p.weapPulls > 0));

        let grandCharTotal = 0;
        let grandWeapTotal = 0;
        let char6Stars = 0;
        let weap6Stars = 0;
        patchesList.forEach(p => {
            grandCharTotal += p.charPulls;
            grandWeapTotal += p.weapPulls;
            char6Stars += p.sixStars.filter(s => s.prefix === 'char').length;
            weap6Stars += p.sixStars.filter(s => s.prefix === 'weap').length;
        });

        let peakCharPatch = null;
        let maxCharPull = -1;
        let peakWeapPatch = null;
        let maxWeapPull = -1;
        patchesList.forEach(p => {
            if (p.charPulls > maxCharPull) {
                maxCharPull = p.charPulls;
                peakCharPatch = p;
            }
            if (p.weapPulls > maxWeapPull) {
                maxWeapPull = p.weapPulls;
                peakWeapPatch = p;
            }
        });

        let activeCharPatchesCount = patchesList.filter(p => p.charPulls > 0).length;
        let activeWeapPatchesCount = patchesList.filter(p => p.weapPulls > 0).length;

        let avgCharPulls = activeCharPatchesCount > 0 ? Math.round(grandCharTotal / activeCharPatchesCount) : 0;
        let avgWeapPulls = activeWeapPatchesCount > 0 ? Math.round(grandWeapTotal / activeWeapPatchesCount) : 0;

        return {
            patches: patchesList,
            grandCharTotal,
            grandWeapTotal,
            peakCharPatch,
            peakWeapPatch,
            avgCharPulls,
            avgWeapPulls,
            char6Stars,
            weap6Stars,
            activeCharPatchesCount,
            activeWeapPatchesCount
        };
    }

    function sortPatches(patchesList, sortMode) {
        return [...patchesList].sort((a, b) => {
            if (sortMode === 'pulls') {
                if (patchCategoryFilter === 'char') {
                    if (b.charPulls !== a.charPulls) return b.charPulls - a.charPulls;
                } else if (patchCategoryFilter === 'weap') {
                    if (b.weapPulls !== a.weapPulls) return b.weapPulls - a.weapPulls;
                } else {
                    // For side-by-side mode, rank by operator pulls first, then arsenal pulls
                    if (b.charPulls !== a.charPulls) return b.charPulls - a.charPulls;
                    if (b.weapPulls !== a.weapPulls) return b.weapPulls - a.weapPulls;
                }
            }
            if (a.isPermanent && !b.isPermanent) return 1;
            if (!a.isPermanent && b.isPermanent) return -1;
            if (sortMode === 'chrono') {
                if (a.major !== b.major) return a.major - b.major;
                return a.minor - b.minor;
            }
            // default 'latest'
            if (a.major !== b.major) return b.major - a.major;
            return b.minor - a.minor;
        });
    }

    function setPatchCategoryFilter(filter) {
        patchCategoryFilter = filter;
        ['all', 'char', 'weap'].forEach(f => {
            const btn = document.getElementById(`patch-filter-${f}`);
            if (btn) btn.classList.toggle('active', f === filter);
        });
        renderPatchStats();
    }

    function cyclePatchSort() {
        const modes = ['latest', 'chrono', 'pulls'];
        const labels = {
            'latest': 'LATEST FIRST ▼',
            'chrono': 'EARLIEST FIRST ▲',
            'pulls': 'MOST PULLS ★'
        };
        let idx = modes.indexOf(patchSortMode);
        let nextIdx = (idx + 1) % modes.length;
        patchSortMode = modes[nextIdx];
        const btn = document.getElementById('patch-sort-btn');
        if (btn) btn.innerText = labels[patchSortMode];
        renderPatchStats();
    }

    function scrollToPatchCard(patchKey) {
        const el = document.getElementById(`patch-card-${patchKey.replace(/\./g, '_')}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.style.boxShadow = '0 0 20px rgba(255, 250, 0, 0.4)';
            setTimeout(() => {
                el.style.boxShadow = '';
            }, 1600);
        }
    }
