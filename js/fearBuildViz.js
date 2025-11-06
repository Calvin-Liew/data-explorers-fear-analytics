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

  // 💓 心跳音效实例
  let heartbeatSound = null;
  if (typeof HeartbeatSound !== "undefined") {
    heartbeatSound = new HeartbeatSound();
    console.log("✅ Heartbeat sound system initialized");
  }

  // BPM 波动系统
  let baseBPM = 80;
  let currentDisplayBPM = 80;
  let bpmFluctuationInterval = null;

  /**
   * 启动BPM波动效果
   * 模拟真实心率的微小变化（±3-5 BPM）
   */
  function startBPMFluctuation(targetBPM) {
    baseBPM = targetBPM;
    currentDisplayBPM = targetBPM;

    // 清除旧的波动定时器
    if (bpmFluctuationInterval) {
      clearInterval(bpmFluctuationInterval);
    }

    // 每500ms更新一次BPM显示
    bpmFluctuationInterval = setInterval(() => {
      // 随机波动范围 ±3 BPM
      const fluctuation = (Math.random() - 0.5) * 6;
      currentDisplayBPM = Math.round(baseBPM + fluctuation);

      // 更新显示
      if (heartRateDisplay) {
        const status = getVitalStatus(currentDisplayBPM);
        heartRateDisplay
          .text(`♥ ${currentDisplayBPM} BPM`)
          .style(
            "fill",
            currentDisplayBPM > 140
              ? "#ff0000"
              : currentDisplayBPM > 100
              ? "#ff8800"
              : "#39ff14"
          );

        // 如果BPM很高，触发警报
        if (currentDisplayBPM > 150 && heartbeatSound) {
          if (Math.random() > 0.8) {
            // 20%概率播放警报
            heartbeatSound.playAlarm();
          }
        }
      }

      // 更新心跳音效的BPM
      if (heartbeatSound && heartbeatSound.isPlaying) {
        heartbeatSound.updateBPM(currentDisplayBPM);
      }
    }, 500);
  }

  /**
   * 停止BPM波动
   */
  function stopBPMFluctuation() {
    if (bpmFluctuationInterval) {
      clearInterval(bpmFluctuationInterval);
      bpmFluctuationInterval = null;
    }
  }

  /**
   * 获取生命体征状态
   */
  function getVitalStatus(bpm) {
    if (bpm > 140) return "CRITICAL";
    if (bpm > 100) return "ELEVATED";
    if (bpm < 50) return "BRADYCARDIA";
    return "NORMAL";
  }

  /**
   * 根据恐惧值计算生命体征
   */
  function calculateVitals(avgFear) {
    return {
      bpm: Math.round(avgFear * 120 + 60), // 60-180 BPM
      systolic: Math.round(avgFear * 60 + 100), // 100-160
      diastolic: Math.round(avgFear * 40 + 60), // 60-100
      spo2: Math.round(100 - avgFear * 8), // 92-100%
      respRate: Math.round(avgFear * 20 + 12), // 12-32/min
      temp: (36.5 + avgFear * 2).toFixed(1), // 36.5-38.5°C
    };
  }

  
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

  
  let linePath, areaPath, flatlineIndicator, heartRateDisplay, vitalsPanel;

  
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

  // 🏥 创建生命体征面板（移到右上角）
  vitalsPanel = svg
    .append("g")
    .attr("class", "vitals-panel")
    .attr("transform", `translate(${width - 170}, 10)`);

  // 面板背景
  vitalsPanel
    .append("rect")
    .attr("x", -5)
    .attr("y", -5)
    .attr("width", 165)
    .attr("height", 160)
    .attr("fill", "rgba(0, 0, 0, 0.85)")
    .attr("stroke", "#39ff14")
    .attr("stroke-width", 2)
    .attr("rx", 5);

  // 面板标题
  vitalsPanel
    .append("text")
    .attr("x", 75)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px")
    .style("fill", "#39ff14")
    .style("font-weight", "bold")
    .text("VITAL SIGNS");

  // 生命体征项目
  const vitalItems = [
    { id: "hr", label: "♥ HR:", unit: "BPM", y: 30 },
    { id: "bp", label: "🩸 BP:", unit: "mmHg", y: 50 },
    { id: "spo2", label: "💨 SpO₂:", unit: "%", y: 70 },
    { id: "rr", label: "🌬 RR:", unit: "/min", y: 90 },
    { id: "temp", label: "🌡 Temp:", unit: "°C", y: 110 },
    { id: "status", label: "📊 Status:", unit: "", y: 130 },
  ];

  vitalItems.forEach((item) => {
    const itemGroup = vitalsPanel
      .append("g")
      .attr("class", `vital-item vital-${item.id}`);

    // 标签
    itemGroup
      .append("text")
      .attr("x", 0)
      .attr("y", item.y)
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "11px")
      .style("fill", "#999")
      .text(item.label);

    // 数值
    itemGroup
      .append("text")
      .attr("class", `vital-value-${item.id}`)
      .attr("x", 155)
      .attr("y", item.y)
      .attr("text-anchor", "end")
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .style("fill", "#39ff14")
      .text("--");
  });

  /**
   * 更新生命体征面板
   */
  function updateVitalsPanel(vitals) {
    const status = getVitalStatus(vitals.bpm);

    // 心率
    vitalsPanel
      .select(".vital-value-hr")
      .text(vitals.bpm)
      .style(
        "fill",
        vitals.bpm > 140 ? "#ff0000" : vitals.bpm > 100 ? "#ff8800" : "#39ff14"
      );

    // 血压
    vitalsPanel
      .select(".vital-value-bp")
      .text(`${vitals.systolic}/${vitals.diastolic}`)
      .style(
        "fill",
        vitals.systolic > 140 ? "#ff8800" : "#39ff14"
      );

    // 血氧
    vitalsPanel
      .select(".vital-value-spo2")
      .text(vitals.spo2)
      .style("fill", vitals.spo2 < 95 ? "#ff8800" : "#39ff14");

    // 呼吸频率
    vitalsPanel
      .select(".vital-value-rr")
      .text(vitals.respRate)
      .style(
        "fill",
        vitals.respRate > 24 ? "#ff8800" : "#39ff14"
      );

    // 体温
    vitalsPanel
      .select(".vital-value-temp")
      .text(vitals.temp)
      .style("fill", vitals.temp > 37.5 ? "#ff8800" : "#39ff14");

    // 状态
    vitalsPanel
      .select(".vital-value-status")
      .text(status)
      .style(
        "fill",
        status === "CRITICAL"
          ? "#ff0000"
          : status === "ELEVATED"
          ? "#ff8800"
          : "#39ff14"
      );
  }

  function update(filmKey) {
    if (!filmKey) return;

    // 📊 数据提取和清洗
    let filmData = fearJourneyData
      .map((row) => ({
        position: +row.scene_position,
        fear: row[filmKey] ? +row[filmKey] : null,
      }))
      .filter((d) => d.fear !== null && !isNaN(d.fear) && !isNaN(d.position));

    if (filmData.length === 0) return;

    // ✅ 关键修复1: 按position排序
    filmData.sort((a, b) => a.position - b.position);

    // ✅ 关键修复2: 处理重复的position（取平均值）
    const positionMap = new Map();
    filmData.forEach((d) => {
      if (positionMap.has(d.position)) {
        const existing = positionMap.get(d.position);
        existing.fear = (existing.fear + d.fear) / 2; // 取平均
        existing.count++;
      } else {
        positionMap.set(d.position, { ...d, count: 1 });
      }
    });
    filmData = Array.from(positionMap.values());

    // ✅ 关键修复3: 限制fear值在合理范围内
    filmData = filmData.map((d) => ({
      position: d.position,
      fear: Math.min(Math.max(d.fear, 0), 1), // 限制在0-1之间
    }));

    console.log("📊 Cleaned data points:", filmData.length);

    
    const avgFear = d3.mean(filmData, (d) => d.fear);
    const vitals = calculateVitals(avgFear);

    // 🔄 启动BPM波动
    startBPMFluctuation(vitals.bpm);

    // 🏥 更新生命体征面板
    updateVitalsPanel(vitals);

    // 💓 更新心跳音效（如果正在播放）
    if (heartbeatSound && heartbeatSound.isPlaying) {
      heartbeatSound.updateBPM(vitals.bpm);
    }

    
    const criticalMoments = filmData.filter((d) => d.fear > 0.7);

    // 📈 绘制恐惧曲线
    // 曲线代表：电影中每个场景的恐惧强度变化
    // 就像心电图(EKG)显示心跳，这条线显示观众的恐惧水平随时间的波动
    const line = d3
      .line()
      .x((d) => xScale(d.position))
      .y((d) => yScale(d.fear))
      .curve(d3.curveBasis); // 使用basis曲线，更平滑，避免弯折

    // 🎨 绘制恐惧填充区域  
    // 填充代表：恐惧的累积强度，就像"恐惧的海洋"
    // 填充越高/越深 = 该时段的恐惧越强烈
    const area = d3
      .area()
      .x((d) => xScale(d.position))
      .y0(height)
      .y1((d) => yScale(d.fear))
      .curve(d3.curveBasis); // 使用相同的曲线类型保持一致

    
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

        // 播放警报音
        if (heartbeatSound) {
          heartbeatSound.playAlarm();
        }

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
  }

  
  if (filmSelect) {
    filmSelect.addEventListener("change", function () {
      if (this.value) {
        update(this.value);
      }
    });
  }

  // 返回API，包含心跳控制
  return {
    update: update,
    svg: svg,
    heartbeat: {
      start: function (bpm) {
        if (heartbeatSound) {
          heartbeatSound.start(bpm || baseBPM);
        }
      },
      stop: function () {
        if (heartbeatSound) {
          heartbeatSound.stop();
        }
        stopBPMFluctuation();
      },
      setVolume: function (volume) {
        if (heartbeatSound) {
          heartbeatSound.setVolume(volume);
        }
      },
      isPlaying: function () {
        return heartbeatSound ? heartbeatSound.isPlaying : false;
      },
    },
  };
}