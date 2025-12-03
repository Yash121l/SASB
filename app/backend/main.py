"""FastAPI backend serving processed air-quality insights to the web dashboard."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORTS_DIR = PROJECT_ROOT / "results" / "reports"

LOGGER = logging.getLogger(__name__)

RESOURCE_LINKS = [
    {
        "title": "World Bank PM2.5 Exposure (EN.ATM.PM25.MC.M3)",
        "type": "Dataset",
        "url": "https://data.worldbank.org/indicator/EN.ATM.PM25.MC.M3",
        "description": "Country-level PM2.5 exposure used for longitudinal analysis (2004-2023).",
    },
    {
        "title": "World Bank GDP per Capita (NY.GDP.PCAP.KD)",
        "type": "Dataset",
        "url": "https://data.worldbank.org/indicator/NY.GDP.PCAP.KD",
        "description": "Economic covariate (constant 2015 USD) powering GDP-versus-air-quality exploration.",
    },
    {
        "title": "World Bank Urban Population Share (SP.URB.TOTL.IN.ZS)",
        "type": "Dataset",
        "url": "https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS",
        "description": "Urbanisation lens to compare rural/urban exposure contrasts.",
    },
    {
        "title": "World Bank Communicable Disease Mortality (SH.DTH.COMM.ZS)",
        "type": "Dataset",
        "url": "https://data.worldbank.org/indicator/SH.DTH.COMM.ZS",
        "description": "Proxy for health-system stress co-moving with air quality.",
    },
    {
        "title": "OpenAQ City-Level Measurements",
        "type": "Dataset",
        "url": "https://explore.openaq.org/",
        "description": "Hourly pollutant readings (PM2.5, PM10, NO2, O3, CO, BC) aggregated into city-year panels.",
    },
    {
        "title": "Analysis Narrative",
        "type": "Report",
        "url": "https://github.com/Yash121l/SASB/blob/main/results/reports/analysis_report.md",
        "description": "Full methodology, findings, limitations, and verification checklist.",
    },
    {
        "title": "Interactive Figures",
        "type": "Dashboard",
        "url": "https://github.com/Yash121l/SASB/tree/main/results/figures",
        "description": "Plotly HTML exports: regional trends, choropleth sliders, GDP vs PM2.5, seasonal patterns.",
    },
]


def _require_artifacts() -> Dict[str, Path]:
    paths = {
        "panel": PROCESSED_DIR / "country_air_quality_panel.csv",
        "summary": PROCESSED_DIR / "country_air_quality_summary.csv",
        "city": PROCESSED_DIR / "openaq_city_year_wide.csv",
        "seasonal": PROCESSED_DIR / "openaq_city_seasonal_profiles.csv",
        "model_metrics": REPORTS_DIR / "model_performance.json",
    }
    missing = [str(path) for path in paths.values() if not path.exists()]
    if missing:
        raise RuntimeError(
            "Missing processed artifacts required by the API. Run the pipeline first.\n"
            f"Missing files: {'; '.join(missing)}"
        )
    return paths


def _frame_to_records(frame: pd.DataFrame, columns: List[str] | None = None) -> List[Dict[str, Any]]:
    subset = frame[columns] if columns else frame
    return json.loads(subset.to_json(orient="records"))


def _compute_region_trends(panel: pd.DataFrame) -> pd.DataFrame:
    region_trends = (
        panel.groupby(["region", "year"], dropna=False)["pm25_exposure"].mean().reset_index()
    )
    region_trends["region"] = region_trends["region"].fillna("Other/Unknown")
    return region_trends.sort_values(["region", "year"])


def _compute_global_trends(panel: pd.DataFrame) -> pd.DataFrame:
    yearly = panel.groupby("year").agg(
        global_pm25=("pm25_exposure", "mean"),
        avg_gdp=("gdp_per_capita_constant_2015usd", "mean"),
        avg_urban=("urban_population_pct", "mean"),
    )
    return yearly.reset_index().sort_values("year")


def _compute_correlations(panel: pd.DataFrame) -> Dict[str, float | None]:
    pairs = {
        "pm25_gdp_corr": ("pm25_exposure", "gdp_per_capita_constant_2015usd"),
        "pm25_urban_corr": ("pm25_exposure", "urban_population_pct"),
        "pm25_health_corr": ("pm25_exposure", "communicable_disease_death_pct"),
        "delta_pm25_delta_health_corr": (
            "pm25_exposure_yoy_delta",
            "communicable_disease_death_pct_yoy_delta",
        ),
    }
    results: Dict[str, float | None] = {}
    for key, (left, right) in pairs.items():
        if left not in panel.columns or right not in panel.columns:
            results[key] = None
            continue
        corr = panel[left].corr(panel[right])
        results[key] = None if pd.isna(corr) else round(float(corr), 4)
    return results


def _compute_highlights(summary: pd.DataFrame) -> Dict[str, Any]:
    highlights: Dict[str, Any] = {}
    if summary.empty:
        return highlights
    ranked = summary.dropna(subset=["pm25_mean"]).sort_values("pm25_mean", ascending=False)
    if not ranked.empty:
        worst = ranked.iloc[0]
        best = ranked.iloc[-1]
        highlights["most_polluted"] = {
            "country": worst["country_name"],
            "pm25_mean": round(float(worst["pm25_mean"]), 2),
            "region": worst.get("region"),
        }
        highlights["cleanest"] = {
            "country": best["country_name"],
            "pm25_mean": round(float(best["pm25_mean"]), 2),
            "region": best.get("region"),
        }
    trend_ready = summary.dropna(subset=["pm25_trend"])
    if not trend_ready.empty:
        improving = trend_ready.sort_values("pm25_trend").iloc[0]
        worsening = trend_ready.sort_values("pm25_trend", ascending=False).iloc[0]
        highlights["fastest_improving"] = {
            "country": improving["country_name"],
            "trend": round(float(improving["pm25_trend"]), 2),
            "region": improving.get("region"),
        }
        highlights["fastest_deteriorating"] = {
            "country": worsening["country_name"],
            "trend": round(float(worsening["pm25_trend"]), 2),
            "region": worsening.get("region"),
        }
    return highlights


def _compute_city_leaderboard(city: pd.DataFrame) -> pd.DataFrame:
    leaderboard = (
        city.groupby(["country", "city"], dropna=False)
        .agg(
            avg_pm25=("avg_pm25", "mean"),
            avg_pm10=("avg_pm10", "mean"),
            avg_no2=("avg_no2", "mean"),
            years=("year", "nunique"),
        )
        .reset_index()
    )
    return leaderboard.dropna(subset=["avg_pm25"])


def _build_meta(panel: pd.DataFrame, summary: pd.DataFrame, city: pd.DataFrame) -> Dict[str, Any]:
    regions = sorted({str(region) for region in panel["region"].dropna().unique()})
    pollutants = sorted(col.replace("avg_", "") for col in city.columns if col.startswith("avg_"))
    feature_cols = [
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "communicable_disease_death_pct",
    ]
    feature_stats = panel[feature_cols].median(numeric_only=True).to_dict()
    return {
        "year_min": int(panel["year"].min()),
        "year_max": int(panel["year"].max()),
        "latest_year": int(panel["year"].max()),
        "country_count": int(summary["iso3"].nunique()),
        "city_count": int(city[["country", "city"]].drop_duplicates().shape[0]),
        "region_count": len(regions),
        "regions": regions,
        "pollutants": pollutants,
        "policy_defaults": {
            "gdp_per_capita": round(float(feature_stats["gdp_per_capita_constant_2015usd"]), 2),
            "urban_population_pct": round(float(feature_stats["urban_population_pct"]), 2),
            "communicable_disease_death_pct": round(float(feature_stats["communicable_disease_death_pct"]), 2),
        },
        "refreshed_at": datetime.utcnow().isoformat(timespec="seconds"),
    }


def _load_model_metrics(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        LOGGER.warning("Failed to parse %s", path)
        return {}


def _train_policy_model(panel: pd.DataFrame) -> Dict[str, Any] | None:
    feature_cols = [
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "communicable_disease_death_pct",
    ]
    model_df = panel[["pm25_exposure", *feature_cols]].dropna()
    if model_df.empty:
        LOGGER.warning("Policy model training skipped – insufficient data")
        return None
    model = LinearRegression()
    X = model_df[feature_cols]
    y = model_df["pm25_exposure"]
    model.fit(X, y)
    return {
        "estimator": model,
        "feature_cols": feature_cols,
        "stats": {
            "min": X.min().to_dict(),
            "max": X.max().to_dict(),
            "median": X.median().to_dict(),
        },
    }


def _compute_clusters(panel: pd.DataFrame, n_clusters: int = 4) -> Dict[str, Any]:
    feature_cols = [
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "pm25_exposure",
        "communicable_disease_death_pct",
    ]
    # Filter for latest year to avoid duplicates per country in clustering
    latest_year = panel["year"].max()
    data = panel[panel["year"] == latest_year].dropna(subset=feature_cols).copy()
    
    if data.empty:
        return {}

    X = data[feature_cols]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    data["cluster"] = kmeans.fit_predict(X_scaled)
    
    # Calculate cluster centers in original scale (approximate)
    centers = []
    for i in range(n_clusters):
        cluster_data = data[data["cluster"] == i]
        center_stats = cluster_data[feature_cols].mean().to_dict()
        center_stats["cluster_id"] = i
        center_stats["size"] = int(len(cluster_data))
        centers.append(center_stats)

    return {
        "data": _frame_to_records(data, columns=["iso3", "country_name", "region", "cluster", *feature_cols]),
        "centers": centers,
        "features": feature_cols
    }


def _compute_elbow(panel: pd.DataFrame) -> Dict[str, List[float]]:
    feature_cols = [
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
        "pm25_exposure",
        "communicable_disease_death_pct",
    ]
    latest_year = panel["year"].max()
    data = panel[panel["year"] == latest_year].dropna(subset=feature_cols).copy()
    
    if data.empty:
        return {"k": [], "inertia": []}

    X = data[feature_cols]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    inertias = []
    k_values = list(range(1, 11))
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        inertias.append(float(kmeans.inertia_))
        
    return {"k": k_values, "inertia": inertias}


def _categorise_pm25(value: float) -> str:
    if value < 12:
        return "Good"
    if value < 35:
        return "Moderate"
    if value < 55:
        return "Unhealthy for Sensitive Groups"
    if value < 150:
        return "Unhealthy"
    return "Hazardous"


def load_dataset_store() -> Dict[str, Any]:
    paths = _require_artifacts()
    panel = pd.read_csv(paths["panel"])
    summary = pd.read_csv(paths["summary"])
    city = pd.read_csv(paths["city"])
    seasonal = pd.read_csv(paths["seasonal"])

    region_trends = _compute_region_trends(panel)
    global_trends = _compute_global_trends(panel)
    correlations = _compute_correlations(panel)
    highlights = _compute_highlights(summary)
    city_leaderboard = _compute_city_leaderboard(city)
    pollutant_cols = [col for col in city.columns if col.startswith("avg_")]
    pollutant_corr = city[pollutant_cols].corr().round(4) if pollutant_cols else pd.DataFrame()
    meta = _build_meta(panel, summary, city)
    model_metrics = _load_model_metrics(paths["model_metrics"])
    policy_model = _train_policy_model(panel)
    if policy_model:
        meta["policy_stats"] = policy_model["stats"]

    return {
        "panel": panel,
        "summary": summary,
        "city": city,
        "seasonal": seasonal,
        "region_trends": region_trends,
        "global_trends": global_trends,
        "correlations": correlations,
        "highlights": highlights,
        "city_leaderboard": city_leaderboard,
        "pollutant_corr": pollutant_corr,
        "meta": meta,
        "model_metrics": model_metrics,
        "policy_model": policy_model,
        "resources": RESOURCE_LINKS,
    }


app = FastAPI(title="Air Quality Intelligence API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    try:
        app.state.store = load_dataset_store()
    except Exception as exc:  # pragma: no cover - startup failure surfaces in logs
        LOGGER.exception("Failed to bootstrap dataset store: %s", exc)
        raise


def _get_store() -> Dict[str, Any]:
    store = getattr(app.state, "store", None)
    if store is None:
        raise HTTPException(status_code=500, detail="Dataset store not initialised. Run the pipeline and restart API.")
    return store


@app.get("/health")
def healthcheck() -> Dict[str, Any]:
    store = _get_store()
    meta = store["meta"]
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(timespec="seconds"),
        "meta": meta,
    }


@app.get("/api/meta")
def meta() -> Dict[str, Any]:
    return _get_store()["meta"]


@app.get("/api/highlights")
def highlights() -> Dict[str, Any]:
    return _get_store()["highlights"]


@app.get("/api/global-trends")
def global_trends() -> Dict[str, Any]:
    data = _frame_to_records(_get_store()["global_trends"])
    return {"data": data}


@app.get("/api/region-trends")
def region_trends() -> Dict[str, Any]:
    data = _frame_to_records(_get_store()["region_trends"])
    return {"data": data}


@app.get("/api/countries/top-polluted")
def top_polluted_countries(
    limit: int = Query(10, ge=1, le=50),
    order: str = Query("desc"),
) -> Dict[str, Any]:
    if order.lower() not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="Order must be 'asc' or 'desc'.")
    summary = _get_store()["summary"].dropna(subset=["pm25_mean"])
    ascending = order.lower() == "asc"
    ranked = summary.sort_values("pm25_mean", ascending=ascending).head(limit)
    columns = [
        "iso3",
        "country_name",
        "region",
        "income_group",
        "pm25_mean",
        "pm25_latest",
        "pm25_peak",
        "pm25_trend",
    ]
    return {"data": _frame_to_records(ranked, columns=columns)}


@app.get("/api/countries/fastest-improving")
def fastest_improving_countries(limit: int = Query(10, ge=1, le=50)) -> Dict[str, Any]:
    summary = _get_store()["summary"].dropna(subset=["pm25_trend"])
    ranked = summary.sort_values("pm25_trend").head(limit)
    columns = [
        "iso3",
        "country_name",
        "region",
        "income_group",
        "pm25_trend",
        "pm25_mean",
        "pm25_latest",
    ]
    return {"data": _frame_to_records(ranked, columns=columns)}


@app.get("/api/gdp-vs-pm25")
def gdp_vs_pm25(year: int | None = Query(None)) -> Dict[str, Any]:
    store = _get_store()
    panel = store["panel"]
    chosen_year = year if year is not None else int(store["meta"]["latest_year"])
    if chosen_year < int(store["meta"]["year_min"]) or chosen_year > int(store["meta"]["year_max"]):
        raise HTTPException(status_code=400, detail="Year outside available range.")
    subset = panel[panel["year"] == chosen_year]
    if subset.empty:
        raise HTTPException(status_code=404, detail="No data for requested year.")
    columns = [
        "iso3",
        "country_name",
        "region",
        "income_group",
        "pm25_exposure",
        "gdp_per_capita_constant_2015usd",
        "urban_population_pct",
    ]
    records = _frame_to_records(subset, columns=columns)
    return {"year": chosen_year, "data": records}


@app.get("/api/cities/leaderboard")
def city_leaderboard(
    metric: str = Query("avg_pm25"),
    limit: int = Query(10, ge=1, le=50),
    order: str = Query("desc"),
) -> Dict[str, Any]:
    leaderboard = _get_store()["city_leaderboard"]
    if metric not in leaderboard.columns:
        raise HTTPException(status_code=400, detail=f"Metric '{metric}' is unavailable.")
    if order.lower() not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="Order must be 'asc' or 'desc'.")
    ranked = leaderboard.sort_values(metric, ascending=(order.lower() == "asc")).head(limit)
    columns = ["country", "city", "years", "avg_pm25", "avg_pm10", "avg_no2"]
    return {"data": _frame_to_records(ranked, columns=columns)}


@app.get("/api/cities/options")
def city_options(limit: int = Query(12, ge=1, le=50)) -> Dict[str, Any]:
    leaderboard = _get_store()["city_leaderboard"].sort_values("avg_pm25", ascending=False).head(limit)
    options = [
        {"city": row["city"], "country": row["country"], "avg_pm25": row["avg_pm25"]}
        for row in leaderboard.to_dict(orient="records")
    ]
    return {"data": options}


@app.get("/api/seasonal-profile")
def seasonal_profile(city: str, country: str) -> Dict[str, Any]:
    seasonal = _get_store()["seasonal"]
    mask = (seasonal["city"].str.lower() == city.lower()) & (seasonal["country"].str.lower() == country.lower())
    subset = seasonal[mask]
    if subset.empty:
        raise HTTPException(status_code=404, detail="Seasonal profile not found for the requested city.")
    return {"city": city, "country": country, "data": _frame_to_records(subset)}


@app.get("/api/correlations")
def correlations() -> Dict[str, Any]:
    return _get_store()["correlations"]


@app.get("/api/model-metrics")
def model_metrics() -> Dict[str, Any]:
    return _get_store()["model_metrics"]


@app.get("/api/pollutants/correlation")
def pollutant_correlation() -> Dict[str, Any]:
    matrix = _get_store()["pollutant_corr"]
    if matrix.empty:
        raise HTTPException(status_code=404, detail="Pollutant correlations unavailable.")
    return {"labels": list(matrix.columns), "matrix": matrix.values.tolist()}


@app.get("/api/resources")
def resources() -> Dict[str, Any]:
    return {"data": _get_store()["resources"]}


@app.get("/api/policy-simulate")
def policy_simulate(
    gdp_per_capita: float = Query(..., gt=0, description="GDP per capita in constant 2015 USD"),
    urban_population_pct: float = Query(..., ge=0, le=100, description="Urban population share (0-100)"),
    communicable_disease_death_pct: float = Query(..., ge=0, le=100, description="Communicable disease deaths (% of total)"),
) -> Dict[str, Any]:
    store = _get_store()
    policy_model = store.get("policy_model")
    if not policy_model:
        raise HTTPException(status_code=503, detail="Policy simulator unavailable – train pipeline first.")
    estimator: LinearRegression = policy_model["estimator"]
    features = [[gdp_per_capita, urban_population_pct, communicable_disease_death_pct]]
    prediction = float(estimator.predict(features)[0])
    category = _categorise_pm25(prediction)
    return {
        "inputs": {
            "gdp_per_capita": gdp_per_capita,
            "urban_population_pct": urban_population_pct,
            "communicable_disease_death_pct": communicable_disease_death_pct,
        },
        "predicted_pm25": round(prediction, 2),
        "category": category,
        "guidance": "Estimates derived from linearised socioeconomic relationships (Random Forest insights).",
    }


@app.get("/api/analysis/clustering")
def clustering_analysis(n_clusters: int = Query(4, ge=2, le=8)) -> Dict[str, Any]:
    store = _get_store()
    panel = store["panel"]
    return _compute_clusters(panel, n_clusters=n_clusters)


@app.get("/api/analysis/elbow")
def elbow_analysis() -> Dict[str, List[float]]:
    store = _get_store()
    panel = store["panel"]
    return _compute_elbow(panel)


@app.get("/api/analysis/elbow")
def elbow_analysis() -> Dict[str, List[float]]:
    store = _get_store()
    panel = store["panel"]
    return _compute_elbow(panel)
