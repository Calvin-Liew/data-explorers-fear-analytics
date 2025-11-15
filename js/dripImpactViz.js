
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
        const signalCol = findCol(cols, ["horror[_ ]?signal", "^signal$","name","feature"], cols[0]);
        const impactCol = findCol(cols, ["overall[_ ]?impact","impact","score","effect","intensity"], cols[1]);

        const rows = raw.map(d => ({
            signal: String(d[signalCol] ?? "").trim(),
            impact: +d[impactCol] || 0
        })).filter(d => d.signal);

        return rows;
    }

    function drawDrip(selector, rows, sortMode) {
        const host = d3.select(selector);
        host.selectAll("*").remove();

        if (!rows.length) {
            host.append("div").attr("class","error").text("No rows to display.");
            return;
        }

        
        let tooltip = d3.select("body").select(".drip-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body")
                .append("div")
                .attr("class", "drip-tooltip")
                .style("position", "fixed")
                .style("opacity", 0)
                .style("pointer-events", "none")
                .style("background", "rgba(10, 0, 5, 0.95)")
                .style("border", "2px solid #ff1f6b")
                .style("border-radius", "8px")
                .style("padding", "12px 16px")
                .style("font-family", "'Special Elite', monospace")
                .style("color", "#ffe5e5")
                .style("font-size", "13px")
                .style("box-shadow", "0 0 20px rgba(255, 31, 107, 0.6)")
                .style("z-index", "10000")
                .style("max-width", "250px")
                .style("word-wrap", "break-word")
                .style("transform", "translateZ(0)"); 
        } else {
            tooltip.style("opacity", 0);
        }
        
        
        function positionTooltip(event) {
            const tooltipNode = tooltip.node();
            if (!tooltipNode) return;
            
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.pageXOffset || 0;
            const scrollY = window.pageYOffset || 0;
            
            
            const x = (event.clientX || 0) + 15;
            const y = (event.clientY || 0) - 28;
            
            
            tooltip.style("left", "0px").style("top", "0px");
            const rect = tooltipNode.getBoundingClientRect();
            
            
            let finalX = Math.max(10, Math.min(x, viewportWidth - rect.width - 10));
            let finalY = Math.max(10, Math.min(y, viewportHeight - rect.height - 10));
            
            tooltip.style("left", finalX + "px").style("top", finalY + "px");
        }

        const margin = { top: 40, right: 40, bottom: 100, left: 40 };
        const cw = host.node() ? host.node().clientWidth : 0;
        const width = Math.max(800, (cw || 1200)) - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = host.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("background", "rgba(5, 0, 10, 0.3)")
            .style("position", "relative")
            .style("display", "block");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const defs = svg.append("defs");
        
        
        const gradId = "drip-grad-" + Math.random().toString(36).slice(2, 8);
        const grad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("x1", "0%").attr("x2", "0%")
            .attr("y1", "0%").attr("y2", "100%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", "#ff1f6b").attr("stop-opacity", 0.95);
        grad.append("stop").attr("offset", "50%").attr("stop-color", "#d61a1a").attr("stop-opacity", 0.9);
        grad.append("stop").attr("offset", "100%").attr("stop-color", "#6a0a0a").attr("stop-opacity", 0.85);
        const fillUrl = `url(#${gradId})`;

        
        const glowFilter = defs.append("filter")
            .attr("id", "drip-glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        glowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "3")
            .attr("result", "coloredBlur");
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        
        const animatedGradId = "drip-animated-grad-" + Math.random().toString(36).slice(2, 8);
        const animatedGrad = defs.append("linearGradient")
            .attr("id", animatedGradId)
            .attr("x1", "0%").attr("x2", "0%")
            .attr("y1", "0%").attr("y2", "100%")
            .attr("gradientUnits", "userSpaceOnUse");
        animatedGrad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ff1f6b")
            .attr("stop-opacity", 0.95)
            .attr("class", "grad-stop-1");
        animatedGrad.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#d61a1a")
            .attr("stop-opacity", 0.9)
            .attr("class", "grad-stop-2");
        animatedGrad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#6a0a0a")
            .attr("stop-opacity", 0.85)
            .attr("class", "grad-stop-3");

        
        function animateGradient() {
            animatedGrad.selectAll("stop")
                .transition()
                .duration(2000)
                .ease(d3.easeSinInOut)
                .attr("stop-opacity", function(d, i) {
                    return i === 0 ? 1 : i === 1 ? 0.95 : 0.9;
                })
                .transition()
                .duration(2000)
                .ease(d3.easeSinInOut)
                .attr("stop-opacity", function(d, i) {
                    return i === 0 ? 0.95 : i === 1 ? 0.9 : 0.85;
                })
                .on("end", animateGradient);
        }
        animateGradient();

        const data = rows.slice().sort((a, b) => {
            if (sortMode === "name") return d3.ascending(a.signal, b.signal);
            return d3.descending(a.impact, b.impact);
        });

        const x = d3.scalePoint().domain(d3.range(data.length)).range([0, width]).padding(0.3);
        const maxImpact = Math.max(1e-9, d3.max(data, d => d.impact) || 0);
        const yScale = d3.scaleLinear().domain([0, maxImpact]).range([0, Math.max(80, height * 0.5)]);
        const yBase = Math.min(height - 60, height * 0.75);

        
        g.append("rect")
            .attr("x", 0).attr("y", yBase)
            .attr("width", width).attr("height", yScale(maxImpact) + 20)
            .attr("fill", "rgba(30, 0, 10, 0.25)")
            .attr("stroke", "rgba(255, 31, 107, 0.15)")
            .attr("stroke-width", 1);

        
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const yPos = yBase + (yScale(maxImpact) / gridLines) * i;
            g.append("line")
                .attr("x1", 0).attr("x2", width)
                .attr("y1", yPos).attr("y2", yPos)
                .attr("stroke", "rgba(255, 31, 107, 0.1)")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "2,4");
        }

        
        const area = d3.area()
            .x((d, i) => x(i))
            .y0(yBase)
            .y1((d, i) => yBase + yScale(d.impact))
            .curve(d3.curveCatmullRom.alpha(0.6));

        const areaPathD = area(data);

        
        const clipId = "drip-clip-" + Math.random().toString(36).slice(2, 8);
        defs.append("clipPath")
            .attr("id", clipId)
            .append("path")
            .attr("d", areaPathD);

        
        const dripGroup = g.append("g")
            .attr("clip-path", `url(#${clipId})`);

        const k = Math.max(2, Math.floor(data.length / 25));
        const topSignals = new Set(data.slice(0, Math.min(10, data.length)).map(d => d.signal));
        
        data.forEach((d, i) => {
            if (i % k !== 0) return;
            const depth = Math.max(15, yScale(d.impact) * 1.4);
            const cx = x(i);
            const edgeY = yBase + yScale(d.impact);
            const isTopSignal = topSignals.has(d.signal);

            const p = d3.path();
            p.moveTo(cx - 5, edgeY - 0.5);
            p.bezierCurveTo(cx - 10, edgeY + depth * 0.25, cx - 7, edgeY + depth * 0.65, cx, edgeY + depth);
            p.bezierCurveTo(cx + 7, edgeY + depth * 0.65, cx + 10, edgeY + depth * 0.25, cx + 5, edgeY - 0.5);

            const drip = dripGroup.append("path")
                .attr("d", p.toString())
                .attr("fill", fillUrl)
                .attr("opacity", isTopSignal ? 0.95 : 0.75)
                .style("filter", isTopSignal ? "url(#drip-glow) brightness(1.1)" : "url(#drip-glow)")
                .style("cursor", "pointer")
                .style("pointer-events", "all");

            let pulseTransition = null;
            let isHovered = false;

            
            function pulseDrip() {
                if (isHovered) return;
                pulseTransition = drip.transition()
                    .duration(2000 + Math.random() * 500)
                    .ease(d3.easeSinInOut)
                    .attr("opacity", isTopSignal ? 1 : 0.85)
                    .transition()
                    .duration(2000 + Math.random() * 500)
                    .ease(d3.easeSinInOut)
                    .attr("opacity", isTopSignal ? 0.95 : 0.75)
                    .on("end", pulseDrip);
            }
            pulseDrip();

            
            drip.on("mouseover", function(event) {
                isHovered = true;
                if (pulseTransition) pulseTransition.interrupt();
                
                
                d3.select(this)
                    .attr("opacity", 1)
                    .style("filter", isTopSignal ? "url(#drip-glow) brightness(1.3)" : "url(#drip-glow) brightness(1.2)");
                
                tooltip.html(`
                    <div style="text-align: center;">
                        <strong style="color: #ff1f6b; font-size: 16px; display: block; margin-bottom: 6px;">${d.signal}</strong>
                        <span style="color: #ffe5e5;">Impact: <strong style="color: #ff1f6b;">${d.impact.toFixed(3)}</strong></span>
                        ${isTopSignal ? '<br/><span style="color: #ff1f6b; font-size: 11px;">⭐ Top Signal</span>' : ''}
                    </div>
                `);
                positionTooltip(event);
                tooltip.transition().duration(150).style("opacity", 1);
            })
            .on("mousemove", function(event) {
                positionTooltip(event);
            })
            .on("mouseout", function() {
                isHovered = false;
                
                d3.select(this)
                    .attr("opacity", isTopSignal ? 0.95 : 0.75)
                    .style("filter", isTopSignal ? "url(#drip-glow) brightness(1.1)" : "url(#drip-glow)");
                
                tooltip.transition().duration(200).style("opacity", 0);
                
                setTimeout(() => {
                    if (!isHovered) pulseDrip();
                }, 100);
            });
        });

        
        const strip = g.append("path")
            .attr("d", areaPathD)
            .attr("fill", `url(#${animatedGradId})`)
            .attr("stroke", "#ff1f6b")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.4)
            .style("filter", "url(#drip-glow)")
            .style("mix-blend-mode", "screen")
            .style("cursor", "pointer")
            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicOut)
            .attr("opacity", 1);

        
        const hoverAreas = g.append("g").attr("class", "hover-areas");
        data.forEach((d, i) => {
            const cx = x(i);
            const barHeight = yScale(d.impact);
            hoverAreas.append("rect")
                .attr("x", cx - x.step() / 2 + 2)
                .attr("y", yBase)
                .attr("width", x.step() - 4)
                .attr("height", barHeight + 5)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    strip.attr("stroke-opacity", 0.7);
                    tooltip.html(`
                        <div style="text-align: center;">
                            <strong style="color: #ff1f6b; font-size: 16px; display: block; margin-bottom: 6px;">${d.signal}</strong>
                            <span style="color: #ffe5e5;">Impact: <strong style="color: #ff1f6b;">${d.impact.toFixed(3)}</strong></span><br/>
                            <span style="color: #ffe5e5; font-size: 11px; opacity: 0.8;">Rank: ${i + 1} of ${data.length}</span>
                        </div>
                    `);
                    positionTooltip(event);
                    tooltip.transition().duration(150).style("opacity", 1);
                })
                .on("mousemove", function(event) {
                    positionTooltip(event);
                })
                .on("mouseout", function() {
                    strip.attr("stroke-opacity", 0.4);
                    tooltip.transition().duration(200).style("opacity", 0);
                });
        });

        
        const highlightLine = g.append("path")
            .attr("d", d3.line()
                .x((d, i) => x(i))
                .y((d, i) => yBase + yScale(d.impact))
                .curve(d3.curveCatmullRom.alpha(0.6))(data))
            .attr("fill", "none")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.3)
            .style("filter", "drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))")
            .attr("opacity", 0)
            .transition()
            .delay(500)
            .duration(800)
            .attr("opacity", 1);

        
        g.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", yBase).attr("y2", yBase)
            .attr("stroke", "#ff1f6b")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.5)
            .style("filter", "drop-shadow(0 0 4px rgba(255, 31, 107, 0.6))");

        
        const labelEvery = Math.max(1, Math.floor(data.length / 15));
        
        g.selectAll(".drip-label")
            .data(data.map((d, i) => ({ ...d, i, isTop: topSignals.has(d.signal) })).filter(d => d.i % labelEvery === 0))
            .enter().append("text")
            .attr("class", d => `drip-label ${d.isTop ? 'top-signal' : ''}`)
            .attr("x", d => x(d.i))
            .attr("y", yBase - 8)
            .attr("transform", d => `rotate(-45, ${x(d.i)}, ${yBase - 8})`)
            .attr("text-anchor", "start")
            .style("font-family", "'Special Elite', monospace")
            .style("font-size", d => d.isTop ? "12px" : "11px")
            .style("fill", d => d.isTop ? "#ffffff" : "#ff1f6b")
            .style("text-shadow", d => d.isTop 
                ? "0 0 10px rgba(255, 31, 107, 1), 0 0 5px rgba(255, 255, 255, 0.5)" 
                : "0 0 6px rgba(255, 31, 107, 0.8)")
            .style("font-weight", d => d.isTop ? "700" : "400")
            .style("cursor", "pointer")
            .attr("opacity", 0)
            .text(d => d.signal)
            .on("mouseover", function(event, d) {
                
                d3.select(this)
                    .style("fill", "#ffffff")
                    .style("text-shadow", "0 0 12px rgba(255, 31, 107, 1), 0 0 6px rgba(255, 255, 255, 0.6)");
                
                tooltip.html(`
                    <div style="text-align: center;">
                        <strong style="color: #ff1f6b; font-size: 16px; display: block; margin-bottom: 6px;">${d.signal}</strong>
                        <span style="color: #ffe5e5;">Impact: <strong style="color: #ff1f6b;">${d.impact.toFixed(3)}</strong></span>
                        ${d.isTop ? '<br/><span style="color: #ff1f6b; font-size: 11px;">⭐ Top Signal</span>' : ''}
                    </div>
                `);
                positionTooltip(event);
                tooltip.transition().duration(150).style("opacity", 1);
            })
            .on("mousemove", function(event) {
                positionTooltip(event);
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .style("fill", d.isTop ? "#ffffff" : "#ff1f6b")
                    .style("text-shadow", d.isTop 
                        ? "0 0 10px rgba(255, 31, 107, 1), 0 0 5px rgba(255, 255, 255, 0.5)" 
                        : "0 0 6px rgba(255, 31, 107, 0.8)");
                tooltip.transition().duration(200).style("opacity", 0);
            })
            .transition()
            .delay((d, i) => i * 30)
            .duration(400)
            .attr("opacity", 1);

        
        data.forEach((d, idx) => {
            const i = idx;
            const isTop = topSignals.has(d.signal);
            const yPos = yBase + yScale(d.impact);
            
            
            const labelY = yPos - 15;
            
            const marker = g.append("g")
                .attr("class", "impact-marker")
                .attr("transform", `translate(${x(i)}, ${labelY})`)
                .attr("opacity", 0);
            
            
            if (isTop) {
                marker.append("circle")
                    .attr("r", 4)
                    .attr("fill", "#ff1f6b")
                    .style("filter", "drop-shadow(0 0 6px rgba(255, 31, 107, 0.9))");
            }
            
            
            const textBg = marker.append("rect")
                .attr("x", -18)
                .attr("y", -8)
                .attr("width", 36)
                .attr("height", 12)
                .attr("fill", isTop ? "rgba(139, 0, 0, 0.85)" : "rgba(0, 0, 0, 0.7)")
                .attr("rx", 2)
                .style("filter", "drop-shadow(0 0 4px rgba(255, 31, 107, 0.4))");
            
            marker.append("text")
                .attr("y", 0)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("font-family", "'Special Elite', monospace")
                .style("font-size", isTop ? "10px" : "9px")
                .style("fill", isTop ? "#ffffff" : "#ff1f6b")
                .style("font-weight", isTop ? "700" : "500")
                .style("stroke", isTop ? "#8b0000" : "#000000")
                .style("stroke-width", isTop ? "0.5px" : "0.3px")
                .style("paint-order", "stroke fill")
                .style("text-shadow", isTop 
                    ? "0 0 4px rgba(255, 255, 255, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)"
                    : "0 0 3px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 31, 107, 0.6)")
                .text(d.impact.toFixed(2));
            
            marker.transition()
                .delay(1000 + idx * 15)
                .duration(600)
                .attr("opacity", 1);
        });
    }

    function init() {
        d3.csv(CSV_URL, d3.autoType).then(raw => {
            const rows = process(raw);
            const sel = d3.select("#drip-sort");
            sel.property("value", "impact");

            let isAnimating = false;
            const draw = () => {
                if (isAnimating) return;
                isAnimating = true;
                
                const currentViz = d3.select(DRIP_SEL).select("svg");
                if (!currentViz.empty()) {
                    currentViz.transition()
                        .duration(300)
                        .style("opacity", 0)
                        .on("end", () => {
                            drawDrip(DRIP_SEL, rows, sel.property("value"));
                            isAnimating = false;
                        });
                } else {
                    drawDrip(DRIP_SEL, rows, sel.property("value"));
                    isAnimating = false;
                }
            };
            
            draw();
            sel.on("change", draw);

        }).catch(err => {
            console.error("Drip load error", err);
            d3.select(DRIP_SEL).append("div")
                .attr("class", "error")
                .style("color", "#ff1f6b")
                .style("font-family", "'Special Elite', monospace")
                .style("padding", "2rem")
                .text("⚠ Drip visualization failed to load. Check console for details.");
        });
    }

    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
})();
