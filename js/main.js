(function () {
  "use strict";

  const state = {
    visualizations: {},
    data: null,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    console.log("🎃 Initializing Fear Analytics Visualization...");

    console.log("🔍 Checking viz functions:");
    console.log("  - createSankeyViz:", typeof createSankeyViz);
    console.log("  - createFearBuildViz:", typeof createFearBuildViz);
    console.log("  - createSpikesViz:", typeof createSpikesViz);
    console.log("  - createEffectivenessViz:", typeof createEffectivenessViz);
    console.log("  - HeartbeatSound:", typeof HeartbeatSound);

    setTimeout(() => {
      console.log("🔍 Re-checking after delay:");
      console.log("  - createEffectivenessViz:", typeof createEffectivenessViz);
      console.log("  - HeartbeatSound:", typeof HeartbeatSound);

      loadAllData()
        .then((data) => {
          state.data = data;
          initializeVisualizations(data);
          setupHeartbeatControls();
          console.log("✅ Initialization complete!");
        })
        .catch((error) => {
          console.error("❌ Error loading data:", error);
          showError("Failed to load data. Please refresh the page.");
        });
    }, 100);
  }

  async function loadAllData() {
    try {
      const [signalsByFilm, fearJourney, effectiveness, filmComparison] =
        await Promise.all([
          d3.csv("data/cleaner_datasets/viz1_horror_signals_by_film.csv"),
          d3.csv("data/cleaner_datasets/viz2b_fear_journey.csv"),
          d3.csv("data/cleaner_datasets/viz3_horror_effectiveness.csv"),
          d3.csv("data/cleaner_datasets/viz4_film_comparison.csv"),
        ]);

      return {
        signalsByFilm: signalsByFilm,
        fearJourney: processFearJourneyData(fearJourney),
        effectiveness: processEffectivenessData(effectiveness),
        filmComparison: processFilmComparisonData(filmComparison),
        fearJourneyRaw: fearJourney,
      };
    } catch (error) {
      console.error("Error in loadAllData:", error);
      throw error;
    }
  }

  function processFearJourneyData(data) {
    const films = Object.keys(data[0]).filter((k) => k !== "scene_position");
    const filmData = [];

    films.forEach((film) => {
      const filmName = film.replace(/_Unknown$/, "").replace(/-/g, " ");
      const values = data
        .map((row) => ({
          position: +row.scene_position,
          fear: row[film] ? +row[film] : null,
        }))
        .filter((d) => d.fear !== null);

      if (values.length > 0) {
        filmData.push({
          film: filmName,
          values: values,
        });
      }
    });

    return filmData;
  }

  function processEffectivenessData(data) {
    return data.map((d) => ({
      signal: d.Horror_Signal,
      occurrences: +d.Total_Occurrences,
      scenesWithSignal: +d.Scenes_With_Signal,
      fearImpact: +d.Fear_Impact,
      tensionImpact: +d.Tension_Impact,
      overallImpact: +d.Overall_Impact,
      avgFear: +d.Avg_Fear_When_Present,
      avgTension: +d.Avg_Tension_When_Present,
    }));
  }

  function processFilmComparisonData(data) {
    return data.map((d) => ({
      film: d.film_title.replace(/_Unknown$/, "").replace(/-/g, " "),
      scenes: +d.Total_Scenes,
      avgTension: +d.Avg_Tension,
      avgFear: +d.Avg_Fear,
      avgSentiment: +d.Avg_Sentiment,
      dialogueWords: +d.Total_Dialogue_Words,
      actionWords: +d.Total_Action_Words,
      dialogueRatio: +d.Dialogue_to_Action_Ratio,
      horrorSignals: +d.Total_Horror_Signals,
    }));
  }

  function initializeVisualizations(data) {
    console.log("📊 Initializing visualizations with data:", data);

    console.log("🩸 Creating Sankey...", typeof createSankeyViz);
    if (typeof createSankeyViz === "function") {
      try {
        state.visualizations.sankey = createSankeyViz(
          "#viz-sankey",
          data.effectiveness
        );
        console.log("✅ Sankey created");
      } catch (error) {
        console.error("❌ Sankey error:", error);
      }
    } else {
      console.error("❌ createSankeyViz not found!");
    }

    console.log("👻 Creating Fear Build...", typeof createFearBuildViz);
    if (typeof createFearBuildViz === "function") {
      try {
        state.visualizations.fearBuild = createFearBuildViz(
          "#viz-fear-build",
          data.fearJourneyRaw
        );
        console.log("✅ Fear Build created");
      } catch (error) {
        console.error("❌ Fear Build error:", error);
      }
    } else {
      console.error("❌ createFearBuildViz not found!");
    }

    console.log("⚡ Creating Spikes...", typeof createSpikesViz);
    if (typeof createSpikesViz === "function") {
      try {
        state.visualizations.spikes = createSpikesViz(
          "#viz-spikes",
          data.fearJourney,
          data.fearJourneyRaw
        );
        console.log("✅ Spikes created");
      } catch (error) {
        console.error("❌ Spikes error:", error);
      }
    } else {
      console.error("❌ createSpikesViz not found!");
    }

    console.log("💀 Creating Effectiveness...", typeof createEffectivenessViz);
    if (typeof createEffectivenessViz === "function") {
      try {
        state.visualizations.effectiveness = createEffectivenessViz(
          "#viz-effectiveness",
          data.effectiveness
        );
        console.log("✅ Effectiveness created");
      } catch (error) {
        console.error("❌ Effectiveness error:", error);
      }
    } else {
      console.error("❌ createEffectivenessViz not found!");
    }
  }

  /**
   * 💓 设置心跳音效控制
   */
  function setupHeartbeatControls() {
    console.log("💓 Setting up heartbeat controls...");

    const toggleBtn = document.getElementById("toggle-heartbeat");
    const volumeSlider = document.getElementById("volume-slider");
    const volumeValue = document.getElementById("volume-value");
    const statusText = document.getElementById("status-text");
    const filmSelect = document.getElementById("film-select");

    if (!toggleBtn || !volumeSlider || !volumeValue || !statusText) {
      console.error("❌ Heartbeat control elements not found!");
      return;
    }

    const fearBuildViz = state.visualizations.fearBuild;
    if (!fearBuildViz || !fearBuildViz.heartbeat) {
      console.error("❌ Fear Build visualization not ready!");
      return;
    }

    // 切换心跳音效
    toggleBtn.addEventListener("click", function () {
      if (fearBuildViz.heartbeat.isPlaying()) {
        // 停止心跳
        fearBuildViz.heartbeat.stop();
        toggleBtn.textContent = "🔊 Start Heartbeat Sound";
        toggleBtn.classList.remove("active");
        statusText.textContent = "Inactive";
        statusText.style.color = "#999";
        console.log("💔 Heartbeat stopped");
      } else {
        // 开始心跳
        const currentFilm = filmSelect.value;
        if (!currentFilm) {
          alert("⚠️ Please select a patient file first!");
          return;
        }

        fearBuildViz.heartbeat.start();
        toggleBtn.textContent = "🔇 Stop Heartbeat Sound";
        toggleBtn.classList.add("active");
        statusText.textContent = "Active";
        statusText.style.color = "#39ff14";
        console.log("💓 Heartbeat started");
      }
    });

    // 音量控制
    volumeSlider.addEventListener("input", function () {
      const volume = this.value / 100;
      volumeValue.textContent = `${this.value}%`;
      fearBuildViz.heartbeat.setVolume(volume);
      console.log(`🔊 Volume: ${this.value}%`);
    });

    // 当选择新电影时，如果心跳正在播放，自动更新BPM
    filmSelect.addEventListener("change", function () {
      if (this.value && fearBuildViz.heartbeat.isPlaying()) {
        console.log("🎬 Film changed, heartbeat will adjust BPM automatically");
      }
    });

    console.log("✅ Heartbeat controls setup complete!");
  }

  function showError(message) {
    const container = document.querySelector("#viz-container");
    if (container) {
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText =
        "padding: 2rem; text-align: center; color: #ff4444; font-family: 'Special Elite', cursive;";
      errorDiv.innerHTML = `<h2>💀 Error</h2><p>${message}</p>`;
      container.prepend(errorDiv);
    }
  }

  window.fearAnalyticsState = state;
})();