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

  
  const films = Object.keys(fearJourneyData[0]).filter(
    (k) => k !== "scene_position"
  );

  
  const filmSelect = document.getElementById("film-select");
  if (filmSelect) {
    filmSelect.innerHTML =
      '<option value="">⚠️ SELECT PATIENT FILE ⚠️</option>' +
      films
        .map((film) => {
          const filmName = film.replace(/_Unknown$/, "").replace(/-/g, " ");
          return `<option value="${film}">SUBJECT: ${filmName.toUpperCase()}</option>`;
        })
        .join("");
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

  
  const xScale = d3.scaleLinear().domain([0, 90]).range([0, width]);
  const yScale = d3.scaleLinear().domain([0, 1.2]).range([height, 0]);

  
  const xGrid = d3
    .axisBottom(xScale)
    .tickSize(-height)
    .tickFormat("")
    .ticks(18);

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
    .tickValues([0, 10, 20, 30, 40, 50, 60, 70, 80, 90])
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
    .text("⏱ TIME PROGRESSION (SCENE INDEX)")
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

  
  const glowGradient = defs
    .append("linearGradient")
    .attr("id", "fear-glow")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  glowGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#39ff14")
    .attr("stop-opacity", 0.8);

  glowGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#001100")
    .attr("stop-opacity", 0.1);

  
  let linePath, areaPath, flatlineIndicator, heartRateDisplay;

  
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

  function update(filmKey) {
    if (!filmKey) return;

    
    const filmData = fearJourneyData
      .map((row) => ({
        position: +row.scene_position,
        fear: row[filmKey] ? +row[filmKey] : null,
      }))
      .filter((d) => d.fear !== null);

    if (filmData.length === 0) return;

    
    const avgFear = d3.mean(filmData, (d) => d.fear);
    const bpm = Math.round(avgFear * 180 + 40); 

    heartRateDisplay
      .transition()
      .duration(500)
      .style("fill", bpm > 150 ? "#ff0000" : bpm > 100 ? "#ff8800" : "#39ff14")
      .tween("text", function () {
        const that = d3.select(this);
        const i = d3.interpolateNumber(0, bpm);
        return function (t) {
          that.text(`♥ BPM: ${Math.round(i(t))}`);
        };
      });

    
    const criticalMoments = filmData.filter((d) => d.fear > 0.7);

    
    const line = d3
      .line()
      .x((d) => xScale(d.position))
      .y((d) => yScale(d.fear))
      .curve(d3.curveMonotoneX);

    
    const area = d3
      .area()
      .x((d) => xScale(d.position))
      .y0(height)
      .y1((d) => yScale(d.fear))
      .curve(d3.curveMonotoneX);

    
    if (areaPath) {
      areaPath.datum(filmData).transition().duration(1000).attr("d", area);
    } else {
      areaPath = svg
        .append("path")
        .datum(filmData)
        .attr("class", "fear-area")
        .attr("d", area)
        .attr("fill", "url(#fear-glow)")
        .style("opacity", 0.4);
    }

    
    if (linePath) {
      linePath.datum(filmData).transition().duration(1000).attr("d", line);
    } else {
      linePath = svg
        .append("path")
        .datum(filmData)
        .attr("class", "fear-line")
        .attr("d", line)
        .attr("stroke", "#39ff14")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .style("filter", "drop-shadow(0 0 8px #39ff14)");
    }

    
    const totalLength = linePath.node().getTotalLength();
    linePath
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    
    svg.selectAll(".critical-marker").remove();

    const criticalMarkers = svg
      .selectAll(".critical-marker")
      .data(criticalMoments)
      .enter()
      .append("g")
      .attr("class", "critical-marker");

    
    criticalMarkers
      .append("line")
      .attr("x1", (d) => xScale(d.position))
      .attr("x2", (d) => xScale(d.position))
      .attr("y1", (d) => yScale(d.fear))
      .attr("y2", height)
      .attr("stroke", "#ff0000")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 200)
      .style("opacity", 0.6);

    
    criticalMarkers
      .append("text")
      .attr("x", (d) => xScale(d.position))
      .attr("y", (d) => yScale(d.fear) - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "28px")
      .text("☠")
      .style("fill", "#ff0000")
      .style("filter", "drop-shadow(0 0 10px #ff0000)")
      .style("opacity", 0)
      .style("cursor", "pointer")
      .transition()
      .duration(500)
      .delay((d, i) => i * 200)
      .style("opacity", 1)
      .selection()
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", "36px")
          .style("filter", "drop-shadow(0 0 20px #ff0000)");

        
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
            <div style="text-align: center; border: 2px solid #ff0000; padding: 10px;">
              <strong style="color: #ff0000; font-size: 18px;">☠ CRITICAL TERROR EVENT ☠</strong><br/>
              <span style="color: #ff6b6b; font-size: 12px;">⚠ VITAL SIGNS CRITICAL ⚠</span><br/><br/>
              Position: <strong>${d.position}%</strong><br/>
              Fear Level: <strong style="color: #ff0000; font-size: 16px;">${d.fear.toFixed(
                3
              )}</strong><br/>
              <br/>
              <span style="font-size: 11px; color: #999; font-style: italic;">
                Subject experiencing extreme terror
              </span>
            </div>
          `
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", "28px")
          .style("filter", "drop-shadow(0 0 10px #ff0000)");

        tooltip.transition().duration(500).style("opacity", 0);
      });

    
    svg.selectAll(".scan-line").remove();

    const scanLine = svg
      .append("line")
      .attr("class", "scan-line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#39ff14")
      .attr("stroke-width", 2)
      .style("opacity", 0.6)
      .style("filter", "drop-shadow(0 0 5px #39ff14)");

    
    function animateScanLine() {
      scanLine
        .attr("x1", 0)
        .attr("x2", 0)
        .transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attr("x1", width)
        .attr("x2", width)
        .on("end", animateScanLine);
    }
    animateScanLine();

    
    const cursor = svg
      .append("circle")
      .attr("class", "scan-cursor")
      .attr("r", 5)
      .attr("fill", "#39ff14")
      .style("opacity", 0);

    setInterval(() => {
      cursor.style("opacity", cursor.style("opacity") == 0 ? 0.8 : 0);
    }, 500);
  }

  
  if (filmSelect) {
    filmSelect.addEventListener("change", function () {
      if (this.value) {
        update(this.value);
      }
    });
  }

  return {
    update: update,
    svg: svg,
  };
}
