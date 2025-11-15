console.log("💀 effectivenessViz.js LOADED!");

function createEffectivenessViz(selector, rawData) {
  "use strict";

  console.log("⚠️ Effectiveness init:", selector, "data:", rawData);

  const container = d3.select(selector);
  const containerNode = container.node();

  if (!containerNode) {
    console.error("❌ Container not found:", selector);
    return null;
  }

  container.selectAll("*").remove();
  container.style("position", "relative");

  const isCompact = containerNode.clientWidth < 720;
  const margin = {
    top: 70,
    right: isCompact ? 32 : 240,
    bottom: 200,
    left: 120,
  };
  const baseHeight = isCompact ? 900 : 1100;
  const containerWidth = containerNode.clientWidth;
  
  
  const maxGraphWidth = 1400;
  const availableWidth = Math.min(containerWidth - margin.left - margin.right, maxGraphWidth - margin.left - margin.right);
  const width = Math.max(480, availableWidth);
  const height = baseHeight - margin.top - margin.bottom;

  
  const svgWidth = width + margin.left + margin.right;

  const svg = container
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", baseHeight)
    .style("display", "block")
    .style("margin", "0 auto");

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const defs = svg.append("defs");

  defs
    .append("linearGradient")
    .attr("id", "signal-lab-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .selectAll("stop")
    .data([
      { offset: "0%", color: "#14001e" },
      { offset: "45%", color: "#130022" },
      { offset: "100%", color: "#050008" },
    ])
    .enter()
    .append("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  const glow = defs
    .append("filter")
    .attr("id", "signal-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", 6).attr("result", "coloredBlur");
  const glowMerge = glow.append("feMerge");
  glowMerge.append("feMergeNode").attr("in", "coloredBlur");
  glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const rippleFilter = defs
    .append("filter")
    .attr("id", "signal-ripple-filter")
    .attr("x", "-100%")
    .attr("y", "-100%")
    .attr("width", "300%")
    .attr("height", "300%");
  rippleFilter.append("feGaussianBlur").attr("stdDeviation", 4).attr("result", "rippleBlur");
  const rippleMerge = rippleFilter.append("feMerge");
  rippleMerge.append("feMergeNode").attr("in", "rippleBlur");
  rippleMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const maxScenes = d3.max(rawData, (d) => d.scenesWithSignal) || 1;
  const maxOccurrences = d3.max(rawData, (d) => d.occurrences) || 1;
  const maxOverallImpact = d3.max(rawData, (d) => d.overallImpact) || 1;

  function getHaloColor(d, opacity = 0.22) {
    const base = d3.color(colorScale(d.dominance)) || d3.color("#ffffff");
    base.opacity = opacity;
    return base.formatRgb();
  }

  const data = rawData
    .map((d) => {
      const fearImpact = +d.fearImpact;
      const tensionImpact = +d.tensionImpact;
      const avgFear = +d.avgFear;
      const avgTension = +d.avgTension;
      const overallImpact = +d.overallImpact;
      const dominance = fearImpact - tensionImpact;
      let profile = "balanced";
      if (dominance > 0.05) profile = "shock";
      if (dominance < -0.05) profile = "dread";
      const badge = profile === "shock" ? "⚡" : profile === "dread" ? "🌫️" : "🩸";
      return {
        signal: d.signal,
        occurrences: +d.occurrences,
        scenesWithSignal: +d.scenesWithSignal,
        fearImpact,
        tensionImpact,
        avgFear,
        avgTension,
        overallImpact,
        dominance,
        profile,
        badge,
        scenesShare: (+d.scenesWithSignal || 0) / maxScenes,
        occurrenceShare: (+d.occurrences || 0) / maxOccurrences,
      };
    })
    .sort((a, b) => b.overallImpact - a.overallImpact);

  const dominanceExtent = d3.extent(data, (d) => d.dominance);
  const dominanceRange = Math.max(
    Math.abs(dominanceExtent[0] || 0),
    Math.abs(dominanceExtent[1] || 0),
    0.05
  );

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(data, (d) => d.occurrences))
    .range(isCompact ? [18, 52] : [22, 68]);

  const colorScale = d3
    .scaleDiverging()
    .domain([-dominanceRange, 0, dominanceRange])
    .interpolator((t) =>
      d3.interpolateRgbBasis(["#2460ff", "#9b4cff", "#ff365f"])(t)
    );

  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  root
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "url(#signal-lab-gradient)")
    .attr("rx", 14)
    .attr("ry", 14)
    .attr("stroke", "#451744")
    .attr("stroke-width", 1.2);

  const gridGroup = root.append("g").attr("class", "signal-grid");
  const xAxisGroup = root
    .append("g")
    .attr("class", "signal-axis signal-axis--x")
    .attr("transform", `translate(0,${height})`);
  const yAxisGroup = root.append("g").attr("class", "signal-axis signal-axis--y");

  const xAxisLabel = root
    .append("text")
    .attr("class", "signal-axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 52)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "13px")
    .style("fill", "#fce6ff");

  const yAxisLabel = root
    .append("text")
    .attr("class", "signal-axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(-64,${height / 2}) rotate(-90)`)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "13px")
    .style("fill", "#fce6ff");

  const diagonalLine = root
    .append("line")
    .attr("class", "signal-diagonal")
    .attr("stroke", "rgba(255,255,255,0.12)")
    .attr("stroke-width", 1.2)
    .attr("stroke-dasharray", "6,6")
    .style("opacity", 0);

  const quadrantLabels = root
    .append("g")
    .attr("class", "signal-quadrants")
    .style("pointer-events", "none");
  quadrantLabels
    .selectAll("text")
    .data([
      { x: width - 12, y: 18, anchor: "end", text: "Tension Architects" },
      { x: width - 12, y: height - 12, anchor: "end", text: "Atmospheric Echoes" },
      { x: 12, y: 18, anchor: "start", text: "Lingering Dread" },
      { x: 12, y: height - 12, anchor: "start", text: "Muted Signals" },
    ])
    .enter()
    .append("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("text-anchor", (d) => d.anchor)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "10px")
    .style("letter-spacing", "0.08em")
    .style("fill", "rgba(255,255,255,0.35)");

  const modeDescription = root
    .append("text")
    .attr("class", "signal-mode-description")
    .attr("x", 0)
    .attr("y", -24)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px")
    .style("fill", "#ff8bff")
    .style("text-transform", "uppercase");

  const crosshair = root.append("g").attr("class", "signal-crosshair").style("opacity", 0);
  crosshair
    .append("line")
    .attr("class", "crosshair-x")
    .attr("stroke", "rgba(250,78,125,0.3)")
    .attr("stroke-width", 1.1)
    .attr("stroke-dasharray", "4,6");
  crosshair
    .append("line")
    .attr("class", "crosshair-y")
    .attr("stroke", "rgba(250,78,125,0.3)")
    .attr("stroke-width", 1.1)
    .attr("stroke-dasharray", "4,6");

  const pulse = root
    .append("circle")
    .attr("class", "signal-pulse")
    .attr("fill", "none")
    .attr("stroke", "rgba(255,104,150,0.65)")
    .attr("stroke-width", 2)
    .attr("opacity", 0)
    .style("filter", "url(#signal-ripple-filter)");

  d3.select("#effectiveness-tooltip").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "effectiveness-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(10,0,20,0.94)")
    .style("border", "1px solid rgba(255,80,150,0.6)")
    .style("padding", "12px 14px")
    .style("min-width", "190px")
    .style("border-radius", "8px")
    .style("box-shadow", "0 0 18px rgba(255,60,120,0.25)")
    .style("opacity", 0)
    .style("color", "#f8e8ff")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px")
    .style("z-index", 9999);

  d3.select("#signal-dossier-overlay").remove();
  const dossierOverlay = d3
    .select("body")
    .append("div")
    .attr("id", "signal-dossier-overlay")
    .style("position", "fixed")
    .style("left", "0")
    .style("right", "0")
    .style("bottom", "0")
    .style("top", "0")
    .style("display", "none")
    .style("pointer-events", "none")
    .style("background", "rgba(6, 0, 14, 0.28)")
    .style("backdrop-filter", "blur(4px)")
    .style("z-index", 10000)
    .style("opacity", 0);

  const dossierCard = dossierOverlay
    .append("div")
    .attr("class", "signal-dossier-card")
    .style("position", "relative")
    .style("width", "100%")
    .style("pointer-events", "auto")
    .style("padding", isCompact ? "22px 20px 30px" : "26px 44px 38px")
    .style("border-radius", "26px 26px 0 0")
    .style("border", "1px solid rgba(255, 90, 214, 0.45)")
    .style(
      "background",
      isCompact
        ? "linear-gradient(175deg, rgba(16,0,18,0.92), rgba(4,0,12,0.86))"
        : "linear-gradient(175deg, rgba(12,0,20,0.88), rgba(2,0,10,0.82))"
    )
    .style("box-shadow", "0 -18px 46px rgba(3, 0, 20, 0.32)")
    .style("color", "#ffe9ff")
    .style("font-family", "'Special Elite', monospace")
    .style("opacity", 0)
    .style("transform", "translateY(40px)");

  const dossierClose = dossierCard
    .append("button")
    .attr("type", "button")
    .attr("aria-label", "Close signal dossier")
    .style("position", "absolute")
    .style("top", "16px")
    .style("right", "20px")
    .style("background", "rgba(255, 80, 180, 0.18)")
    .style("border", "1px solid rgba(255, 120, 210, 0.45)")
    .style("color", "#ffcbff")
    .style("font-size", "12px")
    .style("letter-spacing", "0.18em")
    .style("text-transform", "uppercase")
    .style("border-radius", "999px")
    .style("padding", "6px 16px")
    .style("cursor", "pointer")
    .style("font-family", "'Special Elite', monospace")
    .text("Close");

  const dossierContent = dossierCard
    .append("div")
    .attr("class", "signal-dossier-content")
    .style("font-size", "13px")
    .style("line-height", "1.55");

  let overlayVisible = false;

  function bodyJolt() {
    if (!document.body.animate) {
      document.body.style.transform = "translateX(6px)";
      setTimeout(() => {
        document.body.style.transform = "";
      }, 180);
      return;
    }
    document.body.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 220, easing: "ease-out" }
    );
  }

  function hideDossier() {
    if (!overlayVisible) return;
    overlayVisible = false;
    dossierOverlay
      .interrupt()
      .style("opacity", 1)
      .transition()
      .duration(220)
      .style("opacity", 0)
      .on("end", () => dossierOverlay.style("display", "none"));
    dossierCard
      .interrupt()
      .transition()
      .duration(240)
      .ease(d3.easeCubicIn)
      .style("transform", "translateY(32px)")
      .style("opacity", 0);
    document.removeEventListener("keydown", handleEsc);
  }

  function handleEsc(event) {
    if (event.key === "Escape") {
      hideDossier();
    }
  }

  dossierOverlay.on("click", hideDossier);

  dossierClose.on("click", hideDossier);

  const nodesGroup = root.append("g").attr("class", "signal-nodes");
  const node = nodesGroup
    .selectAll(".signal-node")
    .data(data, (d) => d.signal)
    .enter()
    .append("g")
    .attr("class", "signal-node")
    .style("cursor", "pointer")
    .style("pointer-events", "all");

  node
    .append("circle")
    .attr("class", "signal-node-halo")
    .attr("r", (d) => radiusScale(d.occurrences) + 10)
    .attr("fill", (d) => getHaloColor(d))
    .style("filter", "url(#signal-glow)")
    .style("opacity", 0.7);

  node
    .append("circle")
    .attr("class", "signal-node-core")
    .attr("r", (d) => radiusScale(d.occurrences))
    .attr("fill", (d) => colorScale(d.dominance))
    .attr("stroke", "rgba(5,0,10,0.65)")
    .attr("stroke-width", 2.2)
    .style("filter", "url(#signal-glow)")
    .style("opacity", 0.92);

  node
    .append("text")
    .attr("class", "signal-node-label")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .text((d) => d.signal.toUpperCase())
    .style("font-family", "'Creepster', cursive")
    .style("font-size", (d) => `${Math.min(16, radiusScale(d.occurrences) / 2.4)}px`)
    .style("fill", "#fff")
    .style("letter-spacing", "0.08em")
    .style("text-shadow", "0 0 6px rgba(0,0,0,0.8)")
    .style("pointer-events", "none");

  const formatDelta = d3.format("+.3f");
  const formatNumber = d3.format(",");
  const formatOverall = d3.format(".3f");
  const formatPercent = d3.format(".0%");

  const profileCopy = {
    shock: {
      title: "Shock Trigger",
      copy: "Fear spikes outrun tension. Deploy when you want sudden jumps or vivid gore hits.",
    },
    dread: {
      title: "Dread Architect",
      copy: "Tension builds faster than raw fear. Perfect for slow-burn unease and ominous reveals.",
    },
    balanced: {
      title: "Twin Threat",
      copy: "Fear and tension climb together — a dependable signal for balanced, full-spectrum scares.",
    },
  };

  const layoutModes = {
    impact: {
      key: "impact",
      xAccessor: (d) => d.fearImpact,
      yAccessor: (d) => d.tensionImpact,
      xLabel: "Fear Impact Δ (vs scenes without signal)",
      yLabel: "Tension Impact Δ (vs scenes without signal)",
      xTickFormat: ".2f",
      yTickFormat: ".2f",
      xClamp: "zeroMin",
      yClamp: "zeroMin",
      description: "Rightward signals deliver bigger fear jolts; higher ones sustain tension.",
      showDiagonal: true,
    },
    fear: {
      key: "fear",
      xAccessor: (d) => d.avgFear,
      yAccessor: (d) => d.fearImpact,
      xLabel: "Average Fear When Signal Appears",
      yLabel: "Fear Impact Δ",
      xTickFormat: ".2f",
      yTickFormat: ".2f",
      xClamp: "zeroMin",
      yClamp: "zeroMin",
      description: "Shows raw scene fear versus how much extra the signal injects.",
      showDiagonal: false,
    },
    tension: {
      key: "tension",
      xAccessor: (d) => d.avgTension,
      yAccessor: (d) => d.tensionImpact,
      xLabel: "Average Tension When Signal Appears",
      yLabel: "Tension Impact Δ",
      xTickFormat: ".2f",
      yTickFormat: ".2f",
      xClamp: "zeroMin",
      yClamp: "zeroMin",
      description: "Highlights which cues feed the slow squeeze versus adrenaline spikes.",
      showDiagonal: false,
    },
    frequency: {
      key: "frequency",
      xAccessor: (d) => d.scenesShare,
      yAccessor: (d) => d.overallImpact,
      xLabel: "Share of Scenes Featuring Signal",
      yLabel: "Combined Impact Δ",
      xTickFormat: ".0%",
      yTickFormat: ".2f",
      xDomain: [0, 1],
      yClamp: "zeroMin",
      description: "Common cues hug the right edge — scan how prevalence compares to potency.",
      showDiagonal: false,
    },
  };

  let currentMode = "impact";
  let activeDatum = null;

  function showDossier(d) {
    const profile = profileCopy[d.profile];
    const overallRatio = maxOverallImpact
      ? Math.max(8, Math.min(100, (d.overallImpact / maxOverallImpact) * 100))
      : 100;
    const dominancePercent = Math.min(
      100,
      Math.round((Math.abs(d.dominance) / dominanceRange) * 100)
    );

    dossierContent.html(`
      <div style="display:flex; align-items:center; gap:18px; margin-bottom: 16px;">
        <div style="font-size: 42px; filter: drop-shadow(0 0 14px rgba(255,120,210,0.38));">${d.badge}</div>
        <div style="flex:1;">
          <div style="font-family: 'Nosifer', cursive; font-size: 26px; letter-spacing: 0.12em;">
            ${d.signal.toUpperCase()}
          </div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: rgba(255,220,255,0.7); margin-top: 2px;">
            ${profile.title}
          </div>
        </div>
      </div>
      <p style="margin-bottom: 16px; color: rgba(255,220,255,0.85);">
        ${profile.copy}
      </p>
      <div style="margin-bottom: 18px;">
        <div style="display:flex; justify-content:space-between; font-size: 12px;">
          <span style="letter-spacing: 0.12em; text-transform: uppercase;">Overall delta</span>
          <strong style="color: #ff9bd6; font-size: 18px;">${formatOverall(d.overallImpact)}</strong>
        </div>
        <div style="position:relative; width:100%; height:6px; border-radius:3px; background: rgba(255,120,190,0.18); margin-top:10px;">
          <div style="position:absolute; left:0; top:0; height:100%; width:${overallRatio}%; border-radius:3px; background: linear-gradient(90deg,#ff4fa5,#ffac5f);"></div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; font-size: 12px;">
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Scenes flagged</span><br/><strong>${formatNumber(d.scenesWithSignal)}</strong></div>
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Occurrences</span><br/><strong>${formatNumber(d.occurrences)}</strong></div>
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Fear Δ</span><br/><strong>${formatDelta(d.fearImpact)}</strong></div>
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Tension Δ</span><br/><strong>${formatDelta(d.tensionImpact)}</strong></div>
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Avg fear</span><br/><strong>${d.avgFear.toFixed(3)}</strong></div>
        <div><span style="color: rgba(255,200,255,0.6); text-transform: uppercase; letter-spacing:0.08em;">Avg tension</span><br/><strong>${d.avgTension.toFixed(3)}</strong></div>
      </div>
      <div style="margin-top:18px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; color: rgba(255,200,255,0.7); text-transform: uppercase; letter-spacing: 0.14em;">
          <span>Fear vs tension balance</span>
          <span style="color:#ff9bd6;">${d.dominance > 0 ? "Fear-leaning" : d.dominance < 0 ? "Tension-leaning" : "Balanced"}</span>
        </div>
        <div style="position:relative; width:100%; height:6px; border-radius:3px; background: rgba(60,0,90,0.7); margin-top:10px;">
          <div style="position:absolute; ${d.dominance >= 0 ? "left:50%;" : "right:50%;"} top:0; height:100%; width:${dominancePercent / 2}%; border-radius:3px; background:${d.dominance >= 0 ? "linear-gradient(90deg,#ff4fa5,#ffd45f)" : "linear-gradient(90deg,#3ec0ff,#a87dff)"};"></div>
          <div style="position:absolute; left:calc(50% - 1px); top:-3px; width:2px; height:12px; background: rgba(255,255,255,0.4);"></div>
        </div>
      </div>
    `);

    overlayVisible = true;
    dossierOverlay.style("display", "block");
    dossierOverlay
      .interrupt()
      .style("opacity", 0)
      .transition()
      .duration(180)
      .style("opacity", 1);
    dossierCard
      .interrupt()
      .style("transform", "translateY(40px)")
      .style("opacity", 0)
      .transition()
      .duration(260)
      .ease(d3.easeCubicOut)
      .style("transform", "translateY(0)")
      .style("opacity", 1);

    bodyJolt();
    document.addEventListener("keydown", handleEsc);
  }

  function moveCrosshair(d) {
    crosshair.style("opacity", 1);
    crosshair
      .select(".crosshair-x")
      .attr("x1", d.currentX)
      .attr("y1", 0)
      .attr("x2", d.currentX)
      .attr("y2", height);
    crosshair
      .select(".crosshair-y")
      .attr("x1", 0)
      .attr("y1", d.currentY)
      .attr("x2", width)
      .attr("y2", d.currentY);
  }

  function hideCrosshair() {
    crosshair.style("opacity", 0);
  }

  function showTooltip(event, d) {
    tooltip
      .style("opacity", 1)
      .html(`
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 6px; color:#ff9bd6;">
          ${d.signal.toUpperCase()}
        </div>
        <div>Overall Δ: <strong>${formatOverall(d.overallImpact)}</strong></div>
        <div>Fear Δ: <strong>${formatDelta(d.fearImpact)}</strong></div>
        <div>Tension Δ: <strong>${formatDelta(d.tensionImpact)}</strong></div>
        <div>Scenes: <strong>${formatNumber(d.scenesWithSignal)}</strong></div>
        <div>Occurrences: <strong>${formatNumber(d.occurrences)}</strong></div>
      `)
      .style("left", `${event.pageX + 18}px`)
      .style("top", `${event.pageY - 12}px`);
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  function resolveCollisions(layoutNodes) {
    const simNodes = layoutNodes.map((node) => ({
      datum: node.datum,
      radius: node.radius,
      targetX: node.targetX,
      targetY: node.targetY,
      x: node.targetX,
      y: node.targetY,
    }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force("x", d3.forceX((d) => d.targetX).strength(isCompact ? 0.5 : 0.6))
      .force("y", d3.forceY((d) => d.targetY).strength(isCompact ? 0.5 : 0.6))
      .force(
        "collision",
        d3.forceCollide((d) => d.radius + (isCompact ? 3 : 5))
      )
      .stop();

    
    for (let i = 0; i < 80; i += 1) { 
      simulation.tick();
    }

    simNodes.forEach((node) => {
      const limitedX = Math.max(node.radius, Math.min(width - node.radius, node.x));
      const limitedY = Math.max(node.radius, Math.min(height - node.radius, node.y));
      node.x = limitedX;
      node.y = limitedY;
    });

    return simNodes;
  }

  function triggerPulse(d) {
    pulse
      .interrupt()
      .attr("cx", d.currentX)
      .attr("cy", d.currentY)
      .attr("r", radiusScale(d.occurrences) + 6)
      .attr("opacity", 0.55)
      .transition()
      .duration(950)
      .ease(d3.easeCubicOut)
      .attr("r", radiusScale(d.occurrences) + (isCompact ? 60 : 90))
      .attr("opacity", 0)
      .on("end", () => pulse.attr("opacity", 0));
  }

  function render(modeKey, animate = true) {
    currentMode = modeKey;
    const mode = layoutModes[modeKey];

    const xVals = data.map(mode.xAccessor);
    const yVals = data.map(mode.yAccessor);

    let xMin = d3.min(xVals);
    let xMax = d3.max(xVals);
    let yMin = d3.min(yVals);
    let yMax = d3.max(yVals);

    if (mode.xDomain) {
      [xMin, xMax] = mode.xDomain;
    } else {
      const xSpan = xMax - xMin;
      const xPad = (xSpan === 0 ? Math.abs(xMax) || 0.1 : xSpan) * 0.12;
      if (mode.xClamp === "zeroMin") xMin = 0;
      else xMin -= xPad;
      xMax += xPad;
    }

    if (mode.yDomain) {
      [yMin, yMax] = mode.yDomain;
    } else {
      const ySpan = yMax - yMin;
      const yPad = (ySpan === 0 ? Math.abs(yMax) || 0.1 : ySpan) * 0.12;
      if (mode.yClamp === "zeroMin") yMin = 0;
      else yMin -= yPad;
      yMax += yPad;
    }

    xScale.domain([xMin, xMax]).nice();
    yScale.domain([yMin, yMax]).nice();

    const xGrid = d3.axisBottom(xScale).tickSize(-height).tickFormat("");
    const yGrid = d3.axisLeft(yScale).tickSize(-width).tickFormat("");
    gridGroup.selectAll("*").remove();
    gridGroup
      .append("g")
      .attr("class", "grid-x")
      .attr("transform", `translate(0,${height})`)
      .call(xGrid)
      .selectAll("line")
      .attr("stroke", "rgba(255,255,255,0.06)");
    gridGroup
      .append("g")
      .attr("class", "grid-y")
      .call(yGrid)
      .selectAll("line")
      .attr("stroke", "rgba(255,255,255,0.08)");

    const xAxis = d3.axisBottom(xScale).ticks(isCompact ? 5 : 7);
    const yAxis = d3.axisLeft(yScale).ticks(isCompact ? 5 : 7);

    if (mode.xTickFormat) xAxis.tickFormat(d3.format(mode.xTickFormat));
    if (mode.yTickFormat) yAxis.tickFormat(d3.format(mode.yTickFormat));

    (animate ? xAxisGroup.transition().duration(550).ease(d3.easeCubicOut) : xAxisGroup).call(xAxis);
    (animate ? yAxisGroup.transition().duration(550).ease(d3.easeCubicOut) : yAxisGroup).call(yAxis);

    xAxisGroup
      .selectAll("text")
      .style("fill", "#fce6ff")
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "11px");
    yAxisGroup
      .selectAll("text")
      .style("fill", "#fce6ff")
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "11px");

    xAxisGroup.selectAll("path,line").attr("stroke", "rgba(255,255,255,0.2)");
    yAxisGroup.selectAll("path,line").attr("stroke", "rgba(255,255,255,0.2)");

    xAxisLabel.text(mode.xLabel);
    yAxisLabel.text(mode.yLabel);

    diagonalLine.style("opacity", mode.showDiagonal ? 0.9 : 0);
    if (mode.showDiagonal) {
      const diagMin = Math.max(xScale.domain()[0], yScale.domain()[0]);
      const diagMax = Math.min(xScale.domain()[1], yScale.domain()[1]);
      diagonalLine
        .attr("x1", xScale(diagMin))
        .attr("y1", yScale(diagMin))
        .attr("x2", xScale(diagMax))
        .attr("y2", yScale(diagMax));
    }

    quadrantLabels.style("opacity", modeKey === "impact" ? 1 : 0);

    modeDescription.text(mode.description);

    const layoutTargets = data.map((datum) => ({
      datum,
      targetX: xScale(mode.xAccessor(datum)),
      targetY: yScale(mode.yAccessor(datum)),
      radius: radiusScale(datum.occurrences),
    }));

    const resolvedPositions = resolveCollisions(layoutTargets);
    const positionBySignal = new Map(
      resolvedPositions.map((node) => [node.datum.signal, node])
    );

    node.each(function (d) {
      const pos = positionBySignal.get(d.signal);
      d.currentX = pos ? pos.x : xScale(mode.xAccessor(d));
      d.currentY = pos ? pos.y : yScale(mode.yAccessor(d));
    });

    (animate
      ? node.transition().duration(650).ease(d3.easeCubicOut)
      : node
    ).attr("transform", (d) => `translate(${d.currentX},${d.currentY})`);

    node
      .select(".signal-node-core")
      .attr("fill", (d) => colorScale(d.dominance))
      .attr("stroke", (d) =>
        d === activeDatum ? "rgba(255,255,255,0.8)" : "rgba(5,0,10,0.65)"
      )
      .attr("stroke-width", (d) => (d === activeDatum ? 3 : 2.2));

    node
      .select(".signal-node-halo")
      .attr("fill", (d) => getHaloColor(d))
      .style("opacity", (d) => (d === activeDatum ? 0.9 : 0.6));
  }

  node
    .on("mouseenter", function (event, d) {
      d3.select(this)
        .raise()
        .select(".signal-node-core")
        .transition()
        .duration(150)
        .attr("stroke", "#fff")
        .attr("stroke-width", 3.2);

      moveCrosshair(d);
      showTooltip(event, d);
    })
    .on("mousemove", function (event, d) {
      showTooltip(event, d);
    })
    .on("mouseleave", function (_event, d) {
      d3.select(this)
        .select(".signal-node-core")
        .transition()
        .duration(150)
        .attr("stroke", (datum) =>
          datum === activeDatum ? "rgba(255,255,255,0.8)" : "rgba(5,0,10,0.65)"
        )
        .attr("stroke-width", (datum) => (datum === activeDatum ? 3 : 2.2));
      hideCrosshair();
      hideTooltip();
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      hideTooltip();
      hideCrosshair();
      activeDatum = d;
      triggerPulse(d);
      render(currentMode, false);
      showDossier(d);
    });

  root.on("click", () => {
    hideTooltip();
    hideCrosshair();
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (event) => {
      const modeKey = event.target.value;
      if (!layoutModes[modeKey]) return;
      render(modeKey);
      if (activeDatum) {
        moveCrosshair(activeDatum);
      }
    });
  }

  render(currentMode, false);

  const legendGroup = svg.append("g").attr("class", "effectiveness-legend");
  const legendY = baseHeight - 80;
  const legendSpacing = 200;
  
  const colorLegendWidth = 250;
  const colorLegendHeight = 20;
  const colorLegendX = (svgWidth - colorLegendWidth * 2 - legendSpacing) / 2;
  
  const colorScaleRect = legendGroup
    .append("g")
    .attr("transform", `translate(${colorLegendX}, ${legendY})`);
  
  const colorGradient = defs
    .append("linearGradient")
    .attr("id", "color-legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");
  
  const numStops = 20;
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops;
    const color = colorScale(-dominanceRange + t * (dominanceRange * 2));
    colorGradient
      .append("stop")
      .attr("offset", `${(i / numStops) * 100}%`)
      .attr("stop-color", color);
  }
  
  colorScaleRect
    .append("rect")
    .attr("width", colorLegendWidth)
    .attr("height", colorLegendHeight)
    .attr("fill", "url(#color-legend-gradient)")
    .attr("stroke", "rgba(255,255,255,0.3)")
    .attr("stroke-width", 1)
    .attr("rx", 4);
  
  colorScaleRect
    .append("text")
    .attr("x", colorLegendWidth / 2)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "11px")
    .style("fill", "#fce6ff")
    .text("Signal Profile");
  
  colorScaleRect
    .append("text")
    .attr("x", 0)
    .attr("y", colorLegendHeight + 16)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "10px")
    .style("fill", "#ff9bd6")
    .text("Tension");
  
  colorScaleRect
    .append("text")
    .attr("x", colorLegendWidth / 2)
    .attr("y", colorLegendHeight + 16)
    .attr("text-anchor", "middle")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "10px")
    .style("fill", "#9b4cff")
    .text("Balanced");
  
  colorScaleRect
    .append("text")
    .attr("x", colorLegendWidth)
    .attr("y", colorLegendHeight + 16)
    .attr("text-anchor", "end")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "10px")
    .style("fill", "#ff365f")
    .text("Shock");
  
  const sizeLegendX = colorLegendX + colorLegendWidth + legendSpacing;
  const sizeLegendGroup = legendGroup
    .append("g")
    .attr("transform", `translate(${sizeLegendX}, ${legendY})`);
  
  sizeLegendGroup
    .append("text")
    .attr("x", 0)
    .attr("y", -8)
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "11px")
    .style("fill", "#fce6ff")
    .text("Frequency (Size)");
  
  const sizeSteps = [0.2, 0.5, 0.8, 1.0];
  const sizeLegendItemWidth = 80;
  
  sizeSteps.forEach((step, i) => {
    const x = i * sizeLegendItemWidth;
    const size = radiusScale.domain()[0] + step * (radiusScale.domain()[1] - radiusScale.domain()[0]);
    const radius = radiusScale(size);
    
    sizeLegendGroup
      .append("circle")
      .attr("cx", x + sizeLegendItemWidth / 2)
      .attr("cy", colorLegendHeight / 2)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#fce6ff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.6);
    
    sizeLegendGroup
      .append("text")
      .attr("x", x + sizeLegendItemWidth / 2)
      .attr("y", colorLegendHeight + 16)
      .attr("text-anchor", "middle")
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "10px")
      .style("fill", "#fce6ff")
      .text(Math.round(size));
  });

  return {
    setMode: (modeKey) => {
      if (!layoutModes[modeKey]) return;
      render(modeKey);
    },
    svg,
  };
}
