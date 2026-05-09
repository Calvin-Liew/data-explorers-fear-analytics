(function () {
  "use strict";

  const state = {
    visualizations: {},
    data: null,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setTimeout(() => {
      loadAllData()
        .then((data) => {
          state.data = data;
          initializeVisualizations(data);
        })
        .catch((error) => {
          console.error("❌ Error loading data:", error);
          showError("Failed to load data. Please refresh the page.");
        });
    }, 100);

    document.querySelectorAll(".bat-unit[data-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        const section = document.querySelector(target);
        if (section) {
          const sectionHeader = section.querySelector(".section-header");
          const targetElement = sectionHeader || section;

          const elementRect = targetElement.getBoundingClientRect();
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

          const headerOffset = 80;
          const offsetPosition = elementRect.top + scrollTop - headerOffset;

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: "smooth",
          });
        } else {
          console.warn("Target element not found:", target);
        }
      });
    });
  }

  async function loadAllData() {
    try {
      const [
        signalsByFilm,
        fearJourney,
        tensionJourney,
        effectiveness,
        filmComparison,
        movieGalleryData,
      ] = await Promise.all([
        d3.csv("data/cleaner_datasets/viz1_horror_signals_by_film.csv"),
        d3.csv("data/cleaner_datasets/viz2b_fear_journey.csv"),
        d3.csv("data/cleaner_datasets/viz2a_tension_journey.csv"),
        d3.csv("data/cleaner_datasets/viz3_horror_effectiveness.csv"),
        d3.csv("data/cleaner_datasets/viz4_film_comparison.csv"),
        d3.csv("data/imdb-movies-dataset/imdb_179_horror.csv"),
      ]);
      const brokenPosterIDs = [
        "MV5BYWM1YTgxNjMtNzY2NC00YjVmLWE1ODUtNTdiYTI4YjZhODMwXkEyXkFqcGdeQXVyMTUzMTg2ODkz",
        "MV5BZTk4NzI5NGItYmIxOS00OGI0LTg4NzEtOWU5YjQ0OGEzZDkxXkEyXkFqcGdeQXVyMTQxNzMzNDI@",
        "MV5BOTE2ODNlYTMtOTdlNi00MWVlLThkYzQtY2QyOWRlZmYyOGNmXkEyXkFqcGdeQXVyMTA3MDk2NDg2",
        "MV5BYjExYTcwYmYtMWY2Zi00MGJlLTk3YjUtZTU1Zjg4MDc0Y2FjXkEyXkFqcGdeQXVyODE5NzE3OTE@",
        "MV5BYWU1ZDc0YjMtNjFhYS00NGZiLTk2MzgtNmU0Mzk3ZjdkMTA2XkEyXkFqcGdeQXVyNDE0OTU3NDY@",
        "MV5BMTIxNTMzNzYtNzA3NC00MzgwLTlhNGYtMDEyYTNlZjcwZTNiXkEyXkFqcGdeQXVyNDAxNjkxNjQ@",
        "MV5BYWI4MTVlM2UtNTEzZC00MjdiLWE4ZjItNTZmM2U2NjUzNzI1XkEyXkFqcGdeQXVyMjUzOTY1NTc@",
        "MV5BNzU3Y2IzYTQtNzc0Ni00ZmQzLThkN2ItYTQzZjdhNGRiY2FmXkEyXkFqcGdeQXVyMTQxNzMzNDI@",
        "MV5BZDE0ZGJlMTYtOWY1OS00NGE4LTgzNTQtMDIxYTM5ZjU2NmVlXkEyXkFqcGdeQXVyODk4OTc3MTY@",
        "MV5BNjI0ZTUzMzEtNDc3Yy00MjZjLWI4MjgtNzJhNThlYzE0YjNhXkEyXkFqcGdeQXVyMTcwOTQzOTYy",
        "MV5BNDZmMzE0NjUtZTIzNC00Mzc0LTgyZjgtNzUxMWRiMDIzMDQwXkEyXkFqcGdeQXVyNjc5NjEzNA@@",
        "MV5BNTFjOTFlMzMtYWIyZi00YmQzLWEyMGMtYzJjY2M1MDY1NjkyXkEyXkFqcGdeQXVyMTUzMDUzNTI3",
        "MV5BMGNhZDczNTUtOWEzZS00ZjEyLTkzODQtOGM1MTZiMGY2ODIyXkEyXkFqcGdeQXVyMjkwOTAyMDU@",
        "MV5BMjA0ZTcwMGEtNDc3NC00ODg3LWE3YTctNDU5ODA3MjNlMDkwXkEyXkFqcGdeQXVyNzc5MjA3OA@@",
      ];

      const cleanMovieData = movieGalleryData.filter(
        (d) => !brokenPosterIDs.some((id) => d.Poster.includes(id))
      );

      return {
        signalsByFilm: signalsByFilm,
        fearJourney: processFearJourneyData(fearJourney),
        tensionJourney: processTensionJourneyData(tensionJourney),
        effectiveness: processEffectivenessData(effectiveness),
        filmComparison: processFilmComparisonData(filmComparison),
        fearJourneyRaw: fearJourney,
        tensionJourneyRaw: tensionJourney,
        movieGalleryData: cleanMovieData,
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

  function processTensionJourneyData(data) {
    const films = Object.keys(data[0]).filter((k) => k !== "scene_position");
    const filmData = [];

    films.forEach((film) => {
      const filmName = film.replace(/_Unknown$/, "").replace(/-/g, " ");
      const values = data
        .map((row) => ({
          position: +row.scene_position,
          tension:
            row[film] !== undefined && row[film] !== "" ? +row[film] : null,
        }))
        .filter((d) => d.tension !== null && Number.isFinite(d.tension));

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
    if (typeof createSankeyViz === "function") {
      try {
        state.visualizations.sankey = createSankeyViz(
          "#viz-sankey",
          data.effectiveness
        );
      } catch (error) {
        console.error("❌ Sankey error:", error);
      }
    }

    if (typeof createFearBuildViz === "function") {
      try {
        state.visualizations.fearBuild = createFearBuildViz(
          "#viz-fear-build",
          data.fearJourneyRaw
        );
      } catch (error) {
        console.error("❌ Fear Build error:", error);
      }
    }

    if (typeof createSpikesViz === "function") {
      try {
        state.visualizations.spikes = createSpikesViz(
          "#viz-spikes",
          data.fearJourney,
          data.tensionJourney,
          data.fearJourneyRaw,
          data.tensionJourneyRaw
        );
      } catch (error) {
        console.error("❌ Spikes error:", error);
      }
    }

    if (typeof createStateMachineViz === "function") {
      try {
        state.visualizations.stateMachine = createStateMachineViz(
          "#viz-state-machine",
          data.fearJourneyRaw
        );
      } catch (error) {
        console.error("❌ Fear State Machine error:", error);
      }
    }

    if (typeof createEffectivenessViz === "function") {
      try {
        state.visualizations.effectiveness = createEffectivenessViz(
          "#viz-effectiveness",
          data.effectiveness
        );
      } catch (error) {
        console.error("❌ Effectiveness error:", error);
      }
    }

    if (typeof createMovieGalleryViz === "function") {
      try {
        state.visualizations.movieGallery = createMovieGalleryViz(
          "#viz-movie-gallery",
          data.movieGalleryData
        );
      } catch (error) {
        console.error("❌ Movie Gallery error:", error);
      }
    }
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
