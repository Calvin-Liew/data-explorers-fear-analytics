console.log("👻 fearBuildViz.js LOADED!");

function createFearBuildViz(selector, fearJourneyData) {
  "use strict";

  console.log("👻 Fear Build init:", selector, "data:", fearJourneyData);

  const container = d3.select(selector);
  const containerNode = container.node();

  if (!containerNode) {
    console.error("❌ Container not found:", selector);
    return;
  }

  console.log("✅ Container found:", containerNode);
  const margin = { top: 60, right: 80, bottom: 80, left: 80 };
  const width = containerNode.clientWidth - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "#0a0a0a")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const interactionLayer = svg.append("g").attr("class", "interaction-layer");

  const background = interactionLayer
    .append("rect")
    .attr("class", "interaction-bg")
    .attr("x", -margin.left)
    .attr("y", -margin.top)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("fill", "rgba(5, 0, 10, 0.2)")
    .style("cursor", "crosshair");

  const rippleGroup = interactionLayer.append("g");

  const defs = svg.append("defs");

  const pattern = defs
    .append("pattern")
    .attr("id", "scanlines")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", "100%")
    .attr("height", 4);

  pattern
    .append("rect")
    .attr("width", "100%")
    .attr("height", 2)
    .attr("fill", "rgba(0, 255, 0, 0.05)");

  svg
    .append("rect")
    .attr("x", -margin.left)
    .attr("y", -margin.top)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("fill", "url(#scanlines)")
    .style("pointer-events", "none");

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0);

  const baseFilms = Object.keys(fearJourneyData[0]).filter(
    (k) => k !== "scene_position"
  );

  baseFilms.forEach((filmKey) => {
    fearJourneyData.forEach((row) => {
      if (row[filmKey] === "") {
        row[filmKey] = null;
      }
    });
  });

  fearJourneyData.forEach((row) => {
    let sum = 0;
    let count = 0;
    baseFilms.forEach((filmKey) => {
      const value = row[filmKey];
      if (value !== null && value !== undefined && value !== "") {
        const numeric = +value;
        if (!Number.isNaN(numeric)) {
          sum += numeric;
          count += 1;
        }
      }
    });
    row.AVERAGE_ALL = count ? sum / count : null;
  });

  const seriesStore = new Map();

  function smoothSeries(points, window = 5) {
    if (points.length <= 2) return points.slice();
    const half = Math.floor(window / 2);
    const smoothed = points.map((point, idx) => {
      let sum = 0;
      let count = 0;
      for (let i = idx - half; i <= idx + half; i += 1) {
        if (i >= 0 && i < points.length) {
          sum += points[i].fear;
          count += 1;
        }
      }
      return {
        position: point.position,
        fear: count ? sum / count : point.fear,
      };
    });
    smoothed[0].fear = points[0].fear;
    smoothed[smoothed.length - 1].fear = points[points.length - 1].fear;
    return smoothed;
  }

  function computeSeries(filmKey) {
    const measuredPoints = fearJourneyData
      .map((row) => {
        const position = +row.scene_position;
        if (!Number.isFinite(position)) return null;

        const rawValue = row[filmKey];
        if (
          rawValue === undefined ||
          rawValue === null ||
          rawValue === "" ||
          Number.isNaN(+rawValue)
        ) {
          return null;
        }

        return {
          position,
          fear: +rawValue,
        };
      })
      .filter((d) => d !== null)
      .sort((a, b) => a.position - b.position);

    if (!measuredPoints.length) {
      return null;
    }

    const padded = measuredPoints.slice();

    if (padded[0].position > 0) {
      padded.unshift({
        position: 0,
        fear: padded[0].fear,
      });
    }

    const lastPoint = padded[padded.length - 1];
    if (lastPoint.position < 100) {
      padded.push({
        position: 100,
        fear: lastPoint.fear,
      });
    }

    const display =
      filmKey === "AVERAGE_ALL" ? smoothSeries(padded, 7) : padded;

    seriesStore.set(filmKey, {
      measured: measuredPoints,
      padded,
      display,
    });

    return { measured: measuredPoints };
  }

  baseFilms.forEach((key) => computeSeries(key));
  computeSeries("AVERAGE_ALL");

  const stats = baseFilms
    .map((key) => {
      const series = seriesStore.get(key);
      if (!series) return null;
      const values = series.measured.map((d) => d.fear);
      const mean = values.reduce((acc, v) => acc + v, 0) / (values.length || 1);
      const variance =
        values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
        (values.length || 1);
      return { key, variance };
    })
    .filter((d) => d !== null);

  const curatedNotables = [
    "Alien_Unknown",
    "Halloween_Unknown",
    "Get-Out_Unknown",
    "Scream_Unknown",
    "Saw_Unknown",
  ].filter((key) => seriesStore.has(key));

  const fallbackNotables = stats
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 5)
    .map((s) => s.key);

  const defaultFilms = [
    "AVERAGE_ALL",
    ...(curatedNotables.length ? curatedNotables : fallbackNotables),
  ];
  let currentGroup = defaultFilms.slice();
  let selectedFilm = "AVERAGE_ALL";

  const neonGreens = ["#39ff14", "#48f5ff", "#f8ff5c", "#ff8cff", "#00ffc6"];

  const palette = neonGreens;
  const colorMap = new Map();
  colorMap.set("AVERAGE_ALL", "#ff224e");
  let paletteIndex = 0;

  const getColor = (filmKey) => {
    if (filmKey === "AVERAGE_ALL") return colorMap.get(filmKey);
    if (!colorMap.has(filmKey)) {
      colorMap.set(filmKey, palette[paletteIndex % palette.length]);
      paletteIndex += 1;
    }
    return colorMap.get(filmKey);
  };

  const avgGlow = svg
    .append("path")
    .attr("class", "fear-avg-glow")
    .attr("fill", "none")
    .attr("stroke", "#ff224e")
    .attr("stroke-width", 9)
    .attr("stroke-opacity", 0.18)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .style("filter", "blur(8px)")
    .style("mix-blend-mode", "screen");

  const featuredKeys = defaultFilms.slice(1);
  featuredKeys.forEach((key) => getColor(key));

  const filmSelect = document.getElementById("film-select");
  if (filmSelect) {
    const formatLabel = (filmKey) =>
      filmKey === "AVERAGE_ALL"
        ? "AVERAGE HORROR PULSE"
        : filmKey
            .replace(/_Unknown$/, "")
            .replace(/-/g, " ")
            .toUpperCase();

    const avgOption = `<optgroup label="Dataset Overview"><option value="AVERAGE_ALL">SUBJECT: ${formatLabel(
      "AVERAGE_ALL"
    )}</option></optgroup>`;

    const featuredOptions = featuredKeys
      .map(
        (filmKey) =>
          `<option value="${filmKey}">SUBJECT: ${formatLabel(filmKey)}</option>`
      )
      .join("");

    const allOptions = baseFilms
      .map(
        (filmKey) =>
          `<option value="${filmKey}">SUBJECT: ${formatLabel(filmKey)}</option>`
      )
      .join("");

    filmSelect.innerHTML = `
      <option value="">⚠️ SELECT PATIENT FILE ⚠️</option>
      ${avgOption}
      <optgroup label="Notable Case Files">
        ${featuredOptions}
      </optgroup>
      <optgroup label="All Subjects">
        ${allOptions}
      </optgroup>
    `;
    filmSelect.value = "AVERAGE_ALL";
  }

  svg
    .append("text")
    .attr("class", "monitor-label")
    .attr("x", width / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("⚠ FEAR VITAL SIGNS MONITOR ⚠")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "18px")
    .style("fill", "#39ff14")
    .style("text-shadow", "0 0 10px #39ff14")
    .style("animation", "flicker 0.15s infinite");

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, width]);
  const yScale = d3.scaleLinear().domain([0, 1.2]).range([height, 0]);

  const xGrid = d3
    .axisBottom(xScale)
    .tickSize(-height)
    .tickFormat("")
    .ticks(20);

  const yGrid = d3.axisLeft(yScale).tickSize(-width).tickFormat("").ticks(12);

  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(xGrid)
    .selectAll("line")
    .style("stroke", "#003300")
    .style("stroke-opacity", 0.3);

  svg
    .append("g")
    .attr("class", "grid")
    .call(yGrid)
    .selectAll("line")
    .style("stroke", "#003300")
    .style("stroke-opacity", 0.3);

  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(d3.range(0, 101, 10))
    .tickFormat((d) => `${d}%`);

  const yAxis = d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".1f"));

  svg
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("fill", "#39ff14")
    .style("font-family", "'Special Elite', monospace");

  svg
    .append("g")
    .attr("class", "axis y-axis")
    .call(yAxis)
    .selectAll("text")
    .style("fill", "#39ff14")
    .style("font-family", "'Special Elite', monospace");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .text("⏱ TIME PROGRESSION (% OF RUNTIME)")
    .style("fill", "#39ff14")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .text("💀 FEAR LEVEL (VITAL SIGNS) 💀")
    .style("fill", "#39ff14")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px");

  let flatlineIndicator, heartRateDisplay;

  flatlineIndicator = svg
    .append("text")
    .attr("class", "flatline-warning")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "48px")
    .style("font-family", "'Creepster', cursive")
    .style("fill", "#ff0000")
    .style("opacity", 0)
    .style("text-shadow", "0 0 20px #ff0000")
    .style("pointer-events", "none")
    .text("⚠ TERROR SPIKE DETECTED ⚠");

  heartRateDisplay = svg
    .append("text")
    .attr("class", "heart-rate")
    .attr("x", width - 10)
    .attr("y", -15)
    .attr("text-anchor", "end")
    .style("font-size", "24px")
    .style("font-family", "'Special Elite', monospace")
    .style("fill", "#ff0000")
    .style("text-shadow", "0 0 10px #ff0000")
    .text("♥ BPM: --");

  const lineGenerator = d3
    .line()
    .x((d) => xScale(d.position))
    .y((d) => yScale(d.fear))
    .curve(d3.curveLinear);

  const lineGroup = svg.append("g").attr("class", "fear-lines");
  const markerLayer = svg.append("g").attr("class", "fear-critical-layer");

  const bottomLegend = container
    .append("div")
    .attr("class", "fear-bottom-legend");

  function renderLegend() {
    const entries = currentGroup.map((key) => ({
      key,
      displayName:
        key === "AVERAGE_ALL"
          ? "AVERAGE HORROR PULSE"
          : key
              .replace(/_Unknown$/, "")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
    }));

    const pills = bottomLegend
      .selectAll("button.legend-pill")
      .data(entries, (d) => d.key);

    pills.exit().remove();

    const pillEnter = pills
      .enter()
      .append("button")
      .attr("class", "legend-pill")
      .on("click", (event, d) => {
        if (d.key !== selectedFilm) {
          update(d.key);
          if (filmSelect) {
            filmSelect.value = d.key;
          }
        }
      });

    pillEnter.append("span").attr("class", "pill-swatch");
    pillEnter.append("span").attr("class", "pill-label");

    const merged = pillEnter.merge(pills);

    merged
      .classed("is-average", (d) => d.key === "AVERAGE_ALL")
      .classed("is-active", (d) => d.key === selectedFilm)
      .attr("data-key", (d) => d.key);

    merged.select(".pill-swatch").style("background", (d) => getColor(d.key));

    merged.select(".pill-label").text((d) => d.displayName);
  }

  function pulseAverage() {
    avgGlow
      .transition()
      .duration(1400)
      .ease(d3.easeSinInOut)
      .attr("stroke-opacity", 0.32)
      .attr("stroke-width", 11)
      .transition()
      .duration(1400)
      .ease(d3.easeSinInOut)
      .attr("stroke-opacity", 0.18)
      .attr("stroke-width", 9)
      .on("end", pulseAverage);
  }

  function playClickPulse(xPos, yPos) {
    const line = rippleGroup
      .append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", yPos)
      .attr("y2", yPos)
      .attr("stroke", "rgba(255, 34, 78, 0.35)")
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0 0 6px rgba(255, 34, 78, 0.5))");

    line
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("x1", 0)
      .attr("x2", width)
      .attr("stroke-opacity", 0)
      .remove();

    const circle = rippleGroup
      .append("circle")
      .attr("cx", xPos)
      .attr("cy", yPos)
      .attr("r", 0)
      .attr("stroke", "rgba(57, 255, 20, 0.5)")
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .style("filter", "drop-shadow(0 0 8px rgba(57, 255, 20, 0.6))");

    circle
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr("r", 160)
      .attr("stroke-opacity", 0)
      .remove();
  }

  pulseAverage();

  function renderLines() {
    const paths = lineGroup
      .selectAll(".fear-line")
      .data(currentGroup, (d) => d);

    paths.exit().remove();

    const merged = paths
      .enter()
      .append("path")
      .attr("class", "fear-line")
      .attr("fill", "none")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .merge(paths);

    merged
      .attr("stroke", (d) => getColor(d))
      .attr("d", (d) => lineGenerator(seriesStore.get(d).display))
      .attr("stroke-width", (d) =>
        d === selectedFilm ? 4.4 : d === "AVERAGE_ALL" ? 3 : 3.2
      )
      .attr("opacity", (d) =>
        d === selectedFilm ? 1 : d === "AVERAGE_ALL" ? 0.8 : 0.92
      )
      .style("stroke-dasharray", (d) => (d === "AVERAGE_ALL" ? "18 10" : null))
      .style("filter", (d) => {
        const color = getColor(d);
        if (d === selectedFilm) {
          return `drop-shadow(0 0 14px ${color})`;
        }
        if (d === "AVERAGE_ALL") {
          return "drop-shadow(0 0 14px rgba(255, 34, 78, 0.55))";
        }
        return "drop-shadow(0 0 8px rgba(0,0,0,0.6))";
      })
      .style("mix-blend-mode", "screen");

    const avgSeries = seriesStore.get("AVERAGE_ALL");
    if (avgSeries) {
      avgGlow.attr("d", lineGenerator(avgSeries.display));
    }

    renderLegend();
  }

  function pulseSkulls(selection) {
    selection.each(function repeat() {
      const node = d3.select(this);
      const baseX = +node.attr("data-x");
      const baseY = +node.attr("data-y");

      node
        .interrupt()
        .transition()
        .duration(900)
        .ease(d3.easeSinInOut)
        .attr("transform", `translate(${baseX}, ${baseY}) scale(1.12)`)
        .transition()
        .duration(900)
        .ease(d3.easeSinInOut)
        .attr("transform", `translate(${baseX}, ${baseY}) scale(1)`)
        .on("end", repeat);
    });
  }

  function update(filmKey) {
    if (!filmKey || !seriesStore.has(filmKey)) return;

    if (filmKey === "AVERAGE_ALL") {
      currentGroup = defaultFilms.slice();
    } else {
      currentGroup = ["AVERAGE_ALL", filmKey];
    }

    selectedFilm = filmKey;
    renderLines();

    const series = seriesStore.get(filmKey);
    const measuredPoints = series.measured;

    const avgFear = d3.mean(measuredPoints, (d) => d.fear);
    const bpm = Math.round(avgFear * 180 + 40);

    heartRateDisplay
      .transition()
      .duration(500)
      .style("fill", bpm > 150 ? "#ff0000" : bpm > 100 ? "#ff8800" : "#39ff14")
      .tween("text", function () {
        const that = d3.select(this);
        const i = d3.interpolateNumber(0, bpm);
        return (t) => that.text(`♥ BPM: ${Math.round(i(t))}`);
      });

    markerLayer.selectAll(".critical-marker").remove();
    markerLayer.raise();

    if (filmKey === "AVERAGE_ALL") {
      return;
    }

    const markerTargets = [filmKey];

    markerTargets.forEach((targetKey) => {
      const targetSeries = seriesStore.get(targetKey);
      if (!targetSeries) return;
      const points = targetSeries.measured;
      const criticalMoments = points.filter((d) => d.fear >= 0.7);

      const criticalMarkers = markerLayer
        .selectAll(`.critical-marker-${targetKey}`)
        .data(criticalMoments, (d) => `${targetKey}-${d.position}`);

      criticalMarkers.exit().remove();

      const markerEnter = criticalMarkers
        .enter()
        .append("g")
        .attr("class", `critical-marker critical-marker-${targetKey}`);

      markerEnter.append("line");
      markerEnter.append("rect");
      const markerMerge = markerEnter.merge(criticalMarkers);

      markerMerge.each(function (d) {
        const marker = d3.select(this);
        let skull = marker.select("g.skull-icon");
        if (skull.empty()) {
          skull = marker.append("g").attr("class", "skull-icon");
        }
        skull.datum(d);
      });

      markerMerge
        .select("line")
        .attr("x1", (d) => xScale(d.position))
        .attr("x2", (d) => xScale(d.position))
        .attr("y1", (d) => yScale(d.fear))
        .attr("y2", height)
        .attr("stroke", "rgba(255, 25, 47, 0.75)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .style("opacity", 0)
        .transition()
        .duration(500)
        .delay((d, i) => i * 120)
        .style("opacity", 0.6);

      markerMerge
        .select("rect")
        .attr("x", (d) => xScale(d.position) - 20)
        .attr("y", (d) => yScale(d.fear) - 38)
        .attr("width", 40)
        .attr("height", 40)
        .attr("rx", 18)
        .attr("ry", 18)
        .attr("fill", "rgba(10, 0, 0, 0.6)")
        .style("mix-blend-mode", "screen")
        .style("filter", "drop-shadow(0 0 18px rgba(255, 0, 0, 0.6))")
        .style("opacity", 0)
        .transition()
        .duration(500)
        .delay((d, i) => i * 120)
        .style("opacity", 1);

      const skullGroups = markerMerge
        .select("g.skull-icon")
        .attr("data-x", (d) => xScale(d.position))
        .attr("data-y", (d) => yScale(d.fear) - 12)
        .attr(
          "transform",
          (d) =>
            `translate(${xScale(d.position)}, ${yScale(d.fear) - 12}) scale(1)`
        )
        .style("cursor", "pointer");

      skullGroups.each(function () {
        const g = d3.select(this);
        g.selectAll("*").remove();

        g.append("text")
          .attr("class", "skull-emoji")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "central")
          .attr("y", -4)
          .style("font-size", "28px")
          .style("font-family", "'Creepster', 'Special Elite', monospace")
          .style("fill", "#ffe9e9")
          .style("text-shadow", "0 0 12px rgba(255, 34, 78, 0.85)")
          .text("☠");
      });

      skullGroups
        .style("opacity", 0)
        .transition()
        .duration(500)
        .delay((d, i) => i * 120)
        .style("opacity", 1);

      skullGroups
        .on("mouseover", function (event, d) {
          const node = d3.select(this);
          const baseX = +node.attr("data-x");
          const baseY = +node.attr("data-y");

          node
            .interrupt()
            .transition()
            .duration(200)
            .attr("transform", `translate(${baseX}, ${baseY}) scale(1.28)`);

          node.select(".skull-emoji").style("fill", "#ffffff");

          flatlineIndicator
            .transition()
            .duration(300)
            .style("opacity", 1)
            .transition()
            .duration(300)
            .style("opacity", 0);

          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `
            <div style="text-align: center; border: 2px solid #ff192f; padding: 10px;">
              <strong style="color: #ff192f; font-size: 18px;">☠ CRITICAL TERROR EVENT ☠</strong><br/>
              <span style="color: #ff6b6b; font-size: 12px;">⚠ VITAL SIGNS CRITICAL ⚠</span><br/><br/>
              Film: <strong>${targetKey
                .replace(/_Unknown$/, "")
                .replace(/-/g, " ")}</strong><br/>
              Position: <strong>${d.position.toFixed(1)}%</strong><br/>
              Fear Level: <strong style="color: #ff192f; font-size: 16px;">${d.fear.toFixed(
                3
              )}</strong>
            </div>
          `
            )
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
          const node = d3.select(this);
          node.select(".skull-emoji").style("fill", "#ffe9e9");
          pulseSkulls(node);
          tooltip.transition().duration(500).style("opacity", 0);
        });
    });
  }

  if (filmSelect) {
    filmSelect.addEventListener("change", function () {
      if (this.value) {
        update(this.value);
      }
    });
  }

  background.on("click", function (event) {
    const [x, y] = d3.pointer(event);
    playClickPulse(x, y);
  });

  renderLines();
  update("AVERAGE_ALL");

  return {
    update,
    svg,
    featured: defaultFilms.slice(1),
  };
}

window.createFearBuildViz = createFearBuildViz;
