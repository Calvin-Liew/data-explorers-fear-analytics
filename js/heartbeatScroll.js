// js/heartbeatScroll.js

(function () {
    "use strict";

    
    const HEARTBEAT_HEIGHT = 60; 
    const Y_CENTER = HEARTBEAT_HEIGHT / 2;
    
    const ECG_PRESET = {
        A: 20,      
        cycle: 150,
        step: 2,    
        jitter: 0,  
        Ap: 0.20, Aq: 0.16, Ar: 1.05, As: 0.45, At: 0.38 
    };

    
    let svg, path, totalLen = 0;
    let built = false, ticking = false;



    /**
     *
     * @param {number} y0 
     * @param {number} x0 
     * @param {number} x1 
     * @param {object} preset 
     * @returns {string} - SVG path 'd' attribute string
     */
    function buildSegmentPolylineH(y0, x0, x1, preset) {
        const { A, cycle, step, jitter, Ap, Aq, Ar, As, At } = preset;
        const out = [];
        const s = (t) => t * t * (3 - 2 * t); // Smoothstep function

        function phaseOffset(ph) {
            let yOffset = 0;
            if (ph < 0.14) {
                yOffset -= A * Ap * Math.sin(Math.PI * (ph / 0.14));
            } else if (ph >= 0.22 && ph < 0.26) {
                const t = (ph - 0.22) / 0.04;
                yOffset += A * Aq * s(t);
            } else if (ph >= 0.26 && ph < 0.30) {
                const t = (ph - 0.26) / 0.04;
                yOffset -= A * Ar * (1 - t);
            } else if (ph >= 0.30 && ph < 0.35) {
                const t = (ph - 0.30) / 0.05;
                yOffset += A * As * (t < 0.5 ? 2 * t : 2 * (1 - t));
            } else if (ph >= 0.66 && ph < 0.90) {
                const t = (ph - 0.66) / 0.24;
                yOffset -= A * At * Math.sin(Math.PI * t);
            }
            return yOffset;
        }

        let x = x0;
        while (x <= x1) {
            const dx = x - x0;
            const ph = (dx % cycle) / cycle;
            let y = y0 + phaseOffset(ph);
            y += (Math.random() - 0.5) * jitter;
            out.push(`L ${x.toFixed(2)},${y.toFixed(2)}`);
            x += step;
        }
        return out.join(' ');
    }


    function buildSVG() {
        const container = document.getElementById('heartbeat-container');
        if (!container || !window.d3) return;

        const docW = document.documentElement.clientWidth;

        svg = d3.select('#heartbeat-svg')
            .attr('width', docW)
            .attr('height', HEARTBEAT_HEIGHT)
            .attr('viewBox', `0 0 ${docW} ${HEARTBEAT_HEIGHT}`);

        const dParts = [];
        dParts.push(`M 0,${Y_CENTER}`);
        dParts.push(buildSegmentPolylineH(Y_CENTER, 0, docW, ECG_PRESET));

        if (path) path.remove();
        path = svg.append('path')
            .attr('d', dParts.join(' '))
            .attr('stroke', 'url(#heartbeat-gradient)')
            .attr('stroke-width', 2.5)
            .attr('fill', 'none')
            .style('filter', 'drop-shadow(0 0 4px rgba(255,51,68,.8))');


        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "heartbeat-gradient");
        linearGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8b0000");
        linearGradient.append("stop").attr("offset", "100%").attr("stop-color", "#ff4444");

        totalLen = path.node().getTotalLength();
        path.attr('stroke-dasharray', `${totalLen} ${totalLen}`)
            .attr('stroke-dashoffset', totalLen);

        built = true;
        update();
    }


    function update() {
        if (!built || !path || ticking) return;

        ticking = true;
        requestAnimationFrame(() => {
            const scrollRoot = document.scrollingElement || document.documentElement;
            const scrollTop = scrollRoot.scrollTop;
            const docH = scrollRoot.scrollHeight;
            const viewH = scrollRoot.clientHeight;

            const scrollableHeight = docH - viewH;
            const progress = scrollableHeight > 0 ? scrollTop / scrollableHeight : 1;

            const litLength = totalLen * progress;
            path.attr('stroke-dashoffset', totalLen - litLength);
            
            ticking = false;
        });
    }


    function attachListeners() {
        window.removeEventListener('scroll', update);
        window.removeEventListener('resize', buildSVG);
        
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', buildSVG, { passive: true });
    }


    function init() {
        if (document.readyState === 'complete') {
            buildSVG();
            attachListeners();
        } else {
            window.addEventListener('load', () => {
                buildSVG();
                attachListeners();
            });
        }
    }

    init();

})();