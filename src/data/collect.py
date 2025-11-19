"""
Data acquisition utilities for the SASB air-quality project.

This module currently focuses on downloading the longitudinal World Bank
indicators that we use to understand 20-year national air-quality trends and
their socioeconomic correlates. The OpenAQ snapshot used for city-level
analysis is stored under ``data/external`` (see README for the download command).
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Dict, Iterable, List

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
LOGGER = logging.getLogger(__name__)

# Indicator catalog referenced throughout the project
WORLD_BANK_INDICATORS: Dict[str, str] = {
    "EN.ATM.PM25.MC.M3": "pm25_exposure",  # micrograms per cubic meter
    "NY.GDP.PCAP.KD": "gdp_per_capita_constant_2015usd",
    "SP.URB.TOTL.IN.ZS": "urban_population_pct",
    "SH.DTH.COMM.ZS": "communicable_disease_death_pct",
}

DEFAULT_START_YEAR = 2004
DEFAULT_END_YEAR = 2023
WORLD_BANK_API = "https://api.worldbank.org/v2"


def _request_json(url: str, params: Dict, retries: int = 3) -> Dict:
    """Wrapper around ``requests.get`` with light retry/backoff logic."""
    session = requests.Session()
    for attempt in range(retries):
        response = session.get(url, params=params, timeout=90)
        if response.status_code == requests.codes.ok:
            return response.json()
        LOGGER.warning("World Bank API call failed (%s) – attempt %s/%s", response.status_code, attempt + 1, retries)
        if attempt < retries - 1:
            time.sleep(2**attempt)
    response.raise_for_status()
    raise RuntimeError("Unreachable")  # pragma: no cover


def fetch_world_bank_indicator(indicator: str, start_year: int, end_year: int) -> pd.DataFrame:
    """
    Download a single indicator from the World Bank API between the selected years.

    Returns:
        ``pandas.DataFrame`` with columns: iso3, country, year, value.
    """
    LOGGER.info("Fetching World Bank indicator %s (%s-%s)", indicator, start_year, end_year)
    rows: List[Dict] = []
    page = 1
    while True:
        params = {
            "format": "json",
            "per_page": 20000,
            "page": page,
            "date": f"{start_year}:{end_year}",
        }
        url = f"{WORLD_BANK_API}/country/all/indicator/{indicator}"
        payload = _request_json(url, params)
        if len(payload) < 2:
            break
        meta, observations = payload
        for obs in observations:
            country = obs.get("country", {}) or {}
            iso3 = obs.get("countryiso3code")
            value = obs.get("value")
            year = obs.get("date")
            if not iso3 or not year:
                continue
            rows.append(
                {
                    "iso3": iso3,
                    "country": country.get("value"),
                    "year": int(year),
                    indicator: value,
                }
            )
        if page >= meta.get("pages", 0):
            break
        page += 1
    frame = pd.DataFrame(rows)
    return frame


def fetch_world_bank_metadata() -> pd.DataFrame:
    """Download country metadata (region, income group) for enrichment."""
    LOGGER.info("Fetching World Bank country metadata")
    rows: List[Dict] = []
    page = 1
    while True:
        params = {"format": "json", "per_page": 400, "page": page}
        payload = _request_json(f"{WORLD_BANK_API}/country", params)
        if len(payload) < 2:
            break
        meta, countries = payload
        for entry in countries:
            iso3 = entry.get("id")
            region = (entry.get("region") or {}).get("value")
            income = (entry.get("incomeLevel") or {}).get("value")
            if not iso3 or iso3 in {"", "1A", "XKX"}:
                continue
            rows.append(
                {
                    "iso3": iso3,
                    "country_name": entry.get("name"),
                    "region": region,
                    "income_group": income,
                }
            )
        if page >= meta.get("pages", 0):
            break
        page += 1
    return pd.DataFrame(rows)


def download_world_bank_indicators(output_dir: Path, indicators: Iterable[str], start_year: int, end_year: int) -> Path:
    """Fetch and persist the selected indicators + metadata to disk."""
    output_dir.mkdir(parents=True, exist_ok=True)
    combined: pd.DataFrame | None = None
    for indicator in indicators:
        frame = fetch_world_bank_indicator(indicator, start_year, end_year)
        indicator_path = output_dir / f"world_bank_indicator_{indicator}.csv"
        frame.to_csv(indicator_path, index=False)
        LOGGER.info("Saved %s rows to %s", len(frame), indicator_path)
        if combined is None:
            combined = frame
        else:
            combined = combined.merge(frame, on=["iso3", "country", "year"], how="outer")
    metadata = fetch_world_bank_metadata()
    metadata_path = output_dir / "world_bank_country_metadata.csv"
    metadata.to_csv(metadata_path, index=False)
    LOGGER.info("Saved metadata for %s countries to %s", len(metadata), metadata_path)
    if combined is None:
        raise RuntimeError("No indicators downloaded")
    combined_path = output_dir / "world_bank_combined.csv"
    combined.to_csv(combined_path, index=False)
    LOGGER.info("Persisted combined indicator table to %s", combined_path)
    manifest = {
        "indicators": list(indicators),
        "start_year": start_year,
        "end_year": end_year,
        "rows": len(combined),
    }
    manifest_path = output_dir / "world_bank_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    LOGGER.info("Wrote manifest to %s", manifest_path)
    return combined_path


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Download datasets required for the SASB air-quality analysis.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/raw"),
        help="Directory where raw downloads will be stored (default: data/raw).",
    )
    parser.add_argument("--start-year", type=int, default=DEFAULT_START_YEAR)
    parser.add_argument("--end-year", type=int, default=DEFAULT_END_YEAR)
    parser.add_argument(
        "--indicators",
        nargs="*",
        default=list(WORLD_BANK_INDICATORS.keys()),
        help="Optional subset of World Bank indicator codes to download.",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    download_world_bank_indicators(
        output_dir=args.output_dir,
        indicators=args.indicators,
        start_year=args.start_year,
        end_year=args.end_year,
    )


if __name__ == "__main__":
    main()
