"""
Analytical entrypoint for the SASB air-quality project.

Running this module will:
1. Compute descriptive statistics answering the project research questions.
2. Train a predictive model that estimates PM2.5 exposure from socioeconomic covariates.
3. Generate interactive Plotly visualisations + CSV/JSON artifacts in ``results``.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import plotly.express as px
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
RESULTS_FIG_DIR = PROJECT_ROOT / "results" / "figures"
RESULTS_REP_DIR = PROJECT_ROOT / "results" / "reports"


def _ensure_dirs() -> None:
    RESULTS_FIG_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_REP_DIR.mkdir(parents=True, exist_ok=True)


def load_datasets() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    panel = pd.read_csv(PROCESSED_DIR / "country_air_quality_panel.csv")
    summary = pd.read_csv(PROCESSED_DIR / "country_air_quality_summary.csv")
    openaq_city = pd.read_csv(PROCESSED_DIR / "openaq_city_year_wide.csv")
    return panel, summary, openaq_city


def describe_pm25_leaders(summary: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    leaders = summary.sort_values("pm25_mean", ascending=False).head(10)
    improvers = summary.sort_values("pm25_trend").head(10)
    leaders.to_csv(RESULTS_REP_DIR / "top_polluted_countries.csv", index=False)
    improvers.to_csv(RESULTS_REP_DIR / "fastest_improving_countries.csv", index=False)
    return leaders, improvers


def describe_global_trends(panel: pd.DataFrame) -> pd.DataFrame:
    yearly = panel.groupby("year").agg(
        global_pm25=("pm25_exposure", "mean"),
        avg_gdp=("gdp_per_capita_constant_2015usd", "mean"),
        avg_urban=("urban_population_pct", "mean"),
    )
    yearly = yearly.reset_index()
    yearly.to_csv(RESULTS_REP_DIR / "global_yearly_summary.csv", index=False)
    return yearly


def create_visualizations(panel: pd.DataFrame, openaq_city: pd.DataFrame) -> List[Path]:
    figures: List[Path] = []
    region_year = panel.groupby(["region", "year"])["pm25_exposure"].mean().reset_index()
    fig_global = px.line(
        region_year,
        x="year",
        y="pm25_exposure",
        color="region",
        title="Regional PM2.5 exposure (2004-2023)",
        labels={"pm25_exposure": "PM2.5 (µg/m³)", "region": "Region"},
    )
    path_global = RESULTS_FIG_DIR / "regional_pm25_trends.html"
    fig_global.write_html(path_global)
    figures.append(path_global)

    choropleth = px.choropleth(
        panel,
        locations="iso3",
        color="pm25_exposure",
        hover_name="country_name",
        animation_frame="year",
        color_continuous_scale="YlOrRd",
        range_color=(panel["pm25_exposure"].min(), panel["pm25_exposure"].max()),
        title="Global PM2.5 exposure choropleth (interactive slider)",
    )
    path_choro = RESULTS_FIG_DIR / "pm25_choropleth.html"
    choropleth.write_html(path_choro)
    figures.append(path_choro)

    scatter = px.scatter(
        panel,
        x="gdp_per_capita_constant_2015usd",
        y="pm25_exposure",
        color="region",
        size="urban_population_pct",
        hover_name="country_name",
        animation_frame="year",
        labels={
            "gdp_per_capita_constant_2015usd": "GDP per capita (2015 USD)",
            "pm25_exposure": "PM2.5 (µg/m³)",
            "urban_population_pct": "Urban population (%)",
        },
        title="GDP vs PM2.5 with urbanization as bubble size",
    )
    path_scatter = RESULTS_FIG_DIR / "gdp_vs_pm25.html"
    scatter.write_html(path_scatter)
    figures.append(path_scatter)

    seasonal_data = pd.read_csv(PROCESSED_DIR / "openaq_city_seasonal_profiles.csv")
    # Pick top 8 polluted cities based on mean PM2.5 observations
    city_rank = (
        openaq_city[["country", "city", "avg_pm25"]]
        .dropna(subset=["avg_pm25"])
        .groupby(["country", "city"])
        .mean(numeric_only=True)
        .reset_index()
        .sort_values("avg_pm25", ascending=False)
        .head(8)
    )
    seasonal_focus = seasonal_data.merge(city_rank[["country", "city"]], on=["country", "city"], how="inner")
    seasonal_fig = px.bar(
        seasonal_focus,
        x="season",
        y="seasonal_avg",
        color="pollutant",
        facet_col="city",
        facet_col_wrap=4,
        title="Seasonal pollution patterns for high-burden cities",
        labels={"seasonal_avg": "Average concentration (µg/m³)"},
    )
    path_seasonal = RESULTS_FIG_DIR / "seasonal_patterns.html"
    seasonal_fig.write_html(path_seasonal)
    figures.append(path_seasonal)
    return figures


def correlation_diagnostics(panel: pd.DataFrame) -> Dict[str, float]:
    correlations = {
        "pm25_gdp_corr": panel["pm25_exposure"].corr(panel["gdp_per_capita_constant_2015usd"]),
        "pm25_urban_corr": panel["pm25_exposure"].corr(panel["urban_population_pct"]),
        "pm25_health_corr": panel["pm25_exposure"].corr(panel["communicable_disease_death_pct"]),
        "delta_pm25_delta_health_corr": panel["pm25_exposure_yoy_delta"].corr(
            panel["communicable_disease_death_pct_yoy_delta"]
        ),
    }
    (RESULTS_REP_DIR / "correlations.json").write_text(json.dumps(correlations, indent=2))
    return correlations


def train_predictive_model(panel: pd.DataFrame) -> Dict[str, float]:
    model_panel = panel.copy()
    model_panel["pm25_lag_1"] = model_panel.groupby("iso3")["pm25_exposure"].shift(1)
    feature_cols = [
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "communicable_disease_death_pct",
        "gdp_per_capita_constant_2015usd_yoy_delta",
        "urban_population_pct_yoy_delta",
        "communicable_disease_death_pct_yoy_delta",
        "pm25_lag_1",
    ]
    model_df = model_panel[["pm25_exposure", "region", "income_group"] + feature_cols].dropna()
    model_df = pd.get_dummies(model_df, columns=["region", "income_group"], drop_first=True)
    y = model_df["pm25_exposure"]
    X = model_df.drop(columns=["pm25_exposure"])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(random_state=42, n_estimators=600, max_depth=12, min_samples_leaf=3, n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = {
        "rmse": math.sqrt(mean_squared_error(y_test, preds)),
        "mae": mean_absolute_error(y_test, preds),
        "r2": r2_score(y_test, preds),
    }
    importances = sorted(zip(X.columns, model.feature_importances_), key=lambda kv: kv[1], reverse=True)
    payload = {"metrics": metrics, "top_features": importances[:10]}
    (RESULTS_REP_DIR / "model_performance.json").write_text(json.dumps(payload, indent=2))
    return metrics


def city_insights(openaq_city: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    city_rank = (
        openaq_city.groupby(["country", "city"])
        .agg(avg_pm25=("avg_pm25", "mean"), avg_pm10=("avg_pm10", "mean"), n_years=("year", "nunique"))
        .reset_index()
        .sort_values("avg_pm25", ascending=False)
    )
    city_rank.head(25).to_csv(RESULTS_REP_DIR / "top_cities_pm25.csv", index=False)
    cleanest = city_rank.sort_values("avg_pm25").head(25)
    cleanest.to_csv(RESULTS_REP_DIR / "cleanest_cities_pm25.csv", index=False)

    pollutant_cols = [col for col in openaq_city.columns if col.startswith("avg_")]
    corr_matrix = openaq_city[pollutant_cols].corr()
    corr_path = RESULTS_REP_DIR / "openaq_pollutant_correlations.csv"
    corr_matrix.to_csv(corr_path)
    return city_rank.head(25), cleanest


def main() -> None:
    _ensure_dirs()
    panel, summary, openaq_city = load_datasets()
    describe_pm25_leaders(summary)
    describe_global_trends(panel)
    create_visualizations(panel, openaq_city)
    correlation_diagnostics(panel)
    train_predictive_model(panel)
    city_insights(openaq_city)


if __name__ == "__main__":
    main()
