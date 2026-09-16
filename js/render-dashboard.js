    // ==============================================================================
    // STRING & HTML GENERATION UTILS
    // ==============================================================================


    function getItemIconUrl(prefix, itemId, fallbackEnName) {
        if (itemId) {
            if (prefix === 'char') {
                let id = itemId;
                if (id === 'chr_0034_typhoeus') id = 'chr_0034_typhoea';
                return `${EF_ASSETS_BASE}/operators/${id}.webp`;
            }
            if (prefix === 'weap') return `${EF_ASSETS_BASE}/arsenals/${itemId}.webp`;
        }
        return '';
    }

    function handleIconError(img, prefix, itemId, fallbackEnName) {
        if (!img) return;
        if (img.src.includes('raw.githubusercontent.com/ram-prices/ef-assets/main/')) {
            img.src = img.src.replace('https://raw.githubusercontent.com/ram-prices/ef-assets/main/', 'https://cdn.jsdelivr.net/gh/ram-prices/ef-assets@main/');
            return;
        }
        img.onerror = null;
        img.style.display = 'none';
    }


    function createFallbackBannerHtml(bannerId, poolId, bannerName, prefix, bInfo, data) {
        let { weaponId, weaponName } = getBannerWeaponInfo(poolId, bannerName, bInfo, data);
        let displayName = weaponName || bannerName || "Arsenal Requisition";
        let weaponImgUrl = weaponId ? getItemIconUrl('weap', weaponId, displayName) : '';
        
        let poolTitle = (bannerName || "Arsenal Requisition").toUpperCase();
        let tag = poolTitle.includes("CONSTANT") ? "CONSTANT ISSUE · ARSENAL" : poolTitle;
        let subText = "6★ ARSENAL";
        
        let imgTag = weaponImgUrl ? `
            <div class="fallback-banner-visual">
                <div class="fallback-banner-glow"></div>
                <img src="${weaponImgUrl}" class="fallback-banner-weapon-img" alt="${(displayName || '').replace(/"/g, '&quot;')}" loading="lazy" crossorigin="anonymous" onload="applyAmbientTint('${bannerId}', this)" onerror="handleIconError(this, 'weap', '${weaponId || ''}', '${(displayName || '').replace(/'/g, "\\'")}')">
            </div>
        ` : `
            <div class="fallback-banner-visual">
                <div class="fallback-banner-glow"></div>
                <div style="font-family: monospace; font-size: 24px; color: var(--accent-orange); opacity: 0.6;">✦</div>
            </div>
        `;

        // Apply a warm ambient backlight right away if needed
        setTimeout(() => {
            let bEl = document.getElementById(bannerId);
            if (bEl && !bEl.classList.contains('has-tint')) {
                bEl.style.setProperty('--banner-ambient', 'rgba(255, 152, 0, 0.16)');
                bEl.classList.add('has-tint');
            }
        }, 50);

        return `
            <div class="fallback-banner" id="fallback-${bannerId}">
                <div class="fallback-banner-decor-corner"></div>
                <div class="fallback-banner-content">
                    <div class="fallback-banner-tag"><span class="fallback-banner-tag-dot"></span>${tag}</div>
                    <div class="fallback-banner-name" title="${(displayName || '').replace(/"/g, '&quot;')}">${displayName}</div>
                    <div class="fallback-banner-sub"><span class="fallback-banner-stars">★★★★★★</span> ${subText}</div>
                </div>
                ${imgTag}
            </div>
        `;
    }

    function getBannerImageUrl(poolId, fallbackName, prefix) {
        if (poolId) {
            let cleanId = poolId.toLowerCase().trim();
            // Constant issue banners do not have banner art assets in the repository
            if (cleanId.includes('constant_')) {
                return null;
            }
            let filename = cleanId.replace(/^weaponbox_/, 'weponbox_');
            if (filename === 'joint_1_0_1' || (filename.startsWith('joint_') && filename !== 'joint_1_2_2')) {
                filename = 'joint_1_2_2';
            }
            return `${EF_ASSETS_BASE}/banners/${filename}.webp`;
        }
        return null;
    }

    function handleBannerImgError(img, poolId, bName, prefix, bannerId) {
        if (!img) return;
        if (img.src.includes('raw.githubusercontent.com/ram-prices/ef-assets/main/banners/')) {
            img.src = img.src.replace('https://raw.githubusercontent.com/ram-prices/ef-assets/main/banners/', 'https://cdn.jsdelivr.net/gh/ram-prices/ef-assets@main/banners/');
            return;
        }

        // Determine if this banner should display a fallback banner with weapon image
        let bInfo = getBannerInfo(poolId, bName);
        let isWeaponBanner = prefix === 'weap' || (bInfo && bInfo.type === 'Weapon') || (poolId && (poolId.startsWith('weponbox_') || poolId.startsWith('weaponbox_')));
        
        let targetBannerId = bannerId || img.closest('.banner-box')?.id || '';

        if (isWeaponBanner && targetBannerId) {
            let fallbackHtml = createFallbackBannerHtml(targetBannerId, poolId, bName, prefix, bInfo);

            // If the image is inside the hero layout (real-art banners), the
            // title/rate-up badge live overlaid inside .banner-hero-content --
            // pull them back out as plain siblings above the fallback banner
            // (its own layout, no vignette/overlay) instead of leaving the
            // vignette and absolute positioning wrapped around a fallback node.
            let heroEl = img.closest('.banner-hero');
            if (heroEl && heroEl.parentNode) {
                let contentEl = heroEl.querySelector('.banner-hero-content');
                let wrapper = document.createElement('div');
                wrapper.innerHTML = (contentEl ? contentEl.innerHTML : '') + fallbackHtml;
                while (wrapper.firstChild) heroEl.parentNode.insertBefore(wrapper.firstChild, heroEl);
                heroEl.parentNode.removeChild(heroEl);
                return;
            }

            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = fallbackHtml.trim();
            let fallbackNode = tempDiv.firstElementChild;
            if (fallbackNode && img.parentNode) {
                img.parentNode.replaceChild(fallbackNode, img);
                return;
            }
        }

        if (img.hasAttribute('crossorigin')) {
            img.removeAttribute('crossorigin');
            img.src = img.src;
            return;
        }

        // Final fallback: try converting to fallback banner if applicable
        if (targetBannerId) {
            let fallbackHtml = createFallbackBannerHtml(targetBannerId, poolId, bName, prefix, bInfo);

            let heroEl = img.closest('.banner-hero');
            if (heroEl && heroEl.parentNode) {
                let contentEl = heroEl.querySelector('.banner-hero-content');
                let wrapper = document.createElement('div');
                wrapper.innerHTML = (contentEl ? contentEl.innerHTML : '') + fallbackHtml;
                while (wrapper.firstChild) heroEl.parentNode.insertBefore(wrapper.firstChild, heroEl);
                heroEl.parentNode.removeChild(heroEl);
                return;
            }

            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = fallbackHtml.trim();
            let fallbackNode = tempDiv.firstElementChild;
            if (fallbackNode && img.parentNode) {
                img.parentNode.replaceChild(fallbackNode, img);
                return;
            }
        }
        img.style.display = 'none';
    }

    function formatTimestamp(tsRaw) {
        if (!tsRaw) return "";
        let d = new Date((tsRaw.toString().includes('-') || tsRaw.toString().includes('T')) ? tsRaw : (tsRaw.toString().length === 10 ? parseInt(tsRaw) * 1000 : parseInt(tsRaw)));
        if (isNaN(d.getTime())) return "";
        let [yr, mo, da] = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
        return `${yr}-${mo}-${da} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`; 
    }

    const scrollRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                scrollRevealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    function initScrollReveal() {
        document.querySelectorAll('.reveal-on-scroll:not(.visible)').forEach(el => {
            scrollRevealObserver.observe(el);
        });
    }

    function createPityCol(val, max, label, valColor, labelColor, extraHtml = '') {
        const numVal = Number(val), numMax = Number(max);
        const pct = (numMax > 0 && !isNaN(numVal)) ? Math.max(0, Math.min(100, (numVal / numMax) * 100)) : 0;
        return `
            <div class="pity-col">
                <div class="pity-val" style="color: ${valColor};">${val}<span class="pity-max" style="color: ${labelColor};">/${max}</span></div>
                <div class="pity-label" style="color: ${labelColor}; line-height: 1.2;"><span class="pity-dot" style="background: ${valColor};"></span>${label} ${extraHtml}</div>
                <div class="pity-fill-track"><div class="pity-fill-bar" style="width: ${pct}%; background: ${valColor};"></div></div>
            </div>`;
    }

    function createPityBox(cols) {
        return `<div class="pity-box banner-pity-box">${cols.join('')}</div>`;
    }

    function createStatCard(title, val, sub, badgeText, badgeCss, titleColor, valColorCss) {
        return `
            <div class="stat-card reveal-on-scroll">
                ${badgeText ? `<div class="stat-card-badge ${badgeCss}">${badgeText}</div>` : ''}
                <div class="stat-card-title">${title}</div>
                <div class="stat-card-value ${valColorCss || ''}">${val}</div>
                <div class="stat-card-sub">${sub}</div>
            </div>`;
    }


    function renderDashboard(categoryStats, bannerBoxes, bannerTimeline, prefix) {
        let htmlBuilder = '', sortedTimeline = [];
        if (prefix === 'char') sortedTimeline = [...bannerTimeline.filter(n => bannerBoxes[n].category === "Basic Headhunting"), ...bannerTimeline.filter(n => bannerBoxes[n].category !== "Basic Headhunting").reverse()];
        else sortedTimeline = [...bannerTimeline.filter(n => !bannerBoxes[n].isConstant).reverse(), ...bannerTimeline.filter(n => bannerBoxes[n].isConstant).reverse()];

        let lastBannerByCategory = bannerTimeline.reduce((acc, name) => ({ ...acc, [bannerBoxes[name].category]: name }), {});

        sortedTimeline.forEach((name, index) => {
            const data = bannerBoxes[name], cStats = categoryStats[data.category]; 
            let isActive = (lastBannerByCategory[data.category] === name), pityHTML = '';

            if (prefix === 'weap' || (prefix === 'char' && data.category === "Chartered Headhunting") || isActive) {
                if (prefix === 'char' && data.category === "Chartered Headhunting") {
                    let color = data.endPity >= 64 ? "var(--color-red)" : (data.endPity >= 40 ? "var(--accent-orange)" : "var(--color-green)");
                    let clampedRateUp = Math.min(120, data.endRateUpPity || 0);
                    let ruColor = clampedRateUp >= 100 ? "var(--color-red)" : (clampedRateUp >= 70 ? "var(--accent-orange)" : "var(--color-green)");
                    pityHTML = createPityBox([
                        createPityCol(data.endPity || 0, 80, isActive ? "PITY" : "PITY (FINAL)", isActive ? color : "#888888", isActive ? "var(--text-dim)" : "#888888"),
                        createPityCol(clampedRateUp, 120, "GUARANTEE", data.endHasPulledRateUp ? "#666666" : (isActive ? ruColor : "#888888"), data.endHasPulledRateUp ? "#666666" : (isActive ? "var(--text-dim)" : "#888888")),
                        createPityCol((data.endTokenPulls || 0) % 240, 240, "TOKEN", isActive ? "var(--accent-blue)" : "#888888", isActive ? "var(--text-dim)" : "#888888", `<span style="color: ${isActive ? 'var(--accent-blue)' : '#888888'}; font-weight: bold;">${Math.floor((data.endTokenPulls || 0) / 240)}</span>`)
                    ]);
                } else if (prefix === 'weap') {
                    let tB = Math.ceil(data.totalPulls / 10), gVal = data.hasPulledRateUp ? data.rateUpBlock : (tB % 8 === 0 && tB > 0 ? 8 : tB % 8) || 0;
                    let pVal = tB >= 10 ? ((tB - 10) % 8 || (tB > 10 ? 8 : 0)) : tB, earn = tB >= 10 ? 1 + Math.floor((tB - 10) / 8) : 0;
                    let p4V = data.hasPulledSixStar ? data.firstSixStarBlock : tB;

                    pityHTML = createPityBox([
                        createPityCol(p4V, 4, "PITY", data.hasPulledSixStar ? "#666666" : (p4V >= 3 ? "var(--color-red)" : (p4V >= 2 ? "var(--accent-orange)" : "var(--color-green)")), data.hasPulledSixStar ? "#666666" : "var(--text-dim)"),
                        createPityCol(gVal, 8, "GUARANTEE", data.hasPulledRateUp ? "#666666" : (gVal >= 6 ? "var(--color-red)" : (gVal >= 4 ? "var(--accent-orange)" : "var(--color-green)")), data.hasPulledRateUp ? "#666666" : "var(--text-dim)"),
                        createPityCol(pVal, tB >= 10 ? 8 : 10, `SEL <span style="color: var(--accent-blue); font-weight: bold;">${Math.ceil(earn / 2)}</span> R-UP <span style="color: var(--accent-orange); font-weight: bold;">${Math.floor(earn / 2)}</span>`, (tB < 10 || earn % 2 === 0) ? "var(--accent-blue)" : "var(--accent-orange)", "var(--text-dim)")
                    ]);
                } else {
                    let limit = data.category === "New Horizons" ? 40 : 80;
                    let val = data.category === "New Horizons" ? (cStats.firstSixStarPity !== null ? cStats.firstSixStarPity : data.totalPulls) : cStats.currentPity;
                    let color = (data.category === "New Horizons" && (cStats.firstSixStarPity !== null || data.totalPulls >= 40)) ? "#666666" : (val >= limit * 0.8 ? "var(--color-red)" : (val >= limit * 0.5 ? "var(--accent-orange)" : "var(--color-green)"));
                    
                    let label = "PITY";
                    if (data.category !== "Basic Headhunting" && data.category !== "New Horizons") {
                        label = data.category.startsWith("Joint Headhunting") ? "PITY (JOINT)" : `PITY (${data.category})`;
                    }
                    
                    let columns = [createPityCol(val, limit, label, isActive ? color : "#888888", isActive ? "var(--text-dim)" : "#888888")];
                    if (data.category.startsWith("Joint Headhunting")) {
                        columns.push(createPityCol((data.endTokenPulls || 0) % 120, 120, "TOKEN", isActive ? "var(--accent-blue)" : "#888888", isActive ? "var(--text-dim)" : "#888888", `<span style="color: ${isActive ? 'var(--accent-blue)' : '#888888'}; font-weight: bold;">${Math.floor((data.endTokenPulls || 0) / 120)}</span>`));
                    }
                    pityHTML = createPityBox(columns);
                }
            }

            let lastBlock = -1;
            let pullsHTML = data.allPulls.slice().reverse().map(pull => {
                let timeStr = formatTimestamp(pull.timestamp), rateUpTag = "", newTag = pull.isNew ? `<span class="pity-count pity-green" style="font-size: 9px; padding: 1px 4px; background: rgba(76, 175, 80, 0.1); border: none; border-radius: 2px;">NEW</span>` : "";
                let luckHTML = "", blockHeader = "", badgeHTML = "", clickAction = "";

                if (pull.rarity === "6" && pull.isRateUpItem) {
                    rateUpTag = `<span class="pity-count pity-yellow" style="font-size: 9px; padding: 1px 4px; background: rgba(255, 152, 0, 0.1); border: none; border-radius: 2px;">RATE-UP</span>`;
                    if (pull.pullProb !== undefined) {
                        let msg = prefix === 'weap' ? `chance to pull ${pull.rateUpCopyNum > 1 ? pull.rateUpCopyNum + ' copies' : '1 copy'} of the Rate-Up within ${Math.ceil(pull.pullNum / 10)} blocks.` : `chance to pull ${pull.rateUpCopyNum > 1 ? pull.rateUpCopyNum + ' copies' : '1 copy'} of the Rate-Up within ${pull.pullNum} pulls.<br><span style="font-size: 9px; color: #666;">${data.startingPityForMath > 0 ? `(Started with ${data.startingPityForMath} pity)` : ''}</span>`;
                        luckHTML = `<div class="luck-content"><div class="luck-text">You had a <span style="color: #fff; font-weight: bold;">${pull.pullProb.toFixed(2)}%</span> ${msg}</div>${pull.graphHTML || ''}</div>`;
                        clickAction = `onclick="toggleLuckDrawer(this)"`;
                    }
                }

                if (pull.pityAtPull !== null) {
                    let bClass = "pity-count " + (pull.pityAtPull === "FREE" ? "pity-green" : (pull.rarity === "6" ? (pull.pityAtPull < (prefix === 'weap' ? 4 : 40) ? "pity-green" : (pull.pityAtPull <= (prefix === 'weap' ? 6 : 64) ? "pity-yellow" : "pity-red")) : ""));
                    if (prefix === 'weap' && pull.pityAtPull !== "FREE") {
                        if (pull.pityAtPull !== lastBlock) { blockHeader = `<li class="pull-block-header">BLOCK_${pull.pityAtPull}</li>`; lastBlock = pull.pityAtPull; }
                    } else badgeHTML = `<span class="${bClass}" style="line-height: 1;">${pull.pityAtPull === "FREE" ? "FREE" : `${pull.pityAtPull} / ${prefix === 'weap' ? 8 : 80}`}</span>`;
                }

                return `${blockHeader}<li class="pull-item rarity-${pull.rarity}-item ${pull.isRateUpItem ? 'is-rate-up-item' : ''}" ${clickAction}><div class="pull-item-top" style="gap: 12px;"><span class="pull-name"><img src="${getItemIconUrl(prefix, pull.itemId, pull.enName)}" class="char-icon" loading="lazy" onerror="handleIconError(this, '${prefix}', '${pull.itemId || ''}', '${(pull.enName || '').replace(/'/g, "\\'")}')"><div style="display: flex; align-items: center; flex: 1; min-width: 0;"><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pull.name}</span><span class="banner-pull-num">#${pull.pullNum}</span>${rateUpTag || newTag ? `<div style="display: flex; gap: 6px; margin-left: 8px; flex-shrink: 0;">${rateUpTag}${newTag}</div>` : ''}</div></span>${badgeHTML}</div><div class="extra-drawer">${timeStr ? `<div class="timestamp-content">${timeStr}</div>` : ''}${luckHTML}</div></li>`;
            }).join('');

            let bInfo = getBannerInfo(data.poolId, name);
            let bName = bInfo?.displayEn || bInfo?.name || name;
            let bUrl = getBannerImageUrl(data.poolId, bName, prefix);
            let bannerId = `banner-${prefix}-${index}`, ruHTML = '', ruBtn = '';

            let hasRateUp = (bInfo?.rateUpIds && bInfo.rateUpIds.length > 0) || (bInfo?.rateUpName && bInfo.rateUpName.length > 0) || (bInfo?.rateupName && bInfo.rateupName.length > 0);
            if (hasRateUp) {
                let isJointCat = data.category.startsWith("Joint Headhunting");
                let ruText = "";
                if (isJointCat && bInfo.rateUpIds && bInfo.rateUpIds.length > 1) {
                    ruText = bInfo.rateUpIds.length + " RATE-UPS";
                } else {
                    let ruNames = bInfo.rateUpName || bInfo.rateupName || [];
                    let ruNameFromDb = Array.isArray(ruNames) ? (ruNames.length > 1 ? ruNames.join(', ') : ruNames[0]) : ruNames;
                    let ruId = bInfo.rateUpIds?.[0], fallback = parseIdToName(ruId);
                    ruText = ruNameFromDb || (prefix === 'char' ? uniqueChars : uniqueWeaps).get(ruId) || fallback || "Unknown Item";
                }

                ruHTML = `<div class="banner-rate-up ${data.hasPulledRateUp ? 'won' : 'lost'}">RATE-UP: <span>${ruText}${data.hasPulledRateUp ? ' <span style="color: var(--color-green); margin-left: 4px;">&#10004;</span>' : ''}</span></div>`;
                ruBtn = `<button class="filter-btn" data-filter="RU" onclick="toggleFilter('${bannerId}', 'RU')">RATE-UP</button>`;
            }

            let headerHTML;
            if (bUrl) {
                headerHTML = `<div class="banner-hero"><img src="${bUrl}" class="banner-img" loading="lazy" crossorigin="anonymous" onload="applyAmbientTint('${bannerId}', this)" onerror="handleBannerImgError(this, '${data.poolId || ''}', '${(bName || '').replace(/'/g, "\\'")}', '${prefix}', '${bannerId}')"><div class="banner-hero-vignette"></div><div class="banner-hero-content"><h3>${name}</h3>${ruHTML}</div></div>`;
            } else {
                headerHTML = `<h3>${name}</h3>${ruHTML}${createFallbackBannerHtml(bannerId, data.poolId, bName, prefix, bInfo, data)}`;
            }

            htmlBuilder += `<div class="banner-box reveal-on-scroll" id="${bannerId}"><div class="banner-header-top-box">${headerHTML}${pityHTML}<div class="banner-stats-row"><div class="banner-stats">TOTAL_PULLS: ${data.totalPulls}</div><div class="banner-filters" id="filters-${bannerId}">${ruBtn}<button class="filter-btn active" data-filter="6" onclick="toggleFilter('${bannerId}', '6')">6★</button><button class="filter-btn" data-filter="5" onclick="toggleFilter('${bannerId}', '5')">5★</button><button class="filter-btn" data-filter="4" onclick="toggleFilter('${bannerId}', '4')">4★</button></div></div></div><div class="pull-list-container" id="list-${bannerId}"><ul class="pull-list">${pullsHTML}</ul><div class="empty-filter-msg" style="display: none; text-align: center; color: var(--text-dim); font-family: monospace; margin-top: 30px; font-size: 12px; font-style: italic;">NO PULLS TO DISPLAY</div></div><button class="banner-expand-area" onclick="toggleExpand('${bannerId}', this)">▼ EXPAND ▼</button></div>`;
        });

        document.getElementById(`${prefix}BannerGrid`).innerHTML = htmlBuilder;
        sortedTimeline.forEach((_, i) => { let l = document.getElementById(`list-banner-${prefix}-${i}`); if (l) updateBlockHeaders(l); });
        initScrollReveal();
    }

    function renderOverviews() {
        let getLuck = (act, ev) => act >= ev * 1.25 ? { t: "VERY LUCKY", c: "luck-very-good" } : act > ev * 1.05 ? { t: "LUCKY", c: "luck-good" } : act >= ev * 0.9 ? { t: "AVERAGE", c: "luck-avg" } : act >= ev * 0.7 ? { t: "UNLUCKY", c: "luck-bad" } : { t: "VERY UNLUCKY", c: "luck-very-bad" };
        
        ['char', 'weap'].forEach(type => {
            let s = advStats[type], evProb = type === 'char' ? (1/54.3)*100 : 4.97, html = `<div style="color: var(--text-dim); font-size: 12px; font-style: italic;">NO DATA AVAILABLE</div>`;
            if (s.pulls > 0) {
                let actProb = s.s6 > 0 ? (s.s6 / s.pulls) * 100 : 0, luck = getLuck(actProb, evProb), titleColor = type === 'char' ? 'var(--accent-orange)' : 'var(--accent-blue)', name = type === 'char' ? 'OPERATOR' : 'ARSENAL';
                html = createStatCard(`TOTAL ${name} PULLS`, s.pulls, `Total 6★ Acquired: ${s.s6}`, null, null, 'var(--text-main)') + createStatCard(`${name} 6★ DROP RATE`, `${actProb.toFixed(2)}%`, `Actual: 1 in ${(s.s6 > 0 ? s.pulls / s.s6 : s.pulls).toFixed(1)} pulls | Expected: ${evProb.toFixed(2)}%`, luck.t, luck.c, titleColor, luck.c);
                if ((s.rateUpWins + s.rateUpLosses) > 0) {
                    let wr = (s.rateUpWins / (s.rateUpWins + s.rateUpLosses)) * 100, wLuck = getLuck(wr, type === 'char' ? 50 : 25);
                    html += createStatCard(`${name} ${type === 'char' ? '50/50' : '25/75'} WINS`, `${wr.toFixed(0)}%`, `Won ${s.rateUpWins} out of ${s.rateUpWins + s.rateUpLosses} ${type === 'char' ? '50/50s' : '25/75s'} | Expected: ${type === 'char' ? '50%' : '25%'}`, wLuck.t, wLuck.c, titleColor, wLuck.c);
                }
            }
            document.getElementById(`${type}OverviewDashboard`).innerHTML = html;
        });
        initScrollReveal();
    }
