# Data Guide

The repo contains three levels of data: raw source scripts, AI-generated
analysis tables, and cleaned CSVs used directly by the website.

## Raw Inputs

`data/horror_screenplays/`

The original screenplay text files. These are the source documents for the
Python analysis pipeline.

`data/imdb-movies-dataset/`

IMDb-style metadata and ratings used for film details, ratings, and gallery
cards.

## AI Analysis Outputs

`data/horror_ai_analysis_datasets/scenes_detailed.csv`

Master scene-level table. Each row is one scene with its heading, parsed
location/time, characters, dialogue/action stats, emotional scores, and scene
summary.

`data/horror_ai_analysis_datasets/horror_signals.csv`

Scene-level horror signal table. Each `hs_*` column counts a horror-related
term in that scene, such as `hs_scream`, `hs_blood`, `hs_shadow`, or
`hs_night`.

`data/horror_ai_analysis_datasets/emotional_analysis.csv`

Scene-level fear, tension, and sentiment scores.

`data/horror_ai_analysis_datasets/dialogue_analysis.csv`

Scene-level dialogue and action word counts, plus dialogue pattern metrics.

`data/horror_ai_analysis_datasets/analysis_summary.csv`

One-row summary of the generated analysis run.

## Visualization-Ready Files

These are the smaller cleaned datasets used by the D3 website.

`data/cleaner_datasets/viz1_horror_signals_by_film.csv`

Aggregated horror-signal counts by film.

`data/cleaner_datasets/viz2a_tension_journey.csv`

Tension scores across normalized film runtime.

`data/cleaner_datasets/viz2b_fear_journey.csv`

Fear scores across normalized film runtime.

`data/cleaner_datasets/viz3_horror_effectiveness.csv`

Top horror signals with occurrence counts and impact scores.

`data/cleaner_datasets/viz4_film_comparison.csv`

Film-level summaries used for ratings, comparison, and gallery views.

`data/cleaner_datasets/viz5_horror_categories.csv`

Category-level signal breakdowns used for family/radar-style analysis.

## Metrics

- **Fear score**: AI-estimated direct fear in a scene on a 0 to 1 scale.
- **Tension score**: AI-estimated suspense or dread on a 0 to 1 scale.
- **Sentiment**: emotional valence, where lower values are more negative.
- **Horror signal**: a term or phrase associated with horror atmosphere,
  threat, violence, setting, sound, pace, or psychology.
- **Impact**: the measured difference between scenes where a signal appears and
  scenes where it does not.
