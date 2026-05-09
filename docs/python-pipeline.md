# Python Pipeline Details

This page explains the Python analysis pipeline behind The Anatomy of Fear in
more detail than the README. The website does not need this pipeline to run,
because the generated CSV outputs are already committed under `data/`.

## Purpose

The pipeline turns raw screenplay text into structured scene-level data that can
be filtered, aggregated, and visualized with D3.

It answers four practical questions for each scene:

- What scene is this, and where/when does it happen?
- How much dialogue and action text does it contain?
- How tense, fearful, and emotionally negative is the scene?
- Which horror signals appear, and how often?

## Source Files

- [`analysis/hybrid_horror_parser.py`](../analysis/hybrid_horror_parser.py):
  main parser, OpenAI calls, scene flattening, and CSV export.
- [`analysis/run_full_analysis.py`](../analysis/run_full_analysis.py):
  wrapper that runs the parser against `data/horror_screenplays/`.
- [`analysis/requirements.txt`](../analysis/requirements.txt):
  Python dependencies.
- [`analysis/config.env.example`](../analysis/config.env.example):
  safe API key template.

## Inputs

The full run reads:

- `data/horror_screenplays/*.txt`: raw screenplay text files
- `data/horror_screenplays/downloaded_files.json`: source/download metadata

Each screenplay filename becomes the `film_title` used in the output tables.
For example, `Halloween_Unknown.txt` becomes `Halloween_Unknown`.

## Step-by-Step Flow

### 1. Load Configuration

`load_env_config()` looks for `analysis/config.env` and loads values such as
`OPENAI_API_KEY`. If the file is not present, the parser uses normal system
environment variables.

`config.env` is intentionally ignored by Git.

### 2. Discover Scripts

`main()` walks the screenplay directory, finds every `.txt` file, and skips
`downloaded_files.json`.

The full wrapper points to:

```text
data/horror_screenplays/
```

### 3. Split Scripts Into Scenes

`split_scenes_heuristic()` normalizes line endings, scans for screenplay-style
scene markers, and produces a list of scene text blocks.

The scene splitter looks for patterns such as:

- `INT.`
- `EXT.`
- `FADE IN`
- `FADE OUT`
- `CUT TO`
- `DISSOLVE TO`
- numbered scene separators
- `CONTINUED` markers

Very long scenes are split into smaller blocks so each model request stays
manageable.

### 4. Batch Scenes

`preprocess_scene_chunk()` groups scenes into small batches. The current parser
uses up to 4 scenes per request by default.

Batching keeps the pipeline faster and cheaper than sending every scene one at a
time.

### 5. Build the Model Prompt

`build_chunk_prompt()` creates a compact prompt containing:

- film title
- scene number
- raw scene text
- a required JSON output shape
- a subset of horror terms to count

The model is instructed to return only valid JSON.

### 6. Analyze With a Hybrid Model Strategy

`process_scene_chunk_hybrid()` first sends each chunk to `gpt-4o-mini`.

If that fails validation or parsing, it retries with `gpt-4o`.

If both model calls fail, `create_fallback_result()` creates a conservative
fallback record so the pipeline can continue instead of losing the whole run.

### 7. Validate and Clean JSON

`call_gpt_with_retry()` asks the OpenAI API for JSON output, strips common JSON
formatting issues, validates against `BATCH_SCHEMA`, and retries failed calls.

The expected scene object includes:

- `scene_index`
- `heading`
- `location`
- `time_of_day`
- `characters`
- `dialogue_stats`
- `action_stats`
- `horror_signals`
- `tension_score`
- `fear_emotion`
- `sentiment`
- `scene_summary`

### 8. Flatten Scene Records

`flatten_scene_row()` converts nested JSON into one flat CSV row.

Examples:

- `dialogue_stats.lines` becomes `dialogue_lines`
- `dialogue_stats.words` becomes `dialogue_words`
- `action_stats.words` becomes `action_words`
- horror signal `blood` becomes `hs_blood`
- horror signal `scream` becomes `hs_scream`

This makes the outputs easier to use in pandas, spreadsheets, and D3.

### 9. Write CSV Outputs

The parser writes a timestamped output folder under:

```text
analysis/full_analysis_results/
```

It exports:

- `scenes_detailed.csv`: complete scene-level table
- `horror_signals.csv`: only scene identifiers plus `hs_*` signal counts
- `emotional_analysis.csv`: fear, tension, sentiment, and summaries
- `dialogue_analysis.csv`: character/dialogue/action metrics
- `analysis_summary.csv`: run-level summary metrics

## Output Meaning

### Fear Score

`fear_emotion` is a 0 to 1 estimate of direct fear in the scene.

### Tension Score

`tension_score` is a 0 to 1 estimate of suspense, dread, or pressure.

### Sentiment

`sentiment` estimates emotional valence, where negative values mean darker or
more distressing emotional content.

### Horror Signals

Every `hs_*` column counts a horror-related term. Examples:

- `hs_night`
- `hs_dark`
- `hs_blood`
- `hs_scream`
- `hs_shadow`
- `hs_knife`

The committed scene-level signal table contains 187 exported `hs_*` columns and
11,204 total signal mentions.

## How the Website Uses the Output

The raw AI outputs are kept in:

```text
data/horror_ai_analysis_datasets/
```

The smaller visualization-ready files are kept in:

```text
data/cleaner_datasets/
```

The website loads the cleaned files with D3:

- `viz1_horror_signals_by_film.csv`
- `viz2a_tension_journey.csv`
- `viz2b_fear_journey.csv`
- `viz3_horror_effectiveness.csv`
- `viz4_film_comparison.csv`
- `viz5_horror_categories.csv`

Those files power the Sankey, fear journey, spike map, state machine, bubble
chart, dripline, rating plot, radar chart, and film gallery.

## Reproduce the Run

From the repo root:

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

The wrapper prints estimated runtime and cost before making API calls.

## Notes and Limitations

- The AI scores are computational annotations, not human-coded ground truth.
- OCR artifacts and inconsistent screenplay formatting can affect scene splits.
- The pipeline is designed for reproducible data generation, but outputs can
  vary slightly if model behavior changes.
- The committed CSVs should be used for stable portfolio viewing.
