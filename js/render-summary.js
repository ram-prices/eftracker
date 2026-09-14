// ==============================================================================
// SUMMARY STRIP RENDERING & EXPAND/COLLAPSE ANIMATION
// ==============================================================================
    let summaryExpandedState = {};

    function toggleSummaryExpand(element) {
        if (element.classList.contains('no-expand')) return;
        const isExpanding = !element.classList.contains('expanded');
        const id = element.id;
        summaryExpandedState[id] = isExpanding;

        // Determine which type this container belongs to
        const type = id.includes('char') ? 'char' : 'weap';

        if (isExpanding) {
            element.classList.add('manual-expand');
            element.classList.add('expanding');
            element.style.overflowY = 'hidden';
            const startHeight = element.offsetHeight;
            element.style.transition = 'none';
            element.style.maxHeight = 'none';
            element.classList.add('expanded');
            const endHeight = element.offsetHeight;

            element.style.maxHeight = startHeight + 'px';
            void element.offsetHeight;

            element.style.transition = 'max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            element.style.maxHeight = endHeight + 'px';

            setTimeout(() => {
                if (element.classList.contains('expanded')) {
                    element.style.maxHeight = 'none';
                    element.classList.remove('expanding');
                    element.style.overflowY = '';
                }
            }, 400);

            // Reveal overflow items — but only if row-1 animation is done.
            if (summaryRow1Animating[type]) {
                // Row-1 is still playing; queue the reveal for when it finishes.
                summaryPendingExpand[type] = true;
            } else {
                revealOverflowItems(element);
            }
        } else {
            element.classList.add('collapsing');
            element.classList.remove('manual-expand');
            element.style.overflowY = 'hidden';

            // Cancel any pending expand that was queued during row-1 animation
            summaryPendingExpand[type] = false;

            // Fade out revealed overflow items before collapsing
            element.querySelectorAll('.summary-item.overflow-item').forEach(item => {
                item.classList.remove('reveal-overflow');
                item.classList.add('fade-out');
            });

            const doCollapse = () => {
                const startHeight = element.offsetHeight;
                element.style.maxHeight = startHeight + 'px';
                void element.offsetHeight;

                element.style.transition = 'max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                element.style.maxHeight = element.matches(':hover') ? '160px' : '140px';

                setTimeout(() => {
                    if (!element.classList.contains('expanded')) {
                        element.classList.remove('expanded');
                        element.style.maxHeight = '';
                        element.classList.remove('collapsing');
                        element.style.overflowY = '';
                    }
                    element.querySelectorAll('.summary-item.overflow-item').forEach(item => {
                        item.classList.remove('fade-out');
                    });
                }, 400);
                element.classList.remove('expanded');
            };

            if (summaryRow1Animating[type]) {
                // Items haven't been revealed yet — base CSS already has them at opacity:0.
                // Just animate the container closed directly, no item handling needed.
                element.querySelectorAll('.summary-item.overflow-item').forEach(item => {
                    item.classList.remove('fade-out'); // undo the fade-out added above
                });
                const startHeight = element.offsetHeight;
                element.style.transition = 'none';
                element.style.maxHeight = startHeight + 'px';
                void element.offsetHeight;
                element.style.transition = 'max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                element.style.maxHeight = '140px';
                setTimeout(() => {
                    element.classList.remove('expanded');
                    element.style.maxHeight = '';
                    element.style.transition = '';
                    element.classList.remove('collapsing');
                    element.style.overflowY = '';
                }, 400);
            } else {
                // Overflow items were visible — wait for their fade-out transition before collapsing.
                setTimeout(doCollapse, 300); // matches fade-out transition duration
            }
        }
    }

    function toggleSummaryDefault() {
        const config = getEfConfig();
        const newVal = !config.summaryExpandedByDefault;
        updateEfConfig('summaryExpandedByDefault', newVal);
        const btn = document.getElementById('toggleSummaryExpandBtn');
        if (btn) {
            btn.innerText = newVal ? 'ON' : 'OFF';
            btn.classList.toggle('active', newVal);
        }

        // No need to re-render — just expand or collapse the existing containers directly.
        const containers = [
            document.getElementById('summary-char-container'),
            document.getElementById('summary-weap-container')
        ];
        const maxHeightVal = ((getEfConfig().summaryMaxRows || 3) * 140) + 'px';

        containers.forEach(container => {
            if (!container || container.classList.contains('no-expand')) return;
            const type = container.id.includes('char') ? 'char' : 'weap';

            if (newVal) {
                summaryExpandedState[container.id] = true;
                container.classList.add('expanded');
                container.style.maxHeight = 'none';
                // Snap visible instantly with no transition
                container.querySelectorAll('.summary-item.overflow-item').forEach(item => {
                    item.style.transition = 'none';
                    item.classList.remove('fade-out');
                    item.classList.add('reveal-overflow');
                    void item.offsetWidth;
                    item.style.transition = '';
                });
            } else {
                summaryExpandedState[container.id] = false;
                summaryPendingExpand[type] = false;
                container.classList.remove('expanded');
                container.style.maxHeight = '';
                container.style.transition = '';
                // Snap hidden instantly with no transition
                container.querySelectorAll('.summary-item.overflow-item').forEach(item => {
                    item.style.transition = 'none';
                    item.classList.remove('reveal-overflow');
                    item.classList.remove('fade-out');
                    void item.offsetWidth;
                    item.style.transition = '';
                });
            }
        });
    }

    let animatedSummaries = new Set();

    // If the user tries to expand while row-1 is still animating, we queue it here.
    let summaryPendingExpand = { char: false, weap: false };

    function checkSummaryOverflow() {
        const charContainer = document.getElementById('summary-char-container');
        const weapContainer = document.getElementById('summary-weap-container');
        if (!charContainer || !weapContainer) return;

        const config = getEfConfig();
        const maxRows = config.summaryMaxRows || 3;
        const expandedByDefault = config.summaryExpandedByDefault || false;
        const maxHeightVal = (maxRows * 140) + 'px';

        [charContainer, weapContainer].forEach(container => {
            if (container.offsetParent === null) return;

            const type = container.id.includes('char') ? 'char' : 'weap';
            const items = container.querySelectorAll('.summary-item');
            if (items.length <= 1) {
                container.classList.add('no-expand');
                container.classList.remove('expanded');
                container.style.maxHeight = '';
                summaryExpandedState[container.id] = false;
                return;
            }

            const firstTop = items[0].offsetTop;
            const lastTop = items[items.length - 1].offsetTop;
            const isOverflowing = Math.abs(lastTop - firstTop) > 10;

            items.forEach(item => {
                if (Math.abs(item.offsetTop - firstTop) > 10) {
                    item.classList.add('overflow-item');
                } else {
                    item.classList.remove('overflow-item');
                }
            });

            if (!isOverflowing) {
                container.classList.add('no-expand');
                container.classList.remove('expanded');
                container.style.maxHeight = '';
                summaryExpandedState[container.id] = false;
            } else {
                container.classList.remove('no-expand');

                if (expandedByDefault && !summaryExpandedState.hasOwnProperty(container.id)) {
                    summaryExpandedState[container.id] = true;
                }

                if (summaryExpandedState[container.id]) {
                    if (summaryRow1Animating[type]) {
                        // Row-1 is still playing. Keep the container collapsed so overflow
                        // items stay hidden. triggerSummaryAnimation's timeout will open
                        // it and reveal the items once row-1 is done.
                    } else {
                        container.classList.add('expanded');
                        container.style.maxHeight = maxHeightVal;
                        const alreadyRevealed = container.querySelector('.summary-item.overflow-item.reveal-overflow') !== null;
                        revealOverflowItems(container, !alreadyRevealed);
                    }
                }
            }
        });
    }

    // Called by toggleSummaryExpand / checkSummaryOverflow to reveal overflow items.
    // Uses CSS transitions (not animations) so display:none/block tab switches
    // never restart the effect — transitions only fire when the value actually changes.
    // animate=true: play the fade+slide transition (first reveal or re-expand)
    // animate=false: snap visible instantly (tab switch back to already-expanded state)
    function revealOverflowItems(container, animate = true) {
        const items = container.querySelectorAll('.summary-item.overflow-item');
        items.forEach(item => {
            item.classList.remove('fade-out');
            if (animate) {
                // Let the CSS transition run by adding the class normally
                item.classList.add('reveal-overflow');
            } else {
                // Snap visible with no transition
                item.style.transition = 'none';
                item.classList.add('reveal-overflow');
                void item.offsetWidth;
                item.style.transition = '';
            }
        });
    }

    function triggerSummaryAnimation(type) {
        if (animatedSummaries.has(type)) return;

        const containerId = type === 'char' ? 'summary-char-container' : 'summary-weap-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        const config = getEfConfig();
        const expandedByDefault = config.summaryExpandedByDefault || false;

        animatedSummaries.add(type);
        summaryRow1Animating[type] = true;
        summaryPendingExpand[type] = false;

        // When expand-by-default is on, pre-expand the container to its full height
        // BEFORE adding initial-animate, so the yellow stripe paints all the way down
        // in one seamless motion rather than stopping at row-1 then jumping open.
        if (expandedByDefault) {
            // Ensure the state is marked — checkSummaryOverflow is blocked during row-1
            // so we must set it here ourselves.
            if (!summaryExpandedState.hasOwnProperty(container.id)) {
                summaryExpandedState[container.id] = true;
            }
            if (summaryExpandedState[container.id]) {
                container.style.transition = 'none';
                container.style.maxHeight = 'none';
                container.classList.add('expanded');
                const fullHeight = container.offsetHeight;
                // Lock to pixel value so the stripe has a stable target to grow into
                container.style.maxHeight = fullHeight + 'px';
                void container.offsetHeight;
            }
        }

        container.classList.add('initial-animate');

        // Row-1 items animate in at delay 1.4s + 0.5s duration = done by ~1.9s
        // We add a small buffer and then handle row-2+.
        const ROW1_DONE_MS = 1950; // 1.4s delay + 0.5s duration + ~50ms buffer

        setTimeout(() => {
            summaryRow1Animating[type] = false;
            container.classList.remove('initial-animate');

            // Release the pixel-height lock set during pre-expansion, then reveal overflow items.
            if (expandedByDefault && container.classList.contains('expanded')) {
                container.style.maxHeight = 'none';
                container.style.transition = '';
                revealOverflowItems(container);
            }

            // If the user clicked expand while row-1 was still running, honour it now.
            if (summaryPendingExpand[type]) {
                summaryPendingExpand[type] = false;
                revealOverflowItems(container);
            }
        }, ROW1_DONE_MS);
    }

    function renderSummary() {
        const config = getEfConfig();
        const bannerLimit = config.summaryBannerLimit || 999;
        
        let processItems = (items, prefix, isWeap) => {
            const timeline = isWeap ? weapBannerTimeline : charBannerTimeline;
            const recentBanners = timeline.slice(-bannerLimit);
            
            let html = '';
            let filteredItems = items.filter(i => recentBanners.includes(i.bannerName));
            
            if (isWeap) {
                let groupedItems = [];
                let currentGroup = [];
                for (let i = 0; i < filteredItems.length; i++) {
                    let item = filteredItems[i];
                    if (item.pity === 0) {
                        currentGroup.push(item);
                    } else {
                        currentGroup.push(item);
                        groupedItems.push(currentGroup);
                        currentGroup = [];
                    }
                }
                if (currentGroup.length > 0) {
                    groupedItems.push(currentGroup);
                }
                
                groupedItems.forEach(group => {
                    let mainItem = group[group.length - 1];
                    let colorVal = (mainItem.pity === "FREE" ? "var(--color-green)" : (mainItem.pity === "TOKEN" ? "var(--accent-blue)" : (mainItem.pity < 4 ? "var(--color-green)" : (mainItem.pity <= 6 ? "var(--color-yellow)" : "var(--color-red)"))));
                    let pityClass = 'summary-char-pity';
                    let itemClass = 'summary-item summary-char-item';
                    let pityDisplay = mainItem.pity;
                    
                    let imagesHtml = group.map(i => {
                        let title = i.name;
                        if (i.bannerName === "Basic Headhunting") title += ' (Basic Headhunting)';
                        return `<img src="${getItemIconUrl(prefix, i.id, i.enName)}" title="${title}" class="summary-icon ${i.rarity === '5' ? 'summary-icon-5' : 'summary-icon-6'}" style="background-color: transparent; border-radius: 0;" loading="lazy" onerror="handleIconError(this, '${prefix}', '${i.id || ''}', '${(i.enName || '').replace(/'/g, "\\'")}')">`;
                    }).join('');
                    
                    html += `<div class="${itemClass}">
                        <div style="display: flex; gap: 2px; background-color: #141414; border-radius: 12px; overflow: hidden; align-items: center;">${imagesHtml}</div>
                        <div class="${pityClass}"><span class="luck-dot" style="background-color: ${colorVal};"></span>${pityDisplay}</div>
                    </div>`;
                });
            } else {
                filteredItems.forEach(i => {
                    let colorVal = (i.pity === "FREE" ? "var(--color-green)" : (i.pity === "TOKEN" ? "var(--accent-blue)" : (i.pity < 40 ? "var(--color-green)" : (i.pity <= 65 ? "var(--color-yellow)" : "var(--color-red)"))));
                    let pityClass = 'summary-char-pity';
                    let itemClass = 'summary-item summary-char-item';
                    let pityDisplay = i.pity;
                    let title = i.name;
                    
                    if (i.bannerName === "Basic Headhunting") {
                        title += ' (Basic Headhunting)';
                    }
                    
                    html += `<div class="${itemClass}" title="${title}">
                        <img src="${getItemIconUrl(prefix, i.id, i.enName)}" class="summary-icon ${isWeap && i.rarity === '5' ? 'summary-icon-5' : 'summary-icon-6'}" loading="lazy" onerror="handleIconError(this, '${prefix}', '${i.id || ''}', '${(i.enName || '').replace(/'/g, "\\'")}')">
                        <div class="${pityClass}"><span class="luck-dot" style="background-color: ${colorVal};"></span>${pityDisplay}</div>
                    </div>`;
                });
            }
            return html;
        };
        
        const charContainer = document.getElementById('summary-char-container');
        const weapContainer = document.getElementById('summary-weap-container');
        
        charContainer.innerHTML = `<div class="summary-label">OPERATORS</div>` + processItems([...summaryChars].reverse(), 'char', false);
        weapContainer.innerHTML = `<div class="summary-label">ARSENALS</div>` + processItems([...summaryWeaps].reverse(), 'weap', true);

        // Check for overflow to disable expansion if everything fits in one row
        setTimeout(checkSummaryOverflow, 500);
    }

    function updateSummaryRows(val) {
        updateEfConfig('summaryMaxRows', parseInt(val));
        document.getElementById('summaryRowsVal').innerText = val;
        renderSummary();
    }
