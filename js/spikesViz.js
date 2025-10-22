console.log("⚡ spikesViz.js LOADED!");

function createSpikesViz(selector, fearJourneyData, rawData) {
  "use strict";

  console.log(
    "⚡ Spikes init:",
    selector,
    "journey:",
    fearJourneyData,
    "raw:",
    rawData
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

  
  const featuredFilms = [
    "Alien",
    "Friday the 13th",
    "Get Out",
    "Halloween",
    "Jaws",
    "Psycho",
    "Saw",
    "Scream",
  ];

  const filteredData = fearJourneyData.filter((d) => {
    const filmName = d.film.split(" ")[0];
    return featuredFilms.some((featured) => filmName.includes(featured));
  });

  
  let showFear = true;
  let showTension = true;

  
  const yScale = d3
    .scaleBand()
    .domain(filteredData.map((d) => d.film))
    .range([0, height])
    .padding(0.3);

  const xScale = d3.scaleLinear().domain([0, 90]).range([0, width]);

  const sizeScale = d3.scaleSqrt().domain([0, 1]).range([0, 50]);

  
  g.selectAll(".ground-line")
    .data(filteredData)
    .enter()
    .append("line")
    .attr("class", "ground-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => yScale(d.film) + yScale.bandwidth())
    .attr("y2", (d) => yScale(d.film) + yScale.bandwidth())
    .attr("stroke", "#4a4a4a")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "10,5")
    .style("opacity", 0.5);

  
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues([0, 10, 20, 30, 40, 50, 60, 70, 80, 90])
    .tickFormat((d) => `${d}%`);

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

  setInterval(createGhost, 3000);

  function update() {
    
    g.selectAll(".tombstone-group, .fear-mist").remove();

    filteredData.forEach((filmData) => {
      const film = filmData.film;
      const values = filmData.values;

      
      const peaks = values.filter((d) => d.fear > 0.4);

      
      const tombstoneGroup = g.append("g").attr("class", "tombstone-group");

      if (showFear) {
        
        peaks.forEach((peak, i) => {
          const tombstone = tombstoneGroup
            .append("g")
            .attr("class", "tombstone fear-tombstone")
            .attr(
              "transform",
              `translate(${xScale(peak.position)}, ${
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
                `translate(${xScale(peak.position)}, ${
                  yScale(film) + yScale.bandwidth() - 10
                }) scale(1.2)`
              );

            
            const drip = tombstoneGroup
              .append("ellipse")
              .attr("cx", xScale(peak.position))
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
                <div style="text-align: center; border: 3px solid #8b0000; background: #0a0a0a;">
                  <div style="background: #8b0000; padding: 5px; margin: -12px -16px 10px -16px;">
                    <strong style="color: #fff; font-size: 16px;">⚰ ${film.toUpperCase()} ⚰</strong>
                  </div>
                  <strong style="color: #ff0000; font-size: 20px;">💀</strong><br/>
                  <span style="color: #ff6b6b; font-style: italic;">Here lies a moment of terror</span><br/><br/>
                  <strong>Position:</strong> ${peak.position}%<br/>
                  <strong style="color: #ff0000;">Fear Level: ${peak.fear.toFixed(
                    3
                  )}</strong><br/>
                  <br/>
                  <span style="font-size: 10px; color: #666; font-style: italic;">
                    "They never saw it coming..."
                  </span>
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
                `translate(${xScale(peak.position)}, ${
                  yScale(film) + yScale.bandwidth()
                })`
              );

            tooltip.transition().duration(500).style("opacity", 0);
          });
        });
      }

      if (showTension) {
        
        peaks.forEach((peak, i) => {
          const warningSign = tombstoneGroup
            .append("g")
            .attr("class", "tension-marker")
            .attr(
              "transform",
              `translate(${xScale(peak.position) + 12}, ${
                yScale(film) + yScale.bandwidth()
              })`
            )
            .style("cursor", "pointer")
            .style("opacity", 0);

          const signHeight = sizeScale(peak.fear * 0.85);

          
          warningSign
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", -signHeight)
            .attr("stroke", "#ff8800")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 5px #ff8800)");

          
          warningSign
            .append("polygon")
            .attr(
              "points",
              "0,-" +
                signHeight +
                " -6,-" +
                (signHeight - 12) +
                " 6,-" +
                (signHeight - 12)
            )
            .attr("fill", "#ff8800")
            .attr("stroke", "#000")
            .attr("stroke-width", 1);

          
          warningSign
            .append("text")
            .attr("x", 0)
            .attr("y", -signHeight + 8)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .text("!")
            .style("fill", "#000")
            .style("pointer-events", "none");

          
          warningSign
            .transition()
            .duration(1000)
            .delay(i * 150 + 200)
            .style("opacity", 0.8);

          
          setInterval(() => {
            warningSign
              .transition()
              .duration(300)
              .style("opacity", 0.4)
              .transition()
              .duration(300)
              .style("opacity", 0.8);
          }, 2000 + Math.random() * 2000);

          
          warningSign.on("mouseover", function (event) {
            d3.select(this).style("opacity", 1);

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip
              .html(
                `
                <div style="text-align: center; border: 3px solid #ff8800;">
                  <strong style="color: #ff8800; font-size: 18px;">⚠ TENSION WARNING ⚠</strong><br/>
                  <span style="color: #ff8800;">High anxiety detected</span><br/><br/>
                  Film: <strong>${film}</strong><br/>
                  Position: ${peak.position}%<br/>
                  Tension: <strong style="color: #ff8800;">${(
                    peak.fear * 1.1
                  ).toFixed(3)}</strong>
                </div>
              `
              )
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          });

          warningSign.on("mouseout", function () {
            d3.select(this).style("opacity", 0.8);
            tooltip.transition().duration(500).style("opacity", 0);
          });
        });
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

  return {
    update: update,
    svg: svg,
  };
}
