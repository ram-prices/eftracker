// ==============================================================================
// PATCH STATS RENDERING
// ==============================================================================
    function renderPatchStats() {
        const kpiContainer = document.getElementById('patchStatsKpiDashboard');
        const distContainer = document.getElementById('patchStatsDistributionCard');
        const cardsContainer = document.getElementById('patchCardsContainer');
        if (!kpiContainer || !distContainer || !cardsContainer) return;

        if (!isDataLoaded || !lastLoadedData) {
            kpiContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 13px; font-style: italic; font-family: monospace;">LOAD DATA TO VIEW UPDATE & PATCH STATISTICS</div>`;
            distContainer.innerHTML = '';
            cardsContainer.innerHTML = '';
            return;
        }

        const statsData = buildPatchStatsData();

        // 1. KPI Overview Cards - Strictly separated into Operator & Arsenal currencies
        let kpiHtml = '';

        if (patchCategoryFilter === 'char') {
            const totalCharCard = createStatCard(
                "OPERATOR PULLS",
                statsData.grandCharTotal,
                `Across ${statsData.activeCharPatchesCount} active updates`,
                null,
                null,
                'var(--accent-orange)'
            );
            const peakCharCard = createStatCard(
                "PEAK OPERATOR INVESTMENT",
                statsData.peakCharPatch ? statsData.peakCharPatch.patchTitle : "N/A",
                statsData.peakCharPatch ? `${statsData.peakCharPatch.charPulls} Operator Pulls` : "0 Pulls",
                null,
                null,
                'var(--color-yellow)'
            );
            const avgCharCard = createStatCard(
                "AVG PER UPDATE",
                statsData.avgCharPulls,
                "Operator pulls per active patch",
                null,
                null,
                'var(--accent-orange)'
            );
            const sixCharCard = createStatCard(
                "6★ OPERATORS WON",
                statsData.char6Stars,
                `Drop Rate: ${statsData.grandCharTotal > 0 ? ((statsData.char6Stars / statsData.grandCharTotal) * 100).toFixed(2) + '%' : '0%'}`,
                null,
                null,
                'var(--color-yellow)'
            );
            kpiHtml = totalCharCard + peakCharCard + avgCharCard + sixCharCard;
        } else if (patchCategoryFilter === 'weap') {
            const totalWeapCard = createStatCard(
                "ARSENAL PULLS",
                statsData.grandWeapTotal,
                `Across ${statsData.activeWeapPatchesCount} active updates`,
                null,
                null,
                'var(--accent-blue)'
            );
            const peakWeapCard = createStatCard(
                "PEAK ARSENAL INVESTMENT",
                statsData.peakWeapPatch ? statsData.peakWeapPatch.patchTitle : "N/A",
                statsData.peakWeapPatch ? `${statsData.peakWeapPatch.weapPulls} Arsenal Pulls` : "0 Pulls",
                null,
                null,
                'var(--accent-blue)'
            );
            const avgWeapCard = createStatCard(
                "AVG PER UPDATE",
                statsData.avgWeapPulls,
                "Arsenal pulls per active patch",
                null,
                null,
                'var(--accent-blue)'
            );
            const sixWeapCard = createStatCard(
                "6★ WEAPONS WON",
                statsData.weap6Stars,
                `Drop Rate: ${statsData.grandWeapTotal > 0 ? ((statsData.weap6Stars / statsData.grandWeapTotal) * 100).toFixed(2) + '%' : '0%'}`,
                null,
                null,
                'var(--color-yellow)'
            );
            kpiHtml = totalWeapCard + peakWeapCard + avgWeapCard + sixWeapCard;
        } else {
            // Side-by-side mode: Independent cards for each currency
            const charCard = createStatCard(
                "OPERATOR PULLS",
                statsData.grandCharTotal,
                `Peak: ${statsData.peakCharPatch ? statsData.peakCharPatch.patchTitle + ' (' + statsData.peakCharPatch.charPulls + ')' : 'N/A'}`,
                null,
                null,
                'var(--accent-orange)'
            );
            const weapCard = createStatCard(
                "ARSENAL PULLS",
                statsData.grandWeapTotal,
                `Peak: ${statsData.peakWeapPatch ? statsData.peakWeapPatch.patchTitle + ' (' + statsData.peakWeapPatch.weapPulls + ')' : 'N/A'}`,
                null,
                null,
                'var(--accent-blue)'
            );
            const char6Card = createStatCard(
                "6★ OPERATORS",
                statsData.char6Stars,
                `Rate: ${statsData.grandCharTotal > 0 ? ((statsData.char6Stars / statsData.grandCharTotal) * 100).toFixed(2) + '%' : '0%'} (Avg ${statsData.avgCharPulls}/patch)`,
                null,
                null,
                'var(--accent-orange)'
            );
            const weap6Card = createStatCard(
                "6★ ARSENALS",
                statsData.weap6Stars,
                `Rate: ${statsData.grandWeapTotal > 0 ? ((statsData.weap6Stars / statsData.grandWeapTotal) * 100).toFixed(2) + '%' : '0%'} (Avg ${statsData.avgWeapPulls}/patch)`,
                null,
                null,
                'var(--accent-blue)'
            );
            kpiHtml = charCard + weapCard + char6Card + weap6Card;
        }

        kpiContainer.innerHTML = kpiHtml;

        // 2. Distribution Graph - Separate independent progress bars per currency
        let distPatches = sortPatches(statsData.patches, 'chrono');
        let maxCharInAny = Math.max(1, ...distPatches.map(p => p.charPulls));
        let maxWeapInAny = Math.max(1, ...distPatches.map(p => p.weapPulls));

        let distHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div style="font-size: 13px; color: #ffffff; font-family: monospace; font-weight: bold; letter-spacing: 0.05em;">INVESTMENT BY UPDATE / PATCH</div>
                <div style="display: flex; gap: 15px; font-size: 11px; font-family: monospace; color: var(--text-dim);">
                    ${patchCategoryFilter !== 'weap' ? '<span><span style="display:inline-block;width:10px;height:10px;background:var(--accent-orange);margin-right:5px;vertical-align:middle;border-radius:1px;"></span>Operators</span>' : ''}
                    ${patchCategoryFilter !== 'char' ? '<span><span style="display:inline-block;width:10px;height:10px;background:var(--accent-blue);margin-right:5px;vertical-align:middle;border-radius:1px;"></span>Arsenals</span>' : ''}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">`;

        distPatches.forEach(p => {
            let charWidth = maxCharInAny > 0 ? (p.charPulls / maxCharInAny) * 100 : 0;
            let weapWidth = maxWeapInAny > 0 ? (p.weapPulls / maxWeapInAny) * 100 : 0;

            let barsHtml = '';
            let statsText = '';

            if (patchCategoryFilter === 'char') {
                let shareChar = statsData.grandCharTotal > 0 ? ((p.charPulls / statsData.grandCharTotal) * 100).toFixed(1) : "0.0";
                barsHtml = `
                    <div class="dist-bar-single">
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill-char" style="width: ${charWidth}%;"></div>
                        </div>
                    </div>`;
                statsText = `<strong style="color: var(--accent-orange);">${p.charPulls}</strong> <span style="color: var(--text-dim); font-size: 11px;">Pulls (${shareChar}%)</span>`;
            } else if (patchCategoryFilter === 'weap') {
                let shareWeap = statsData.grandWeapTotal > 0 ? ((p.weapPulls / statsData.grandWeapTotal) * 100).toFixed(1) : "0.0";
                barsHtml = `
                    <div class="dist-bar-single">
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill-weap" style="width: ${weapWidth}%;"></div>
                        </div>
                    </div>`;
                statsText = `<strong style="color: var(--accent-blue);">${p.weapPulls}</strong> <span style="color: var(--text-dim); font-size: 11px;">Pulls (${shareWeap}%)</span>`;
            } else {
                // Side-by-side view with distinct individual tracks
                let shareChar = statsData.grandCharTotal > 0 ? ((p.charPulls / statsData.grandCharTotal) * 100).toFixed(1) : "0.0";
                let shareWeap = statsData.grandWeapTotal > 0 ? ((p.weapPulls / statsData.grandWeapTotal) * 100).toFixed(1) : "0.0";
                barsHtml = `
                    <div class="dist-bar-single">
                        <span class="dist-bar-type-tag" style="color: var(--accent-orange);">OPER</span>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill-char" style="width: ${charWidth}%;"></div>
                        </div>
                        <span class="dist-bar-count-inline" style="color: var(--accent-orange);">${p.charPulls}</span>
                    </div>
                    <div class="dist-bar-single">
                        <span class="dist-bar-type-tag" style="color: var(--accent-blue);">ARSEN</span>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill-weap" style="width: ${weapWidth}%;"></div>
                        </div>
                        <span class="dist-bar-count-inline" style="color: var(--accent-blue);">${p.weapPulls}</span>
                    </div>`;
                statsText = `
                    <div style="line-height: 1.4;">
                        <div><strong style="color: var(--accent-orange);">${p.charPulls}</strong> <span style="color: var(--text-dim); font-size: 10px;">Op (${shareChar}%)</span></div>
                        <div><strong style="color: var(--accent-blue);">${p.weapPulls}</strong> <span style="color: var(--text-dim); font-size: 10px;">Ars (${shareWeap}%)</span></div>
                    </div>`;
            }

            distHtml += `
                <div class="dist-patch-row" onclick="scrollToPatchCard('${p.patchKey}')" title="Jump to ${p.patchTitle}">
                    <div class="dist-patch-label">${p.patchTitle}</div>
                    <div class="dist-bars-container">
                        ${barsHtml}
                    </div>
                    <div class="dist-patch-stats">
                        ${statsText}
                    </div>
                </div>`;
        });
        distHtml += `</div>`;
        distContainer.innerHTML = distHtml;

        // 3. Patch Breakdown Cards
        let sortedPatches = sortPatches(statsData.patches, patchSortMode);
        let cardsHtml = '';

        sortedPatches.forEach(p => {
            let charShare = statsData.grandCharTotal > 0 ? ((p.charPulls / statsData.grandCharTotal) * 100).toFixed(1) : "0.0";
            let weapShare = statsData.grandWeapTotal > 0 ? ((p.weapPulls / statsData.grandWeapTotal) * 100).toFixed(1) : "0.0";

            let char6s = p.sixStars.filter(s => s.prefix === 'char');
            let weap6s = p.sixStars.filter(s => s.prefix === 'weap');

            let avgCharPity = char6s.length > 0
                ? (char6s.reduce((a, b) => a + (b.pity || 0), 0) / char6s.length).toFixed(1)
                : '-';
            let avgWeapPity = weap6s.length > 0
                ? (weap6s.reduce((a, b) => a + (b.pity || 0), 0) / weap6s.length).toFixed(1)
                : '-';

            // Filter banners by active category
            let bannerList = Array.from(p.banners.values()).filter(b => {
                if (patchCategoryFilter === 'char' && b.prefix !== 'char') return false;
                if (patchCategoryFilter === 'weap' && b.prefix !== 'weap') return false;
                return true;
            });

            // Sort: banners with pulls first, then by poolId
            bannerList.sort((a, b) => {
                if (b.totalPulls !== a.totalPulls) return b.totalPulls - a.totalPulls;
                return (a.poolId || '').localeCompare(b.poolId || '');
            });

            let bannersHtml = '';
            bannerList.forEach(b => {
                let bannerImgUrl = getBannerImageUrl(b.poolId, b.bannerName, b.prefix);
                let thumbHtml = '';
                if (bannerImgUrl) {
                    thumbHtml = `<img src="${bannerImgUrl}" class="patch-banner-thumb" alt="${b.bannerName}" onerror="this.style.display='none';">`;
                }

                let pillClass = b.prefix === 'char' ? 'patch-pill-char' : 'patch-pill-weap';
                let pillLabel = b.prefix === 'char' ? 'OPERATOR' : 'ARSENAL';
                let poolTotalInPatch = b.prefix === 'char' ? p.charPulls : p.weapPulls;
                let bShare = poolTotalInPatch > 0 ? ((b.totalPulls / poolTotalInPatch) * 100).toFixed(0) + `% of patch ${b.prefix === 'char' ? 'operators' : 'arsenals'}` : '';

                let dropsHtml = '';
                if (b.sixStars.length > 0) {
                    dropsHtml = `<div class="patch-banner-drops">`;
                    b.sixStars.forEach(s => {
                        let iconUrl = getItemIconUrl(s.prefix, s.id, s.enName || s.name);
                        let luckClass = s.pity <= 40 ? 'luck-good' : (s.pity <= 65 ? 'luck-avg' : 'luck-bad');
                        dropsHtml += `
                            <div class="patch-drop-item" title="${s.name} (Pity: ${s.pity})">
                                <img src="${iconUrl}" class="patch-drop-icon" alt="${s.name}" onerror="handleIconError(this, '${s.prefix}', '${s.id}', '${(s.enName || s.name || '').replace(/'/g, "\\'")}')">
                                <span class="patch-drop-name">${s.name}</span>
                                <span class="patch-drop-pity ${luckClass}">${s.pity}</span>
                                ${s.isRateUpItem ? '<span style="color: var(--color-green); font-size: 10px;" title="Rate-Up Won">&#10004;</span>' : '<span style="color: var(--color-red); font-size: 10px;" title="Off-Banner">&#10006;</span>'}
                            </div>`;
                    });
                    dropsHtml += `</div>`;
                }

                bannersHtml += `
                    <div class="patch-banner-item ${b.totalPulls === 0 ? 'skipped' : ''}">
                        <div class="patch-banner-item-header">
                            ${thumbHtml}
                            <div class="patch-banner-info">
                                <div class="patch-banner-name" title="${b.bannerName}">${b.bannerName}</div>
                                <div class="patch-banner-meta">
                                    <span class="${pillClass}">${pillLabel}</span>
                                    <span>${b.poolId || ''}</span>
                                </div>
                            </div>
                            <div class="patch-banner-pulls">
                                <div class="patch-banner-pulls-val" style="color: ${b.totalPulls > 0 ? '#ffffff' : 'var(--text-dim)'};">
                                    ${b.totalPulls} <span style="font-size: 11px; font-weight: normal; color: var(--text-dim);">PULLS</span>
                                </div>
                                ${b.totalPulls > 0 ? `<div class="patch-banner-pulls-share">${bShare}</div>` : `<div class="patch-banner-pulls-share" style="color: #666;">SKIPPED</div>`}
                            </div>
                        </div>
                        ${dropsHtml}
                    </div>`;
            });

            // Header pull badges: separated by currency
            let pullsBadgeHtml = '';
            if (patchCategoryFilter === 'char') {
                pullsBadgeHtml = `
                    <div class="patch-pull-badge char">
                        <div class="patch-pull-badge-num">${p.charPulls}</div>
                        <div class="patch-pull-badge-label">OPERATOR PULLS</div>
                    </div>`;
            } else if (patchCategoryFilter === 'weap') {
                pullsBadgeHtml = `
                    <div class="patch-pull-badge weap">
                        <div class="patch-pull-badge-num">${p.weapPulls}</div>
                        <div class="patch-pull-badge-label">ARSENAL PULLS</div>
                    </div>`;
            } else {
                pullsBadgeHtml = `
                    <div class="patch-pulls-dual-box">
                        <div class="patch-pull-badge char">
                            <div class="patch-pull-badge-num">${p.charPulls}</div>
                            <div class="patch-pull-badge-label">OPERATOR PULLS</div>
                        </div>
                        <div class="patch-pull-badge weap">
                            <div class="patch-pull-badge-num">${p.weapPulls}</div>
                            <div class="patch-pull-badge-label">ARSENAL PULLS</div>
                        </div>
                    </div>`;
            }

            // Subline: separate shares without blending totals
            let sublineHtml = '';
            if (patchCategoryFilter === 'char') {
                sublineHtml = `
                    <span>Operator Pulls Share: <strong style="color: var(--accent-orange);">${charShare}%</strong> of all operator pulls</span>
                    <span>${char6s.length} 6★ Operators &middot; Avg Pity: ${avgCharPity}</span>`;
            } else if (patchCategoryFilter === 'weap') {
                sublineHtml = `
                    <span>Arsenal Pulls Share: <strong style="color: var(--accent-blue);">${weapShare}%</strong> of all arsenal pulls</span>
                    <span>${weap6s.length} 6★ Weapons &middot; Avg Pity: ${avgWeapPity}</span>`;
            } else {
                sublineHtml = `
                    <span>Operator Share: <strong style="color: var(--accent-orange);">${charShare}%</strong> &nbsp;|&nbsp; Arsenal Share: <strong style="color: var(--accent-blue);">${weapShare}%</strong></span>
                    <span>Active Banners: <strong>${bannerList.length}</strong></span>`;
            }

            // Metrics grid: clean independent metrics
            let metricsGridHtml = '';
            if (patchCategoryFilter === 'char') {
                metricsGridHtml = `
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">6★ OPERATORS</div>
                        <div class="patch-metric-val" style="color: var(--color-yellow);">${char6s.length}</div>
                        <div class="patch-metric-sub">Avg Pity: ${avgCharPity}</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">OPERATOR PULLS</div>
                        <div class="patch-metric-val" style="color: var(--accent-orange);">${p.charPulls}</div>
                        <div class="patch-metric-sub">${charShare}% of all Op pulls</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">BANNERS ACTIVE</div>
                        <div class="patch-metric-val">${bannerList.length}</div>
                        <div class="patch-metric-sub">${bannerList.filter(b => b.totalPulls > 0).length} Pulled &middot; ${bannerList.filter(b => b.totalPulls === 0).length} Skipped</div>
                    </div>`;
            } else if (patchCategoryFilter === 'weap') {
                metricsGridHtml = `
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">6★ WEAPONS</div>
                        <div class="patch-metric-val" style="color: var(--color-yellow);">${weap6s.length}</div>
                        <div class="patch-metric-sub">Avg Pity: ${avgWeapPity}</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">ARSENAL PULLS</div>
                        <div class="patch-metric-val" style="color: var(--accent-blue);">${p.weapPulls}</div>
                        <div class="patch-metric-sub">${weapShare}% of all Ars pulls</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">BANNERS ACTIVE</div>
                        <div class="patch-metric-val">${bannerList.length}</div>
                        <div class="patch-metric-sub">${bannerList.filter(b => b.totalPulls > 0).length} Pulled &middot; ${bannerList.filter(b => b.totalPulls === 0).length} Skipped</div>
                    </div>`;
            } else {
                metricsGridHtml = `
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">6★ OPERATORS</div>
                        <div class="patch-metric-val" style="color: var(--accent-orange);">${char6s.length}</div>
                        <div class="patch-metric-sub">Avg Pity: ${avgCharPity}</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">6★ WEAPONS</div>
                        <div class="patch-metric-val" style="color: var(--accent-blue);">${weap6s.length}</div>
                        <div class="patch-metric-sub">Avg Pity: ${avgWeapPity}</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">OPERATOR PULLS</div>
                        <div class="patch-metric-val" style="color: var(--accent-orange);">${p.charPulls}</div>
                        <div class="patch-metric-sub">${charShare}% of Op pulls</div>
                    </div>
                    <div class="patch-metric-cell">
                        <div class="patch-metric-title">ARSENAL PULLS</div>
                        <div class="patch-metric-val" style="color: var(--accent-blue);">${p.weapPulls}</div>
                        <div class="patch-metric-sub">${weapShare}% of Ars pulls</div>
                    </div>`;
            }

            cardsHtml += `
                <div class="patch-card reveal-on-scroll" id="patch-card-${p.patchKey.replace(/\./g, '_')}">
                    <div class="patch-card-header">
                        <div class="patch-tag-box">
                            <h3 class="patch-title-text">${p.patchTitle}</h3>
                            <span class="patch-status-badge">${p.isPermanent ? 'PERMANENT' : 'UPDATE'}</span>
                        </div>
                        ${pullsBadgeHtml}
                    </div>

                    <div class="patch-subline">
                        ${sublineHtml}
                    </div>

                    <div class="patch-metrics-grid">
                        ${metricsGridHtml}
                    </div>

                    <div class="patch-banners-subhead">
                        <span>Banners in ${p.patchTitle}</span>
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: none;">${bannerList.length} banners recorded</span>
                    </div>

                    <div class="patch-banners-grid">
                        ${bannersHtml || '<div style="color: var(--text-dim); font-size: 12px; font-style: italic;">No banners recorded for this category.</div>'}
                    </div>
                </div>`;
        });

        cardsContainer.innerHTML = cardsHtml;
        initScrollReveal();
    }
