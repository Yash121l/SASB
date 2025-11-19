## 1. Problem Understanding & Research Objectives

Air quality inequality is both an environmental justice and economic productivity problem. Anchored in the literature review (`docs/literature_review.md`), we framed our analysis around three theoretical pillars:

1. **Environmental Kuznets deviations:** Several recent papers (Sager, 2025; Xu et al., 2025) show that PM2.5 inequality now exceeds income inequality, implying structural rather than cyclical drivers.
2. **Health externalities:** WHO’s Global Health Estimates tie particulate spikes directly to cardiopulmonary mortality, motivating our inclusion of the `SH.DTH.COMM.ZS` indicator.
3. **Urban form paradox:** Rapid urbanisation can either worsen or alleviate pollution depending on infrastructure, so we explicitly test the interaction between `SP.URB.TOTL.IN.ZS` and PM2.5 trends.

**Primary research questions (aligned with the course brief):**

- Which countries and cities recorded the highest and lowest average PM2.5 values during 2004‑2020?
- Do economies with higher urban population shares always experience higher pollution than rural peers?
- How has air quality evolved globally and by region, and can we animate those changes interactively?
- What is the elasticity between GDP per capita and PM2.5? Between PM2.5 and communicable-disease mortality?
- Are there seasonal (winter vs summer) spikes, and how do pollutant families co-move?
- Can we predict next-year PM2.5 exposure given socioeconomic signals plus historical pollution?

## 2. Work Planning, Roles & Consistency

| Phase | Timeline | Leader | Focus | Evidence |
|-------|----------|--------|-------|----------|
| Phase 1 | Weeks 1‑3 | Yash Lunawat | Repository scaffolding, data source contracts, tooling decisions | `README.md` overview, `requirements.txt`, git history |
| Phase 2 | Weeks 4‑6 | Deepanshu Mehta | ETL scripts, preprocessing logic, documentation & Git hygiene | `src/data/*.py`, `docs/methodology.md`, meeting notes |
| Phase 3 | Weeks 7‑9 | Rishabh Gusain | Research synthesis, visualization planning, literature contextualisation | `docs/literature_review.md`, `results/figures` planning |
| Phase 4 | Weeks 10‑12 | Shared | Integration, predictive modelling, storytelling, QA | `src/analysis/analyze.py`, `results/reports/analysis_report.md`, `pytest` logs |

Supporting practices:

- **Rotating leadership handoffs:** Each phase starts with a status memo + 1‑hour transition call (documented in `docs/meeting_notes/`).
- **Task tracking:** GitHub Projects board with 2‑4 hour work items, daily updates, and review gates.
- **Contribution log:** Maintained in README for auditability; commits are attributed via personal GitHub handles to satisfy the “consistency” rubric.

## 3. Data Sources & Pre-processing Strategy

| Step | Description | Automation |
|------|-------------|------------|
| **World Bank ingestion** | `src/data/collect.py` downloads PM2.5 exposure, GDP per capita (constant 2015 USD), urban population %, and communicable-disease mortality for all ISO3 codes between 2004‑2023, plus region/income metadata. | CLI (`python3 -m src.data.collect`) with retries + manifest logging. |
| **OpenAQ snapshot** | Lightweight clone of the Kaggle-hosted OpenAQ export (original API measurements between 2007‑2019). | `git clone --depth=1 https://github.com/songhaoli/OpenAQ data/external/openaq-kaggle` |
| **Cleaning & feature engineering** | `src/data/preprocess.py` ffill/bfill gaps per country, produces YOY deltas, rolling means, log-GDP feature, urbanisation tiers, and summary statistics. OpenAQ data is aggregated into city-year pollutant tables, seasonal profiles, and a pollutant correlation matrix. | CLI (`python3 -m src.data.preprocess`) writing to `data/processed/`. |
| **Quality gates** | `tests/test_data_processing.py` validates schema, ranges, and availability of PM2.5 columns before downstream analysis. | `python3 -m pytest` (part of CI checklist). |

Missing data handling: forward/backward fill within each country sequence preserves trend continuity without imputing across geo units. Outliers are handled analytically (we keep them but track them via percentile stats because they signal policy-relevant spikes).

## 4. Innovative Hypotheses & Exploratory Angles

1. **Urban tipping point:** Instead of assuming monotonic effects, we hypothesise that PM2.5 decreases after ~70% urbanisation due to public transit density. Tested via quartile splits plus regression slopes.
2. **Health elasticity to pollution change, not levels:** We correlate YoY PM2.5 deltas with YoY changes in communicable-disease deaths to see whether abrupt improvements translate into immediate health benefits.
3. **Seasonal fingerprinting:** By building four-season aggregates per city, we test whether South Asian winter spikes differ in magnitude compared to Southern Hemisphere heating seasons.
4. **Multi-pollutant clustering:** Using OpenAQ’s multi-parameter coverage we compute pollutant correlation matrices to identify coupled pollutants (PM2.5/PM10/BC vs oxidants).
5. **Predictive uplift from socioeconomic signals:** Random Forest models test whether GDP/urban/health covariates materially improve next-year PM2.5 prediction beyond lagged pollution alone.

## 5. Research Methodology

### 5.1 Exploratory Data Analysis

- **Global + regional timelines:** Animated choropleth (`results/figures/pm25_choropleth.html`) and line charts highlight shifts in exposure inequality.
- **Country rankings & trajectory slopes:** Generated via `results/reports/top_polluted_countries.csv` and `fastest_improving_countries.csv`, referencing slope calculations in `src/data/preprocess.py`.
- **City micro-views:** `results/reports/top_cities_pm25.csv` plus seasonal bar grids reveal micro-patterns and help connect OpenAQ data to macro policy debates.
- **Correlation diagnostics:** `results/reports/correlations.json` quantifies GDP, urbanisation, and health linkages; `openaq_pollutant_correlations.csv` surfaces pollutant clusters.

### 5.2 Predictive / Descriptive Analysis

- **Model selection:** RandomForestRegressor (`src/analysis/analyze.py`) with 600 estimators, depth cap 12, lag features, and one-hot region/income controls.
- **Validation:** 80/20 stratified split; metrics stored in `results/reports/model_performance.json` (current RMSE ≈ 3.0 µg/m³, MAE ≈ 1.57 µg/m³, R² ≈ 0.97).
- **Interpretability:** Feature importance export + correlation diagnostics ensure transparency before stakeholders consider scenario planning.

### 5.3 Visualisation Plan

- **Interactive slider** for animation across 2004‑2020, fulfilling the “effective interactive visualisation” requirement.
- **Bubble scatter** linking GDP, PM2.5, and urbanisation to answer the urban vs rural hypothesis.
- **Seasonal facets** to compare hemispheres and pollutant mixes.

## 6. Consistency & Evidence of Effort

- Every stage emits tangible artifacts (`data/processed`, `results/reports`, dashboards).
- Meeting notes (e.g., `docs/meeting_notes/2024-11-19.md`) document attendance, blockers, and assignments.
- Git commits are attributed to individual usernames, and the README contribution log ties dates → hours → commit hashes.

This methodology ensures alignment with the grading rubric: organised planning, deep problem understanding, robust preprocessing, innovative hypotheses, literature-backed methodology, and auditable contributions.
