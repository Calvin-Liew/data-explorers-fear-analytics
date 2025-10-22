console.log("🩸 sankeyViz.js LOADED!");

function createSankeyViz(selector, effectivenessData) {
  "use strict";

  console.log("🩸 Sankey init:", selector, "data:", effectivenessData);

  const container = d3.select(selector);
  const containerNode = container.node();

  if (!containerNode) {
    console.error("❌ Container not found:", selector);
    return;
  }

  console.log("✅ Container found:", containerNode);
  const margin = { top: 20, right: 200, bottom: 20, left: 200 };
  const width = containerNode.clientWidth - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  
  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0);

  
  const sortedData = effectivenessData.sort(
    (a, b) => b.occurrences - a.occurrences
  );

  let currentThreshold = 400;

  
  const dripsContainer = svg.append("g").attr("class", "blood-drips");

  function createBloodDrip(x, y) {
    const drip = dripsContainer
      .append("ellipse")
      .attr("cx", x)
      .attr("cy", y)
      .attr("rx", 3)
      .attr("ry", 5)
      .attr("fill", "#8b0000")
      .style("opacity", 0.8);

    drip
      .transition()
      .duration(2000)
      .ease(d3.easeQuadIn)
      .attr("cy", y + 50)
      .style("opacity", 0)
      .remove();
  }

  
  setInterval(() => {
    if (Math.random() > 0.7) {
      createBloodDrip(Math.random() * width, Math.random() * 50);
    }
  }, 500);

  function update(threshold = currentThreshold) {
    currentThreshold = threshold;

    
    const filtered = sortedData
      .filter((d) => d.occurrences >= threshold)
      .slice(0, 10);

    
    const categories = {
      "THE VOID": ["night", "dark", "shadow", "silent"],
      "THE VIOLENCE": ["blood", "death", "knife"],
      "THE SCREAM": ["scream", "fear"],
      "THE UNKNOWN": ["creepy"],
    };

    const signalToCategory = {};
    Object.keys(categories).forEach((cat) => {
      categories[cat].forEach((sig) => {
        signalToCategory[sig] = cat;
      });
    });

    
    const nodes = [];
    const nodeMap = new Map();

    
    Object.keys(categories).forEach((cat, i) => {
      nodes.push({ name: cat, id: i, type: "category" });
      nodeMap.set(cat, i);
    });

    
    filtered.forEach((d, i) => {
      const nodeId = Object.keys(categories).length + i;
      nodes.push({
        name: d.signal,
        id: nodeId,
        type: "signal",
        data: d,
      });
      nodeMap.set(d.signal, nodeId);
    });

    
    const links = [];
    filtered.forEach((d) => {
      const category = signalToCategory[d.signal] || "THE UNKNOWN";
      const sourceId = nodeMap.get(category);
      const targetId = nodeMap.get(d.signal);

      if (sourceId !== undefined && targetId !== undefined) {
        links.push({
          source: sourceId,
          target: targetId,
          value: d.occurrences,
          signal: d.signal,
          impact: d.overallImpact,
        });
      }
    });

    
    const sankey = d3
      .sankey()
      .nodeId((d) => d.id)
      .nodeWidth(30)
      .nodePadding(20)
      .extent([
        [0, 0],
        [width, height],
      ]);

    const graph = sankey({
      nodes: nodes.map((d) => Object.assign({}, d)),
      links: links.map((d) => Object.assign({}, d)),
    });

    
    const categoryColors = {
      "THE VOID": "#1a0033",
      "THE VIOLENCE": "#660000",
      "THE SCREAM": "#cc0000",
      "THE UNKNOWN": "#003300",
    };

    
    svg.selectAll(".sankey-link, .sankey-node, .blood-particle").remove();

    
    const defs = svg.append("defs");

    graph.links.forEach((link, i) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `blood-gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.source.x1)
        .attr("x2", link.target.x0);

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#330000")
        .attr("stop-opacity", 0.6);

      gradient
        .append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#8b0000")
        .attr("stop-opacity", 0.8);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ff0000")
        .attr("stop-opacity", 0.4);
    });

    
    const linkPaths = svg
      .append("g")
      .selectAll(".sankey-link")
      .data(graph.links)
      .join("path")
      .attr("class", "sankey-link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", (d, i) => `url(#blood-gradient-${i})`)
      .attr("stroke-width", (d) => Math.max(2, d.width))
      .style("stroke-opacity", 0)
      .style("mix-blend-mode", "screen")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .style("stroke-opacity", 1)
          .attr("stroke-width", (d) => Math.max(4, d.width * 1.5))
          .style("filter", "drop-shadow(0 0 10px #ff0000)");

        
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const point = this.getPointAtLength(
              Math.random() * this.getTotalLength()
            );
            createBloodSplatter(point.x, point.y);
          }, i * 100);
        }

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `
            <div style="text-align: center;">
              <strong style="color: #ff0000; font-size: 16px;">💀 ${d.signal.toUpperCase()} 💀</strong><br/>
              <span style="color: #ff6b6b;">The Blood Flows...</span><br/><br/>
              Manifestations: <strong>${d.value.toLocaleString()}</strong><br/>
              Terror Impact: <strong style="color: #ff0000;">${d.impact.toFixed(
                3
              )}</strong><br/>
              <em style="font-size: 11px; color: #999;">hover to feel the dread</em>
            </div>
          `
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .style("stroke-opacity", 0.5)
          .attr("stroke-width", (d) => Math.max(2, d.width))
          .style("filter", "none");

        tooltip.transition().duration(500).style("opacity", 0);
      });

    
    linkPaths
      .transition()
      .duration(1500)
      .delay((d, i) => i * 100)
      .style("stroke-opacity", 0.5);

    
    function animateBloodParticles() {
      graph.links.forEach((link, linkIndex) => {
        if (Math.random() > 0.3) return;

        const path = linkPaths.filter((d, i) => i === linkIndex).node();
        if (!path) return;

        const totalLength = path.getTotalLength();

        const particle = svg
          .append("circle")
          .attr("class", "blood-particle")
          .attr("r", Math.random() * 3 + 2)
          .attr("fill", Math.random() > 0.5 ? "#ff0000" : "#8b0000")
          .style("opacity", 0.8)
          .style("filter", "blur(1px)");

        const duration = 2000 + Math.random() * 2000;

        particle
          .transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .attrTween("transform", () => {
            return (t) => {
              const point = path.getPointAtLength(t * totalLength);
              return `translate(${point.x},${point.y})`;
            };
          })
          .style("opacity", 0)
          .remove();
      });
    }

    
    setInterval(animateBloodParticles, 800);

    
    const node = svg
      .append("g")
      .selectAll(".sankey-node")
      .data(graph.nodes)
      .join("g")
      .attr("class", "sankey-node");

    node
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", (d) => {
        if (d.type === "category") {
          return categoryColors[d.name] || "#8b0000";
        } else {
          const intensity = d.data.overallImpact;
          return d3.interpolateRgb("#330000", "#ff0000")(intensity);
        }
      })
      .attr("stroke", "#ff0000")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 0 5px #8b0000)")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("opacity", 0.8)
          .style("filter", "drop-shadow(0 0 15px #ff0000)")
          .transition()
          .duration(200)
          .attr("stroke-width", 4);

        if (d.type === "signal") {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `
              <div style="text-align: center;">
                <strong style="color: #ff0000; font-size: 18px;">💀 ${d.name.toUpperCase()} 💀</strong><br/>
                <span style="color: #ff6b6b; font-style: italic;">A manifestation of terror</span><br/><br/>
                Sightings: <strong>${d.data.occurrences.toLocaleString()}</strong><br/>
                Fear Generated: <strong style="color: #ff4444;">${d.data.avgFear.toFixed(
                  2
                )}</strong><br/>
                Tension Created: <strong style="color: #ff8888;">${d.data.avgTension.toFixed(
                  2
                )}</strong><br/>
                <br/>
                <span style="font-size: 14px; color: #ff0000;">Overall Horror: ${d.data.overallImpact.toFixed(
                  3
                )}</span>
              </div>
            `
            )
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px");
        } else {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `
              <div style="text-align: center;">
                <strong style="color: #ff0000; font-size: 18px;">${d.name}</strong><br/>
                <span style="color: #999; font-style: italic;">Source of Terror</span>
              </div>
            `
            )
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px");
        }
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("opacity", 1)
          .style("filter", "drop-shadow(0 0 5px #8b0000)")
          .transition()
          .duration(200)
          .attr("stroke-width", 2);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    
    node
      .selectAll("rect")
      .filter((d) => d.type === "signal" && d.data.overallImpact > 0.5)
      .style("animation", "pulse 2s ease-in-out infinite");

    
    node
      .append("text")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 10 : d.x0 - 10))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
      .text((d) => d.name.toUpperCase())
      .style("font-size", (d) => (d.type === "category" ? "16px" : "12px"))
      .style("font-weight", (d) => (d.type === "category" ? "bold" : "600"))
      .style("fill", "#ff6b6b")
      .style("text-shadow", "0 0 10px #8b0000, 0 0 5px #000")
      .style("font-family", "'Creepster', cursive")
      .style("pointer-events", "none")
      .style("letter-spacing", "1px");

    
    function createBloodSplatter(x, y) {
      const splatter = svg.append("g").attr("class", "blood-splatter");

      const numDrops = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < numDrops; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 30 + 10;
        const size = Math.random() * 4 + 2;

        splatter
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", size)
          .attr("fill", "#8b0000")
          .style("opacity", 0.8)
          .transition()
          .duration(500)
          .attr("cx", x + Math.cos(angle) * distance)
          .attr("cy", y + Math.sin(angle) * distance)
          .style("opacity", 0)
          .remove();
      }

      setTimeout(() => splatter.remove(), 600);
    }
  }

  
  update(400);

  
  const slider = document.getElementById("threshold-slider");
  const valueDisplay = document.getElementById("threshold-value");

  if (slider && valueDisplay) {
    slider.addEventListener("input", function () {
      const value = +this.value;
      valueDisplay.textContent = value;
      update(value);
    });
  }

  return {
    update: update,
    svg: svg,
  };
}
