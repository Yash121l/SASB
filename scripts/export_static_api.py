import json
import shutil
import sys
from pathlib import Path
from datetime import datetime

# Add project root to sys.path to import app.backend
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

# Mock app state store loading since we can't easily run the full startup event without uvicorn
from app.backend.main import load_dataset_store, _frame_to_records, _categorise_pm25, _compute_clusters

print("Initializing dataset store...")
store = load_dataset_store()

# Define output directory
PUBLIC_DIR = PROJECT_ROOT / "app" / "frontend" / "public"
DATA_DIR = PUBLIC_DIR / "data"
FIGURES_DIR = PUBLIC_DIR / "figures"
DATA_DIR.mkdir(parents=True, exist_ok=True)
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

def save_json(filename, data):
    path = DATA_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {filename}")

# Export Meta
print("Exporting Meta...")
save_json("meta.json", store["meta"])

# Export Highlights
print("Exporting Highlights...")
save_json("highlights.json", store["highlights"])

# Export Global Trends
print("Exporting Global Trends...")
global_trends = _frame_to_records(store["global_trends"])
save_json("global-trends.json", {"data": global_trends})

# Export Region Trends
print("Exporting Region Trends...")
region_trends = _frame_to_records(store["region_trends"])
save_json("region-trends.json", {"data": region_trends})

# Export Top Polluted Countries
print("Exporting Top Polluted Countries...")
summary = store["summary"].dropna(subset=["pm25_mean"])
ranked_desc = summary.sort_values("pm25_mean", ascending=False).head(6) # Dashboard uses 6
top_columns = [
    "iso3", "country_name", "region", "income_group",
    "pm25_mean", "pm25_latest", "pm25_peak", "pm25_trend"
]
save_json("top-polluted.json", {"data": _frame_to_records(ranked_desc, columns=top_columns)})

# Export Cleanest Countries
print("Exporting Cleanest Countries...")
ranked_asc = summary.sort_values("pm25_mean", ascending=True).head(6) # Dashboard uses 6
save_json("cleanest.json", {"data": _frame_to_records(ranked_asc, columns=top_columns)})

# Export Fastest Improving Countries
print("Exporting Fastest Improving...")
ranked_improving = summary.sort_values("pm25_trend").head(4) # Dashboard uses 4 (in metric)? No, table uses 6 if requested? The metric cards use top 1
save_json("fastest-improving.json", {"data": _frame_to_records(ranked_improving, columns=top_columns)}) # Just dumping enough data

# Export GDP vs PM2.5 (All Years Master File)
print("Exporting GDP vs PM2.5 Master File...")
panel = store["panel"]
gdp_columns = [
    "year", "iso3", "country_name", "region", "income_group",
    "pm25_exposure", "gdp_per_capita_constant_2015usd", "urban_population_pct"
]
gdp_data = _frame_to_records(panel.dropna(subset=["pm25_exposure", "gdp_per_capita_constant_2015usd"]), columns=gdp_columns)
save_json("gdp-vs-pm25-all.json", {"data": gdp_data})

# Export City Leaderboard
print("Exporting City Leaderboard...")
city_leaderboard = store["city_leaderboard"]
ranked_cities = city_leaderboard.sort_values("avg_pm25", ascending=False).head(10)
city_cols = ["country", "city", "years", "avg_pm25", "avg_pm10", "avg_no2"]
save_json("city-leaderboard.json", {"data": _frame_to_records(ranked_cities, columns=city_cols)})

# Export City Options
print("Exporting City Options...")
city_options_df = city_leaderboard.sort_values("avg_pm25", ascending=False).head(12)
city_options = [
    {"city": row["city"], "country": row["country"], "avg_pm25": row["avg_pm25"]}
    for row in city_options_df.to_dict(orient="records")
]
save_json("city-options.json", {"data": city_options})

# Export Seasonal Profiles (Master File)
print("Exporting Seasonal Profiles Master File...")
seasonal = store["seasonal"]
seasonal_data = _frame_to_records(seasonal)
save_json("seasonal-profiles-all.json", {"data": seasonal_data})

# Export Correlations
print("Exporting Correlations...")
save_json("correlations.json", store["correlations"])

# Export Model Metrics
print("Exporting Model Metrics...")
save_json("model-metrics.json", store["model_metrics"])

# Export Pollutant Heatmap
print("Exporting Pollutant Heatmap...")
matrix = store["pollutant_corr"]
if not matrix.empty:
    save_json("pollutant-correlation.json", {"labels": list(matrix.columns), "matrix": matrix.values.tolist()})

# Export Resources
print("Exporting Resources...")
save_json("resources.json", {"data": store["resources"]})

# Export Policy Model Coefficients (for client-side prediction)
print("Exporting Policy Model Coefficients...")
policy_model = store.get("policy_model")
if policy_model:
    estimator = policy_model["estimator"]
    coeffs = {
        "intercept": estimator.intercept_,
        "coefficients": list(estimator.coef_),
        "features": policy_model["feature_cols"],
        "stats": policy_model["stats"] # min/max ranges for inputs
    }
    save_json("policy-model.json", coeffs)

# Export Clustering Analysis (Pre-computed for 4 clusters)
print("Exporting Clustering Analysis (k=4)...")
clusters = _compute_clusters(panel, n_clusters=4)
save_json("clustering-k4.json", clusters)


# Copy Figures
print("Copying HTML Figures...")
SOURCE_FIG_DIR = PROJECT_ROOT / "results" / "figures"
if SOURCE_FIG_DIR.exists():
    for file in SOURCE_FIG_DIR.glob("*.html"):
        shutil.copy2(file, FIGURES_DIR / file.name)
        print(f"Copied {file.name}")
else:
    print("Warning: results/figures/ directory not found.")

print("Export Complete.")
