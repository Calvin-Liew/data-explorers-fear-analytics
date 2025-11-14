console.log("🔁 stateMachineViz.js LOADED!");

function createStateMachineViz(selector, fearJourneyRaw) {
    "use strict";

    console.log("🔁 Creating Fear State Machine viz on", selector);

    const container = d3.select(selector);

    if (container.empty()) {
        console.error("StateMachineViz: container not found for selector", selector);
        return null;
    }

    // Clear any existing content
    container.selectAll("*").remove();

    const width = 640;
    const height = 420;
    const margin = { top: 80, right: 120, bottom: 80, left: 120 };

    const svg = container
        .append("svg")
        .attr("class", "state-machine-svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    const defs = svg.append("defs");

    // Blood-moon style backdrop to feel like a ritual board
    const bgGradient = defs
        .append("radialGradient")
        .attr("id", "stateMachineBloodMoon")
        .attr("cx", "50%")
        .attr("cy", "30%");

    bgGradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#3b000a");

    bgGradient
        .append("stop")
        .attr("offset", "55%")
        .attr("stop-color", "#120008");

    bgGradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#020003");

    // Glow filter for the "hottest" transitions
    const glow = defs
        .append("filter")
        .attr("id", "stateMachineCellGlow")
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%");

    glow
        .append("feGaussianBlur")
        .attr("stdDeviation", 4)
        .attr("result", "coloredBlur");

    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    svg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#stateMachineBloodMoon)");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Three coarse fear states
    const states = ["Calm", "Unease", "Panic"];
    const stateIcons = {
        Calm: "🕯",
        Unease: "👁",
        Panic: "☠",
    };

    function classifyFear(value) {
        if (value == null || isNaN(value)) return null;
        if (value < 0.3) return "Calm";
        if (value < 0.6) return "Unease";
        return "Panic";
    }

    // Walk scene -> next scene across all films
    const columns = Object.keys(fearJourneyRaw[0]).filter(
        (k) => k !== "scene_position"
    );

    const transitions = {};
    states.forEach((from) => {
        transitions[from] = {};
        states.forEach((to) => {
            transitions[from][to] = 0;
        });
    });

    fearJourneyRaw.forEach((row, rowIndex) => {
        if (rowIndex === fearJourneyRaw.length - 1) return;
        const nextRow = fearJourneyRaw[rowIndex + 1];

        columns.forEach((col) => {
            const f1 = row[col];
            const f2 = nextRow[col];

            if (f1 === "" || f2 === "" || f1 == null || f2 == null) return;

            const from = classifyFear(+f1);
            const to = classifyFear(+f2);

            if (!from || !to) return;
            transitions[from][to] += 1;
        });
    });

    const matrixData = [];
    const rowTotals = {};

    states.forEach((from, rIndex) => {
        const total = states.reduce(
            (acc, to) => acc + (transitions[from][to] || 0),
            0
        );
        rowTotals[from] = total;
        states.forEach((to, cIndex) => {
            const count = transitions[from][to] || 0;
            const prob = total > 0 ? count / total : 0;
            matrixData.push({
                from,
                to,
                row: rIndex,
                col: cIndex,
                count,
                prob,
            });
        });
    });

    const cellSize = Math.min(
        innerWidth / states.length,
        innerHeight / states.length
    );

    const xScale = d3
        .scaleBand()
        .domain(states)
        .range([0, cellSize * states.length])
        .padding(0.08);

    const yScale = d3
        .scaleBand()
        .domain(states)
        .range([0, cellSize * states.length])
        .padding(0.08);

    const maxProb = d3.max(matrixData, (d) => d.prob) || 0.0001;

    // Custom blood palette: almost-black -> deep red -> neon crimson
    const colorScale = d3
        .scaleLinear()
        .domain([0, maxProb * 0.4, maxProb])
        .range(["#140007", "#5b0716", "#ff224e"])
        .clamp(true);

    // Title & helper text
    g.append("text")
        .attr("class", "state-machine-title")
        .attr("x", (cellSize * states.length) / 2)
        .attr("y", -34)
        .attr("text-anchor", "middle")
        .style("font-family", "Creepster, cursive")
        .style("font-size", "22px")
        .style("fill", "#ff224e")
        .style("text-shadow", "0 0 10px #ff224e, 0 0 20px #000")
        .text("☠ FEAR RITUAL GRID ☠");

    g.append("text")
        .attr("x", (cellSize * states.length) / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "11px")
        .style("fill", "#f5d8d8")
        .text("Rows: where you are now · Columns: where the next scene drags you");

    // Faint ritual frame around the grid
    g.append("rect")
        .attr("x", -10)
        .attr("y", -10)
        .attr("width", cellSize * states.length + 20)
        .attr("height", cellSize * states.length + 20)
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 60, 100, 0.5)")
        .attr("stroke-width", 1.4)
        .attr("stroke-dasharray", "6 6");

    // Very faint connecting lines for strong transitions, drawn behind cells
    const connectionsLayer = g
        .append("g")
        .attr("class", "state-machine-connections");

    const hotThreshold = maxProb * 0.4;

    matrixData
        .filter((d) => d.prob >= hotThreshold)
        .forEach((d) => {
            const x = xScale(d.to) + xScale.bandwidth() / 2;
            const y = yScale(d.from) + yScale.bandwidth() / 2;

            // Draw a small glowing circle behind strong transitions
            connectionsLayer
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", xScale.bandwidth() / 2.2)
                .attr("fill", "none")
                .attr("stroke", "rgba(255, 34, 78, 0.5)")
                .attr("stroke-width", 1.2)
                .attr("stroke-dasharray", d.from === d.to ? "2 2" : "8 4")
                .style("opacity", 0.5);
        });

    // Tooltip shared with other horror charts
    const existingTooltip = d3.select("body").select("div.tooltip");
    const tooltip =
        !existingTooltip.empty()
            ? existingTooltip
            : d3
                .select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("opacity", 0);

    container.style("position", "relative");

    const cells = g
        .selectAll(".state-cell")
        .data(matrixData)
        .enter()
        .append("g")
        .attr("class", "state-cell")
        .attr("transform", (d) => {
            const x = xScale(d.to);
            const y = yScale(d.from);
            return `translate(${x},${y})`;
        });

    const rects = cells
        .append("rect")
        .attr("class", "state-cell-rect")
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("fill", (d) => colorScale(d.prob))
        .attr("stroke", "#1a0004")
        .attr("stroke-width", 0.8)
        .style("cursor", "pointer");

    // Add glow to the hottest transitions
    rects
        .filter((d) => d.prob >= maxProb * 0.65)
        .style("filter", "url(#stateMachineCellGlow)");

    const pctFormat = d3.format(".0%");

    cells
        .append("text")
        .attr("class", "state-cell-prob")
        .attr("x", xScale.bandwidth() / 2)
        .attr("y", yScale.bandwidth() / 2 - 4)
        .attr("text-anchor", "middle")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "12px")
        .style("fill", "#fff7f7")
        .text((d) => (d.prob > 0 ? pctFormat(d.prob) : ""));

    cells
        .append("text")
        .attr("class", "state-cell-count")
        .attr("x", xScale.bandwidth() / 2)
        .attr("y", yScale.bandwidth() / 2 + 12)
        .attr("text-anchor", "middle")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "9px")
        .style("fill", "#ffdfdf")
        .text((d) => (d.count > 0 ? d.count + " jumps" : ""));

    // Tiny icon in the corner of each cell to lean into the horror theme
    cells
        .append("text")
        .attr("class", "state-cell-icon")
        .attr("x", xScale.bandwidth() - 6)
        .attr("y", yScale.bandwidth() - 6)
        .attr("text-anchor", "end")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "10px")
        .style("fill", "#ff8099")
        .text((d) => stateIcons[d.to]);

    // Interactions – highlight + tooltip
    rects
        .on("mouseenter", function (event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("stroke-width", 1.6)
                .attr("stroke", "#ffd1d1");

            const fromIcon = stateIcons[d.from];
            const toIcon = stateIcons[d.to];

            const moodChange =
                d.from === d.to
                    ? "holds the mood"
                    : d.from === "Calm" && d.to === "Panic"
                        ? "pulls a full jump-scare"
                        : d.from === "Panic" && d.to === "Calm"
                            ? "drops you back to safety"
                            : d.from === "Calm"
                                ? "starts the climb"
                                : d.to === "Panic"
                                    ? "tightens the screws"
                                    : "eases off, but not all the way";

            tooltip.transition().duration(200).style("opacity", 1);

            tooltip
                .html(
                    `
          <div style="font-family:'Special Elite', monospace;">
            <div style="font-size:13px; margin-bottom:4px;">
              ${fromIcon} <strong>${d.from}</strong> → ${toIcon} <strong>${d.to}</strong>
            </div>
            <div>Share of transitions: <strong>${pctFormat(d.prob)}</strong></div>
            <div>Scene jumps observed: <strong>${d.count.toLocaleString()}</strong></div>
            <div style="margin-top:6px; font-size:11px; opacity:0.85;">
              This step ${moodChange}.
            </div>
          </div>
        `
                )
                .style("left", event.pageX + 18 + "px")
                .style("top", event.pageY - 34 + "px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 18 + "px")
                .style("top", event.pageY - 34 + "px");
        })
        .on("mouseleave", function () {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("stroke-width", 0.8)
                .attr("stroke", "#1a0004");

            tooltip.transition().duration(150).style("opacity", 0);
        });

    // Axes – Ouija-board style labels with icons
    const xAxis = d3
        .axisBottom(xScale)
        .tickSize(0)
        .tickFormat((d) => `${stateIcons[d]} ${d}`);

    const yAxis = d3
        .axisLeft(yScale)
        .tickSize(0)
        .tickFormat((d) => `${stateIcons[d]} ${d}`);

    const xAxisG = g
        .append("g")
        .attr("transform", `translate(0, ${cellSize * states.length})`)
        .call(xAxis);

    xAxisG
        .selectAll("text")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "11px")
        .style("fill", "#ffe3e3");

    xAxisG.selectAll("path,line").remove();

    const yAxisG = g.append("g").call(yAxis);

    yAxisG
        .selectAll("text")
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "11px")
        .style("fill", "#ffe3e3");

    yAxisG.selectAll("path,line").remove();

    // Row totals legend on the right
    const legendX = cellSize * states.length + 26;

    const legend = g
        .append("g")
        .attr("class", "state-machine-legend")
        .attr("transform", `translate(${legendX}, 4)`);

    legend
        .append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-family", "Special Elite, monospace")
        .style("font-size", "11px")
        .style("fill", "#ffb3c4")
        .text("Passages through each state");

    states.forEach((s, i) => {
        const total = rowTotals[s] || 0;
        legend
            .append("text")
            .attr("x", 0)
            .attr("y", 18 + i * 16)
            .style("font-family", "Special Elite, monospace")
            .style("font-size", "10px")
            .style("fill", "#ffe3e3")
            .text(`${stateIcons[s]} ${s}: ${total.toLocaleString()} jumps`);
    });

    return {
        svg: svg,
        data: matrixData,
    };
}
