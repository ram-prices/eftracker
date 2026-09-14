    // Add resize listener for dynamic overflow detection
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(checkSummaryOverflow, 100);
    });

    document.addEventListener("DOMContentLoaded", async () => {
        // Migrate old config keys
        migrateOldConfig();
        const config = getEfConfig();

        // Initialize settings UI
        const summaryExpandBtn = document.getElementById('toggleSummaryExpandBtn');
        if (summaryExpandBtn) {
            summaryExpandBtn.innerText = config.summaryExpandedByDefault ? 'ON' : 'OFF';
            summaryExpandBtn.classList.toggle('active', config.summaryExpandedByDefault);
        }
        const summaryRowsSlider = document.getElementById('summaryRowsSlider');
        if (summaryRowsSlider) {
            summaryRowsSlider.value = config.summaryMaxRows;
            document.getElementById('summaryRowsVal').innerText = config.summaryMaxRows;
        }
        const bannerLimitSlider = document.getElementById('bannerLimitSlider');
        if (bannerLimitSlider) {
            bannerLimitSlider.value = config.summaryBannerLimit >= 50 ? 50 : config.summaryBannerLimit;
            document.getElementById('bannerLimitVal').innerText = config.summaryBannerLimit >= 50 ? 'ALL' : config.summaryBannerLimit;
        }

        // Load custom images and manual username
        loadCustomImages();
        if (config.manualUser) document.getElementById('display-username').innerText = config.manualUser;

        // Load default banner if no custom banner is available
        const bannerEl = document.querySelector('.hero-banner');
        if (bannerEl && !config.customBanner) {
            const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            let currentIndex = 0;

            function tryNextImage() {
                if (currentIndex >= extensions.length) return;
                const img = new Image();
                img.onload = () => {
                    // Re-check if a custom banner was added in the meantime (unlikely but safe)
                    if (!getEfConfig().customBanner) {
                        bannerEl.style.backgroundImage = `url('banner.${extensions[currentIndex]}')`;
                    }
                };
                img.onerror = () => {
                    currentIndex++;
                    tryNextImage();
                };
                img.src = `banner.${extensions[currentIndex]}`;
            }
            tryNextImage();
        }

        // Initialize tab slider position
        updateTabSlider(currentTab);

        // Populate export list
        populateExportList();

        // Sync remote banners database from GitHub repository
        await syncRemoteBannersJson();

        if (config.showTimestamps === true) {
            document.body.classList.add('show-timestamps');
            const btn = document.getElementById('toggleTimeBtn');
            if (btn) { btn.classList.add('active'); btn.innerText = 'ON'; }
        }

        const savedBlur = config.bannerBlur;
        if (savedBlur !== undefined && savedBlur !== null) {
            updateBannerBlur(savedBlur);
            const slider = document.getElementById('blurSlider');
            if (slider) slider.value = savedBlur;
        }

        const savedPos = config.bannerPos;
        if (savedPos !== undefined && savedPos !== null) {
            updateBannerPos(savedPos);
            const slider = document.getElementById('posSlider');
            if (slider) slider.value = savedPos;
        }

        const savedData = localStorage.getItem('efTrackerData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                processAndLoadData(data, config.trackerUser);
            }
            catch (err) { console.error("Cache corrupt:", err); localStorage.removeItem('efTrackerData'); }
        } else {
            // No data, show settings by default
            const settingsSec = document.getElementById('settings-section');
            settingsSec.style.display = 'block';
            settingsSec.classList.add('first-visit');
            visitedTabs.add('settings');

            setTimeout(() => {
                settingsSec.classList.remove('first-visit');
            }, 1500);

            updateTabButtonStyles('settings');
            updateTabSlider('settings');
        }
    });
