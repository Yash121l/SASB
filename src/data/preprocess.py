"""
Preprocessing pipeline for the SASB air-quality project.

This module transforms the raw World Bank downloads and the OpenAQ snapshot
into analysis-ready tables. All expensive computations (rolling windows,
seasonal groupings, correlations) are cached inside ``data/processed`` so
downstream notebooks and scripts can remain lightweight.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd

from src.data.collect import WORLD_BANK_INDICATORS

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

SEASON_MAP = {
    12: "winter",
    1: "winter",
    2: "winter",
    3: "spring",
    4: "spring",
    5: "spring",
    6: "summer",
    7: "summer",
    8: "summer",
    9: "autumn",
    10: "autumn",
    11: "autumn",
}


def _compute_trend(x: pd.Series, y: pd.Series) -> float:
    """Return the slope (per year) from a simple linear fit."""
    valid = x.notna() & y.notna()
    if valid.sum() < 2:
        return np.nan
    coeffs = np.polyfit(x[valid], y[valid], deg=1)
    return float(coeffs[0])


def build_world_bank_panel(raw_dir: Path | str = Path("data/raw"), processed_dir: Path | str = Path("data/processed")) -> Tuple[Path, Path]:
    """Clean and enrich the longitudinal World Bank indicator table."""
    raw_dir = Path(raw_dir)
    processed_dir = Path(processed_dir)
    processed_dir.mkdir(parents=True, exist_ok=True)

    combined_path = raw_dir / "world_bank_combined.csv"
    metadata_path = raw_dir / "world_bank_country_metadata.csv"
    if not combined_path.exists():
        raise FileNotFoundError(f"Missing combined indicator file at {combined_path}. Run src.data.collect first.")
    combined = pd.read_csv(combined_path)
    rename_map: Dict[str, str] = WORLD_BANK_INDICATORS.copy()
    combined = combined.rename(columns=rename_map)
    combined = combined.rename(columns={"country": "country_name"})
    numeric_cols = list(rename_map.values())
    for col in numeric_cols:
        combined[col] = pd.to_numeric(combined[col], errors="coerce")
    combined = combined.dropna(subset=["pm25_exposure"])
    combined = combined.sort_values(["iso3", "year"])
    # Fill gaps per country through forward/backward fill
    grouped = combined.groupby("iso3", group_keys=False)
    for col in numeric_cols:
        combined[col] = grouped[col].apply(lambda s: s.ffill().bfill())
    # Derived metrics
    for col in numeric_cols:
        combined[f"{col}_yoy_delta"] = grouped[col].diff()
        combined[f"{col}_rolling_mean_3yr"] = grouped[col].transform(lambda s: s.rolling(window=3, min_periods=1).mean())
    combined["log_gdp_per_capita"] = np.log1p(combined["gdp_per_capita_constant_2015usd"])
    combined["urbanization_tier"] = pd.cut(
        combined["urban_population_pct"],
        bins=[0, 40, 60, 80, 100],
        labels=["low", "emerging", "advanced", "hyper-urban"],
        include_lowest=True,
    )
    meta = pd.read_csv(metadata_path) if metadata_path.exists() else pd.DataFrame()
    if not meta.empty:
        combined = combined.merge(meta, on="iso3", how="left", suffixes=("", "_meta"))
    if "country_name_meta" in combined.columns:
        combined["country_name"] = combined["country_name"].fillna(combined["country_name_meta"])
        combined.drop(columns=["country_name_meta"], inplace=True)
    combined["region"] = combined["region"].fillna("Other")
    combined["income_group"] = combined["income_group"].fillna("Not classified")
    panel_path = processed_dir / "country_air_quality_panel.csv"
    combined.to_csv(panel_path, index=False)
    LOGGER.info("World Bank panel saved to %s (%s rows)", panel_path, len(combined))

    grouped = combined.groupby(["iso3", "country_name", "region", "income_group"])
    summary_records = []
    for keys, frame in grouped:
        iso3, country_name, region, income_group = keys
        summary_records.append(
            {
                "iso3": iso3,
                "country_name": country_name,
                "region": region,
                "income_group": income_group,
                "start_year": frame["year"].min(),
                "end_year": frame["year"].max(),
                "pm25_mean": frame["pm25_exposure"].mean(),
                "pm25_latest": frame.sort_values("year")["pm25_exposure"].iloc[-1],
                "pm25_peak": frame["pm25_exposure"].max(),
                "pm25_trend": _compute_trend(frame["year"], frame["pm25_exposure"]),
                "gdp_mean": frame["gdp_per_capita_constant_2015usd"].mean(),
                "urban_mean": frame["urban_population_pct"].mean(),
            }
        )
    summary = pd.DataFrame(summary_records)
    summary["pm25_percent_change"] = (
        (summary["pm25_latest"] - summary["pm25_mean"]) / summary["pm25_mean"]
    ) * 100
    summary_path = processed_dir / "country_air_quality_summary.csv"
    summary.to_csv(summary_path, index=False)
    LOGGER.info("World Bank summary saved to %s", summary_path)
    return panel_path, summary_path


def build_openaq_city_tables(
    snapshot_path: Path | str = Path("data/external/openaq-kaggle/OpenAQ.csv"),
    processed_dir: Path | str = Path("data/processed"),
) -> Tuple[Path, Path, Path]:
    """Aggregate the OpenAQ snapshot into tidy city-level tables."""
    snapshot_path = Path(snapshot_path)
    processed_dir = Path(processed_dir)
    processed_dir.mkdir(parents=True, exist_ok=True)
    if not snapshot_path.exists():
        raise FileNotFoundError(
            f"OpenAQ snapshot not found at {snapshot_path}. "
            "Download it via `git clone https://github.com/songhaoli/OpenAQ data/external/openaq-kaggle`."
        )
    df = pd.read_csv(snapshot_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["timestamp", "value", "pollutant"])
    df["year"] = df["timestamp"].dt.year
    df["month"] = df["timestamp"].dt.month
    df = df[(df["year"] >= 2007) & (df["year"] <= 2019)]
    df["season"] = df["month"].map(SEASON_MAP)
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    pollutant_agg = (
        df.groupby(["country", "city", "year", "pollutant"])
        .agg(
            avg_value=("value", "mean"),
            median_value=("value", "median"),
            p95_value=("value", lambda s: s.quantile(0.95)),
            measurements=("value", "count"),
            max_value=("value", "max"),
            min_value=("value", "min"),
        )
        .reset_index()
    )
    pollutant_path = processed_dir / "openaq_city_year_pollutants.csv"
    pollutant_agg.to_csv(pollutant_path, index=False)
    LOGGER.info("Saved OpenAQ city-year pollutant table to %s", pollutant_path)

    pivot = pollutant_agg.pivot_table(
        index=["country", "city", "year"], columns="pollutant", values="avg_value"
    )
    pivot.columns = [f"avg_{col.lower()}" for col in pivot.columns]
    pivot = pivot.reset_index()
    pivot["pollutant_span"] = pivot[[c for c in pivot.columns if c.startswith("avg_")]].max(axis=1) - pivot[
        [c for c in pivot.columns if c.startswith("avg_")]
    ].min(axis=1)
    pivot_path = processed_dir / "openaq_city_year_wide.csv"
    pivot.to_csv(pivot_path, index=False)
    LOGGER.info("Saved OpenAQ city-year wide table to %s", pivot_path)

    seasonal = (
        df.groupby(["country", "city", "season", "pollutant"])
        .agg(seasonal_avg=("value", "mean"))
        .reset_index()
    )
    seasonal_path = processed_dir / "openaq_city_seasonal_profiles.csv"
    seasonal.to_csv(seasonal_path, index=False)
    LOGGER.info("Saved OpenAQ seasonal profiles to %s", seasonal_path)

    return pollutant_path, pivot_path, seasonal_path


def run_all(
    raw_dir: Path | str = Path("data/raw"),
    processed_dir: Path | str = Path("data/processed"),
    openaq_snapshot: Path | str = Path("data/external/openaq-kaggle/OpenAQ.csv"),
) -> None:
    """Convenience function used by automation/tests."""
    build_world_bank_panel(raw_dir=raw_dir, processed_dir=processed_dir)
    build_openaq_city_tables(snapshot_path=openaq_snapshot, processed_dir=processed_dir)


if __name__ == "__main__":
    run_all()
