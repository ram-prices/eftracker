// ==============================================================================
// PITY MATH (PMF / CDF)
// ==============================================================================
    function buildPMF(maxPulls, hardPity6Star, softPityStart, baseRate, rateUpProb, hardGuaranteePull, startingPity) {
        let pmf = new Array(maxPulls + 1).fill(0);
        let dp = new Array(hardPity6Star + 1).fill(0);
        dp[startingPity] = 1.0;

        for (let i = 1; i <= maxPulls; i++) {
            let nextDp = new Array(hardPity6Star + 1).fill(0);
            let rateUpThisPull = 0;

            for (let pity = 0; pity < hardPity6Star; pity++) {
                if (dp[pity] > 0) {
                    let currentPity = pity + 1;
                    let p6 = baseRate;
                    if (currentPity > softPityStart) p6 = baseRate + 0.05 * (currentPity - softPityStart);
                    if (currentPity >= hardPity6Star) p6 = 1.0;
                    if (p6 > 1.0) p6 = 1.0;

                    let pRU = p6 * rateUpProb;
                    if (hardGuaranteePull !== null && i === hardGuaranteePull) { pRU = 1.0; p6 = 1.0; }

                    let pLose6 = p6 - pRU;
                    let pNone = 1.0 - p6;

                    rateUpThisPull += dp[pity] * pRU;
                    nextDp[0] += dp[pity] * pLose6; 
                    if (currentPity < hardPity6Star) nextDp[currentPity] += dp[pity] * pNone; 
                }
            }
            pmf[i] = rateUpThisPull;
            dp = nextDp;
        }
        return pmf;
    }

    function convolve(pmf1, pmf2) {
        let maxLen = pmf1.length, res = new Array(maxLen).fill(0);
        for (let i = 0; i < maxLen; i++) {
            if (pmf1[i] === 0) continue;
            for (let j = 0; j < maxLen - i; j++) {
                if (pmf2[j] === 0) continue;
                res[i + j] += pmf1[i] * pmf2[j];
            }
        }
        return res;
    }

    pmf_char_any = buildPMF(MAX_PULLS, 80, 65, 0.008, 0.50, null, 0);
    pmf_weap_any = buildPMF(MAX_PULLS, 40, 40, 0.04, 0.25, null, 0); 
    pmf_joint_any = buildPMF(MAX_PULLS, 80, 65, 0.008, 1.0, null, 0);

    function generateCDFGraph(pmf, actualPull) {
        let width = 120, height = 30, cdf = 0, maxX = 0;
        for(let i=0; i<pmf.length; i++) { cdf += pmf[i]; if (cdf >= 0.999) { maxX = i; break; } }
        maxX = Math.max(maxX, actualPull) || 1; 

        let points = [], currentCdf = 0, actualX = 0, actualY = 0;
        for (let i = 0; i <= maxX; i++) {
            if (i < pmf.length) currentCdf += pmf[i];
            let x = (i / maxX) * width, y = height - (currentCdf * height);
            points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            if (i === actualPull) { actualX = x; actualY = y; }
        }
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="luck-graph">
            <polyline points="${points.join(' ')}" fill="none" stroke="rgba(255, 152, 0, 0.2)" stroke-width="2" />
            <polyline points="${points.join(' ')}" fill="none" stroke="var(--accent-orange)" stroke-width="2" class="luck-graph-path" />
            <g class="luck-graph-elements">
                <line x1="${actualX.toFixed(1)}" y1="${actualY.toFixed(1)}" x2="${actualX.toFixed(1)}" y2="${height}" stroke="rgba(255, 152, 0, 0.5)" stroke-width="1" stroke-dasharray="2,2" />
                <circle cx="${actualX.toFixed(1)}" cy="${actualY.toFixed(1)}" r="3" fill="var(--bg-panel)" stroke="#fff" stroke-width="1.5" />
            </g>
        </svg>`;
    }
