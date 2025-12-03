## The Anatomy of Fear: Horror Film Analytics

**The Anatomy of Fear** is an interactive story about how horror movies make us scared.  
We analyzed 129 horror screenplays and turned them into a single, scrollable experience that shows how films use pacing, language, and atmosphere to build dread.

---

## Where to Find the Project

- **Project website**: [The Anatomy of Fear live site](https://calvin-liew.github.io/data-explorers-fear-analytics/)
- **Short screencast (interface walkthrough)**: [YouTube screencast](https://www.youtube.com/watch?v=SE_CLwrHt_0)

These links are what you should use to mark our project website and videos for grading.

---

## What You Are Looking At

### Our Original Work (What We Are Handing In)

- **Narrative website**

  - `index.html`: The full story structure (intro, “scenes” 1–8, epilogue, and film gallery).
  - `css/style.css`: Custom horror-themed visual design (colors, typography, layout, animations).
  - `images/` and `favicon*.png`: Custom visual assets (bats, fog, painting, icons).
  - `video-from-rawpixel-...mp4`: Ambient video used as part of the atmosphere.

- **Custom interaction and visualization code** (all written by our team)

  - `js/main.js`: Loads data, cleans it, and wires up all the visualizations.
  - `js/sankeyViz.js`: “Scene 1 - The Blood Flow of Horror” (signal families flowing into specific cues).
  - `js/fearBuildViz.js`: “Scene 2 – Heartbeat of Terror” (fear over time line chart with BPM counter).
  - `js/spikesViz.js`: “Scene 3 – Mapping the Spikes” (tombstones and lanterns for fear vs. tension spikes).
  - `js/stateMachineViz.js`: “Scene 4 – The Ladder of Fear” (Calm → Unease → Panic transition matrix).
  - `js/effectivenessViz.js`: “Scene 5 – What Actually Works?” (bubble chart of signal frequency vs. impact).
  - `js/dripImpactViz.js`: “Scene 6 – Impact Dripline” (ranked “drips” of signal potency).
  - `js/ratingImpactViz.js`: “Scene 7 – Does Scary = Good?” (scatter/constellation of horror impact vs. IMDb rating).
  - `js/radarBalanceViz.js`: “Scene 8 – The Horror Fingerprint” (radar chart of six signal families per film).
  - `js/movieGalleryViz.js`: “Film Dossiers” horizontal gallery with filters.
  - `js/heartbeatScroll.js`, `js/scrollAnimations.js`, `js/heroFX.js`, `js/heartbeat.js`:
    Custom scroll, heartbeat progress bar, and hero-section effects.

- **Data we prepared for visualization**

  - `data/cleaner_datasets/`
    - `viz1_horror_signals_by_film.csv`: Aggregate horror signal counts.
    - `viz2a_tension_journey.csv`, `viz2b_fear_journey.csv`: Fear and tension scores across film runtimes.
    - `viz3_horror_effectiveness.csv`: Per-signal effectiveness metrics.
    - `viz4_film_comparison.csv`: Film-level fear/tension/lexicon summaries.
    - `viz5_horror_categories.csv`: Category-level horror lexicon breakdowns.
  - `data/horror_ai_analysis_datasets/`
    - Structured outputs from our AI analysis step (scene-level emotional scores, signals, etc.).
  - `data/horror_screenplays/`
    - 129 raw screenplay text files plus one JSON metadata file used as our primary source material.
  - `data/imbd-movies-dataset/`
    - IMDb-based movie dataset used for ratings and metadata.

- **Parsing + analysis pipeline**
  - **`hybrid_horror_parser`** (separate codebase):  
    Custom Python pipeline that:
    - Reads raw scripts from `data/horror_screenplays/`.
    - Splits them into scenes.
    - Sends scenes to GPT‑4o with structured prompts.
    - Collects JSON outputs and aggregates them into the CSVs under `data/horror_ai_analysis_datasets/` and `data/cleaner_datasets/`.
  - If you want to inspect or reuse the parsing pipeline itself, it lives in:  
    [hybrid_horror_parser repository](ADD_REPO_OR_URL_FOR_HYBRID_HORROR_PARSER_HERE).

### External libraries and resources (not written by us)

- **D3.js v7** – main visualization library, loaded from CDN.
- **d3-sankey** – used only for the Sankey diagram in Scene 1 (signal flows).
- **Browser features** – standard DOM APIs, CSS Grid and Flexbox.
- **Stock assets** – some base imagery and video adapted from royalty-free sources and then styled to match our theme.

Everything in `js/`, `css/`, and our `data/` folders is part of our submission, aside from the D3/d3-sankey scripts that are loaded from external CDNs.

---

## How to Experience the Site (General Audience)

You can think of the site as a single “film” broken into scenes:

- **Landing screen**

  - A **title card** introduces “The Anatomy of Fear”.
  - A **heartbeat bar** at the very top quietly tracks your scroll progress down the page.
  - A **swarm of bats** each represents a different scene (1–9). Hover to see a label, click to jump straight to that section.

- **Prologue – Project Snapshot**

  - Cards show the scale of our study: number of scripts, scenes, signals, and lexicon terms.
  - A short explanation of what a “signal” is and how we grouped them into families (Audio, Visual, Pace, Threat, Setting, Psyche).

- **Scene 1 – “The Blood Flow of Horror” (Sankey)**

  - Left: three big sources (**THE VOID**, **THE VIOLENCE**, **THE SCREAM**).
  - Right: individual signals like “night”, “blood”, “scream”.
  - A **slider** lets you hide low-frequency signals so only the biggest “veins” of horror remain.

- **Scene 2 – “Heartbeat of Terror” (Fear Journey)**

  - A line plot shows how fear rises and falls across a film (0 at the start, 1 at the end).
  - A **dropdown** lets you choose a specific film or view the average pattern.
  - A **BPM-style counter** converts average fear into a “pulse rate”.

- **Scene 3 – “Mapping the Spikes” (Graveyard)**

  - Each row is a film; **tombstones** mark fear spikes and **lanterns** mark tension spikes.
  - **Buttons** let you toggle fear-only, tension-only, or both, and reset the zoom.

- **Scene 4 – “The Ladder of Fear” (State Machine)**

  - A grid shows how likely scenes are to move from Calm → Unease → Panic.
  - Darker squares mean more common transitions; hovering shows exact probabilities.

- **Scene 5 – “What Actually Works?” (Bubble Chart)**

  - Each bubble is a horror signal; size = how often it appears, position = how much impact it has.
  - A **view mode dropdown** lets you switch between overall impact, fear, tension, or pure frequency.
  - Clicking a bubble opens a more detailed “dossier” about that signal.

- **Scene 6 – “Impact Dripline” (Ranked Drips)**

  - Each vertical “drip” is a signal ranked by impact.
  - A **sort menu** switches between alphabetical order and “most to least potent”.

- **Scene 7 – “Does Scary = Good?” (Ratings vs. Impact)**

  - Each dot is a film, placed by horror impact (x-axis) and IMDb rating (y-axis).
  - It visually asks whether being scarier actually means being better liked.

- **Scene 8 – “The Horror Fingerprint” (Radar Recipes)**

  - Radar chart shows a film’s balance across six signal families (Audio, Visual, Pace, Threat, Setting, Psyche).
  - A **film dropdown** changes the shape.
  - Underneath, sliders let you set your preferred mix and get suggested films that match your “horror recipe”.

- **Final Act – Film Dossiers (Gallery)**

  - A horizontal gallery of all 129 films with mini “posters”.
  - Filters for **genre**, **decade**, and **minimum rating**, plus left/right arrows to scroll through the archive.

- **Epilogue – “What the Data Whispers”**
  - A summary of the three main ideas: elite signals vs. atmospheric background, the grammar of pacing, and horror “recipes” rather than a single formula.

---

## Non‑Obvious Interface Features

- **Bats as navigation shortcuts**

  - Hovering over a bat reveals which scene it represents.
  - Clicking a bat scrolls you smoothly down to that exact section.

- **Heartbeat scroll bar**

  - The thin heartbeat line at the very top is a **scroll progress indicator**: it “beats” and fills as you move down the story.

- **Interactive “How to Read This” panels**

  - Many scenes have a styled explainer box under the main graphic.
  - These are not static captions: they walk users step‑by‑step through how to interpret the visualization and what takeaway to look for.

- **Flexible filters, toggles, and sliders**

  - Several views (Sankey, drips, spikes, radar, gallery) include subtle controls:
    - Sliders adjust thresholds (e.g., which signals are shown).
    - Toggles show/hide fear vs. tension markers.
    - Dropdowns change the metric being shown or which film is being highlighted.
  - These controls allow both a guided story and open-ended exploration.

- **Film recommendation via radar preferences**
  - In Scene 8, the preference sliders under the radar chart are a **simple recommender**:
    you can set how much you like each type of horror (e.g., more “Setting”, less “Threat”) and get film suggestions that best match that pattern.

---

## Data and Methods (High‑Level Explanation)

- We collected **129 horror screenplays** and split them into **9,760 scenes**.
- Using a custom Python pipeline called **`hybrid_horror_parser`**, we:
  - Broke scripts into scenes using headings and context.
  - Sent each scene to an AI model (GPT‑4o) with structured prompts.
  - Received back JSON with:
    - Fear, tension, and sentiment scores on a 0–1 scale.
    - Which of our **207 horror lexicon terms** appear in the scene.
    - Basic dialogue vs. action statistics and metadata.
- From these scene‑level JSON outputs, `hybrid_horror_parser` then:
  - Aggregated to **per‑film** summaries (used in the heartbeat, spikes, and radar views).
  - Calculated **per‑signal impact scores** (used in the bubble chart and impact dripline).
  - Joined with **IMDb ratings and metadata** to create film‑level comparison tables.
- All of the CSV files in `data/cleaner_datasets/` and `data/horror_ai_analysis_datasets/` are the cleaned outputs of this pipeline, specifically prepared for visualization.

If you want to inspect or reuse the parsing pipeline itself, it lives in our separate codebase **`hybrid_horror_parser`** (`[ADD REPO OR URL HERE]`).

---

## AI Parser: Example Input and Output

To make the `hybrid_horror_parser` process concrete, here is a simplified example.

### Example screenplay input (one scene)

```text
INT. ASYLUM HALLWAY - NIGHT

The lights flicker. SARAH walks alone, her footsteps echoing.
A distant SCREAM cuts through the silence.

She freezes, breathing fast, scanning the darkness ahead.
Something moves in the shadows, just out of sight.
```

### Example prompt style (simplified for illustration)

```text
You are analyzing a horror movie scene.

1. Read the scene text.
2. Identify horror "signals" from these families: Audio, Visual, Pace, Threat, Setting, Psyche.
3. Score the scene from 0 to 1 for:
   - fear
   - tension
   - sentiment (1 = very positive, 0 = very negative)

Return ONLY valid JSON in this format:

{
  "heading": "...",
  "signals": {
    "audio": [...],
    "visual": [...],
    "pace": [...],
    "threat": [...],
    "setting": [...],
    "psyche": [...]
  },
  "scores": {
    "fear": 0-1 number,
    "tension": 0-1 number,
    "sentiment": 0-1 number
  }
}
```

### Example JSON output from the AI (what `hybrid_horror_parser` saves)

```json
{
  "heading": "INT. ASYLUM HALLWAY - NIGHT",
  "signals": {
    "audio": ["scream", "silence", "echo"],
    "visual": ["dark", "flicker", "shadows"],
    "pace": ["sudden"],
    "threat": [],
    "setting": ["asylum", "hallway", "night"],
    "psyche": ["fear", "panic"]
  },
  "scores": {
    "fear": 0.85,
    "tension": 0.78,
    "sentiment": 0.22
  }
}
```

`hybrid_horror_parser` repeats this process for every scene in every script, then stacks and aggregates these JSON records into the CSV datasets that drive our visualizations.

---

### Data Sources

- **Screenplays (primary text corpus)**  
  129 horror film scripts collected from online screenplay archives (e.g., IMSDb and similar public sources).  
  Stored in `data/horror_screenplays/` and read by `hybrid_horror_parser`.

- **AI‑generated analysis tables**  
  Scene‑level and film‑level JSON/CSV outputs from our `hybrid_horror_parser` + GPT‑4o pipeline:

  - `data/horror_ai_analysis_datasets/`
  - `data/cleaner_datasets/` (final tidy CSVs used directly by the visualizations)

- **IMDb metadata and ratings**  
  Movie metadata and ratings derived from:
  - `data/imbd-movies-dataset/imdb_movies_dataset.csv` (original dataset)
  - `data/imbd-movies-dataset/imdb_179_horror.csv` (our filtered subset for horror titles)

Together, these sources feed into the interactive visuals you see on the website.

---

## Running the Site (for Instructors / Developers)

You can simply use the live link above. If you need to run it locally:

1. **Download or clone the repository.**
2. **Start a simple local server** from the project folder (D3 needs HTTP to load CSV files):

   - Python 3:

   ```bash
   python -m http.server 8000
   ```

   - Node:

   ```bash
   npx http-server
   ```

   - PHP:

   ```bash
   php -S localhost:8000
   ```

3. **Open** `http://localhost:8000` in your browser.

The site is a static HTML + CSS + JavaScript project; there is no backend server or database.

---

## Team

- **Calvin Liew** – Team Lead, Visualization Design
- **Yichen Fan** – Data Preparation & Analysis
- **Yansong Zhu** – Data Preparation & Analysis
- **Olivia Doerrstein** – Visualization & Narrative Design
- **Mehmet Gunenc** – Data Preparation & Analysis
- **Fanke Qin** – Visualization & Interaction Design

**Course**: CSC316 – Data Visualization  
**Institution**: University of Toronto  
**Year**: 2025–2026
