#!/usr/bin/env bash

set -euo pipefail

RAW_DIR=${RAW_DIR:-data/raw}
PROCESSED_DIR=${PROCESSED_DIR:-data/processed}
START_YEAR=${START_YEAR:-2004}
END_YEAR=${END_YEAR:-2023}
INDICATORS=${INDICATORS:-}

echo "[1/4] Data collection"
if [[ "${SKIP_COLLECTION:-0}" == "1" ]]; then
  echo "→ Skipping data collection step (SKIP_COLLECTION=1)"
else
  COLLECT_ARGS=(--output-dir "$RAW_DIR" --start-year "$START_YEAR" --end-year "$END_YEAR")
  if [[ -n "$INDICATORS" ]]; then
    COLLECT_ARGS+=(--indicators)
    IFS=',' read -ra INDICATOR_LIST <<< "$INDICATORS"
    for code in "${INDICATOR_LIST[@]}"; do
      trimmed=$(echo "$code" | tr -d '[:space:]')
      [[ -n "$trimmed" ]] && COLLECT_ARGS+="$trimmed"
    done
  fi
  python3 -m src.data.collect "${COLLECT_ARGS[@]}"
fi

echo "[2/4] Preprocessing"
if [[ "${SKIP_PREPROCESS:-0}" == "1" ]]; then
  echo "→ Skipping preprocessing step (SKIP_PREPROCESS=1)"
else
  python3 -m src.data.preprocess
fi

echo "[3/4] Analysis & visualization"
if [[ "${SKIP_ANALYSIS:-0}" == "1" ]]; then
  echo "→ Skipping analysis step (SKIP_ANALYSIS=1)"
else
  python3 -m src.analysis.analyze
fi

echo "[4/4] Test suite"
if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  echo "→ Skipping tests (SKIP_TESTS=1)"
else
  python3 -m pytest
fi

echo "Pipeline completed successfully."
