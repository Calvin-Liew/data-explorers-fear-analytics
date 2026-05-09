# The Anatomy of Fear

Interactive horror film analytics built with D3.js.

[Live site](https://calvin-liew.github.io/data-explorers-fear-analytics/) | [Methodology](docs/methodology.md) | [Data guide](docs/data-guide.md) | [Python pipeline](docs/python-pipeline.md)

## Overview

The Anatomy of Fear explores how horror films create dread through recurring
signals: screams, shadows, blood, darkness, pacing shifts, isolated settings,
direct threats, and psychological unease.

The project analyzes 129 horror screenplays, breaks them into 9,760 scenes, and
turns the resulting fear, tension, sentiment, and signal data into a scrolling
interactive story.

## Project Highlights

- **129 horror screenplays** used as the source corpus
- **9,760 scenes** extracted and analyzed
- **11,204 horror-signal mentions** across the scene-level signal table
- **D3.js visual narrative** with nine interactive sections
- **Python AI analysis pipeline** included under `analysis/`
- **Cleaned CSV datasets** included under `data/cleaner_datasets/`

## Screenshots

| Scene | Visualization |
| --- | --- |
| 1. Blood Flow of Horror | ![Sankey horror signal flow](docs/screenshots/01-sankey-signals.png) |
| 2. Heartbeat of Terror | ![Fear journey line chart](docs/screenshots/02-fear-journey.png) |
| 3. Mapping the Spikes | ![Fear and tension spike map](docs/screenshots/03-spikes.png) |
| 4. The Ladder of Fear | ![Fear state transition matrix](docs/screenshots/04-state-machine.png) |
| 5. What Actually Works | ![Horror signal effectiveness bubble chart](docs/screenshots/05-effectiveness.png) |
| 6. Impact Dripline | ![Ranked signal impact dripline](docs/screenshots/06-dripline.png) |
| 7. Does Scary Equal Good | ![IMDb rating versus horror impact scatterplot](docs/screenshots/07-rating-impact.png) |
| 8. Horror Fingerprint | ![Radar chart of horror signal families](docs/screenshots/08-radar.png) |
| Final Act. Film Dossiers | ![Interactive horror film gallery](docs/screenshots/09-movie-gallery.png) |

## Repository Structure

```text
.
|-- index.html                         # Single-page interactive story
|-- css/                               # Visual design and layout
|-- js/                                # D3 visualization modules
|-- data/
|   |-- cleaner_datasets/              # CSVs used directly by the site
|   |-- horror_ai_analysis_datasets/   # Scene-level AI analysis outputs
|   |-- horror_screenplays/            # Raw screenplay text files
|   `-- imdb-movies-dataset/           # Movie metadata and ratings
|-- analysis/                          # Original Python analysis pipeline
|-- docs/                              # Simplified methodology and data docs
`-- scripts/                           # Utility scripts, including screenshots
```

## Python AI Pipeline

The Python pipeline in `analysis/` is the data engine behind the project. It
does not need to run for the website to work because the generated CSVs are
already committed, but it documents how the analysis was produced.

Core flow:

1. Read raw screenplay text files from `data/horror_screenplays/`.
2. Split scripts into scenes using screenplay markers such as `INT.`, `EXT.`,
   `FADE IN`, `CUT TO`, and `DISSOLVE TO`.
3. Batch scenes into small chunks and send them to the OpenAI API.
4. Use `gpt-4o-mini` first, then retry failed chunks with `gpt-4o`.
5. Validate model output against a JSON schema before writing CSV rows.
6. Export scene-level tables for emotions, dialogue/action, horror signals, and
   run summary metrics.
7. Clean those outputs into smaller visualization-ready CSVs under
   `data/cleaner_datasets/`.

For each scene, the AI extracts:

- scene heading, location, time of day, and characters
- dialogue lines, dialogue words, action words, and question/exclamation rates
- `tension_score`, `fear_emotion`, and `sentiment`
- horror-signal counts such as `hs_night`, `hs_blood`, `hs_scream`, and
  `hs_shadow`
- a short scene summary

Example scene-level AI extraction:

```json
{
  "heading": "INT. BASEMENT - NIGHT",
  "location": "BASEMENT",
  "time_of_day": "NIGHT",
  "characters": ["LAURIE", "MICHAEL"],
  "dialogue_stats": {
    "lines": 12,
    "words": 140,
    "question_rate": 0.25,
    "exclamation_rate": 0.08
  },
  "action_stats": {
    "words": 210,
    "stage_directions": 9
  },
  "horror_signals": {
    "night": 1,
    "dark": 2,
    "blood": 0,
    "scream": 1,
    "shadow": 3
  },
  "tension_score": 0.82,
  "fear_emotion": 0.74,
  "sentiment": -0.63,
  "scene_summary": "A character moves through a dark basement while an unseen threat closes in."
}
```

The `scene_summary` is the AI-provided plain-language explanation of what is
happening in that scene. The numeric scores and `horror_signals` fields are the
structured values later used for the charts.

The main generated outputs live in `data/horror_ai_analysis_datasets/`:

- `scenes_detailed.csv`
- `horror_signals.csv`
- `emotional_analysis.csv`
- `dialogue_analysis.csv`
- `analysis_summary.csv`

Read the full technical explanation in
[Python pipeline details](docs/python-pipeline.md).

## Visual Story

1. **Blood Flow of Horror** shows which horror cues dominate the corpus.
2. **Heartbeat of Terror** traces fear across a film's normalized runtime.
3. **Mapping the Spikes** compares sudden fear and tension peaks by film.
4. **The Ladder of Fear** shows transitions between calm, unease, and panic.
5. **What Actually Works** compares signal frequency against emotional impact.
6. **Impact Dripline** ranks the strongest horror cues.
7. **Does Scary Equal Good** compares horror impact with IMDb rating.
8. **Horror Fingerprint** compares each film's mix of six horror families.
9. **Film Dossiers** lets users browse the full analyzed film set.

## Run Locally

D3 loads CSV files over HTTP, so run a local static server instead of opening
`index.html` directly.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also use the npm script:

```bash
npm install
npm run serve
```

## Regenerate Screenshots

Screenshots are generated with Playwright and saved to `docs/screenshots/`.

```bash
npm install
npm run screenshots
```

## Reproduce the Analysis

The generated datasets are already committed, so rerunning the AI pipeline is
optional. To reproduce the analysis from the original screenplay text files:

```bash
cd analysis
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy config.env.example config.env
```

Add your own OpenAI API key to `analysis/config.env`, then run:

```bash
python run_full_analysis.py
```

The full run uses the OpenAI API and asks for confirmation before starting.
For a deeper end-to-end explanation, see the [Python pipeline details](docs/python-pipeline.md).

## Documentation

- [Methodology](docs/methodology.md): how screenplays became structured data
- [Data guide](docs/data-guide.md): what each CSV contains
- [Python pipeline details](docs/python-pipeline.md): end-to-end parser flow and output meaning
- [Analysis pipeline](analysis/README.md): how to rerun the Python parser

## Tech Stack

- D3.js v7
- d3-sankey
- HTML, CSS, JavaScript
- Python, pandas, NumPy, OpenAI API
- Playwright for screenshot capture
