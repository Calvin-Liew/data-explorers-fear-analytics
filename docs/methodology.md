# Methodology

This project turns horror screenplays into an interactive visual story about how
films build fear.

## Research Question

How do horror films use repeated narrative signals, pacing, setting, sound, and
emotional shifts to create fear and tension?

## Dataset

- 129 horror screenplays stored in `data/horror_screenplays/`
- 9,760 scene-level records
- 187 exported horror-signal columns
- 11,204 total horror-signal mentions in the scene-level signal table
- IMDb metadata and ratings stored in `data/imdb-movies-dataset/`

## Pipeline

1. **Collect scripts**
   Screenplays were collected as plain text and stored by film title.

2. **Split into scenes**
   The Python parser uses screenplay headings such as `INT.`, `EXT.`, and other
   scene markers to break each script into analyzable chunks.

3. **Analyze each scene with AI**
   Each scene batch is sent to the OpenAI API with a structured prompt. The model
   returns JSON containing:

   - scene heading, location, and time of day
   - characters
   - dialogue and action statistics
   - tension, fear, and sentiment scores
   - horror signal counts
   - a short scene summary

4. **Export CSVs**
   The parser writes scene-level CSV files, then the visualization dataset is
   cleaned into smaller CSVs under `data/cleaner_datasets/`.

5. **Build visualizations**
   The website loads the cleaned CSVs with D3 and presents the analysis as a
   scrolling narrative.

## Signal Families

The visual story groups horror cues into six broad families:

- **Audio**: screams, whispers, silence, music, sudden sounds
- **Visual**: blood, shadows, darkness, masks, mirrors
- **Pace**: chases, running, sudden changes, attacks
- **Threat**: killers, monsters, weapons, ghosts, danger
- **Setting**: night, forests, basements, graveyards, isolation
- **Psyche**: panic, dread, paranoia, madness, supernatural fear

## Caveats

The AI-generated scores should be treated as computational annotations, not
ground truth. They are useful for pattern discovery and visualization, but they
should not replace close reading or human film analysis.

Some source scripts contain OCR artifacts or inconsistent screenplay formatting.
The parser is designed to be robust to messy text, but noisy source material can
still affect scene splitting and signal counts.
