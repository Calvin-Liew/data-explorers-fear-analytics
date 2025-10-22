// js/dripImpactViz.js (REV 3) — fixes empty gradient / zero-width / column-name issues
(function () {
    const DRIP_SEL = "#viz-drip";
    const CSV_URL = "data/cleaner_datasets/viz3_horror_effectiveness.csv";

    function findCol(cols, needles, fallback) {
        const rx = new RegExp(needles.join("|"), "i");
        return cols.find(c => rx.test(c)) || fallback;
    }

    function process(raw) {
        if (!raw || !raw.length) return [];
        const cols = Object.keys(raw[0]);
        // Your file has Horror_Signal + Overall_Impact (but keep it flexible)
        const signalCol = findCol(cols, ["horror[_ ]?signal", "^signal$","name","feature"], cols[0]);
        const impactCol = findCol(cols, ["overall[_ ]?impact","impact","score","effect","intensity"], cols[1]);

        const rows = raw.map(d => ({
            signal: String(d[signalCol] ?? "").trim(),
            impact: +d[impactCol] || 0
        })).filter(d => d.signal);

        return rows;
    }

    function makeGradient(defs, id) {
        const grad = defs.append("linearGradient")
            .attr("id", id)
            .attr("x1", "0%").attr("x2", "0%")
            .attr("y1", "0%").attr("y2", "100%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", "#d61a1a").attr("stop-opacity", 0.95);
        grad.append("stop").attr("offset", "100%").attr("stop-color", "#6a0a0a").attr("stop-opacity", 0.9);
        return `url(#${id})`;
    }

    function drawDrip(selector, rows, sortMode) {
        const host = d3.select(selector);
        host.selectAll("*").remove();

        if (!rows.length) {
            host.append("div").attr("class","error").text("No rows to display.");
            return;
        }

        const margin = { top: 20, right: 20, bottom: 80, left: 20 };
        // If container width is zero (e.g., hidden), fall back to 900
        const cw = host.node() ? host.node().clientWidth : 0;
        const width = Math.min(640, (cw || 900)) - margin.left - margin.right;

        const height = 360 - margin.top - margin.bottom;

        const svg = host.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const defs = svg.append("defs");
        // Use a unique gradient id each draw to avoid cache issues
        const gradId = "drip-grad-" + Math.random().toString(36).slice(2, 8);
        const fillUrl = makeGradient(defs, gradId);

        const data = rows.slice().sort((a, b) => {
            if (sortMode === "name") return d3.ascending(a.signal, b.signal);
            return d3.descending(a.impact, b.impact);
        });

        const x = d3.scalePoint().domain(d3.range(data.length)).range([0, width]).padding(0.5);
        const maxImpact = Math.max(1e-9, d3.max(data, d => d.impact) || 0); // avoid 0 domain
        const yScale = d3.scaleLinear().domain([0, maxImpact]).range([0, Math.max(60, height * 0.45)]);
        const yBase = Math.min(height - 40, height * 0.72);

        // Background (helps visibility)
        g.append("rect")
            .attr("x", 0).attr("y", yBase)
            .attr("width", width).attr("height", yScale(maxImpact) + 14)
            .attr("fill", "#1e0a0a")
            .attr("opacity", 0.12);


        // Build the wavy strip
// Build the wavy strip (compute once so we can clip drips to it)
        const area = d3.area()
            .x((d, i) => x(i))
            .y0(yBase)
            .y1((d, i) => yBase + yScale(d.impact))
            .curve(d3.curveCatmullRom.alpha(0.6));

// Path string for clipPath
        const areaPathD = area(data);

// Define a unique clipPath so drips never stick out past the strip
        const clipId = "drip-clip-" + Math.random().toString(36).slice(2, 8);
        defs.append("clipPath")
            .attr("id", clipId)
            .append("path")
            .attr("d", areaPathD);

// Draw DRIPS first, but clipped to the strip area
        const dripGroup = g.append("g")
            .attr("clip-path", `url(#${clipId})`)
            .attr("pointer-events", "none");

        const k = Math.max(2, Math.floor(data.length / 18));
        data.forEach((d, i) => {
            if (i % k !== 0) return;
            const depth = Math.max(12, yScale(d.impact) * 1.35);
            const cx = x(i);
            const edgeY = yBase + yScale(d.impact); // top edge of strip at this point

            const p = d3.path();
            // Start slightly INSIDE the strip so the join is hidden under the fill
            p.moveTo(cx - 4, edgeY - 0.5);
            p.bezierCurveTo(cx - 8, edgeY + depth * 0.25, cx - 6, edgeY + depth * 0.65, cx, edgeY + depth);
            p.bezierCurveTo(cx + 6, edgeY + depth * 0.65, cx + 8, edgeY + depth * 0.25, cx + 4, edgeY - 0.5);

            dripGroup.append("path")
                .attr("d", p.toString())
                .attr("fill", fillUrl)     // use SAME gradient for seamless look
                .attr("opacity", 1);
        });

// Now draw the strip ON TOP to cover any seam
        g.append("path")
            .attr("d", areaPathD)
            .attr("fill", fillUrl)
            .attr("stroke", "#3b1a1a")
            .attr("stroke-opacity", 0.35)
            .attr("pointer-events", "none");


        // Baseline & labels
        g.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", yBase).attr("y2", yBase)
            .attr("stroke", "var(--ink-60, #555)");

        const labelEvery = Math.max(1, Math.floor(data.length / 12));
        g.selectAll(".drip-label")
            .data(data.map((d, i) => ({ ...d, i })).filter(d => d.i % labelEvery === 0))
            .enter().append("text")
            .attr("class", "drip-label")
            .attr("x", d => x(d.i))
            .attr("y", yBase - 12)
            .attr("transform", d => `rotate(-45, ${x(d.i)}, ${yBase - 12})`)

            .attr("text-anchor", "start")
            .text(d => d.signal);

    }

    function init() {
        d3.csv(CSV_URL, d3.autoType).then(raw => {
            const rows = process(raw);
            const sel = d3.select("#drip-sort");
// Default to Name (A–Z)
            sel.property("value", "name");

            const draw = () => drawDrip(DRIP_SEL, rows, sel.property("value"));
            draw();
            sel.on("change", draw);

        }).catch(err => {
            console.error("Drip load error", err);
            d3.select(DRIP_SEL).append("div").attr("class", "error").text("Drip failed to load.");
        });
    }

    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
})();
