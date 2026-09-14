// ==============================================================================
// DATA PIPELINE (PARSE / SORT / ANALYZE / LOAD)
// ==============================================================================
    function parseIdToName(idStr) {
        if (!idStr) return "";
        if (idStr === 'chr_0034_typhoea' || idStr === 'chr_0034_typhoeus') return "Typhoeus";
        let parts = idStr.split('_');
        if (idStr.startsWith('wpn_') && parts.length >= 3) return parts.slice(1).join('_');
        if (idStr.startsWith('chr_') && parts.length >= 3) return parts.slice(2).join('_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return idStr;
    }

    function checkRateUpWon(bannerInfo, itemId, itemName, enName, pull) {
        if (!bannerInfo) return false;
        
        const clean = (s) => (s || '').toString().toLowerCase().replace(/[\s_\-]/g, '');
        const curId = clean(itemId);
        const curName = clean(itemName);
        const curEnName = clean(enName);

        let ruNames = bannerInfo.rateUpName || bannerInfo.rateupName || [];
        if (!Array.isArray(ruNames)) ruNames = [ruNames];
        for (let rName of ruNames) {
            let cleanRName = clean(rName);
            if (cleanRName && (curName === cleanRName || curEnName === cleanRName || (curName && curName.includes(cleanRName)) || (curEnName && curEnName.includes(cleanRName)))) return true;
        }

        if (!bannerInfo.rateUpIds || !bannerInfo.rateUpIds.length) return false;

        for (let rId of bannerInfo.rateUpIds) {
            let cleanRId = clean(rId);
            if (curId && (curId === cleanRId || curId.endsWith(cleanRId) || cleanRId.endsWith(curId))) return true;
            
            let rParts = rId.toLowerCase().split('_');
            let rCore = rParts[rParts.length - 1];
            let curParts = (itemId || '').toLowerCase().split('_');
            let curCore = curParts[curParts.length - 1];
            
            if (rCore && curCore && rCore === curCore) return true;

            let parsedRName = clean(parseIdToName(rId));
            if (curName && (curName.includes(parsedRName) || parsedRName.includes(curName))) return true;
            if (curEnName && (curEnName.includes(parsedRName) || parsedRName.includes(curEnName))) return true;
        }
        return false;
    }

    function getBannerWeaponInfo(poolId, bannerName, bInfo, data) {
        if (!bInfo) bInfo = getBannerInfo(poolId, bannerName);
        
        let weaponId = "";
        let weaponName = "";
        
        // 1. Check rateUpIds in bInfo
        if (bInfo && bInfo.rateUpIds && bInfo.rateUpIds.length > 0) {
            let wId = bInfo.rateUpIds.find(id => typeof id === 'string' && id.startsWith('wpn_')) || bInfo.rateUpIds[0];
            if (wId && typeof wId === 'string') {
                weaponId = wId;
            }
        }
        
        // 2. Check rateUpName in bInfo
        if (bInfo && (bInfo.rateUpName || bInfo.rateupName)) {
            let names = bInfo.rateUpName || bInfo.rateupName;
            if (Array.isArray(names) && names.length > 0) {
                weaponName = names[0];
            } else if (typeof names === 'string') {
                weaponName = names;
            }
        }
        
        // 3. Constant issue specific fallback mappings if rateUpIds were missing
        if (!weaponId && poolId) {
            let p = poolId.toLowerCase();
            if (p.includes('constant_1')) { weaponId = 'wpn_claym_0013'; weaponName = weaponName || 'Khravengger'; }
            else if (p.includes('constant_2')) { weaponId = 'wpn_funnel_0013'; weaponName = weaponName || 'Dreams of the Starry Beach'; }
            else if (p.includes('constant_3')) { weaponId = 'wpn_sword_0016'; weaponName = weaponName || 'Never Rest'; }
            else if (p.includes('constant_4')) { weaponId = 'wpn_lance_0012'; weaponName = weaponName || 'Mountain Bearer'; }
            else if (p.includes('constant_5')) { weaponId = 'wpn_claym_0007'; weaponName = weaponName || 'Thunderberge'; }
        }
        
        // 4. Check data.allPulls for 6★ weapon or any weapon pulled in that banner
        if (data && data.allPulls && data.allPulls.length > 0) {
            if (!weaponId) {
                let pull6 = data.allPulls.find(p => p.rarity === "6" && p.itemId && p.itemId.startsWith('wpn_'));
                let pullAnyWeap = data.allPulls.find(p => p.itemId && p.itemId.startsWith('wpn_'));
                let targetPull = pull6 || pullAnyWeap;
                if (targetPull) {
                    weaponId = targetPull.itemId;
                    if (!weaponName) weaponName = targetPull.name || targetPull.enName;
                }
            }
        }
        
        // 5. If weaponId is found but weaponName is missing, resolve it
        if (weaponId && !weaponName) {
            weaponName = uniqueWeaps.get(weaponId) || parseIdToName(weaponId);
        }
        
        return { weaponId, weaponName };
    }

    function isHuntingDossier(pull) {
        if (!pull) return false;
        return pull.kind === 'gift_intel_book' ||
               pull.id === 'gift_intel_book' ||
               pull.itemId === 'gift_intel_book' ||
               pull.kindId === 'gift_intel_book' ||
               pull.itemKind === 'gift_intel_book';
    }

    function sortPullsChronologically(pullData) {
        if (!Array.isArray(pullData) || !pullData.length) return [];
        const filtered = pullData.filter(p => !isHuntingDossier(p));
        if (!filtered.length) return [];
        
        const getTs = (p) => {
            let raw = p.gachaTs || p.ts || p.timestamp || p.time;
            if (!raw) return 0;
            let n = parseInt(raw);
            if (!isNaN(n) && n > 0) return n;
            let d = Date.parse(raw);
            return isNaN(d) ? 0 : d;
        };
        const getSeq = (p) => parseInt(p.seqId || p.id || p.order || 0) || 0;

        let isDesc = false;
        if (filtered.length >= 2) {
            let firstTs = getTs(filtered[0]);
            let lastTs = getTs(filtered[filtered.length - 1]);
            if (firstTs > lastTs) {
                isDesc = true;
            } else if (firstTs === lastTs) {
                let firstSeq = getSeq(filtered[0]);
                let lastSeq = getSeq(filtered[filtered.length - 1]);
                if (firstSeq > lastSeq) isDesc = true;
            }
        }

        const indexed = filtered.map((p, idx) => ({ ...p, _origIdx: idx }));

        indexed.sort((a, b) => {
            let tsA = getTs(a), tsB = getTs(b);
            if (tsA !== tsB) return tsA - tsB;

            let seqA = getSeq(a), seqB = getSeq(b);
            if (seqA && seqB && seqA !== seqB) return seqA - seqB;

            return isDesc ? (b._origIdx - a._origIdx) : (a._origIdx - b._origIdx);
        });

        return indexed;
    }

    function analyzeData(pullData, prefix) {
        if (!pullData || !pullData.length) return;
        const validPulls = pullData.filter(p => !isHuntingDossier(p));
        if (!validPulls.length) return;
        const pullsCopy = sortPullsChronologically(validPulls);
        
        let categoryStats = {}, bannerBoxes = {}, bannerTimeline = [];

        if (prefix === 'char') charBannerTimeline = bannerTimeline;
        else weapBannerTimeline = bannerTimeline;

        pullsCopy.forEach(pull => {
            if (isHuntingDossier(pull)) return;
            let poolTypeRaw = (pull.poolType || pull.gachaType || pull.poolId || "Special").toString().toLowerCase();
            let poolId = pull.poolId || pull.gachaPoolId || pull.pool_id || poolTypeRaw;
            let bannerName = normalizeBannerName(pull.poolName || pull.gachaPoolName || pull.weaponPoolName || pull.activityName || poolId);
            let isJoint = false;
            let category = "Chartered Headhunting";

            let bannerInfo = getBannerInfo(poolId, bannerName);
            let bannerType = bannerInfo?.type || "";

            if (prefix === 'char') {
                if (bannerType === "New Horizons" || poolTypeRaw.includes("new") || poolTypeRaw.includes("horizon") || poolTypeRaw.includes("beginner") || poolId === "beginner") {
                    category = "New Horizons";
                } else if (bannerType === "Standard" || poolTypeRaw.includes("basic") || poolTypeRaw.includes("standard") || poolId === "standard") {
                    category = "Basic Headhunting";
                } else if (poolTypeRaw.includes("joint") || poolId === "joint" || bannerName.toLowerCase().includes("joint") || (poolId && poolId.toString().toLowerCase().startsWith("joint_"))) {
                    isJoint = true;
                    category = "Joint Headhunting: " + bannerName;
                } else {
                    category = "Chartered Headhunting";
                }
            } else {
                category = (bannerType === "Standard" || poolTypeRaw.includes("constant") || bannerName.toLowerCase().includes("constant") || poolTypeRaw.includes("standard") || poolId === "standard" || (poolId && poolId.toString().toLowerCase().includes("constant"))) ? "Constant Issue" : bannerName;
            }

            if (!categoryStats[category]) categoryStats[category] = { currentPity: 0, rateUpPity: 0, totalPulls: 0, lastBannerName: "", firstSixStarPity: null, hasPulledRateUp: false, tokenPulls: 0 };
            if (!bannerBoxes[bannerName]) {
                bannerTimeline.push(bannerName);
                bannerBoxes[bannerName] = { poolId, category, isConstant: category === "Constant Issue", totalPulls: 0, currentWeaponPity: 0, allPulls: [], hasPulledRateUp: false, rateUpBlock: null, hasPulledSixStar: false, firstSixStarBlock: null, endPity: 0, endRateUpPity: 0, rateUpPity: 0, tokenPulls: 0, endTokenPulls: 0, endHasPulledRateUp: false, rateUpCount: 0, startingPityForMath: prefix === 'char' && category === "Chartered Headhunting" ? categoryStats[category].currentPity || 0 : 0, pmfs: null };
            }

            if (!bannerBoxes[bannerName].pmfs) bannerBoxes[bannerName].pmfs = [null, prefix === 'char' ? (isJoint ? buildPMF(MAX_PULLS, 80, 65, 0.008, 1.0, null, 0) : buildPMF(MAX_PULLS, 80, 65, 0.008, 0.50, 120, bannerBoxes[bannerName].startingPityForMath)) : buildPMF(MAX_PULLS, 40, 40, 0.04, 0.25, 80, 0)];

            let itemId = (prefix === 'char' ? (pull.charId || pull.itemId) : (pull.weaponId || pull.itemId)) || pull.charId || pull.weaponId || pull.itemId || "";
            let itemName = (prefix === 'char' ? (pull.charName || pull.name || pull.itemName) : (pull.weaponName || pull.name || pull.itemName)) || pull.charName || pull.weaponName || pull.name || pull.itemName || (pull.weapon ? pull.weapon.name || pull.weapon.weaponName : "Unknown Item");
            let enName = parseIdToName(itemId) || itemName.replace(/[:;]/g, '');

            if (itemId) (prefix === 'char' ? uniqueChars : uniqueWeaps).set(itemId, itemName);
            
            const rarity = pull.rarity ? pull.rarity.toString() : "3";
            const isFree = ["true", true, 1, "1"].includes(pull.isFree);
            const isNewItem = ["true", true].includes(pull.isNew);

            if (isFree) {
                bannerBoxes[bannerName].allPulls.push({ name: itemName, enName, itemId, pityAtPull: "FREE", rarity, pullNum: "FREE", isNew: isNewItem, timestamp: pull.gachaTs || pull.ts || pull.timestamp });
                if (rarity === "6") (prefix === 'char' ? summaryChars : summaryWeaps).push({ id: itemId, name: itemName, enName, rarity, pity: "FREE", bannerName });
            } else {
                bannerBoxes[bannerName].totalPulls++; categoryStats[category].totalPulls++; advStats[prefix].pulls++; 
                if (rarity === "5") advStats[prefix].s5++;

                let currentPullNum = bannerBoxes[bannerName].totalPulls, displayPity, pushedToAllPulls = false;

                if (prefix === 'weap') {
                    bannerBoxes[bannerName].currentWeaponPity++; displayPity = Math.ceil(currentPullNum / 10) || 1;
                    
                    if (currentPullNum > 0 && currentPullNum % 10 === 0) {
                        let tB = currentPullNum / 10;
                        if (tB >= 18 && (tB - 18) % 16 === 0) {
                            let poolInfo = getBannerInfo(poolId, bannerName);
                            if (poolInfo && poolInfo.rateUpIds && poolInfo.rateUpIds.length) {
                                let ruNames = poolInfo.rateUpName || poolInfo.rateupName || [];
                                let ruNameFromDb = Array.isArray(ruNames) ? ruNames[0] : ruNames;
                                let ruId = poolInfo.rateUpIds[0], fallback = ruNameFromDb || parseIdToName(ruId), locName = uniqueWeaps.get(ruId) || fallback;
                                summaryWeaps.push({ id: ruId, name: locName, enName: fallback, rarity: "6", pity: "TOKEN", bannerName });
                            }
                        }
                    }
                } else {
                    categoryStats[category].currentPity++;
                    if (category === "Chartered Headhunting") {
                        if (!bannerBoxes[bannerName].hasPulledRateUp) {
                            bannerBoxes[bannerName].rateUpPity = Math.min(120, (bannerBoxes[bannerName].rateUpPity || 0) + 1);
                        }
                        bannerBoxes[bannerName].tokenPulls = (bannerBoxes[bannerName].tokenPulls || 0) + 1;
                        if (bannerBoxes[bannerName].tokenPulls > 0 && bannerBoxes[bannerName].tokenPulls % 240 === 0) {
                            let poolInfo = getBannerInfo(poolId, bannerName);
                            if (poolInfo && poolInfo.rateUpIds && poolInfo.rateUpIds.length) {
                                let ruNames = poolInfo.rateUpName || poolInfo.rateupName || [];
                                let ruNameFromDb = Array.isArray(ruNames) ? ruNames[0] : ruNames;
                                let ruId = poolInfo.rateUpIds[0], fallback = ruNameFromDb || parseIdToName(ruId), locName = uniqueChars.get(ruId) || fallback;
                                summaryChars.push({ id: ruId, name: locName, enName: fallback, rarity: "6", pity: "TOKEN", bannerName });
                            }
                        }
                    } else if (isJoint) {
                        categoryStats[category].tokenPulls++;
                        if (categoryStats[category].tokenPulls > 0 && categoryStats[category].tokenPulls % 120 === 0) {
                            summaryChars.push({ id: '', name: 'JOINT SELECTOR', enName: 'Joint_Selector', rarity: "6", pity: "TOKEN", bannerName });
                        }
                    }
                    displayPity = categoryStats[category].currentPity;
                }

                if (rarity === "6" || (rarity === "5" && prefix === 'weap')) {
                    if (rarity === "6") {
                        advStats[prefix].s6++;
                        if (category === "New Horizons" && categoryStats[category].firstSixStarPity === null) categoryStats[category].firstSixStarPity = displayPity;

                        let wonRateUp = false, rateUpCopyNum = 0, pullProbability = undefined, generatedGraphHTML = "";
                        let bannerInfo = getBannerInfo(poolId, bannerName);
                        let isRateUpBanner = bannerInfo && bannerInfo.rateUpIds && bannerInfo.rateUpIds.length > 0;
                        
                        if (isRateUpBanner) {
                            wonRateUp = checkRateUpWon(bannerInfo, itemId, itemName, enName, pull);
                            
                            // 120th pull guarantee: if reaching 120 pulls on Chartered Headhunting without rate-up, this 6★ is guaranteed to be rate-up
                            if (!wonRateUp && prefix === 'char' && category === "Chartered Headhunting" && ((bannerBoxes[bannerName].rateUpPity || 0) >= 120 || currentPullNum >= 120) && !bannerBoxes[bannerName].hasPulledRateUp) {
                                wonRateUp = true;
                            }

                            let isGuaranteed = (prefix === 'char' && category === "Chartered Headhunting" && ((bannerBoxes[bannerName].rateUpPity || 0) >= 120 || currentPullNum >= 120) && !bannerBoxes[bannerName].hasPulledRateUp) || (prefix === 'weap' && currentPullNum === 80 && !bannerBoxes[bannerName].hasPulledRateUp);
                            
                            if (wonRateUp) {
                                rateUpCopyNum = ++bannerBoxes[bannerName].rateUpCount;
                                while (bannerBoxes[bannerName].pmfs.length <= rateUpCopyNum) {
                                    let basePmf = prefix === 'weap' ? pmf_weap_any : (isJoint ? pmf_joint_any : pmf_char_any);
                                    bannerBoxes[bannerName].pmfs.push(convolve(bannerBoxes[bannerName].pmfs[bannerBoxes[bannerName].pmfs.length - 1], basePmf));
                                }
                                
                                let targetPmf = bannerBoxes[bannerName].pmfs[rateUpCopyNum], cdfVal = 0, evalPull = Math.min(prefix === 'weap' ? Math.ceil(currentPullNum / 10) * 10 : currentPullNum, MAX_PULLS);
                                for (let i = 1; i <= evalPull; i++) cdfVal += targetPmf[i];
                                pullProbability = cdfVal * 100.0;
                                generatedGraphHTML = generateCDFGraph(targetPmf, evalPull);
                                if (!isGuaranteed) advStats[prefix].rateUpWins++;
                            } else {
                                advStats[prefix].rateUpLosses++;
                            }
                        }

                        if (prefix === 'weap' && !bannerBoxes[bannerName].hasPulledSixStar) { bannerBoxes[bannerName].hasPulledSixStar = true; bannerBoxes[bannerName].firstSixStarBlock = displayPity; }

                        bannerBoxes[bannerName].allPulls.push({ name: itemName, enName, itemId, pityAtPull: displayPity, isRateUpItem: wonRateUp, rarity: "6", pullNum: currentPullNum, isNew: isNewItem, pullProb: pullProbability, rateUpCopyNum, graphHTML: generatedGraphHTML, timestamp: pull.gachaTs || pull.ts || pull.timestamp });
                        pushedToAllPulls = true;

                        let weaponBlocksTaken = null;
                        if (prefix === 'weap') {
                            let previousPullNum = currentPullNum - bannerBoxes[bannerName].currentWeaponPity;
                            weaponBlocksTaken = Math.ceil(currentPullNum / 10) - Math.ceil(previousPullNum / 10);
                        }

                        if (prefix === 'weap') {
                            bannerBoxes[bannerName].currentWeaponPity = 0; 
                            if (wonRateUp && !bannerBoxes[bannerName].hasPulledRateUp) { bannerBoxes[bannerName].hasPulledRateUp = true; bannerBoxes[bannerName].rateUpBlock = displayPity; }
                        } else {
                            if (category === "Chartered Headhunting" && wonRateUp) {
                                bannerBoxes[bannerName].hasPulledRateUp = true;
                                categoryStats[category].hasPulledRateUp = true;
                            }
                            if (category !== "New Horizons") categoryStats[category].currentPity = 0; 
                        }

                        (prefix === 'char' ? summaryChars : summaryWeaps).push({ id: itemId, name: itemName, enName, rarity: "6", pity: prefix === 'char' ? displayPity : weaponBlocksTaken, bannerName });
                    } else if (rarity === "5" && prefix === 'weap') {
                        bannerBoxes[bannerName].allPulls.push({ name: itemName, enName, itemId, pityAtPull: Math.ceil(currentPullNum / 10) || 1, rarity: "5", pullNum: currentPullNum, isNew: isNewItem, timestamp: pull.gachaTs || pull.ts || pull.timestamp });
                        pushedToAllPulls = true;
                    }
                }
                
                if (!pushedToAllPulls) bannerBoxes[bannerName].allPulls.push({ name: itemName, enName, itemId, pityAtPull: prefix === 'weap' ? (Math.ceil(currentPullNum / 10) || 1) : null, rarity, pullNum: currentPullNum, isNew: isNewItem, timestamp: pull.gachaTs || pull.ts || pull.timestamp });
            }

            if (category === "Chartered Headhunting") {
                Object.assign(bannerBoxes[bannerName], { 
                    endPity: categoryStats[category].currentPity, 
                    endRateUpPity: Math.min(120, bannerBoxes[bannerName].rateUpPity || 0), 
                    endTokenPulls: bannerBoxes[bannerName].tokenPulls || 0, 
                    endHasPulledRateUp: !!bannerBoxes[bannerName].hasPulledRateUp 
                });
            } else if (category.startsWith("Joint Headhunting")) {
                Object.assign(bannerBoxes[bannerName], { 
                    endPity: categoryStats[category].currentPity, 
                    endRateUpPity: 0, 
                    endTokenPulls: categoryStats[category].tokenPulls || 0, 
                    endHasPulledRateUp: false 
                });
            }
        });

        if (prefix === 'char') {
            // Token pushing is now handled inline during pull processing
        }
        
        renderDashboard(categoryStats, bannerBoxes, bannerTimeline, prefix);
    }

    function processAndLoadData(data, username) {
        lastLoadedData = data;
        if (username) {
            document.getElementById('display-username').innerText = username;
            updateEfConfig('trackerUser', username);
        } else {
            const config = getEfConfig();
            if (config.manualUser) document.getElementById('display-username').innerText = config.manualUser;
        }
        
        summaryChars = []; summaryWeaps = []; uniqueChars.clear(); uniqueWeaps.clear();
        charBannerBoxes = {}; weapBannerBoxes = {};
        advStats = { char: { pulls: 0, s6: 0, s5: 0, rateUpWins: 0, rateUpLosses: 0 }, weap: { pulls: 0, s6: 0, s5: 0, rateUpWins: 0, rateUpLosses: 0 } };
        
        if (data.characters) analyzeData(data.characters, 'char');
        if (data.weapons) analyzeData(data.weapons, 'weap');
        
        document.getElementById('uniqueCharCount').innerText = uniqueChars.size + 1;
        document.getElementById('uniqueWeapCount').innerText = uniqueWeaps.size + 5;
        
        const overviewStats = document.getElementById('overviewStats');
        overviewStats.style.display = 'flex';
        
        if (!hasAnimatedStats) {
            overviewStats.classList.add('initial-animate');
            hasAnimatedStats = true;
            setTimeout(() => {
                overviewStats.classList.remove('initial-animate');
            }, 3000);
        }
        
        renderSummary(); renderOverviews(); renderPatchStats();
        
        isDataLoaded = true;
        
        // Show hidden tabs
        ['char', 'weap', 'stats'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if (btn) btn.style.display = 'flex';
        });

        const uploadBtn = document.getElementById('uploadLabel');
        if (uploadBtn) { uploadBtn.innerHTML = 'DATA LOADED &#10003;'; uploadBtn.classList.add('data-loaded'); }
        document.getElementById('clearDataBtn').style.display = 'block';
        
        switchTab('char');
    }

    let hasAnimatedStats = false;
