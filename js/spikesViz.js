console.log("⚡ spikesViz.js LOADED!");

function createSpikesViz(
  selector,
  fearJourneyData,
  tensionJourneyData,
  fearRawData,
  tensionRawData
) {
  "use strict";

  console.log(
    "⚡ Spikes init:",
    selector,
    "fear journey:",
    fearJourneyData,
    "tension journey:",
    tensionJourneyData,
    "fear raw:",
    fearRawData,
    "tension raw:",
    tensionRawData
  );

  const container = d3.select(selector);
  const containerNode = container.node();

  if (!containerNode) {
    console.error("❌ Container not found:", selector);
    return;
  }

  console.log("✅ Container found:", containerNode);
  const margin = { top: 60, right: 180, bottom: 80, left: 180 };
  const width = containerNode.clientWidth - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;
  const totalWidth = width + margin.left + margin.right;
  const totalHeight = height + margin.top + margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const defs = svg.append("defs");

  const fogGradient = defs
    .append("linearGradient")
    .attr("id", "fog")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  fogGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#0a0a0a")
    .attr("stop-opacity", 0.3);

  fogGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#1a1a1a")
    .attr("stop-opacity", 0.8);

  svg
    .append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "url(#fog)");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const nightOverlay = svg
    .append("rect")
    .attr("class", "night-overlay")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "rgba(0,0,0,0)")
    .style("pointer-events", "none");

  const fireflyLayer = svg
    .append("g")
    .attr("class", "firefly-layer")
    .style("pointer-events", "none")
    .style("opacity", 0);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text("⚰ THE CEMETERY OF TERROR ⚰")
    .style("font-family", "'Creepster', cursive")
    .style("font-size", "24px")
    .style("fill", "#8b0000")
    .style("text-shadow", "0 0 10px #8b0000, 0 0 20px #000");

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0);

  container.style("position", "relative");

  const controlsNode =
    containerNode.parentElement &&
    containerNode.parentElement.querySelector(".viz-controls");

  const MAX_ACTIVE_FILMS = 12;
  let nightMode = false;
  const selectedMoments = [];

  let nightFireflyTimer = null;

  function addMoment(entry) {
    const key = `${entry.type}-${entry.film}-${entry.position.toFixed(3)}`;
    if (selectedMoments.some((d) => d.key === key)) return;
    selectedMoments.unshift({ ...entry, key });
    if (selectedMoments.length > 6) {
      selectedMoments.pop();
    }
    renderMomentTrail();
  }

  if (controlsNode && !controlsNode.querySelector("#night-mode-toggle")) {
    const nightButton = document.createElement("button");
    nightButton.id = "night-mode-toggle";
    nightButton.className = "spooky-button";
    nightButton.textContent = "Night Watch";
    nightButton.style.marginLeft = "8px";
    nightButton.addEventListener("click", () => {
      nightMode = !nightMode;
      nightButton.classList.toggle("active", nightMode);
      nightButton.textContent = nightMode ? "Night Watch: On" : "Night Watch";
      toggleNightMode(nightMode);
    });
    controlsNode.appendChild(nightButton);
  }

  const drawerOverlay = d3
    .select(containerNode.parentElement || containerNode)
    .append("div")
    .attr("class", "mortuary-drawer")
    .style("position", "absolute")
    .style("top", "20px")
    .style("right", "20px")
    .style("width", "360px")
    .style("max-width", "85vw")
    .style("background", "rgba(5, 0, 10, 0.92)")
    .style("border", "2px solid #8b0000")
    .style("box-shadow", "0 0 20px rgba(0, 0, 0, 0.6)")
    .style("padding", "16px 20px 20px 20px")
    .style("border-radius", "12px")
    .style("backdrop-filter", "blur(6px)")
    .style("display", "none")
    .style("z-index", 10);

  drawerOverlay
    .append("button")
    .attr("class", "drawer-close")
    .text("✖")
    .style("position", "absolute")
    .style("top", "6px")
    .style("right", "8px")
    .style("background", "transparent")
    .style("border", "none")
    .style("color", "#ff6b6b")
    .style("font-size", "18px")
    .style("cursor", "pointer")
    .on("click", () => {
      drawerOverlay.style("display", "none");
      drawerOverlay.select(".drawer-body").selectAll("*").remove();
    });

  drawerOverlay
    .append("div")
    .attr("class", "drawer-body")
    .style("margin-top", "12px")
    .style("color", "#ffe9e9")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "13px")
    .style("line-height", "1.4");

  const drawerBody = drawerOverlay.select(".drawer-body");

  const trailPanel = d3
    .select(containerNode.parentElement || containerNode)
    .append("div")
    .attr("class", "moment-trail")
    .style("position", "absolute")
    .style("left", "20px")
    .style("bottom", "10px")
    .style("padding", "10px 14px")
    .style("background", "rgba(10, 0, 0, 0.75)")
    .style("border", "1px solid rgba(255, 34, 78, 0.4)")
    .style("border-radius", "10px")
    .style("color", "#ffe9e9")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px")
    .style("display", "none")
    .style("max-width", "280px")
    .style("pointer-events", "none");

  const FEAR_THRESHOLD = 0.4;
  const TENSION_THRESHOLD = 0.4;
  const MAX_RUNTIME = 100;

  function renderMomentTrail() {
    if (!selectedMoments.length) {
      trailPanel.style("display", "none");
      return;
    }

    trailPanel.style("display", "block");

    const items = trailPanel
      .selectAll("div.trail-item")
      .data(selectedMoments, (d) => d.key);

    items.exit().remove();

    const enter = items
      .enter()
      .append("div")
      .attr("class", "trail-item")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("margin-bottom", "4px");

    enter
      .append("span")
      .attr("class", "trail-icon")
      .style("font-size", "14px")
      .text((d) => (d.type === "fear" ? "✞" : "⚠"));

    enter
      .append("span")
      .attr("class", "trail-text")
      .style("flex", "1")
      .text(
        (d) =>
          `${d.film} — ${d.type === "fear" ? "Fear" : "Tension"} at ${d.position.toFixed(
            1
          )}%`
      );

    enter.merge(items).select(".trail-text").text(
      (d) =>
        `${d.film} — ${d.type === "fear" ? "Fear" : "Tension"} at ${d.position.toFixed(
          1
        )}%`
    );
  }

  const fearSeriesByFilm = new Map(
    fearJourneyData.map((d) => [d.film, d.values || []])
  );
  const tensionSeriesByFilm = new Map(
    tensionJourneyData.map((d) => [d.film, d.values || []])
  );

  const fearRawKeyMap = buildRawKeyMap(fearRawData || []);
  const tensionRawKeyMap = buildRawKeyMap(tensionRawData || []);

  const curatedFilms = [
    "Alien",
    "Friday the 13th",
    "Get Out",
    "Halloween",
    "Jaws",
    "Psycho",
    "Saw",
    "Scream",
  ].filter(
    (film) =>
      fearSeriesByFilm.has(film) || tensionSeriesByFilm.has(film)
  );

  if (!curatedFilms.length) {
    console.warn(
      "⚠️ No overlapping films between fear and tension datasets for spikes viz."
    );
  }

  const wrapperNode = containerNode.parentElement || containerNode;
  if (
    wrapperNode &&
    typeof window !== "undefined" &&
    window.getComputedStyle(wrapperNode).position === "static"
  ) {
    wrapperNode.style.position = "relative";
  }
  let shelfNode = wrapperNode.querySelector(".film-shelf");
  if (!shelfNode) {
    shelfNode = document.createElement("div");
    shelfNode.className = "film-shelf";
    shelfNode.style.display = "flex";
    shelfNode.style.flexWrap = "wrap";
    shelfNode.style.gap = "8px";
    shelfNode.style.margin = "12px 0 8px 0";
    shelfNode.style.fontFamily = "'Special Elite', monospace";
    wrapperNode.insertBefore(shelfNode, containerNode);
  }

  const defaultFilms = curatedFilms.length
    ? curatedFilms.slice()
    : Array.from(fearSeriesByFilm.keys()).slice(0, 8);
  let activeFilms = defaultFilms.slice();
  let highlightFilm = null;
  const allFilms = Array.from(new Set(fearSeriesByFilm.keys())).sort();

  const shelfSelection = d3.select(shelfNode);
  shelfSelection
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "8px")
    .style("margin", "12px 0 8px 0")
    .style("font-family", "'Special Elite', monospace");

  shelfSelection.selectAll("*").remove();

  shelfSelection
    .append("span")
    .attr("class", "film-shelf-heading")
    .text("Films on the graveyard:")
    .style("font-size", "12px")
    .style("letter-spacing", "0.6px");

  const activeListContainer = shelfSelection
    .append("div")
    .attr("class", "active-film-list")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "8px");

  const addControlsContainer = shelfSelection
    .append("div")
    .attr("class", "film-add-controls")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "8px")
    .style("flex-wrap", "wrap");

  addControlsContainer
    .append("span")
    .text("Add film:")
    .style("font-size", "11px")
    .style("letter-spacing", "0.5px");

  const addSelect = addControlsContainer
    .append("select")
    .attr("class", "film-add-select")
    .style("padding", "4px 6px")
    .style("background", "rgba(15, 0, 5, 0.7)")
    .style("border", "1px solid rgba(255, 34, 78, 0.4)")
    .style("color", "#ffe9e9")
    .style("font-size", "11px");

  addSelect
    .append("option")
    .attr("class", "placeholder")
    .attr("value", "")
    .attr("disabled", true)
    .attr("selected", true)
    .text("Select a film…");

  const addButton = addControlsContainer
    .append("button")
    .attr("class", "spooky-button")
    .text("Add")
    .style("padding", "4px 10px");

  const resetButton = addControlsContainer
    .append("button")
    .attr("class", "spooky-button")
    .text("Reset to Default")
    .style("padding", "4px 10px");

  const highlightContainer = shelfSelection
    .append("div")
    .attr("class", "highlight-controls")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "4px");

  highlightContainer
    .append("span")
    .text("Highlight:")
    .style("font-size", "11px")
    .style("letter-spacing", "0.5px");

  const highlightButtonsWrap = highlightContainer
    .append("div")
    .attr("class", "highlight-button-wrap")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "6px");

  function renderActiveFilmList() {
    const limited = activeFilms.slice(0, MAX_ACTIVE_FILMS);

    const pills = activeListContainer
      .selectAll("div.active-film-pill")
      .data(limited, (d) => d);

    pills.exit().remove();

    const pillEnter = pills
      .enter()
      .append("div")
      .attr("class", "active-film-pill")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("padding", "6px 10px")
      .style("border-radius", "999px")
      .style("border", "1px solid rgba(255, 34, 78, 0.4)")
      .style("background", "rgba(15, 0, 5, 0.7)")
      .style("color", "#ffe9e9")
      .style("font-size", "11px")
      .style("letter-spacing", "0.5px");

    pillEnter.append("span").attr("class", "pill-label");

    pillEnter
      .append("button")
      .attr("class", "pill-remove spooky-button")
      .text("✖")
      .style("padding", "0 6px")
      .style("font-size", "12px")
      .style("line-height", "1.2")
      .style("border-radius", "8px")
      .on("click", (_, film) => {
        activeFilms = activeFilms.filter((f) => f !== film);
        if (!activeFilms.length) {
          activeFilms = defaultFilms.slice();
        }
        if (highlightFilm === film) {
          highlightFilm = null;
        }
        renderActiveFilmList();
        renderAddOptions();
        renderHighlightControls();
        update();
      });

    pillEnter
      .merge(pills)
      .select(".pill-label")
      .text((d) => d.toUpperCase());
  }

  function renderAddOptions() {
    const available = allFilms.filter((film) => !activeFilms.includes(film));
    const canAdd = available.length > 0 && activeFilms.length < MAX_ACTIVE_FILMS;
    const options = addSelect
      .selectAll("option.dynamic-option")
      .data(available, (d) => d);

    options.exit().remove();

    options
      .enter()
      .append("option")
      .attr("class", "dynamic-option")
      .merge(options)
      .attr("value", (d) => d)
      .text((d) => d.toUpperCase());

    if (canAdd) {
      addSelect.select(".placeholder").attr("selected", null);
      addSelect.property("value", available[0]);
      addSelect.attr("disabled", null);
      addButton.attr("disabled", null);
    } else {
      addSelect
        .property("value", "")
        .select(".placeholder")
        .attr("selected", true);
      addSelect.attr("disabled", true);
      addButton.attr("disabled", true);
    }
  }

  function renderHighlightControls() {
    const renderFilms = activeFilms.slice(0, MAX_ACTIVE_FILMS);
    if (highlightFilm && !renderFilms.includes(highlightFilm)) {
      highlightFilm = null;
    }
    const highlightData = ["ALL"].concat(renderFilms);
    const buttons = highlightButtonsWrap
      .selectAll("button.highlight-pill")
      .data(highlightData, (d) => d);

    buttons.exit().remove();

    const buttonEnter = buttons
      .enter()
      .append("button")
      .attr("class", "highlight-pill spooky-button")
      .style("padding", "4px 8px")
      .style("font-size", "10px")
      .style("letter-spacing", "0.5px");

    buttonEnter
      .merge(buttons)
      .text((d) => (d === "ALL" ? "Show All" : d.toUpperCase()))
      .classed(
        "is-active",
        (d) => (highlightFilm === null && d === "ALL") || d === highlightFilm
      )
      .style("box-shadow", (d) =>
        (highlightFilm === null && d === "ALL") || d === highlightFilm
          ? "0 0 10px rgba(255, 34, 78, 0.5)"
          : "none"
      )
      .on("click", (_, film) => {
        highlightFilm = film === "ALL" ? null : film;
        renderHighlightControls();
        update();
      });
  }

  renderActiveFilmList();
  renderAddOptions();
  renderHighlightControls();

  addButton.on("click", () => {
    const film = addSelect.property("value");
    if (!film) return;
    if (!activeFilms.includes(film)) {
      activeFilms.push(film);
      if (activeFilms.length > MAX_ACTIVE_FILMS) {
        activeFilms = activeFilms.slice(
          activeFilms.length - MAX_ACTIVE_FILMS,
          activeFilms.length
        );
        if (
          highlightFilm &&
          !activeFilms.slice(0, MAX_ACTIVE_FILMS).includes(highlightFilm)
        ) {
          highlightFilm = null;
        }
      }
    }
    renderActiveFilmList();
    renderAddOptions();
    renderHighlightControls();
    update();
  });

  resetButton.on("click", () => {
    activeFilms = defaultFilms.slice();
    highlightFilm = null;
    renderActiveFilmList();
    renderAddOptions();
    renderHighlightControls();
    update();
  });

  let showFear = true;
  let showTension = true;

  const yScale = d3
    .scaleBand()
    .domain(activeFilms.slice(0, MAX_ACTIVE_FILMS))
    .range([0, height])
    .padding(0.3);

  const xScale = d3.scaleLinear().domain([0, MAX_RUNTIME]).range([0, width]);

  const sizeScale = d3.scaleSqrt().domain([0, 1]).range([0, 50]);

  const xAxis = d3.axisBottom(xScale).tickValues(d3.range(0, 101, 10)).tickFormat((d) => `${d}%`);

  const yAxis = d3.axisLeft(yScale).tickSize(0);

  g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("fill", "#8b0000")
    .style("font-family", "'Special Elite', monospace");

  g.append("g")
    .attr("class", "axis y-axis")
    .call(yAxis)
    .selectAll("text")
    .style("fill", "#ff6b6b")
    .style("font-family", "'Creepster', cursive")
    .style("font-size", "14px");

  g.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .text("⏱ TIMELINE OF TERROR")
    .style("fill", "#8b0000")
    .style("font-family", "'Creepster', cursive");

  g.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -140)
    .text("🎬 FILMS")
    .style("fill", "#8b0000")
    .style("font-family", "'Creepster', cursive");

  const legend = g.append("g").attr("transform", `translate(${width + 30}, 0)`);

  const legendData = [
    { label: "FEAR", color: "#ff0000", emoji: "💀" },
    { label: "TENSION", color: "#ff8800", emoji: "⚠" },
  ];

  legendData.forEach((item, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 40})`);

    legendItem
      .append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", item.color)
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .style("filter", `drop-shadow(0 0 5px ${item.color})`);

    legendItem
      .append("text")
      .attr("x", 30)
      .attr("y", 15)
      .text(`${item.emoji} ${item.label}`)
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "14px")
      .style("fill", item.color);
  });

  function createGhost() {
    const ghost = g
      .append("text")
      .attr("class", "floating-ghost")
      .attr("x", Math.random() * width)
      .attr("y", -50)
      .attr("font-size", "30px")
      .text("👻")
      .style("opacity", 0.3)
      .style("pointer-events", "none");

    ghost
      .transition()
      .duration(8000 + Math.random() * 4000)
      .ease(d3.easeLinear)
      .attr("y", height + 50)
      .attr("x", Math.random() * width)
      .style("opacity", 0)
      .remove();
  }

  d3.interval(createGhost, 5500);

  function pulseWarning(selection) {
    selection.each(function repeat() {
      const node = d3.select(this);
      node
        .interrupt()
        .transition()
        .duration(350)
        .style("opacity", 0.45)
        .transition()
        .duration(350)
        .style("opacity", 0.85)
        .on("end", repeat);
    });
  }

  function spawnFirefly() {
    if (activeFilms.slice(0, MAX_ACTIVE_FILMS).length > 20) {
      return;
    }
    const startX = 20 + Math.random() * (totalWidth - 40);
    const startY = totalHeight - 30;
    const driftX = startX + (Math.random() * 60 - 30);
    const endY = margin.top + Math.random() * height * 0.4;
    const firefly = fireflyLayer
      .append("circle")
      .attr("cx", startX)
      .attr("cy", startY)
      .attr("r", 2 + Math.random() * 2.5)
      .attr("fill", "#ffd966")
      .style("opacity", 0);

    firefly
      .transition()
      .duration(400)
      .style("opacity", 1)
      .transition()
      .duration(4000 + Math.random() * 2500)
      .ease(d3.easeQuadOut)
      .attr("cx", driftX)
      .attr("cy", endY)
      .style("opacity", 0)
      .remove();
  }

  function toggleNightMode(enabled) {
    nightOverlay
      .transition()
      .duration(400)
      .attr("fill", enabled ? "rgba(0, 0, 0, 0.45)" : "rgba(0,0,0,0)");

    fireflyLayer
      .interrupt()
      .transition()
      .duration(400)
      .style("opacity", enabled ? 1 : 0);

    if (nightFireflyTimer) {
      clearInterval(nightFireflyTimer);
      nightFireflyTimer = null;
    }

    fireflyLayer.selectAll("*").remove();

    if (enabled) {
      for (let i = 0; i < 4; i += 1) {
        setTimeout(spawnFirefly, i * 250);
      }
      nightFireflyTimer = setInterval(() => {
        spawnFirefly();
      }, 1400);
    }
  }

  function extractSeriesFromRaw(rawRows, rawKey) {
    if (!rawKey) return [];
    return rawRows
      .map((row) => {
        const value = row[rawKey];
        const num = value === "" || value === undefined ? null : +value;
        return {
          position: +row.scene_position,
          value: Number.isFinite(num) ? num : null,
        };
      })
      .filter((d) => Number.isFinite(d.position) && d.value !== null)
      .sort((a, b) => a.position - b.position);
  }

  function openDrawer(film, metric, peak) {
    drawerBody.selectAll("*").remove();

    const fearKey = fearRawKeyMap.get(film);
    const tensionKey = tensionRawKeyMap.get(film);
    const fearSeries = extractSeriesFromRaw(fearRawData || [], fearKey);
    const tensionSeries = extractSeriesFromRaw(
      tensionRawData || [],
      tensionKey
    );

    const windowSize = 15;
    const minWindow = Math.max(0, peak.position - windowSize);
    const maxWindow = Math.min(MAX_RUNTIME, peak.position + windowSize);

    const contextualFear = fearSeries.filter(
      (d) => d.position >= minWindow && d.position <= maxWindow
    );
    const contextualTension = tensionSeries.filter(
      (d) => d.position >= minWindow && d.position <= maxWindow
    );

    const header = drawerBody.append("div");
    header
      .append("h3")
      .text(`Grave File: ${film}`)
      .style("margin", "0 0 6px 0")
      .style("font-size", "16px")
      .style("color", "#ff6b6b")
      .style("text-transform", "uppercase")
      .style("letter-spacing", "1px");

    header
      .append("p")
      .text(
        metric === "fear"
          ? "Surface tablet unearthed. Scroll the sparkline to inspect the shockwave."
          : "Catacomb warning uncovered. See how the dread simmered beneath."
      )
      .style("margin", "0 0 12px 0");

    const chartWidth = 300;
    const chartHeight = 140;

    const chart = drawerBody
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .style("background", "rgba(10, 10, 28, 0.7)")
      .style("border-radius", "8px")
      .style("overflow", "visible")
      .style("margin-bottom", "12px");

    const xContext = d3
      .scaleLinear()
      .domain([minWindow, maxWindow])
      .range([20, chartWidth - 20]);

    const maxFear =
      contextualFear.length > 0
        ? d3.max(contextualFear, (d) => d.value)
        : 0;
    const maxTension =
      contextualTension.length > 0
        ? d3.max(contextualTension, (d) => d.value)
        : 0;

    const yContext = d3
      .scaleLinear()
      .domain([0, Math.max(maxFear || 0, maxTension || 0, 0.6)])
      .range([chartHeight - 30, 20]);

    const lineFear = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((d) => xContext(d.position))
      .y((d) => yContext(d.value));

    const lineTension = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((d) => xContext(d.position))
      .y((d) => yContext(d.value));

    chart
      .append("line")
      .attr("x1", xContext(peak.position))
      .attr("x2", xContext(peak.position))
      .attr("y1", yContext.range()[0])
      .attr("y2", yContext.range()[1])
      .attr("stroke", "rgba(255, 107, 107, 0.6)")
      .attr("stroke-dasharray", "6,4");

    if (contextualFear.length > 1) {
      chart
        .append("path")
        .datum(contextualFear)
        .attr("d", lineFear)
        .attr("fill", "none")
        .attr("stroke", "#ff224e")
        .attr("stroke-width", 2.2)
        .style("filter", "drop-shadow(0 0 6px rgba(255, 34, 78, 0.55))");
    }

    if (contextualTension.length > 1) {
      chart
        .append("path")
        .datum(contextualTension)
        .attr("d", lineTension)
        .attr("fill", "none")
        .attr("stroke", "#ff8800")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 0 6px rgba(255, 136, 0, 0.5))");
    }

    chart
      .append("text")
      .attr("x", xContext(peak.position))
      .attr("y", yContext(peak.value || peak.fear || peak.tension) - 6)
      .attr("text-anchor", "middle")
      .text(metric === "fear" ? "✞" : "⚠")
      .style("fill", metric === "fear" ? "#ff224e" : "#ff8800")
      .style("font-size", "16px");

    const detailList = drawerBody
      .append("ul")
      .style("margin", "0 0 0 18px")
      .style("padding", "0")
      .style("list-style", "'☠ '");

    detailList
      .append("li")
      .text(
        `Scene position: ${peak.position.toFixed(1)}% (${minWindow.toFixed(
          0
        )}% - ${maxWindow.toFixed(0)}% window)`
      )
      .style("margin-bottom", "4px");

    if (metric === "fear") {
      detailList
        .append("li")
        .text(`Fear level: ${peak.fear.toFixed(3)}`)
        .style("margin-bottom", "4px");
    } else if (peak.tension !== undefined) {
      detailList
        .append("li")
        .text(`Tension level: ${peak.tension.toFixed(3)}`)
        .style("margin-bottom", "4px");
    }

    if (contextualFear.length && contextualTension.length) {
      const dual = detailList.append("li");
      dual
        .text(
          `Average fear ⟂ tension in window: ${d3
            .mean(contextualFear, (d) => d.value)
            .toFixed(3)} / ${d3
            .mean(contextualTension, (d) => d.value)
            .toFixed(3)}`
        )
        .style("margin-bottom", "4px");
    }

    drawerOverlay.style("display", "block");
  }

  function update() {
    g.selectAll(".tombstone-group, .fear-mist, .tension-marker").remove();

    const renderFilms = activeFilms.slice(0, MAX_ACTIVE_FILMS);
    yScale.domain(renderFilms);
    console.log("⚰️ Spikes active films:", renderFilms);

    const groundLines = g.selectAll(".ground-line").data(renderFilms, (d) => d);

    groundLines.exit().remove();

    groundLines
      .enter()
      .append("line")
      .attr("class", "ground-line")
      .attr("x1", 0)
      .attr("x2", width)
      .merge(groundLines)
      .attr("y1", (film) => yScale(film) + yScale.bandwidth())
      .attr("y2", (film) => yScale(film) + yScale.bandwidth())
      .attr("stroke", "#4a4a4a")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "10,5")
      .style("opacity", (film) =>
        highlightFilm && highlightFilm !== film ? 0.12 : 0.5
      );

    g
      .select(".axis.y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#ff6b6b")
      .style("font-family", "'Creepster', cursive")
      .style("font-size", "14px");

    renderFilms.forEach((film) => {
      const fearPeaks = (fearSeriesByFilm.get(film) || [])
        .filter(
          (d) =>
            d &&
            Number.isFinite(d.position) &&
            Number.isFinite(d.fear) &&
            d.position <= MAX_RUNTIME
        )
        .filter((d) => d.fear >= FEAR_THRESHOLD);

      const tensionPeaks = (tensionSeriesByFilm.get(film) || [])
        .filter(
          (d) =>
            d &&
            Number.isFinite(d.position) &&
            Number.isFinite(d.tension) &&
            d.position <= MAX_RUNTIME
        )
        .filter((d) => d.tension >= TENSION_THRESHOLD);

      const rowOpacity =
        highlightFilm && highlightFilm !== film ? 0.25 : 1;

      const tombstoneGroup = g
        .append("g")
        .attr("class", "tombstone-group")
        .style("opacity", rowOpacity);

      if (showFear && fearPeaks.length) {
        fearPeaks.forEach((peak, i) => {
          const clampedPosition = Math.min(peak.position, MAX_RUNTIME);

          const tombstone = tombstoneGroup
            .append("g")
            .attr("class", "tombstone fear-tombstone")
            .attr(
              "transform",
              `translate(${xScale(clampedPosition)}, ${
                yScale(film) + yScale.bandwidth()
              })`
            )
            .style("cursor", "pointer")
            .style("opacity", 0);

          const tombHeight = sizeScale(peak.fear);
          tombstone
            .append("rect")
            .attr("x", -8)
            .attr("y", -tombHeight)
            .attr("width", 16)
            .attr("height", tombHeight)
            .attr("rx", 8)
            .attr("fill", "#4a4a4a")
            .attr("stroke", "#ff0000")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 8px #ff0000)");

          tombstone
            .append("text")
            .attr("x", 0)
            .attr("y", -tombHeight / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .text("✞")
            .style("fill", "#ff0000")
            .style("pointer-events", "none");

          tombstone
            .append("text")
            .attr("x", 0)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "8px")
            .text("RIP")
            .style("fill", "#8b0000")
            .style("font-family", "'Special Elite', monospace")
            .style("pointer-events", "none");

          tombstone
            .transition()
            .duration(1000)
            .delay(i * 150)
            .style("opacity", 1)
            .attr(
              "transform",
              `translate(${xScale(peak.position)}, ${
                yScale(film) + yScale.bandwidth()
              })`
            );

          tombstone
            .append("ellipse")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("rx", 15)
            .attr("ry", 3)
            .attr("fill", "#ffffff")
            .style("opacity", 0.1)
            .attr("class", "fear-mist");

          tombstone.on("mouseover", function (event) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr(
                "transform",
                `translate(${xScale(clampedPosition)}, ${
                  yScale(film) + yScale.bandwidth() - 10
                }) scale(1.2)`
              );

            const drip = tombstoneGroup
              .append("ellipse")
              .attr("cx", xScale(clampedPosition))
              .attr("cy", yScale(film) + yScale.bandwidth() - tombHeight)
              .attr("rx", 2)
              .attr("ry", 4)
              .attr("fill", "#8b0000")
              .style("opacity", 0.8);

            drip
              .transition()
              .duration(1000)
              .attr("cy", yScale(film) + yScale.bandwidth())
              .style("opacity", 0)
              .remove();

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip
              .html(
                `
                <div style="padding:10px 12px; background:#0a0a0a; border:1px solid #ff224e; border-radius:8px; color:#ffe9e9; font-family:'Special Elite', monospace; text-align:left;">
                  <div style="font-weight:700; margin-bottom:4px;">${film}</div>
                  <div>Runtime: ${peak.position.toFixed(1)}%</div>
                  <div>Fear score: ${peak.fear.toFixed(2)}</div>
                  <div style="margin-top:6px; font-size:10px; opacity:0.75;">Click for more scene details</div>
                </div>
              `
              )
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          });

          tombstone.on("mouseout", function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr(
                "transform",
                `translate(${xScale(clampedPosition)}, ${
                  yScale(film) + yScale.bandwidth()
                })`
              );

            tooltip.transition().duration(500).style("opacity", 0);
          });

          tombstone.on("click", function () {
            openDrawer(film, "fear", peak);
            addMoment({
              type: "fear",
              film,
              position: peak.position,
              value: peak.fear,
            });
          });
        });
      }

      if (showTension && tensionPeaks.length) {
        if (tensionPeaks.length > 1) {
          const ropeBaseY = yScale(film) + yScale.bandwidth() - 18;
          const ropeLine = d3
            .line()
            .curve(d3.curveMonotoneX)
            .x((d) => xScale(d.position) + 12)
            .y(() => ropeBaseY);

          tombstoneGroup
            .append("path")
            .attr("class", "lantern-rope")
            .attr("d", ropeLine(tensionPeaks))
            .attr("fill", "none")
            .attr("stroke", "rgba(255, 136, 0, 0.35)")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,6")
            .lower();
        }

        tensionPeaks.forEach((peak, i) => {
          const clampedPosition = Math.min(peak.position, MAX_RUNTIME);

          const warningSign = tombstoneGroup
            .append("g")
            .attr("class", "tension-marker")
            .attr(
              "transform",
              `translate(${xScale(clampedPosition) + 12}, ${
                yScale(film) + yScale.bandwidth()
              })`
            )
            .style("cursor", "pointer")
            .style("opacity", 0);

          const signHeight = sizeScale(peak.tension);

          const lanternHeight = Math.max(30, signHeight * 0.9);
          const lanternWidth = 22;
          const glowRadius = Math.max(18, signHeight * 0.6);

          warningSign
            .append("ellipse")
            .attr("cx", 0)
            .attr("cy", -glowRadius - lanternHeight * 0.35)
            .attr("rx", glowRadius)
            .attr("ry", glowRadius * 0.65)
            .attr("fill", "rgba(255, 136, 0, 0.2)")
            .style("filter", "blur(8px)");

          warningSign
            .append("rect")
            .attr("x", -lanternWidth / 2)
            .attr("y", -lanternHeight - 6)
            .attr("width", lanternWidth)
            .attr("height", lanternHeight)
            .attr("rx", 8)
            .attr("fill", "rgba(255, 136, 0, 0.85)")
            .attr("stroke", "#2b0d00")
            .attr("stroke-width", 1.2);

          warningSign
            .append("rect")
            .attr("x", -lanternWidth / 2 - 3)
            .attr("y", -lanternHeight - 10)
            .attr("width", lanternWidth + 6)
            .attr("height", 6)
            .attr("rx", 3)
            .attr("fill", "#ffbb55");

          warningSign
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", -lanternHeight - 10)
            .attr("y2", -lanternHeight - 26)
            .attr("stroke", "#ff8800")
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 136, 0, 0.6))");

          warningSign
            .append("circle")
            .attr("cx", 0)
            .attr("cy", -lanternHeight - 26)
            .attr("r", 6)
            .attr("fill", "#ff8800")
            .attr("stroke", "#2b0d00")
            .attr("stroke-width", 1);

          warningSign
            .transition()
            .duration(1000)
            .delay(i * 150 + 200)
            .style("opacity", 0.85)
            .on("end", function () {
              d3.select(this).call(pulseWarning);
            });

          warningSign.on("mouseover", function (event) {
            d3.select(this)
              .interrupt()
              .transition()
              .duration(200)
              .style("opacity", 1);

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip
              .html(
                `
                 <div style="padding:10px 12px; background:#120800; border:1px solid #ff8800; border-radius:8px; color:#ffe9e9; font-family:'Special Elite', monospace; text-align:left;">
                   <div style="font-weight:700; margin-bottom:4px;">${film}</div>
                   <div>Runtime: ${peak.position.toFixed(1)}%</div>
                   <div>Tension score: ${peak.tension.toFixed(2)}</div>
                   <div style="margin-top:6px; font-size:10px; opacity:0.75;">Click to review tension build-up</div>
                 </div>
               `
              )
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          });

          warningSign.on("mouseout", function () {
            d3.select(this)
              .interrupt()
              .transition()
              .duration(300)
              .style("opacity", 0.85)
              .on("end", () => pulseWarning(d3.select(this)));
            tooltip.transition().duration(500).style("opacity", 0);
          });

          warningSign.on("click", function () {
            openDrawer(film, "tension", peak);
            addMoment({
              type: "tension",
              film,
              position: peak.position,
              value: peak.tension,
            });
          });
        });
      }

      if (!tombstoneGroup.selectAll("*").size()) {
        tombstoneGroup.remove();
      }
    });

    if (Math.random() > 0.5) {
      const crow = g
        .append("text")
        .attr("x", -50)
        .attr("y", Math.random() * height * 0.3)
        .attr("font-size", "20px")
        .text("🦅")
        .style("opacity", 0.6);

      crow
        .transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attr("x", width + 50)
        .style("opacity", 0)
        .remove();
    }
  }

  update();

  const fearBtn = document.getElementById("toggle-fear");
  const tensionBtn = document.getElementById("toggle-tension");
  const resetBtn = document.getElementById("reset-zoom");

  if (fearBtn) {
    fearBtn.addEventListener("click", function () {
      showFear = !showFear;
      this.classList.toggle("active");
      update();
    });
  }

  if (tensionBtn) {
    tensionBtn.addEventListener("click", function () {
      showTension = !showTension;
      this.classList.toggle("active");
      update();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      showFear = true;
      showTension = true;
      if (fearBtn) fearBtn.classList.add("active");
      if (tensionBtn) tensionBtn.classList.add("active");
      update();
    });
  }

  function buildRawKeyMap(rawRows) {
    if (!rawRows.length) return new Map();
    const sample = rawRows[0];
    return Object.keys(sample)
      .filter((key) => key !== "scene_position")
      .reduce((map, key) => {
        const displayName = key
          .replace(/_Unknown$/, "")
          .replace(/-/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        map.set(displayName, key);
        return map;
      }, new Map());
  }

  return {
    update: update,
    svg: svg,
  };
}
