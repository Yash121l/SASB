from __future__ import annotations

from fastapi.testclient import TestClient

from app.backend.main import app


def test_health_endpoint_returns_meta() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
        payload = response.json()
        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert "meta" in payload
        assert payload["meta"]["country_count"] > 0


def test_gdp_vs_pm25_endpoint_responds_for_latest_year() -> None:
    with TestClient(app) as client:
        meta_resp = client.get("/api/meta")
        latest_year = meta_resp.json()["latest_year"]
        resp = client.get(f"/api/gdp-vs-pm25?year={latest_year}")
        data = resp.json()
        assert resp.status_code == 200
        assert data["year"] == latest_year
        assert len(data["data"]) > 0


def test_seasonal_profile_available_for_top_city() -> None:
    with TestClient(app) as client:
        options_resp = client.get("/api/cities/options?limit=1")
        options = options_resp.json()["data"]
        if not options:
            return
        option = options[0]
        seasonal_resp = client.get(
            "/api/seasonal-profile",
            params={"city": option["city"], "country": option["country"]},
        )
        assert seasonal_resp.status_code == 200
        payload = seasonal_resp.json()
        assert payload["data"], "Seasonal payload should not be empty"


def test_policy_simulator_returns_prediction() -> None:
    with TestClient(app) as client:
        meta = client.get("/api/meta").json()
        defaults = meta["policy_defaults"]
        resp = client.get(
            "/api/policy-simulate",
            params={
                "gdp_per_capita": defaults["gdp_per_capita"],
                "urban_population_pct": defaults["urban_population_pct"],
                "communicable_disease_death_pct": defaults["communicable_disease_death_pct"],
            },
        )
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["predicted_pm25"] > 0
        assert payload["category"]


def test_resources_endpoint_lists_links() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/resources")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert isinstance(data, list) and data
        assert {"title", "url"}.issubset(data[0].keys())
