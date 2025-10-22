console.log("💀 effectivenessViz.js LOADED!");

function createEffectivenessViz(selector, data) {
  "use strict";

  console.log("⚠️ Effectiveness init:", selector, "data:", data);

  const container = d3.select(selector);
  const containerNode = container.node();

  if (!containerNode) {
    console.error("❌ Container not found:", selector);
    return;
  }

  console.log("✅ Container found:", containerNode);
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const width = containerNode.clientWidth - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  
  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  
  const jumpscareOverlay = d3
    .select("body")
    .append("div")
    .attr("id", "jumpscare-overlay")
    .style("position", "fixed")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100vw")
    .style("height", "100vh")
    .style("background", "#000")
    .style("z-index", "9999")
    .style("display", "none")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("opacity", "0");

  
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0);

  
  let currentSort = "impact";

  
  const topSignals = data.slice(0, 15);

  
  const sizeScale = d3
    .scaleSqrt()
    .domain([0, d3.max(topSignals, (d) => d.occurrences)])
    .range([20, 80]);

  const colorScale = d3
    .scaleSequential(d3.interpolateRgb("#330000", "#ff0000"))
    .domain([0, d3.max(topSignals, (d) => d.overallImpact)]);

  
  const simulation = d3
    .forceSimulation(topSignals)
    .force("charge", d3.forceManyBody().strength(5))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((d) => sizeScale(d.occurrences) + 5)
    )
    .stop();

  
  for (let i = 0; i < 300; i++) simulation.tick();

  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  function playScreamSound() {
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      200,
      audioContext.currentTime + 0.5
    );

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  function playStaticSound() {
    
    const bufferSize = audioContext.sampleRate * 0.3;
    const buffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = 0.2;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
  }

  function playWhisperSound() {
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(
      150,
      audioContext.currentTime + 0.8
    );

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  }

  
  function triggerJumpscare(signal, impactLevel) {
    console.log(`💀 JUMPSCARE TRIGGERED: ${signal} (impact: ${impactLevel})`);

    const intensity =
      impactLevel > 0.6 ? "extreme" : impactLevel > 0.4 ? "high" : "medium";

    
    document.body.style.animation = "shake 0.5s";
    setTimeout(() => {
      document.body.style.animation = "";
    }, 500);

    jumpscareOverlay.style("display", "flex");

    if (intensity === "extreme") {
      extremeJumpscare(signal);
    } else if (intensity === "high") {
      highJumpscare(signal);
    } else {
      mediumJumpscare(signal);
    }
  }

  function createCreepyEyes() {
    
    const eyeContainer = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100vw")
      .style("height", "100vh")
      .style("z-index", "10000")
      .style("pointer-events", "none");

    for (let i = 0; i < 8; i++) {
      const eyePair = eyeContainer
        .append("div")
        .style("position", "absolute")
        .style("left", `${Math.random() * 90}%`)
        .style("top", `${Math.random() * 90}%`)
        .style("font-size", "40px")
        .style("opacity", "0")
        .html("👁️👁️");

      eyePair
        .transition()
        .delay(i * 200)
        .duration(300)
        .style("opacity", "1")
        .transition()
        .duration(300)
        .style("opacity", "0");
    }

    setTimeout(() => eyeContainer.remove(), 3000);
  }

  function createFollowingEyes() {
    
    const eyeContainer = d3
      .select("body")
      .append("div")
      .attr("id", "following-eyes-container")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100vw")
      .style("height", "100vh")
      .style("z-index", "10001")
      .style("pointer-events", "none");

    const eyePositions = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 50, y: 50 },
      { x: 20, y: 80 },
      { x: 80, y: 80 },
    ];

    const eyeElements = eyePositions.map((pos) => {
      return eyeContainer
        .append("div")
        .style("position", "absolute")
        .style("left", `${pos.x}%`)
        .style("top", `${pos.y}%`)
        .style("font-size", "60px")
        .style("opacity", "0")
        .style("transition", "transform 0.1s ease-out")
        .html("👁️");
    });

    
    eyeElements.forEach((eye, i) => {
      eye
        .transition()
        .delay(i * 100)
        .duration(300)
        .style("opacity", "0.8");
    });

    
    function followCursor(e) {
      eyeElements.forEach((eye) => {
        const eyeNode = eye.node();
        const rect = eyeNode.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 5;

        eye.style(
          "transform",
          `translate(${Math.cos(angle) * distance}px, ${
            Math.sin(angle) * distance
          }px)`
        );
      });
    }

    document.addEventListener("mousemove", followCursor);

    
    setTimeout(() => {
      document.removeEventListener("mousemove", followCursor);
      eyeElements.forEach((eye) => {
        eye.transition().duration(400).style("opacity", "0");
      });
      setTimeout(() => eyeContainer.remove(), 500);
    }, 2500);
  }

  function createStaticEffect() {
    
    const staticOverlay = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100vw")
      .style("height", "100vh")
      .style("z-index", "9998")
      .style(
        "background",
        "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkYGD4z8DAwMgABXAGNgGwSgYYR1YAUwDSDAC9BgQBTBIYPgAAAABJRU5ErkJggg==)"
      )
      .style("animation", "static-noise 0.1s infinite")
      .style("opacity", "0.3")
      .style("pointer-events", "none");

    setTimeout(() => staticOverlay.remove(), 1000);
  }

  function extremeJumpscare(signal) {
    playScreamSound();

    
    createFollowingEyes();

    
    const colors = [
      "#ff0000",
      "#000000",
      "#ffffff",
      "#8b0000",
      "#000000",
      "#ff0000",
    ];
    let flashCount = 0;

    const creepyMessages = [
      "YOU SHOULDN'T HAVE CLICKED",
      "IT SEES YOU",
      "THERE'S NO ESCAPE",
      "BEHIND YOU",
      "DON'T TURN AROUND",
      "LOOK AT ME",
      "YOU'RE NOT ALONE",
      "WE'RE WATCHING",
    ];

    
    const backwardsMessages = [
      "DNIHEB SI TI", 
      "NRUT T'NOD", 
      "OT ETAL OOT", 
      "EPACSE ON", 
    ];

    const flashInterval = setInterval(() => {
      const color = colors[flashCount % colors.length];
      const showFace = flashCount % 3 === 0;
      const showBackwards = flashCount % 4 === 0;

      jumpscareOverlay
        .style("background", color)
        .html(
          `
          <div style="text-align: center; animation: glitchText 0.05s infinite;">
            ${
              showFace
                ? `
              <div style="position: absolute; top: 10%; left: 10%; font-size: 100px; opacity: 0.3; transform: rotate(-20deg);">
                👁️
              </div>
              <div style="position: absolute; top: 10%; right: 10%; font-size: 100px; opacity: 0.3; transform: rotate(20deg);">
                👁️
              </div>
            `
                : ""
            }
            
            <div style="font-size: ${
              100 + Math.random() * 50
            }px; transform: rotate(${Math.random() * 20 - 10}deg); 
                        filter: ${
                          flashCount % 2 === 0 ? "invert(1)" : "none"
                        };">
              ${
                ["💀", "👁️", "🩸", "☠️", "👻", "😱", "🔪"][
                  Math.floor(Math.random() * 7)
                ]
              }
            </div>
            
            <div style="font-family: 'Nosifer', cursive; font-size: ${
              60 + Math.random() * 40
            }px; 
                        color: ${color === "#000000" ? "#fff" : "#000"}; 
                        text-shadow: 0 0 ${10 + Math.random() * 20}px ${
            color === "#000000" ? "#ff0000" : "#000"
          }; 
                        transform: scaleX(${
                          0.8 + Math.random() * 0.4
                        }) scaleY(${0.9 + Math.random() * 0.3});
                        letter-spacing: ${-5 + Math.random() * 15}px;">
              ${signal.toUpperCase()}
            </div>
            
            <div style="font-family: 'Creepster', cursive; font-size: 30px; 
                        color: ${
                          color === "#000000" ? "#ff0000" : "#8b0000"
                        }; margin-top: 20px;
                        opacity: ${Math.random()}; transform: rotate(${
            Math.random() * 10 - 5
          }deg);">
              ${
                showBackwards
                  ? backwardsMessages[flashCount % backwardsMessages.length]
                  : creepyMessages[flashCount % creepyMessages.length]
              }
            </div>
            
            ${
              flashCount % 5 === 0
                ? `
              <div style="position: absolute; bottom: 20%; left: 50%; transform: translateX(-50%); 
                          font-size: 150px; opacity: 0.2; animation: float 0.5s ease-in-out;">
                😱
              </div>
            `
                : ""
            }
          </div>
        `
        )
        .style("opacity", Math.random() > 0.2 ? "1" : "0");

      flashCount++;
      if (flashCount >= 12) {
        clearInterval(flashInterval);
        jumpscareOverlay
          .transition()
          .duration(300)
          .style("opacity", "0")
          .on("end", () => jumpscareOverlay.style("display", "none"));
      }
    }, 80);

    
    setTimeout(() => createCreepyEyes(), 200);

    
    createStaticEffect();

    
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        document.body.style.filter = `invert(${Math.random()}) hue-rotate(${
          Math.random() * 360
        }deg) saturate(${3 + Math.random() * 2})`;
        setTimeout(() => {
          document.body.style.filter = "";
        }, 60);
      }, i * 150);
    }

    
    const cursorTrail = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("z-index", "10001");

    let trailTimeout;
    function updateTrail(e) {
      cursorTrail
        .append("div")
        .style("position", "absolute")
        .style("left", e.clientX + "px")
        .style("top", e.clientY + "px")
        .style("font-size", "30px")
        .html("🩸")
        .transition()
        .duration(500)
        .style("opacity", "0")
        .remove();
    }

    document.addEventListener("mousemove", updateTrail);
    trailTimeout = setTimeout(() => {
      document.removeEventListener("mousemove", updateTrail);
      cursorTrail.remove();
    }, 2000);
  }

  function highJumpscare(signal) {
    playStaticSound();

    const creepyFaces = ["😱", "👁️👁️", "💀", "👻", "🩸"];
    const messages = [
      "IT KNOWS YOUR NAME",
      "CAN YOU FEEL IT?",
      "IT'S GETTING CLOSER",
      "RUN",
      "TOO LATE",
    ];

    jumpscareOverlay
      .style("background", "#000000")
      .html(
        `
        <div style="text-align: center; position: relative;">
          <div style="font-size: 120px; animation: float 0.3s ease-in-out infinite; filter: drop-shadow(0 0 20px #ff0000);">
            ${creepyFaces[Math.floor(Math.random() * creepyFaces.length)]}
          </div>
          <div style="font-family: 'Creepster', cursive; font-size: 70px; color: #fff; 
                      text-shadow: 0 0 15px #ff0000; letter-spacing: 5px; animation: glitchText 0.1s infinite;">
            ${signal.toUpperCase()}
          </div>
          <div style="font-size: 25px; color: #ff6b6b; margin-top: 30px; font-family: 'Special Elite', monospace;
                      animation: pulse 0.5s ease-in-out infinite;">
            ${messages[Math.floor(Math.random() * messages.length)]}
          </div>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                      font-size: 200px; opacity: 0.1; z-index: -1;">
            👁️
          </div>
        </div>
      `
      )
      .transition()
      .duration(100)
      .style("opacity", "1")
      .transition()
      .delay(900)
      .duration(400)
      .style("opacity", "0")
      .on("end", () => {
        jumpscareOverlay.style("display", "none").style("opacity", "0");
      });

    
    for (let i = 0; i < 15; i++) {
      const shadow = d3
        .select("body")
        .append("div")
        .style("position", "fixed")
        .style("top", "-50px")
        .style("left", `${Math.random() * 100}%`)
        .style("font-size", `${20 + Math.random() * 40}px`)
        .style("z-index", "9997")
        .style("pointer-events", "none")
        .html(["🩸", "💀", "👁️", "🔪"][Math.floor(Math.random() * 4)]);

      shadow
        .transition()
        .duration(1000 + Math.random() * 1000)
        .style("top", "100vh")
        .style("opacity", "0")
        .remove();
    }

    
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        document.body.style.transform = `translateX(${
          Math.random() * 20 - 10
        }px)`;
        setTimeout(() => {
          document.body.style.transform = "";
        }, 50);
      }, i * 200);
    }
  }

  function mediumJumpscare(signal) {
    playWhisperSound();

    jumpscareOverlay
      .style("background", "rgba(0, 0, 0, 0.95)")
      .html(
        `
        <div style="text-align: center;">
          <div style="font-size: 90px; animation: pulse 0.5s ease-in-out;">⚠️</div>
          <div style="font-family: 'Special Elite', monospace; font-size: 50px; color: #ff8800;
                      text-shadow: 0 0 10px #ff8800;">
            ${signal.toUpperCase()}
          </div>
          <div style="font-size: 18px; color: #999; margin-top: 20px; font-style: italic;">
            "...something is watching..."
          </div>
        </div>
      `
      )
      .transition()
      .duration(150)
      .style("opacity", "0.9")
      .transition()
      .delay(700)
      .duration(300)
      .style("opacity", "0")
      .on("end", () => {
        jumpscareOverlay.style("display", "none").style("opacity", "0");
      });

    
    const eyes = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("top", "10%")
      .style("right", "10%")
      .style("font-size", "60px")
      .style("z-index", "10000")
      .style("opacity", "0")
      .html("👁️👁️");

    eyes
      .transition()
      .duration(200)
      .style("opacity", "1")
      .transition()
      .duration(300)
      .style("opacity", "0")
      .remove();
  }

  
  function summonTheHorror() {
    console.log("💀💀💀 SUMMONING THE HORROR 💀💀💀");

    const deadliestSignals = topSignals
      .filter((d) => d.overallImpact > 0.5)
      .sort((a, b) => b.overallImpact - a.overallImpact)
      .slice(0, 5);

    console.log("Deadliest signals:", deadliestSignals);

    if (deadliestSignals.length === 0) {
      alert("No signals deadly enough to summon...");
      return;
    }

    
    let countdown = 3;

    jumpscareOverlay.style("display", "flex").style("opacity", "0");

    const countdownInterval = setInterval(() => {
      console.log(`Countdown: ${countdown}`);

      jumpscareOverlay
        .style("display", "flex")
        .style("background", "#8b0000")
        .html(
          `
          <div style="text-align: center;">
            <div style="font-family: 'Nosifer', cursive; font-size: 60px; color: #fff; margin-bottom: 30px; animation: pulse 0.5s ease-in-out infinite;">
              ⚠️ SUMMONING RITUAL ⚠️
            </div>
            <div style="font-size: 150px; color: #ff0000; text-shadow: 0 0 30px #fff; font-family: 'Special Elite', monospace;">
              ${countdown > 0 ? countdown : "💀"}
            </div>
            <div style="font-family: 'Creepster', cursive; font-size: 30px; color: #fff; margin-top: 30px;">
              ${countdown > 0 ? "PREPARE YOURSELF..." : "IT BEGINS..."}
            </div>
          </div>
        `
        );

      if (
        jumpscareOverlay.style("opacity") === "0" ||
        jumpscareOverlay.style("opacity") === ""
      ) {
        jumpscareOverlay.transition().duration(200).style("opacity", "1");
      }

      countdown--;

      if (countdown < -1) {
        clearInterval(countdownInterval);
        console.log("🔥 UNLEASHING THE HORROR!");

        jumpscareOverlay.transition().duration(300).style("opacity", "0");

        
        deadliestSignals.forEach((signal, i) => {
          console.log(`Scheduling jumpscare ${i + 1}: ${signal.signal}`);
          setTimeout(() => {
            console.log(`💀 Triggering: ${signal.signal}`);
            extremeJumpscare(signal.signal);
          }, i * 1800);
        });

        
        setTimeout(() => {
          jumpscareOverlay.style("display", "none");
        }, 500);
      }
    }, 1000);
  }

  
  const bubbles = svg
    .selectAll(".signal-bubble")
    .data(topSignals)
    .enter()
    .append("g")
    .attr("class", "signal-bubble")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  
  bubbles
    .append("circle")
    .attr("class", "danger-ring")
    .attr("r", (d) => sizeScale(d.occurrences) + 8)
    .attr("fill", "none")
    .attr("stroke", (d) => (d.overallImpact > 0.5 ? "#ff0000" : "#666"))
    .attr("stroke-width", (d) => (d.overallImpact > 0.5 ? 3 : 1))
    .attr("stroke-dasharray", "5,5")
    .style("opacity", 0.5)
    .style("animation", (d) =>
      d.overallImpact > 0.5 ? "pulse 2s ease-in-out infinite" : "none"
    );

  
  bubbles
    .append("circle")
    .attr("class", "main-bubble")
    .attr("r", (d) => sizeScale(d.occurrences))
    .attr("fill", (d) => colorScale(d.overallImpact))
    .attr("stroke", "#000")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .style("opacity", 0.85)
    .style("filter", (d) =>
      d.overallImpact > 0.6
        ? "drop-shadow(0 0 15px #ff0000)"
        : "drop-shadow(0 0 5px rgba(0,0,0,0.5))"
    )
    .on("mouseover", function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", sizeScale(d.occurrences) * 1.2)
        .style("opacity", 1);

      if (d.overallImpact > 0.5) {
        d3.select(this.parentNode)
          .select(".danger-ring")
          .transition()
          .duration(200)
          .attr("stroke-width", 5)
          .style("opacity", 1);
      }

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `
          <div style="text-align: center; border: 2px solid ${
            d.overallImpact > 0.6 ? "#ff0000" : "#ff8800"
          };">
            <strong style="font-size: 20px; color: #fff;">${d.signal.toUpperCase()}</strong><br/>
            <span style="color: #999; font-size: 11px; font-style: italic;">
               Click to explore
            </span><br/><br/>
            Overall Impact: <strong style="color: #ff0000;">${d.overallImpact.toFixed(
              3
            )}</strong><br/>
            Fear: <strong>${d.avgFear.toFixed(2)}</strong> | 
            Tension: <strong>${d.avgTension.toFixed(2)}</strong><br/>
            Frequency: <strong>${d.occurrences.toLocaleString()}</strong>
          </div>
        `
        )
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", sizeScale(d.occurrences))
        .style("opacity", 0.85);

      d3.select(this.parentNode)
        .select(".danger-ring")
        .transition()
        .duration(200)
        .attr("stroke-width", d.overallImpact > 0.5 ? 3 : 1)
        .style("opacity", 0.5);

      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      triggerJumpscare(d.signal, d.overallImpact);

      
      const explosion = d3.select(this.parentNode);
      for (let i = 0; i < 12; i++) {
        const angle = (i * 2 * Math.PI) / 12;
        const distance = 60;
        explosion
          .append("circle")
          .attr("r", 5)
          .attr("fill", colorScale(d.overallImpact))
          .transition()
          .duration(500)
          .attr("cx", Math.cos(angle) * distance)
          .attr("cy", Math.sin(angle) * distance)
          .attr("r", 2)
          .style("opacity", 0)
          .remove();
      }

      d3.select(this)
        .transition()
        .duration(100)
        .attr("r", sizeScale(d.occurrences) * 1.5)
        .transition()
        .duration(200)
        .attr("r", sizeScale(d.occurrences));
    });

  
  bubbles
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .text((d) => d.signal.toUpperCase())
    .style("font-family", "'Creepster', cursive")
    .style(
      "font-size",
      (d) => Math.min(sizeScale(d.occurrences) / 3, 14) + "px"
    )
    .style("fill", "#fff")
    .style("text-shadow", "0 0 5px #000")
    .style("pointer-events", "none")
    .style("user-select", "none");

  
  bubbles
    .filter((d) => d.overallImpact > 0.5)
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", (d) => -sizeScale(d.occurrences) - 15)
    .text("💀")
    .style("font-size", "20px")
    .style("animation", "float 2s ease-in-out infinite")
    .style("pointer-events", "none");

  
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 120}, 20)`);

  legend
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text("DANGER LEVEL")
    .style("font-family", "'Special Elite', monospace")
    .style("font-size", "12px")
    .style("fill", "#ff0000")
    .style("font-weight", "bold");

  const legendData = [
    { label: "EXTREME", color: "#ff0000", emoji: "💀" },
    { label: "HIGH", color: "#ff4444", emoji: "👻" },
    { label: "MEDIUM", color: "#ff8800", emoji: "⚠️" },
    { label: "LOW", color: "#aa0000", emoji: "•" },
  ];

  legendData.forEach((item, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 25 + 20})`);
    legendItem
      .append("circle")
      .attr("r", 8)
      .attr("fill", item.color)
      .attr("stroke", "#000")
      .attr("stroke-width", 1);
    legendItem
      .append("text")
      .attr("x", 15)
      .attr("y", 4)
      .text(`${item.emoji} ${item.label}`)
      .style("font-family", "'Special Elite', monospace")
      .style("font-size", "10px")
      .style("fill", "#e0e0e0");
  });

  
  function updateSort(sortBy) {
    currentSort = sortBy;
    let sortedData;
    switch (sortBy) {
      case "fear":
        sortedData = [...topSignals].sort((a, b) => b.avgFear - a.avgFear);
        break;
      case "tension":
        sortedData = [...topSignals].sort(
          (a, b) => b.avgTension - a.avgTension
        );
        break;
      case "frequency":
        sortedData = [...topSignals].sort(
          (a, b) => b.occurrences - a.occurrences
        );
        break;
      default:
        sortedData = [...topSignals].sort(
          (a, b) => b.overallImpact - a.overallImpact
        );
    }

    simulation.nodes(sortedData).alpha(0.5).restart();
    setTimeout(() => {
      bubbles
        .data(sortedData)
        .transition()
        .duration(1000)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    }, 100);
  }

  
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      updateSort(this.value);
    });
    console.log("✅ Sort select connected");
  } else {
    console.error("❌ Sort select not found!");
  }

  const summonBtn = document.getElementById("summon-horror-btn");
  if (summonBtn) {
    console.log("✅ SUMMON button found, attaching event...");
    summonBtn.addEventListener("click", function () {
      console.log("🔴 SUMMON BUTTON CLICKED!");

      
      const confirmed = confirm(
        "⚠️ WARNING ⚠️\n\nYou are about to trigger ALL the deadliest jumpscares in sequence.\n\nThis will be VERY intense with rapid flashing, distortion effects, and disturbing visuals.\n\nAre you absolutely sure you want to proceed?"
      );

      console.log("Confirmation result:", confirmed);

      if (confirmed) {
        summonTheHorror();
      }
    });
  } else {
    console.error("❌ SUMMON button not found! ID:", "summon-horror-btn");
  }

  
  setInterval(() => {
    const randomBubble = bubbles
      .filter((d) => d.overallImpact > 0.5 && Math.random() > 0.7)
      .select(".main-bubble");

    randomBubble
      .transition()
      .duration(300)
      .style("filter", "drop-shadow(0 0 25px #ff0000)")
      .transition()
      .duration(300)
      .style("filter", "drop-shadow(0 0 15px #ff0000)");
  }, 2000);

  return {
    updateSort: updateSort,
    svg: svg,
  };
}
