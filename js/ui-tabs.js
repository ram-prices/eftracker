    let currentTab = 'settings';
    let isAnimating = false;

    // ==============================================================================
    // SLIDE ANIMATION ENGINE
    // ==============================================================================
    function getTabIndex(t) { return SECTION_ORDER.indexOf(t); }

    function updateTabButtonStyles(activeTabId) {
        ['char', 'weap', 'planner', 'stats', 'settings', 'about'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if (btn) btn.classList.toggle('active-tab', t === activeTabId);
        });
        updateTabSlider(activeTabId);
    }

    function updateTabSlider(tabId) {
        const btn = document.getElementById(`tab-${tabId}`);
        const slider = document.getElementById('tabSlider');
        if (btn && slider) {
            const left = btn.offsetLeft;
            const top = btn.offsetTop;
            
            slider.style.transform = `translate(${left}px, ${top}px)`;
            slider.style.width = `${btn.offsetWidth}px`;
            slider.style.height = `${btn.offsetHeight}px`;
        }
    }

    window.addEventListener('resize', () => {
        if (currentTab) updateTabSlider(currentTab);
    });

    function switchTab(tab) {
        if (isAnimating) return;
        if (!isDataLoaded && !['settings', 'about'].includes(tab)) return;
        if (tab === currentTab) return;

        if (tab === 'settings') populateExportList();
        
        isAnimating = true;
        updateTabButtonStyles(tab);

        let oldTab = currentTab;
        let isRight = getTabIndex(tab) > getTabIndex(oldTab);
        currentTab = tab;

        let currSec = document.getElementById(`${oldTab}-section`);
        let newSec = document.getElementById(`${tab}-section`);

        // Clean up any ongoing animations from the old tab
        if (oldTab === 'char' || oldTab === 'weap') {
            const oldSummaryId = oldTab === 'char' ? 'summary-char-container' : 'summary-weap-container';
            const oldSummary = document.getElementById(oldSummaryId);
            if (oldSummary) oldSummary.classList.remove('initial-animate');
            
            const oldDash = document.getElementById(`${oldTab}OverviewDashboard`);
            if (oldDash) oldDash.classList.remove('initial-animate');
        } else if (oldTab === 'overview') {
            const overviewStats = document.getElementById('overviewStats');
            if (overviewStats) overviewStats.classList.remove('initial-animate');
        }
        currSec.classList.remove('first-visit');

        // Handle first visit animation
        if (!visitedTabs.has(tab)) {
            newSec.classList.add('first-visit');
            visitedTabs.add(tab);
            // Remove the class after animation finishes so it doesn't re-run on next switch
            setTimeout(() => {
                newSec.classList.remove('first-visit');
            }, 1500);
        } else {
            newSec.classList.remove('first-visit');
        }

        // Prep it slightly off-screen
        if (newSec.style.display !== 'block') {
            newSec.style.display = 'block';
            newSec.style.transition = 'none';
            newSec.style.transform = `translateX(${isRight ? '40px' : '-40px'})`;
            newSec.style.opacity = '0';
        }

        newSec.style.zIndex = '3';
        currSec.style.zIndex = '1';
        void newSec.offsetWidth; // reflow

        if (tab === 'char' || tab === 'weap') {
            triggerSummaryAnimation(tab); // Must run first so summaryRow1Animating flag is set before checkSummaryOverflow reads it
            checkSummaryOverflow();
            document.querySelectorAll(`#${tab}BannerGrid .pull-list-container`).forEach(updateBlockHeaders);
            
            if (!animatedDashboards.has(tab)) {
                const dash = document.getElementById(`${tab}OverviewDashboard`);
                if (dash) {
                    dash.classList.add('initial-animate');
                    animatedDashboards.add(tab);
                    setTimeout(() => {
                        dash.classList.remove('initial-animate');
                    }, 3000);
                }
            }
        } else if (tab === 'stats') {
            renderPatchStats();
        } else if (tab === 'planner' && !plannerRendered) {
            renderPlanner();
            plannerRendered = true;
        }

        let ease = 'cubic-bezier(0.25, 1, 0.5, 1)';
        currSec.style.transition = `transform 0.4s ${ease}, opacity 0.4s ${ease}`;
        newSec.style.transition = `transform 0.4s ${ease}, opacity 0.4s ${ease}`;

        // Animate the current section sliding away slightly and fading out
        currSec.style.transform = `translateX(${isRight ? '-40px' : '40px'})`;
        currSec.style.opacity = '0';
        
        // Animate the new section sliding fully into place and fading in
        newSec.style.transform = `translateX(0)`;
        newSec.style.opacity = '1';

        setTimeout(() => {
            currSec.style.display = 'none';
            currSec.style.transform = '';
            currSec.style.opacity = '';
            currSec.style.transition = '';
            currSec.style.zIndex = '';
            
            newSec.style.transition = '';
            newSec.style.zIndex = '';
            
            isAnimating = false;
            if (tab === 'char' || tab === 'weap') {
                // Only re-check overflow if row-1 animation is already done (e.g. revisiting a tab).
                // If it's still animating, triggerSummaryAnimation's timeout handles expansion.
                const type = tab;
                if (!summaryRow1Animating[type]) {
                    checkSummaryOverflow();
                }
            }
            newSec.querySelectorAll('.pull-list-container').forEach(checkExpandButtonVisibility);
        }, 400);
    }

    let animatedDashboards = new Set();

    // ==============================================================================
    // EXPAND/TOGGLE/FILTER LOGIC
    // ==============================================================================
    function checkExpandButtonVisibility(container) {
        const bannerBox = container.parentElement;
        const btn = bannerBox.querySelector('.banner-expand-area');
        if (!btn || container.offsetParent === null) return; 

        const wasExpanded = bannerBox.classList.contains('expanded');
        const wasActive = btn.classList.contains('active');

        // Temporarily reset to measure natural overflow
        bannerBox.classList.remove('expanded');
        const originalHeight = bannerBox.style.height;
        bannerBox.style.height = '600px';
        
        const wouldOverflow = container.scrollHeight > (container.clientHeight + 2);
        
        if (wouldOverflow) {
            btn.style.display = 'flex';
            // Restore state if it was expanded
            if (wasExpanded) {
                bannerBox.classList.add('expanded');
                bannerBox.style.height = originalHeight || 'auto';
            } else {
                bannerBox.style.height = '';
            }
        } else {
            // No overflow possible, so collapse and hide button
            btn.style.display = 'none';
            btn.innerText = '▼ EXPAND ▼';
            btn.classList.remove('active');
            bannerBox.classList.remove('expanded');
            bannerBox.style.height = '';
        }
    }

    function applyAmbientTint(bannerId, imgElement) {
        const banner = document.getElementById(bannerId);
        if (!banner || !imgElement) return;

        // Use a small delay to ensure the image is actually ready for canvas drawing
        setTimeout(() => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 10;
                canvas.height = 10;
                
                // Draw the image to a tiny canvas to get average color
                ctx.drawImage(imgElement, 0, 0, 10, 10);
                const data = ctx.getImageData(0, 0, 10, 10).data;
                
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i+1];
                    b += data[i+2];
                }
                const count = data.length / 4;
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                // Boost saturation and ensure minimum brightness for a more prominent effect
                const avg = (r + g + b) / 3;
                const satFactor = 2.2; // Increased saturation boost
                r = Math.min(255, Math.max(0, Math.floor(avg + (r - avg) * satFactor)));
                g = Math.min(255, Math.max(0, Math.floor(avg + (g - avg) * satFactor)));
                b = Math.min(255, Math.max(0, Math.floor(avg + (b - avg) * satFactor)));
                
                // Ensure it's vibrant enough
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness < 100) {
                    const boost = 100 / (brightness || 1);
                    r = Math.min(255, Math.floor(r * boost));
                    g = Math.min(255, Math.floor(g * boost));
                    b = Math.min(255, Math.floor(b * boost));
                }

                banner.style.setProperty('--banner-tint', `rgb(${r}, ${g}, ${b})`);
                banner.classList.add('has-tint');
            } catch (e) {
                // If CORS fails, we can't extract color, but we'll set a default subtle glow
                banner.style.setProperty('--banner-tint', 'rgba(255, 255, 255, 0.1)');
                banner.classList.add('has-tint');
                console.warn("Ambient mode color extraction failed (likely CORS). Using fallback.");
            }
        }, 100);
    }

    function toggleExpand(bannerId, btnElement) {
        const bannerBox = document.getElementById(bannerId);
        const isExpanding = !bannerBox.classList.contains('expanded');
        
        btnElement.innerText = isExpanding ? '▲ COLLAPSE ▲' : '▼ EXPAND ▼';
        btnElement.classList.toggle('active', isExpanding);

        if (isExpanding) {
            const startHeight = bannerBox.offsetHeight;
            
            // Temporarily disable transition to measure target height
            bannerBox.style.transition = 'none';
            bannerBox.style.height = 'auto';
            bannerBox.classList.add('expanded');
            const endHeight = bannerBox.offsetHeight;
            
            // Reset to start height
            bannerBox.style.height = startHeight + 'px';
            
            // Force a reflow to ensure the transition triggers
            void bannerBox.offsetHeight;
            
            // Restore transition and set target height
            bannerBox.style.transition = '';
            bannerBox.style.height = endHeight + 'px';
            
            setTimeout(() => {
                if (btnElement.classList.contains('active')) {
                    bannerBox.style.height = 'auto';
                }
            }, 400);
        } else {
            const startHeight = bannerBox.offsetHeight;
            bannerBox.style.height = startHeight + 'px';
            
            // Force a reflow
            void bannerBox.offsetHeight;
            
            bannerBox.style.height = '600px';
            
            setTimeout(() => {
                if (!btnElement.classList.contains('active')) {
                    bannerBox.classList.remove('expanded');
                    bannerBox.style.height = '';
                }
            }, 400);
        }
    }

    function toggleLuckDrawer(element) {
        element.classList.toggle('expanded');
        const container = element.closest('.pull-list-container');
        if (container) {
            if (element.classList.contains('expanded')) setTimeout(() => container.scrollTo({ top: element.offsetTop - 15, behavior: 'smooth' }), 310);
            checkExpandButtonVisibility(container);
            setTimeout(() => checkExpandButtonVisibility(container), 320); 
        }
    }

    function toggleFilter(bannerId, filterType) {
        const listContainer = document.getElementById(`list-${bannerId}`);
        const filterBox = document.getElementById(`filters-${bannerId}`);
        if (!filterBox) return;
        const btn = Array.from(filterBox.querySelectorAll('.filter-btn')).find(b => {
            const dataF = b.getAttribute('data-filter');
            const txt = (b.textContent || '').trim();
            return dataF === filterType || txt.includes(filterType === 'RU' ? 'RATE-UP' : `${filterType}★`);
        });
        if (btn) btn.classList.toggle('active');
        if (listContainer) updateBlockHeaders(listContainer);
    }

    function updateBlockHeaders(container) {
        if (!container) return;
        const filterBox = document.getElementById(`filters-${container.id.replace('list-', '')}`);
        if (!filterBox) return;
        const buttons = filterBox.querySelectorAll('.filter-btn');
        let filters = { show6: false, show5: false, show4: false, showRU: false };
        buttons.forEach(b => {
            if (b.classList.contains('active')) {
                const dataF = b.getAttribute('data-filter');
                const txt = (b.textContent || '').trim();
                if (dataF === '6' || txt.includes('6★')) filters.show6 = true;
                if (dataF === '5' || txt.includes('5★')) filters.show5 = true;
                if (dataF === '4' || txt.includes('4★')) filters.show4 = true;
                if (dataF === 'RU' || txt.includes('RATE-UP')) filters.showRU = true;
            }
        });

        let currentHeader = null, hasVisibleItems = false, totalVisibleItems = 0;
        const pullList = container.querySelector('.pull-list');
        if (!pullList) return;
        Array.from(pullList.children).forEach(node => {
            if (node.classList.contains('pull-block-header')) {
                if (currentHeader) currentHeader.style.display = hasVisibleItems ? 'inline-block' : 'none';
                currentHeader = node; hasVisibleItems = false; 
            } else if (node.classList.contains('pull-item')) {
                let isVisible = (filters.show6 && node.classList.contains('rarity-6-item')) ||
                                (filters.show5 && node.classList.contains('rarity-5-item')) ||
                                (filters.show4 && Array.from(node.classList).some(c => ['rarity-4-item','rarity-3-item','rarity-2-item','rarity-1-item'].includes(c))) ||
                                (filters.showRU && node.classList.contains('is-rate-up-item'));
                node.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) { hasVisibleItems = true; totalVisibleItems++; }
            }
        });
        
        if (currentHeader) currentHeader.style.display = hasVisibleItems ? 'inline-block' : 'none';
        const emptyMsg = container.querySelector('.empty-filter-msg');
        if (emptyMsg) emptyMsg.style.display = totalVisibleItems === 0 ? 'block' : 'none';
        checkExpandButtonVisibility(container);
    }
