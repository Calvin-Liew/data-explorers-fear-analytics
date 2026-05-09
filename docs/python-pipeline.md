# AI Python Pipeline Details

This document explains the AI analysis pipeline behind **The Anatomy of Fear**.
It is meant for readers who want to understand how the raw screenplay text was
turned into the scene-level CSV data used by the D3 website.

The website does **not** need this pipeline to run. The generated outputs are
already committed under `data/`.

## Executive Summary

The pipeline uses a hybrid Python + OpenAI workflow:

1. Read 129 raw horror screenplay text files.
2. Split each script into screenplay scenes with regex-based heuristics.
3. Batch scenes into small model requests.
4. Ask an OpenAI model to return structured JSON for each scene.
5. Validate the JSON against a strict schema.
6. Flatten nested JSON into CSV rows.
7. Export scene-level analysis tables.
8. Clean and aggregate those outputs into the D3-ready datasets used by the
   site.

The committed analysis outputs contain:

- 129 films
- 9,760 scenes
- 75.7 average scenes per film
- 572,848 dialogue words
- 560,135 action words
- 11,204 total horror-signal mentions
- 207 lexicon entries in the parser, producing 187 unique `hs_*` signal columns

## Source Files

- [`analysis/hybrid_horror_parser.py`](../analysis/hybrid_horror_parser.py)
  contains the original AI parser, OpenAI calls, JSON validation, fallback
  logic, scene flattening, and CSV export.
- [`analysis/run_full_analysis.py`](../analysis/run_full_analysis.py)
  is the repo-friendly production wrapper. It points the parser at
  `data/horror_screenplays/` and writes generated outputs under
  `analysis/full_analysis_results/`.
- [`analysis/requirements.txt`](../analysis/requirements.txt)
  lists Python dependencies.
- [`analysis/config.env.example`](../analysis/config.env.example)
  is a safe local API key template.

## Input Data

The full run reads:

```text
data/horror_screenplays/*.txt
```

Each file is one screenplay. The filename becomes the `film_title` field in the
output tables.

Example:

```text
Halloween_Unknown.txt -> Halloween_Unknown
Scream_Unknown.txt    -> Scream_Unknown
Alien_Unknown.txt     -> Alien_Unknown
```

The repo also includes:

```text
data/horror_screenplays/downloaded_files.json
```

That file tracks source/download metadata and is skipped by the parser.

## Why Use AI Here?

Traditional screenplay coding would require a person to read every scene and
manually record:

- location
- time of day
- characters
- dialogue/action quantities
- horror language
- emotional tone
- fear/tension intensity

That is more consistent at small scale, but slow and hard to repeat across 129
scripts. The AI workflow was used to produce consistent computational
annotations at corpus scale.

The resulting scores are not treated as perfect ground truth. They are used as
structured signals for exploratory visualization.

## High-Level Architecture

```text
Raw screenplay text
        |
        v
Scene splitting heuristics
        |
        v
Scene chunks, max 4 scenes per request
        |
        v
OpenAI structured JSON extraction
        |
        v
JSON cleanup and schema validation
        |
        v
Fallback record if both model attempts fail
        |
        v
Flattened scene rows
        |
        v
CSV exports
        |
        v
Cleaned visualization datasets
```

## Step 1: Configuration and API Setup

The parser loads API configuration from:

```text
analysis/config.env
```

That file is intentionally ignored by Git. A safe template is committed at:

```text
analysis/config.env.example
```

The only required value is:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

If `analysis/config.env` is missing, the parser falls back to the system
environment.

## Step 2: Script Discovery

`main()` walks the input directory and collects every `.txt` screenplay:

```python
for root, _, files in os.walk(scripts_dir):
    for file in files:
        if file.endswith(".txt") and file != "downloaded_files.json":
            script_files.append(os.path.join(root, file))
```

The production wrapper sets:

```text
scripts_dir = data/horror_screenplays
output_dir  = analysis/full_analysis_results
max_workers = 6
```

`max_workers` controls how many scripts can be processed in parallel.

## Step 3: Scene Splitting

The first major task is turning long screenplay text into individual scene
blocks.

Function:

```text
split_scenes_heuristic()
```

The parser normalizes line endings and scans line by line for screenplay-style
scene markers.

It treats these patterns as possible scene boundaries:

- `INT.`
- `EXT.`
- `FADE IN`
- `FADE OUT`
- `CUT TO`
- `DISSOLVE TO`
- numeric scene dividers
- numbered `CONTINUED` markers

The parser only keeps a scene if it has more than 50 words. This removes many
tiny fragments, page artifacts, and formatting leftovers.

Very long scene blocks are truncated to a maximum of 2,000 words before the
model batching step.

## Step 4: Scene Chunking

The parser does not send an entire screenplay to the model at once. It groups
scenes into small chunks.

Function:

```text
preprocess_scene_chunk()
```

Current chunking rules:

- max 4 scenes per chunk
- rough 2,000-token budget per chunk
- token estimate uses about 1 token per 4 characters

This design keeps requests short enough for consistent JSON output while still
being faster than one API call per scene.

## Step 5: Prompt Construction

Function:

```text
build_chunk_prompt()
```

For each chunk, the parser builds a prompt containing:

- film title
- number of scenes in the chunk
- scene index within the chunk
- raw scene text
- the JSON shape to return
- a horror-term counting instruction

Each scene is truncated to 300 words inside the prompt to reduce token overflow.

The prompt repeatedly emphasizes that the model should return only valid JSON:

```text
Return ONLY valid JSON. No explanations, no markdown, no extra text.
```

The prompt also includes a compact example object, so the model knows the exact
field names expected downstream.

## Step 6: AI Model Strategy

Function:

```text
process_scene_chunk_hybrid()
```

The pipeline uses a hybrid model strategy:

1. Try `gpt-4o-mini` first.
2. If parsing or schema validation fails, retry with `gpt-4o`.
3. If both attempts fail, create a conservative fallback record.

Why this strategy was used:

- `gpt-4o-mini` is faster and cheaper for routine structured extraction.
- `gpt-4o` is kept as a stronger fallback for messy screenplay chunks.
- Fallback rows prevent a single failed request from stopping the full run.

The API call uses:

```text
temperature = 0.0
response_format = {"type": "json_object"}
max_tokens = 1500 for gpt-4o-mini
max_tokens = 2000 for gpt-4o
```

Low temperature was used because this is an extraction task. The goal is
consistency, not creative variation.

## Step 7: What the AI Extracts

Each returned scene must contain this structure:

```json
{
  "scene_index": 0,
  "heading": "INT. BASEMENT - NIGHT",
  "location": "BASEMENT",
  "time_of_day": "NIGHT",
  "characters": ["LAURIE", "MICHAEL"],
  "dialogue_stats": {
    "lines": 12,
    "words": 140,
    "question_rate": 0.25,
    "exclamation_rate": 0.08,
    "avg_line_words": 11.7
  },
  "action_stats": {
    "words": 210,
    "stage_directions": 9
  },
  "horror_signals": {
    "night": 1,
    "dark": 2,
    "blood": 0,
    "scream": 1
  },
  "tension_score": 0.82,
  "fear_emotion": 0.74,
  "sentiment": -0.63,
  "scene_summary": "A character moves through a dark basement while a threat closes in."
}
```

The key AI tasks are:

- identify scene metadata
- separate dialogue from action
- estimate emotional intensity
- count horror-related terms
- summarize the scene in one or two sentences

## Step 8: JSON Schema Validation

The parser validates every model response with `jsonschema`.

Function:

```text
call_gpt_with_retry()
```

Validation checks include:

- required fields are present
- `scene_index` is an integer
- `characters` is an array of strings
- dialogue/action counts are nonnegative
- fear and tension scores are between 0 and 1
- sentiment is between -1 and 1
- no extra top-level fields are added

Before validation, the parser also attempts simple JSON cleanup:

- trims whitespace
- removes text before the first `{`
- removes trailing text after the last `}`
- parses with `json.loads()`

If parsing or validation fails, the same model is retried up to 2 times before
the pipeline moves to the fallback model.

## Step 9: Fallback Behavior

Function:

```text
create_fallback_result()
```

If both model attempts fail, the parser creates a fallback row rather than
dropping the chunk.

Fallback records use:

- `location = "Unknown"`
- `time_of_day = "Unknown"`
- empty character list
- zero dialogue/action counts
- all horror signals set to 0
- `tension_score = 0.5`
- `fear_emotion = 0.5`
- `sentiment = 0.0`
- summary set to `"Parsing failed - fallback data"`

This makes failure visible in the data while preserving row structure.

The committed run summary reports:

```text
mini_success_rate = 0.9996507160321342
4o_fallback_rate  = 0.0
fallback_rate     = 0.00034928396786587494
```

## Step 10: Horror Lexicon

The parser uses a curated horror lexicon. The source list contains 207 entries,
with some repeated terms across categories. After duplicate column names collapse
in CSV output, the committed scene-level table has 187 unique `hs_*` columns.

The lexicon covers six broad kinds of horror language.

### Atmosphere and Setting

Examples:

- `night`
- `dark`
- `darkness`
- `fog`
- `silence`
- `basement`
- `attic`
- `cabin`
- `woods`
- `cemetery`
- `graveyard`
- `abandoned`
- `remote`

### Sound and Voice

Examples:

- `scream`
- `screaming`
- `whisper`
- `whispering`
- `moan`
- `gasp`
- `shriek`
- `howl`
- `wail`
- `heartbeat`
- `footsteps`
- `thud`
- `bang`

### Threats and Violence

Examples:

- `blood`
- `knife`
- `gun`
- `weapon`
- `blade`
- `chainsaw`
- `axe`
- `stab`
- `attack`
- `violent`
- `brutal`
- `death`

### Supernatural Signals

Examples:

- `ghost`
- `demon`
- `possessed`
- `spirit`
- `witch`
- `curse`
- `haunted`
- `supernatural`
- `paranormal`
- `satan`

### Psychological States

Examples:

- `fear`
- `afraid`
- `scared`
- `panic`
- `dread`
- `anxious`
- `paranoid`
- `disturbed`
- `horrifying`
- `terrifying`

### Movement and Pacing

Examples:

- `chase`
- `run`
- `running`
- `stalk`
- `pursue`
- `hide`
- `escape`
- `flee`
- `caught`
- `trapped`

## Step 11: Emotional Scoring

The model produces three scene-level emotional metrics.

### `tension_score`

A 0 to 1 estimate of suspense, pressure, or dread.

Interpretation:

- `0.0-0.2`: calm or low-pressure scene
- `0.3-0.5`: unease or moderate suspense
- `0.6-0.8`: high tension
- `0.9-1.0`: extreme suspense or immediate danger

### `fear_emotion`

A 0 to 1 estimate of direct fear in the scene.

Interpretation:

- `0.0-0.2`: little or no fear
- `0.3-0.5`: concern, uncertainty, or mild fear
- `0.6-0.8`: strong fear or panic
- `0.9-1.0`: intense terror

### `sentiment`

A -1 to 1 estimate of emotional valence.

Interpretation:

- `-1.0` is extremely negative
- `0.0` is neutral
- `1.0` is extremely positive

Most horror scenes lean negative, but neutral or positive scenes matter because
they help show pacing and contrast.

## Step 12: Dialogue and Action Analysis

The AI also estimates scene structure:

- `dialogue_lines`: number of spoken lines
- `dialogue_words`: words spoken by characters
- `dialogue_q_rate`: share of dialogue lines that are questions
- `dialogue_excl_rate`: share of dialogue lines with exclamation marks
- `dialogue_avg_line_words`: average length of dialogue lines
- `action_words`: words used for action or description
- `stage_directions`: count of action/stage direction blocks

These fields help distinguish talk-heavy scenes from action-heavy scenes and
support later film-level comparisons.

## Step 13: Parallel Processing

The pipeline uses parallelism at two levels.

### Script-Level Parallelism

`main()` uses:

```text
ThreadPoolExecutor(max_workers=max_workers)
```

The production wrapper sets `max_workers = 6`, so multiple screenplays can be
processed at the same time.

### Chunk-Level Parallelism

`process_script_hybrid()` also uses:

```text
ThreadPoolExecutor(max_workers=3)
```

This allows up to 3 scene chunks within the same screenplay to be analyzed in
parallel.

The result is faster processing, but it also means API rate limits matter. The
parser includes retry waits, and the wrapper asks for confirmation before
starting a full run.

## Step 14: Flattening Nested JSON

Function:

```text
flatten_scene_row()
```

The model returns nested JSON. CSVs work better as flat tables, so the parser
converts nested fields into columns.

Examples:

```text
dialogue_stats.lines             -> dialogue_lines
dialogue_stats.words             -> dialogue_words
dialogue_stats.question_rate     -> dialogue_q_rate
dialogue_stats.exclamation_rate  -> dialogue_excl_rate
action_stats.words               -> action_words
horror_signals.blood             -> hs_blood
horror_signals.scream            -> hs_scream
```

Character arrays are joined with `|`:

```text
["LAURIE", "MICHAEL"] -> LAURIE|MICHAEL
```

## Step 15: CSV Outputs

The parser writes a timestamped folder:

```text
analysis/full_analysis_results/analysis_YYYYMMDD_HHMMSS/
```

It writes five CSV files.

### `scenes_detailed.csv`

The master scene-level table.

Committed output:

- 9,760 rows
- 204 columns

Includes identifiers, metadata, dialogue/action stats, emotional scores,
summaries, and every `hs_*` signal column.

### `horror_signals.csv`

The signal-count table.

Committed output:

- 9,760 rows
- 190 columns

Includes:

- `film_title`
- `scene_index`
- `heading`
- every `hs_*` signal count

### `emotional_analysis.csv`

The emotional-score table.

Committed output:

- 9,760 rows
- 7 columns

Includes:

- `film_title`
- `scene_index`
- `heading`
- `tension_score`
- `fear_emotion`
- `sentiment`
- `scene_summary`

### `dialogue_analysis.csv`

The dialogue/action table.

Committed output:

- 9,760 rows
- 8 columns

Includes:

- `film_title`
- `scene_index`
- `heading`
- `characters`
- `dialogue_lines`
- `dialogue_words`
- `dialogue_q_rate`
- `dialogue_excl_rate`

### `analysis_summary.csv`

The run-level summary table.

Committed output:

- 1 row
- 11 columns

Includes total films, total scenes, average fear/tension, total dialogue/action
words, and success/fallback rates.

## Production Results in This Repo

The committed `analysis_summary.csv` reports:

| Metric | Value |
| --- | ---: |
| Total films | 129 |
| Total scenes | 9,760 |
| Average scenes per film | 75.66 |
| Average tension | 0.436 |
| Average fear | 0.310 |
| Total dialogue words | 572,848 |
| Total action words | 560,135 |
| Mini success rate | 99.965% |
| Fallback rate | 0.035% |

The most frequent top-level signals in `viz3_horror_effectiveness.csv` include:

| Signal | Occurrences | Overall impact |
| --- | ---: | ---: |
| night | 3,694 | 0.297 |
| blood | 1,460 | 0.562 |
| death | 1,213 | 0.438 |
| scream | 1,187 | 0.691 |
| dark | 981 | 0.346 |
| fear | 729 | 0.575 |
| knife | 569 | 0.538 |
| shadow | 477 | 0.404 |

## How AI Outputs Become Visualization Data

The scene-level AI outputs are more detailed than the website needs. They are
cleaned into smaller, visualization-specific CSVs under:

```text
data/cleaner_datasets/
```

The website loads these with D3.

### `viz1_horror_signals_by_film.csv`

Aggregates signal counts by film. Used by the Sankey signal-flow view.

### `viz2a_tension_journey.csv`

Normalizes scene positions from 0 to 1 and tracks tension across film runtime.
Used by the tension/spike views.

### `viz2b_fear_journey.csv`

Normalizes scene positions from 0 to 1 and tracks fear across film runtime.
Used by the heartbeat/fear journey and spike views.

### `viz3_horror_effectiveness.csv`

Summarizes signal frequency and impact. Used by:

- signal effectiveness bubble chart
- impact dripline
- Sankey filtering

### `viz4_film_comparison.csv`

Aggregates film-level metrics such as total scenes, average fear, average
tension, sentiment, dialogue words, action words, and total horror signals.

Used by:

- ratings versus horror impact plot
- film comparison logic
- gallery support

### `viz5_horror_categories.csv`

Groups horror language into broader categories for family-level comparison.
Used by the radar/fingerprint view.

## How Each Website Scene Uses the Pipeline

### Scene 1: Blood Flow of Horror

Uses signal occurrence and category groupings to show how broad horror families
flow into specific cues such as `night`, `blood`, `scream`, and `fear`.

### Scene 2: Heartbeat of Terror

Uses normalized `fear_emotion` values to plot how fear rises and falls across a
film.

### Scene 3: Mapping the Spikes

Uses fear and tension journeys to find sudden peaks. These peaks become the
markers in the spike map.

### Scene 4: The Ladder of Fear

Buckets fear scores into states such as calm, unease, and panic, then calculates
how often films move from one state to another.

### Scene 5: What Actually Works

Uses signal impact metrics to compare signal frequency with fear and tension
effect.

### Scene 6: Impact Dripline

Ranks signals by overall impact.

### Scene 7: Does Scary Equal Good

Joins film-level horror metrics with IMDb ratings to compare horror impact and
audience rating.

### Scene 8: Horror Fingerprint

Groups signals into six horror families and shows each film's balance across
those families.

### Final Act: Film Dossiers

Uses film metadata, ratings, posters, and cleaned film-level metrics for browse
and filter interactions.

## Reproduce the Analysis

From the repo root:

```bash
cd analysis
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy config.env.example config.env
```

Edit `analysis/config.env`:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

Run the full pipeline:

```bash
python run_full_analysis.py
```

The wrapper prints estimated runtime and cost, then asks for confirmation before
making API calls.

You can also call the parser directly:

```bash
python hybrid_horror_parser.py --scripts_dir ../data/horror_screenplays --out_dir ./out_hybrid --max_workers 4
```

## Quality Controls

The pipeline includes several guardrails:

- scene length filtering removes fragments under 50 words
- long scenes are truncated before model processing
- prompts require JSON-only output
- OpenAI `response_format` requests a JSON object
- JSON is parsed with `json.loads()`
- parsed output is validated with `jsonschema`
- numeric fields have defined ranges
- failed chunks retry before fallback
- fallback rows preserve row structure instead of silently dropping data

## Limitations

The pipeline is useful for large-scale exploratory analysis, but it has limits.

- AI scores are computational annotations, not human-coded ground truth.
- Different model versions can produce slightly different scores.
- OCR errors and messy script formatting can affect scene splitting.
- Some horror signals are counted lexically and may miss context.
- A word like `dark` can be literal, metaphorical, or atmospheric depending on
  scene context.
- Fear and tension are subjective, so the scores should be interpreted as
  comparative signals rather than exact measurements.

For portfolio viewing, use the committed CSVs. Rerun the AI pipeline only if
you want to reproduce or extend the dataset.
