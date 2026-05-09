#!/usr/bin/env python3
"""
Run the full horror screenplay analysis from this repository.

This wrapper keeps the original parser easy to run from the portfolio repo by
pointing it at data/horror_screenplays and writing outputs under analysis/.
"""

import os
import time
from pathlib import Path

from hybrid_horror_parser import main


ANALYSIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = ANALYSIS_DIR.parent


def load_env_config():
    """Load local config.env if present, otherwise rely on environment vars."""
    config_file = ANALYSIS_DIR / "config.env"
    if config_file.exists():
        with config_file.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value
        print(f"Loaded configuration from {config_file}")
    else:
        print("No analysis/config.env found. Using system environment variables.")


def count_scripts(scripts_dir):
    return sum(
        1
        for path in scripts_dir.rglob("*.txt")
        if path.name != "downloaded_files.json"
    )


def main_production():
    """Run the full production analysis."""
    print("HORROR MOVIE SCRIPT ANALYSIS - PRODUCTION RUN")
    print("=" * 60)

    load_env_config()

    scripts_dir = REPO_ROOT / "data" / "horror_screenplays"
    output_dir = ANALYSIS_DIR / "full_analysis_results"
    max_workers = 6

    print(f"Scripts directory: {scripts_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Parallel workers: {max_workers}")
    print()

    if not scripts_dir.exists():
        print(f"Error: scripts directory not found: {scripts_dir}")
        return

    script_count = count_scripts(scripts_dir)
    print(f"Found {script_count} horror screenplays to analyze")
    print()

    if script_count == 0:
        print("No script files found.")
        return

    estimated_time_minutes = script_count * 1.2
    estimated_cost = script_count * 0.018

    print("ESTIMATED PROCESSING")
    print(f"   Time: ~{estimated_time_minutes:.0f} minutes ({estimated_time_minutes / 60:.1f} hours)")
    print(f"   Cost: ~${estimated_cost:.2f}")
    print("   Speed: ~1.23 scenes/second")
    print()

    response = input("Ready to start full analysis? This uses the OpenAI API. (y/N): ").strip().lower()
    if response != "y":
        print("Analysis cancelled.")
        return

    print("\nSTARTING FULL ANALYSIS")
    print("=" * 60)

    start_time = time.time()

    try:
        main(str(scripts_dir), str(output_dir), max_workers)

        processing_time = time.time() - start_time
        print("\nANALYSIS COMPLETE")
        print("=" * 60)
        print(f"Total processing time: {processing_time / 60:.1f} minutes")
        print(f"Results saved to: {output_dir}")
        print(f"Processed {script_count} horror movies")
        print()
        print("Output files:")
        print("   scenes_detailed.csv - Complete scene analysis")
        print("   horror_signals.csv - Horror term detection")
        print("   emotional_analysis.csv - Tension/fear/sentiment")
        print("   dialogue_analysis.csv - Dialogue statistics")
        print("   analysis_summary.csv - Overall metrics")

    except KeyboardInterrupt:
        print("\nAnalysis interrupted by user.")
    except Exception as e:
        print(f"\nAnalysis failed: {e}")
        print("Check your API key and internet connection.")


if __name__ == "__main__":
    main_production()
