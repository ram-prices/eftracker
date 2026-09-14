    function toggleTimestamps() {
        const isEnabled = document.body.classList.toggle('show-timestamps');
        updateEfConfig('showTimestamps', isEnabled);
        const btn = document.getElementById('toggleTimeBtn');
        if (btn) { btn.classList.toggle('active', isEnabled); btn.innerText = isEnabled ? 'ON' : 'OFF'; }
        setTimeout(() => document.querySelectorAll('.pull-list-container').forEach(checkExpandButtonVisibility), 320);
    }

    function updateBannerBlur(val) {
        document.documentElement.style.setProperty('--banner-blur', `${val}px`);
        const valEl = document.getElementById('blurVal');
        if (valEl) valEl.innerText = `${val}px`;
        updateEfConfig('bannerBlur', val);
    }

    function updateBannerPos(val) {
        document.documentElement.style.setProperty('--banner-pos-y', `${val}%`);
        const valEl = document.getElementById('posVal');
        if (valEl) valEl.innerText = `${val}%`;
        updateEfConfig('bannerPos', val);
    }


    function updateBannerLimit(val) {
        const limit = parseInt(val);
        updateEfConfig('summaryBannerLimit', limit);
        document.getElementById('bannerLimitVal').innerText = limit >= 50 ? 'ALL' : limit;
        if (lastLoadedData) processAndLoadData(lastLoadedData);
    }

    // ==============================================================================
    // USER CUSTOMIZATION (MANUAL NAME & IMAGES)
    // ==============================================================================
    function saveManualUsername(name) {
        updateEfConfig('manualUser', name);
    }

    function handleImageUpload(input, type) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 1.5 * 1024 * 1024) {
            alert("Image is too large. Please select an image smaller than 1.5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            if (type === 'avatar') {
                updateEfConfig('customAvatar', base64);
                document.getElementById('display-avatar').src = base64;
            } else if (type === 'banner') {
                updateEfConfig('customBanner', base64);
                document.querySelector('.hero-banner').style.backgroundImage = `url('${base64}')`;
            }
        };
        reader.readAsDataURL(file);
    }

    function resetImages() {
        const config = getEfConfig();
        delete config.customAvatar;
        delete config.customBanner;
        localStorage.setItem('efConfig', JSON.stringify(config));
        location.reload();
    }

    function loadCustomImages() {
        const config = getEfConfig();
        if (config.customAvatar) document.getElementById('display-avatar').src = config.customAvatar;
        if (config.customBanner) document.querySelector('.hero-banner').style.backgroundImage = `url('${config.customBanner}')`;
    }

    // ==============================================================================
    // DATA EXPORT LOGIC
    // ==============================================================================
    function populateExportList() {
        const list = document.getElementById('exportList');
        if (!list) return;
        list.innerHTML = '';

        const items = [];
        if (localStorage.getItem('efTrackerData')) items.push({ id: 'data', label: 'PULL HISTORY DATA' });

        const config = getEfConfig();
        if (Object.keys(config).length > 0) {
            // Split config into settings and images for selective export
            const settingsKeys = ['showTimestamps', 'bannerBlur', 'bannerPos', 'manualUser', 'trackerUser'];
            if (settingsKeys.some(k => k in config)) items.push({ id: 'settings', label: 'APP SETTINGS (BLUR, POS, NAME, ETC)' });
            if (config.customAvatar) items.push({ id: 'avatar', label: 'PROFILE AVATAR IMAGE' });
            if (config.customBanner) items.push({ id: 'banner', label: 'HERO BANNER IMAGE' });
        }

        if (items.length === 0) {
            list.innerHTML = '<div style="color: var(--text-dim); font-size: 11px;">NO TRACKER DATA FOUND IN STORAGE.</div>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '10px';
            div.style.padding = '4px 0';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `export-${item.id}`;
            checkbox.checked = true;
            checkbox.style.accentColor = 'var(--accent-blue)';

            const label = document.createElement('label');
            label.htmlFor = `export-${item.id}`;
            label.innerText = item.label;
            label.style.fontSize = '12px';
            label.style.cursor = 'pointer';

            div.appendChild(checkbox);
            div.appendChild(label);
            list.appendChild(div);
        });
    }

    async function exportSelectedData() {
        const config = getEfConfig();
        const zip = new JSZip();
        let filesToDownload = [];

        // 1. Prepare Pull History Data
        if (document.getElementById('export-data')?.checked) {
            const data = localStorage.getItem('efTrackerData');
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    // Reorganize to match user's requested format: weapons first, then characters at root
                    const cleanData = {
                        weapons: parsedData.weapons || [],
                        characters: parsedData.characters || []
                    };
                    filesToDownload.push({
                        name: 'pull_history.json',
                        content: JSON.stringify(cleanData, null, 4), // Use 4 spaces for exact match to user's sample
                        type: 'text'
                    });
                } catch (e) { console.error("Export parse error:", e); }
            }
        }

        // 2. Prepare App Settings
        if (document.getElementById('export-settings')?.checked) {
            const settings = {};
            ['showTimestamps', 'bannerBlur', 'bannerPos', 'manualUser', 'trackerUser'].forEach(k => {
                if (k in config) settings[k] = config[k];
            });
            filesToDownload.push({
                name: 'app_settings.json',
                content: JSON.stringify({ efConfig: settings }, null, 4),
                type: 'text'
            });
        }

        // 3. Prepare Images
        const addImage = (base64, filename) => {
            const match = base64.match(/^data:(image\/\w+);base64,/);
            if (!match) return;
            const extension = match[1].split('/')[1];
            filesToDownload.push({
                name: `${filename}.${extension}`,
                content: base64.split(',')[1],
                type: 'base64'
            });
        };

        if (document.getElementById('export-avatar')?.checked && config.customAvatar) {
            addImage(config.customAvatar, 'avatar');
        }

        if (document.getElementById('export-banner')?.checked && config.customBanner) {
            addImage(config.customBanner, 'banner');
        }

        if (filesToDownload.length === 0) {
            alert("No data selected for export.");
            return;
        }

        // 4. Execute Download
        if (filesToDownload.length === 1 && filesToDownload[0].type === 'text') {
            // If only one text file (like pull history), download directly as JSON
            const blob = new Blob([filesToDownload[0].content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filesToDownload[0].name === 'pull_history.json' ?
                `endfield_pulls_${new Date().toISOString().split('T')[0]}.json` : filesToDownload[0].name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files or images: Bundle into ZIP
            filesToDownload.forEach(f => {
                if (f.type === 'base64') zip.file(f.name, f.content, { base64: true });
                else zip.file(f.name, f.content);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ef_tracker_backup_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // ==============================================================================
    // INITIALIZATION & FILE HANDLING
    // ==============================================================================
    async function handleFileUpload(event) {
        const file = event.target.files[0]; if (!file) return;
        let fn = file.name.match(/endfield_pulls_|endfield pulls /) ? file.name.split(/endfield_pulls_|endfield pulls /)[1].replace('.json', '').replace(/_/g, ' ') : "";

        const processJson = (jsonText) => {
            try {
                const parsed = JSON.parse(jsonText);
                let dataToProcess = null;
                let configToProcess = null;

                // 1. Check for "Clean" format (weapons/characters at root)
                if (parsed.weapons || parsed.characters) {
                    dataToProcess = {
                        weapons: parsed.weapons || [],
                        characters: parsed.characters || []
                    };
                    localStorage.setItem('efTrackerData', JSON.stringify(dataToProcess));
                }

                // 2. Check for "Wrapped" format (efTrackerData/efConfig)
                if (parsed.efTrackerData || parsed.efConfig) {
                    if (parsed.efTrackerData) {
                        const trackerData = typeof parsed.efTrackerData === 'string' ? JSON.parse(parsed.efTrackerData) : parsed.efTrackerData;
                        localStorage.setItem('efTrackerData', JSON.stringify(trackerData));
                        dataToProcess = trackerData;
                    }
                    if (parsed.efConfig) configToProcess = parsed.efConfig;
                }

                // 3. Fallback for legacy flat array
                if (!dataToProcess && Array.isArray(parsed)) {
                    localStorage.setItem('efTrackerData', jsonText);
                    dataToProcess = parsed;
                }

                if (configToProcess) {
                    const currentConfig = getEfConfig();
                    const mergedConfig = { ...currentConfig, ...configToProcess };
                    localStorage.setItem('efConfig', JSON.stringify(mergedConfig));
                }

                if (fn) updateEfConfig('trackerUser', fn);
                location.reload();
            } catch (err) {
                console.error("Error processing JSON:", err);
                alert("Error reading file! Check the developer console for details.");
            }
        };

        if (file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                let combinedData = {};

                // Check for all possible JSON files in ZIP
                const pullFile = zip.file('pull_history.json') || zip.file('backup_data.json');
                const settingsFile = zip.file('app_settings.json') || zip.file('settings.json');

                if (pullFile) {
                    const text = await pullFile.async('string');
                    const parsed = JSON.parse(text);
                    // Merge based on structure
                    if (parsed.weapons || parsed.characters) {
                        combinedData.weapons = parsed.weapons;
                        combinedData.characters = parsed.characters;
                    } else if (parsed.efTrackerData) {
                        combinedData.efTrackerData = parsed.efTrackerData;
                    }
                }

                if (settingsFile) {
                    const text = await settingsFile.async('string');
                    const parsed = JSON.parse(text);
                    combinedData.efConfig = parsed.efConfig || parsed;
                }

                // Images
                const avatarFile = zip.file(/avatar\.(png|jpg|jpeg|webp|gif)$/i)[0];
                const bannerFile = zip.file(/banner\.(png|jpg|jpeg|webp|gif)$/i)[0];

                if (avatarFile || bannerFile) combinedData.efConfig = combinedData.efConfig || {};

                if (avatarFile) {
                    const base64 = await avatarFile.async('base64');
                    const ext = avatarFile.name.split('.').pop();
                    combinedData.efConfig.customAvatar = `data:image/${ext};base64,${base64}`;
                }
                if (bannerFile) {
                    const base64 = await bannerFile.async('base64');
                    const ext = bannerFile.name.split('.').pop();
                    combinedData.efConfig.customBanner = `data:image/${ext};base64,${base64}`;
                }

                if (Object.keys(combinedData).length > 0) {
                    processJson(JSON.stringify(combinedData));
                } else {
                    alert("Invalid ZIP file: No recognizable tracker data found.");
                }
            } catch (err) {
                console.error("Error loading ZIP:", err);
                alert("Error reading ZIP file!");
            }
        } else {
            const reader = new FileReader();
            reader.onload = e => processJson(e.target.result);
            reader.readAsText(file);
        }
    }

    function clearSavedData() {
        if (confirm("Are you sure you want to clear your saved pull history from this browser?")) {
            localStorage.removeItem('efTrackerData');
            const config = getEfConfig();
            delete config.trackerUser;
            localStorage.setItem('efConfig', JSON.stringify(config));
            location.reload();
        }
    }
