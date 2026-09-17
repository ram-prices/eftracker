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
                <div class="pity-label" style="color: ${labelColor}; line-height: 1.2;"><span class="pity-dot" style="background: ${valColor};"></span>${label} ${extraHtml}</div>
                <div class="pity-val" style="color: ${valColor};">${val}<span class="pity-max" style="color: ${labelColor};">/${max}</span></div>
                <div class="pity-fill-track"><div class="pity-fill-bar" style="width: ${pct}%; background: ${valColor};"></div></div>
            </div>`;
    }

    function createPityBox(cols) {
        return `<div class="pity-box banner-pity-box">${cols.join('')}</div>`;
    }

    const PITY_RULER_ICONS = {
        star: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 6.9L12 17l-6.3 3.8 1.7-6.9L2 9.2l7.1-.6z"/></svg>',
        badge: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 8 1.3 8 4v2H4v-2c0-2.7 5.3-4 8-4zm0-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
        ticket: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 1 0 4v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 1 0-4z"/></svg>'
    };

    // How far the triangle tip tilts per percentage-point a pin was nudged
    // off its true spot, and the tilt's cap so a heavily-nudged pin (several
    // cascaded pushes deep) doesn't spin its pointer past readability.
    const PIN_TILT_DEG_PER_PCT = 3;
    const PIN_TILT_MAX_DEG = 55;

    // A pin whose circle shows a real portrait (an item actually obtained)
    // instead of a generic glyph, labeled with the pull number it landed on
    // -- on the pin's outer side, same as every other pin's label.
    // `truePct` is where the pull actually happened; `leftPct` is where the
    // pin is actually drawn, which the declutter pass below may have moved
    // either side of it to sit around a crowded cluster's average. When
    // they differ, the triangle tip itself tilts back toward the true spot
    // instead of pointing straight at the line, rather than drawing a
    // separate connector -- the pin's own pointer just leans in the
    // direction of the pull it represents.
    function pityRulerPortraitPin(side, leftPct, portraitUrl, itemId, enName, pullNum, truePct = leftPct, extraClass = '') {
        const safeName = (Array.isArray(enName) ? enName[0] : enName) || '';
        const img = portraitUrl
            ? `<img src="${portraitUrl}" loading="lazy" onerror="handleIconError(this, 'char', '${itemId || ''}', '${safeName.replace(/'/g, "\\'")}')">`
            : PITY_RULER_ICONS.check;
        const label = `<div class="ruler-pin-label">${pullNum}</div>`;
        const circle = `<div class="ruler-pin-circle">${img}</div>`;
        // delta > 0 means the true pull is to the right of where the pin
        // got drawn (it was nudged left to make room), delta < 0 the
        // opposite. Rotating a "below" pin's tip left needs a negative
        // angle and an "above" pin's tip left needs a positive one (they
        // point opposite directions), verified against the real rendered
        // triangle shapes rather than assumed -- so the same-sign delta
        // maps directly to the angle for "below" pins and flips sign for
        // "above" pins.
        const delta = truePct - leftPct;
        const rawTilt = delta * PIN_TILT_DEG_PER_PCT * (side === 'below' ? 1 : -1);
        const tiltDeg = Math.max(-PIN_TILT_MAX_DEG, Math.min(PIN_TILT_MAX_DEG, rawTilt));
        const pointStyle = Math.abs(tiltDeg) > 0.05 ? ` style="transform: rotate(${tiltDeg.toFixed(1)}deg);"` : '';
        const point = `<div class="ruler-pin-point"${pointStyle}></div>`;
        // "above" pins point down at the line and read label→circle→point
        // top to bottom; "below" pins point up at the line, so the label
        // needs to fall on the far/outer side too -- circle→point→label in
        // source order, relying on .ruler-pin-below .ruler-pin-point's
        // order:-1 to still put the point first visually, touching the line.
        const children = side === 'below' ? circle + point + label : label + circle + point;
        return `
            <div class="ruler-pin-${side} done ${extraClass}" style="left: ${pinEdgeClamp(leftPct)}; color: var(--text-dim);">
                ${children}
            </div>`;
    }

    // Minimum center-to-center spacing (in axis %) enforced between
    // same-side portrait pins so pulls landing close together (e.g. two
    // 6-stars back-to-back) don't visually merge into one blob. A fixed
    // percentage rather than a measured pixel gap, like every other
    // position on this ruler -- keeps the whole feature static/resize-safe
    // with no JS layout pass, at the cost of being an approximation. Sized
    // against the narrowest real case measured (a single segment of a
    // horizontally-scrolled, multi-cycle ruler on a 375px mobile viewport,
    // ~260px wide): the 22px pin circles need ~26px of real separation to
    // clear each other, and 26/260 ~= 10%. Wide desktop cards end up
    // roomier than strictly necessary as a result, which is harmless.
    const PIN_MIN_GAP_PCT = 10;

    // Groups pins that land within PIN_MIN_GAP_PCT of a neighbor into
    // clusters (transitively -- a chain of near neighbors all join one
    // cluster even if the two ends aren't close to each other directly),
    // then centers each cluster on the average of its members' true
    // positions and spaces them out exactly minGap apart around that
    // average, rather than anchoring on the first member and cascading the
    // rest rightward. E.g. pulls at 98 and 102 (avg 100, minGap 10) end up
    // at 95 and 105 -- both as close to their true spot as the minimum
    // spacing allows, instead of the first staying put and the second
    // getting shoved a full 10 away. Input must already be sorted
    // ascending (pull number order, which is also ascending pct order
    // here); a pathological run of many clusters packed right against each
    // other could in principle still leave two cluster edges closer than
    // minGap, since each cluster is centered independently in one pass.
    function declutterPct(pcts, minGap = PIN_MIN_GAP_PCT) {
        const n = pcts.length;
        const out = new Array(n);
        let start = 0;
        for (let i = 1; i <= n; i++) {
            if (i === n || pcts[i] - pcts[i - 1] >= minGap) {
                const size = i - start;
                if (size === 1) {
                    out[start] = pcts[start];
                } else {
                    const avg = pcts.slice(start, i).reduce((a, b) => a + b, 0) / size;
                    const first = avg - (minGap * (size - 1)) / 2;
                    for (let j = 0; j < size; j++) out[start + j] = first + j * minGap;
                }
                start = i;
            }
        }
        return out;
    }

    // Renders one side's group of portrait pins, decluttering their
    // positions first so the pointer/connector logic above has both the
    // true and (possibly nudged) drawn position for each pull.
    function renderPortraitPinGroup(side, pulls, windowStart, axisMax) {
        const truePcts = pulls.map(p => ((p.pullNum - windowStart) / axisMax) * 100);
        const nudgedPcts = declutterPct(truePcts);
        return pulls
            .map((p, i) => pityRulerPortraitPin(side, nudgedPcts[i], getItemIconUrl('char', p.itemId, p.enName), p.itemId, p.enName, p.pullNum, truePcts[i]))
            .join('');
    }

    // Measured via getBoundingClientRect against real rendered labels.
    // These labels stack their two parts onto separate lines (e.g.
    // "Guarantee" over "120"), so the pin's width is set by its widest
    // single line, not the two parts combined -- "Guarantee" is the
    // longest at ~47px, needing ~24px of clearance for its own
    // half-width. Sized with headroom above that minimum since label
    // width varies slightly with the actual number. Kept narrower than
    // it once was (58px, back when both parts shared one unstacked line)
    // specifically so the owner pin doesn't get dragged so far inward
    // that it visually collides with a pity pin landing nearby on the
    // same axis -- redeeming a token and pity resetting are unrelated,
    // and clamping both similarly close together implied otherwise.
    const WIDE_PIN_EDGE_PX = 28;

    // A pin's `left` needs to stay far enough from 0%/100% that its own
    // circle+label don't get clipped by .banner-box's overflow:hidden --
    // clamp() keeps that clearance in real pixels regardless of how wide
    // the segment actually renders, rather than insetting the whole axis
    // (which previously put the track's background and its fill children
    // in different coordinate spaces and made the fills overshoot).
    // `edgePx` only needs to be wider (WIDE_PIN_EDGE_PX) for the two pins
    // with a long label ("Guarantee/Token · <n>", "Pity · 80"/"Forced");
    // every other pin on this ruler shows just a pull number and fits
    // inside the narrower default.
    function pinEdgeClamp(pct, edgePx = 16) {
        return `clamp(${edgePx}px, ${pct}%, calc(100% - ${edgePx}px))`;
    }

    // Renders one segment's track+fills+pins -- shared by the single 0-120
    // guarantee window and, once the guarantee is won, by each individual
    // 240-pull token cycle (see createPityRulerChartered below). Only the
    // segment that's actually still in progress gets pity's own live fill/
    // target pin; a completed segment shows what happened in it (history
    // pins, its own achieved owner-pin) but not a "current projection",
    // since pity's forward target is only meaningful for the live moment.
    function renderRulerAxis(opts) {
        const clamp = v => Math.max(0, Math.min(100, v));
        const { windowStart, axisMax, ownerNow, ownerColor, ownerLabel, ownerTarget, ownerIcon, ownerPinMode, pityColor, pityVal, showPityLive, allPulls } = opts;
        const ownerPct = axisMax > 0 ? clamp((ownerNow / axisMax) * 100) : 0;

        const pityPulls = (allPulls || []).filter(p => p.rarity === '6' && !p.isRateUpItem && p.pullNum > windowStart && p.pullNum <= windowStart + ownerNow);
        const rateUpPulls = (allPulls || []).filter(p => p.rarity === '6' && p.isRateUpItem && p.pullNum > windowStart && p.pullNum <= windowStart + ownerNow);
        const pityHistoryPinsHtml = renderPortraitPinGroup('below', pityPulls, windowStart, axisMax);
        const rateUpHistoryPinsHtml = renderPortraitPinGroup('above', rateUpPulls, windowStart, axisMax);

        let pityFillHtml = '', pityPinHtml = '', nowCapHtml = '';
        if (showPityLive) {
            // pityVal (pulls since the last 6-star) runs continuously and
            // isn't reset by hitting a 240-pull token cycle boundary --
            // redeeming a token for the rate-up character is a separate
            // mechanic from pity. So the last reset can predate this
            // segment's own window (pityResetRaw negative); the target must
            // still be computed from the true reset point rather than
            // clamping it to this window's start first, or the projected
            // pin would land 80 pulls after a fake reset-at-0 and read too
            // late. Only the fill's visible left edge gets clamped, since
            // there's no way to draw a bar starting before this axis.
            const pityResetRaw = ownerNow - pityVal;
            const pityTargetRaw = pityResetRaw + 80;
            // The true target can fall beyond this segment's own visible
            // range for two different reasons. On the 0-120 guarantee axis
            // specifically, its 120-pull cap can force a 6-star (and
            // therefore a pity reset) before pity would naturally get
            // there -- that's still worth showing, clamped to the edge,
            // since it's a real rule about *this* axis. On a 240-pull
            // token axis, there's no such rule -- it just means the pull
            // that reaches 80 pity hasn't happened yet and belongs to a
            // future cycle this ruler doesn't render, so there's nothing
            // real to draw and the pin is skipped rather than clamped to
            // the same spot as the cycle's own end-of-axis pin (which
            // would wrongly suggest the two are related -- redeeming a
            // token doesn't reset pity).
            const pityOverflow = pityTargetRaw > axisMax;
            const forced = axisMax === 120 && pityOverflow;
            const showPityPin = !pityOverflow || forced;
            const pityTargetPct = forced ? 100 : clamp((pityTargetRaw / axisMax) * 100);
            const pityFillLeftPct = clamp((Math.max(0, pityResetRaw) / axisMax) * 100);
            const pityFillWidthPct = Math.max(0, ownerPct - pityFillLeftPct);
            const pityLabelText = forced ? 'Forced<br>Pity' : '80<br>Pity';
            pityFillHtml = `<div class="ruler-fill-pity" style="left: ${pityFillLeftPct}%; width: ${pityFillWidthPct}%; background: ${pityColor};"></div>`;
            pityPinHtml = showPityPin ? `
                <div class="ruler-pin-below ${forced ? 'ruler-pin-forced' : ''}" style="left: ${pinEdgeClamp(pityTargetPct, WIDE_PIN_EDGE_PX)}; color: ${pityColor};">
                    <div class="ruler-pin-circle" style="background: ${forced ? 'transparent' : pityColor};">${PITY_RULER_ICONS.star}</div>
                    <div class="ruler-pin-point"></div>
                    <div class="ruler-pin-label" style="${forced ? '' : `color: ${pityColor};`}">${pityLabelText}</div>
                </div>` : '';
            nowCapHtml = `<div class="ruler-now-cap" style="left: ${ownerPct}%;"></div>`;
        }

        const ownerPinHtml = ownerPinMode === 'done'
            ? `<div class="ruler-pin-above done" style="left: ${pinEdgeClamp(100)}; color: var(--text-dim);">
                    <div class="ruler-pin-label">${ownerTarget}</div>
                    <div class="ruler-pin-circle">${PITY_RULER_ICONS.check}</div>
                    <div class="ruler-pin-point"></div>
                </div>`
            : `<div class="ruler-pin-above" style="left: ${pinEdgeClamp(100, WIDE_PIN_EDGE_PX)}; color: ${ownerColor};">
                    <div class="ruler-pin-label" style="color: ${ownerColor};">${ownerLabel}<br>${ownerTarget}</div>
                    <div class="ruler-pin-circle" style="background: ${ownerColor};">${ownerIcon}</div>
                    <div class="ruler-pin-point"></div>
                </div>`;

        return `
            <div class="ruler-axis">
                <div class="ruler-track">
                    <div class="ruler-fill-owner" style="width: ${ownerPct}%; background: ${ownerColor};"></div>
                    ${pityFillHtml}
                </div>
                ${nowCapHtml}
                ${pityPinHtml}
                ${pityHistoryPinsHtml}
                ${rateUpHistoryPinsHtml}
                ${ownerPinHtml}
            </div>`;
    }

    // Pity Ruler for Chartered Headhunting banners: one shared axis for
    // Guarantee (then Token, once the guarantee is won) and a floating
    // Pity lane, instead of three separate boxes. See the CSS comment
    // above ".pity-ruler" in index.html for the full rationale.
    //
    // Once the guarantee is won the axis is measured in 240-pull token
    // cycles, and a heavy player can rack up several of those on one
    // banner -- rather than compressing everything before "now" into a
    // summary, each cycle gets rendered as its own full-detail segment and
    // the whole strip becomes horizontally scrollable, defaulting to the
    // current (rightmost) segment.
    function createPityRulerChartered(data, isActive) {
        const grey = '#888888';
        const pityVal = data.endPity || 0;
        const clampedRateUp = Math.min(120, data.endRateUpPity || 0);
        const tokenRaw = data.endTokenPulls || 0;
        const tokenCycles = Math.floor(tokenRaw / 240);
        const tokenNow = tokenRaw % 240;
        const guaranteeDone = !!data.endHasPulledRateUp;
        const pityColor = !isActive ? grey : (pityVal >= 64 ? 'var(--color-red)' : (pityVal >= 40 ? 'var(--accent-orange)' : 'var(--color-green)'));

        let segmentsHtml, isScrollable;
        if (!guaranteeDone) {
            const ownerColor = !isActive ? grey : (clampedRateUp >= 100 ? 'var(--color-red)' : (clampedRateUp >= 70 ? 'var(--accent-orange)' : 'var(--color-green)'));
            segmentsHtml = `<div class="ruler-segment">${renderRulerAxis({
                windowStart: 0, axisMax: 120, ownerNow: clampedRateUp, ownerColor,
                ownerLabel: 'Guarantee', ownerTarget: 120, ownerIcon: PITY_RULER_ICONS.badge, ownerPinMode: 'active',
                pityColor, pityVal, showPityLive: true, allPulls: data.allPulls
            })}</div>`;
            isScrollable = false;
        } else {
            const segs = [];
            const segFlexBasis = 100 / (tokenCycles + 1);
            for (let i = 0; i <= tokenCycles; i++) {
                const isCurrent = i === tokenCycles;
                const windowStart = i * 240;
                const ownerNow = isCurrent ? tokenNow : 240;
                const ownerColor = isCurrent && isActive ? 'var(--accent-blue)' : grey;
                segs.push(`
                    <div class="ruler-segment" style="flex-basis: ${segFlexBasis}%;">
                        ${tokenCycles > 0 ? `<div class="ruler-segment-label">Cycle ${i + 1} of ${tokenCycles + 1}</div>` : ''}
                        ${renderRulerAxis({
                            windowStart, axisMax: 240, ownerNow, ownerColor,
                            ownerLabel: 'Token', ownerTarget: windowStart + 240, ownerIcon: PITY_RULER_ICONS.ticket,
                            ownerPinMode: isCurrent ? 'active' : 'done',
                            pityColor, pityVal, showPityLive: isCurrent, allPulls: data.allPulls
                        })}
                    </div>`);
            }
            segmentsHtml = segs.join('');
            isScrollable = tokenCycles > 0;
        }

        const readoutNow = guaranteeDone ? tokenNow : clampedRateUp;
        const readoutColor = !isActive ? grey : (guaranteeDone ? 'var(--accent-blue)' : (clampedRateUp >= 100 ? 'var(--color-red)' : (clampedRateUp >= 70 ? 'var(--accent-orange)' : 'var(--color-green)')));

        return `
            <div class="pity-ruler">
                <div class="pity-ruler-readout">
                    <span style="color: ${readoutColor};">${readoutNow}<span class="unit">${guaranteeDone ? 'token' : 'guar'}</span></span>
                    <span style="color: ${pityColor};">${pityVal}<span class="unit">pity</span></span>
                </div>
                <div class="ruler-body${isScrollable ? ' ruler-body-multi' : ''}">${isScrollable
                    ? `<div class="ruler-scroll"><div class="ruler-segments" style="width: ${(tokenCycles + 1) * 100}%;">${segmentsHtml}</div></div>`
                    : segmentsHtml}
                </div>
            </div>`;
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
            let bInfo = getBannerInfo(data.poolId, name);

            if (prefix === 'weap' || (prefix === 'char' && data.category === "Chartered Headhunting") || isActive) {
                if (prefix === 'char' && data.category === "Chartered Headhunting") {
                    pityHTML = createPityRulerChartered(data, isActive);
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
