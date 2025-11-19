from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_country_panel_has_expected_columns():
    panel_path = PROJECT_ROOT / "data" / "processed" / "country_air_quality_panel.csv"
    assert panel_path.exists(), "Run src.data.preprocess before executing tests."
    panel = pd.read_csv(panel_path)
    required = {
        "iso3",
        "country_name",
        "year",
        "pm25_exposure",
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "communicable_disease_death_pct",
    }
    assert required.issubset(set(panel.columns))
    assert panel["year"].min() <= 2004
    assert panel["year"].max() >= 2019
    assert panel["pm25_exposure"].between(0, 400).all()


def test_openaq_city_table_contains_pollutants():
    city_path = PROJECT_ROOT / "data" / "processed" / "openaq_city_year_wide.csv"
    assert city_path.exists(), "OpenAQ wide table missing."
    city = pd.read_csv(city_path)
    assert "avg_pm25" in city.columns
    assert city["avg_pm25"].notna().sum() > 0
