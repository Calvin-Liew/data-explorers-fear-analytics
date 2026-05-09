# Analysis Pipeline

This folder contains the original Python pipeline used to convert raw horror
screenplays into the CSV files that power the website.

## What It Does

1. Reads screenplay text files from `data/horror_screenplays/`.
2. Splits each screenplay into scenes.
3. Sends scene batches to the OpenAI API for structured analysis.
4. Extracts scene metadata, dialogue/action counts, fear and tension scores,
   sentiment, scene summaries, and horror signal counts.
5. Writes analysis CSVs under `analysis/full_analysis_results/`.

The committed site already includes the generated outputs in `data/`, so you do
not need to rerun this pipeline to view the website.

## Files

- `hybrid_horror_parser.py`: original parser and CSV exporter.
- `run_full_analysis.py`: repo-friendly wrapper for the full 129-film run.
- `requirements.txt`: Python dependencies.
- `config.env.example`: safe template for local OpenAI API configuration.

## Setup

```bash
cd analysis
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy config.env.example config.env
```

Then edit `analysis/config.env` and add your own `OPENAI_API_KEY`.
`config.env` is ignored by Git.

## Run the Full Pipeline

```bash
python run_full_analysis.py
```

The wrapper prints an estimated runtime and cost before it starts. A full run is
expensive enough that it asks for confirmation.

## Run a Custom Subset

You can also call the parser directly with your own input/output folders:

```bash
python hybrid_horror_parser.py --scripts_dir ../data/horror_screenplays --out_dir ./out_hybrid --max_workers 4
```

## Outputs

The parser writes timestamped folders containing:

- `scenes_detailed.csv`
- `horror_signals.csv`
- `emotional_analysis.csv`
- `dialogue_analysis.csv`
- `analysis_summary.csv`

The cleaned visualization-ready datasets live in `../data/cleaner_datasets/`.
