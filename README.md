# Air Quality Intelligence Initiative

## Overview

The SASB air-quality repository investigates how particulate matter exposure varies across economies, time, and socioeconomic conditions. We combine **World Bank PM2.5, GDP, urbanisation, and health burden indicators (2004‑2020)** with a **city-level OpenAQ snapshot (2007‑2019)** to answer the project’s exploratory questions:

- Which countries and cities experience the highest/lowest sustained PM2.5 burdens?
- How have global and regional exposure profiles evolved during the last two decades?
- What is the elasticity between GDP per capita, urbanisation, and pollution?
- Do seasonal and multi-pollutant dynamics reveal distinct fingerprints?
- How strongly do air-quality changes co-move with communicable-disease mortality?
- Can we predict next-year PM2.5 exposure using socioeconomic covariates?

The full analytical narrative (methodology, experiments, findings, limitations, and next steps) lives in `results/reports/analysis_report.md`, while `results/figures/*.html` contains the interactive dashboards (regional trends, choropleth slider, GDP vs PM2.5 bubble chart, and seasonal pollutant grids).

## Data Sources

| Dataset | Description | Coverage | Access Path |
|---------|-------------|----------|-------------|
| **World Bank – PM2.5 exposure (EN.ATM.PM25.MC.M3)** plus GDP, urban population share, communicable disease mortality | Annual country-level panel used for 20-year longitudinal analysis and predictive modelling | 2004‑2020 | `python3 -m src.data.collect` (writes CSVs to `data/raw/`) |
| **OpenAQ Kaggle snapshot** (originally harvested from the OpenAQ API) | City/location measurements for PM2.5, PM10, NO₂, SO₂, CO, O₃, BC with timestamps and coordinates | 2007‑2019 | `git clone --depth=1 https://github.com/songhaoli/OpenAQ data/external/openaq-kaggle` |

Raw assets stay outside of version control (`data/raw/**` and `data/external/**` are ignored). Reproducible, analysis-ready tables are stored under `data/processed/`.

## Project Quickstart

```bash
# 0. (Optional) Orchestrate everything + tests
chmod +x run_pipeline.sh
./run_pipeline.sh

# 1. Install dependencies
python3 -m pip install --user -r requirements.txt

# 2. Acquire World Bank indicators (OpenAQ snapshot command shown in table above)
python3 -m src.data.collect

# 3. Build processed panels + OpenAQ aggregates
python3 -m src.data.preprocess

# 4. Run descriptive + predictive analytics and regenerate Plotly dashboards
python3 -m src.analysis.analyze

# 5. Execute the smoketests
python3 -m pytest

# 6. Launch the FastAPI backend (new app/ layout)
uvicorn app.backend.main:app --reload --port 8000

# 7. Launch the React frontend
cd app/frontend && npm install && npm run dev
```

Use environment flags (`START_YEAR`, `END_YEAR`, `INDICATORS`, `SKIP_*`) with `run_pipeline.sh` to
customise or skip stages during automation.

Key outputs:

- `data/processed/country_air_quality_panel.csv` – master country-year panel with engineered features, YOY deltas, rolling means, and metadata.
- `data/processed/openaq_city_year_wide.csv` – pivoted city-year pollutant matrix plus variability spans.
- `results/reports/*.csv|json` – textual artifacts (rankings, correlations, model metrics).
- `results/figures/*.html` – interactive Plotly visualisations (year sliders + hover tooltips).

## Interactive Web + API Layer

- **FastAPI backend (`app/backend/main.py`):** Serves `/api/*` endpoints for region trends, GDP vs
  PM2.5 slices, country/city leaderboards, pollutant correlation matrices, seasonal fingerprints,
  highlights, the new policy-simulation endpoint, and a research/resources registry. Launch locally
  with `uvicorn app.backend.main:app --reload` and view `http://localhost:8000/health` for status.
- **React frontend (`app/frontend/`):** Vite + React + Plotly dashboard with three routes:
  1. **Insights:** mirrors our exploratory analysis with interactive charts, tables, and correlations.
  2. **Policy Lab:** sliders for GDP, urbanisation, and communicable-disease deaths backed by the
     `/api/policy-simulate` endpoint; surfaces predicted PM2.5 plus WHO-style severity labels.
  3. **Research Hub:** curated links to datasets, reports, figure exports, and cited literature.
  Run via `npm install && npm run dev` (defaults to `http://localhost:4173`) and point the frontend to
  the backend with `VITE_API_BASE_URL` if the services live on different origins.
- **Deployment playbook:** Updated instructions for the new `app/` layout live in
  `docs/deployment.md`.

### Application Directory Snapshot

```
app/
├── backend/
│   ├── __init__.py
│   └── main.py          # FastAPI entrypoint (uvicorn app.backend.main:app)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx      # Routes: Insights, Policy Lab, Research Hub
        ├── pages/
        ├── components/
        └── styles/
```

## Analysis & Design Philosophy

- **Holistic lens:** Pair macro (country-level structural determinants) with micro (city/seasonal pollutant fingerprints) to trace inequality patterns from atmosphere to health outcomes.
- **Transparent pipeline:** Modular scripts (`src/data/collect.py`, `src/data/preprocess.py`, `src/analysis/analyze.py`) with deterministic CLI interfaces and automated smoketests.
- **Explain-first modelling:** Random Forest regression (R² ≈ 0.97, RMSE ≈ 3.0 µg/m³) with feature importance export ensures policy teams can interpret drivers before deploying forecasts.
- **Interactive storytelling:** Figures ship as standalone HTML dashboards so stakeholders can filter by region, drag the time slider, and compare GDP vs PM2.5 bubbles without launching notebooks.

## Key Findings Snapshot

| Theme | Insight |
|-------|---------|
| Highest burdens | Qatar, Niger, Mauritania, Bahrain, and Egypt averaged ≥65 µg/m³ despite slight downward trends. |
| Fastest improvers | Peru and Bolivia cut PM2.5 by >2 µg/m³ per year between 2004‑2020, driven by fuel-switching and industrial controls. |
| Socioeconomic links | Correlations: PM2.5 vs GDP (-0.35), PM2.5 vs urbanisation (-0.36), PM2.5 vs communicable-disease deaths (+0.46). |
| Seasonal signal | North Indian and Chilean cities exhibit winter PM2.5 multiples of 1.8‑2.4× summer levels, confirming heating + inversion effects. |
| Multi-pollutant dynamics | Plotly correlations show PM2.5 closely tracks PM10 and BC, while oxidants (O₃) decouple from particulate spikes. |

Detailed narrative and visual excerpts are compiled inside `results/reports/analysis_report.md`.

## Team Workflow & Evidence of Division

- **Leadership Rotation:** Phase-based ownership (Data Collection → Pre-processing → Analysis → Presentation) documented below.
- **Task tracking:** GitHub board with Backlog → To Do → In Progress → Review → Done columns, updated daily.
- **Contribution ledger:** Weekly notes stored in `docs/meeting_notes/` plus commit metadata (see “Contribution Log” table below).
- **Quality gates:** Every merge requires peer review + successful pytest run; documentation updates accompany code.

# Team Structure & Organization

## 1. Team Composition & Roles

### Current Leadership
- **Project Leader:** Yash Lunawat (yash.l23csai@nst.rishihood.edu.in)
- **Responsibilities:** Overall project coordination, milestone tracking, stakeholder communication, final deliverable quality assurance

### Role Assignments

| Role | Team Member | Primary Responsibilities | Deliverables |
|------|-------------|-------------------------|--------------|
| **Data Collection/Integration** | Yash Lunawat | • Source and acquire air quality datasets (WHO, EPA, OpenAQ)<br>• Integrate multiple data sources<br>• Ensure data completeness and temporal coverage<br>• Document data provenance | • Raw datasets (CSV/JSON)<br>• Data source documentation<br>• Integration scripts |
| **Data Cleaning/Preprocessing** | Deepanshu Mehta | • Handle missing values and outliers<br>• Normalize and standardize data formats<br>• Feature engineering<br>• Create analysis-ready datasets | • Cleaned datasets<br>• Preprocessing pipeline code<br>• Data quality report |
| **Research & Literature Review** | Rishabh Gusain | • Survey existing air quality research<br>• Identify methodological approaches<br>• Document theoretical frameworks<br>• Synthesize findings for context | • Literature review document<br>• Annotated bibliography<br>• Research gap analysis |
| **Visualization Planning** | Rishabh Gusain | • Design visualization strategy<br>• Select appropriate chart types<br>• Plan interactive dashboards<br>• Ensure accessibility and clarity | • Visualization mockups<br>• Dashboard prototypes<br>• Final visualizations |
| **Documentation & Git Management** | Deepanshu Mehta | • Maintain GitHub repository<br>• Write comprehensive README<br>• Document code and processes<br>• Manage version control workflow | • GitHub repository<br>• README and documentation<br>• Commit history and branches |

---

## 2. Rotating Leadership Model

### Leadership Rotation Schedule

**Phase 1 (Weeks 1-3): Yash Lunawat**
- Focus: Project setup, data collection, initial planning
- Key decisions: Data source selection, tool choices, timeline establishment

**Phase 2 (Weeks 4-6): Deepanshu Mehta**
- Focus: Data preprocessing, pipeline development, quality assurance
- Key decisions: Preprocessing strategies, feature selection, data validation

**Phase 3 (Weeks 7-9): Rishabh Gusain**
- Focus: Analysis, visualization, research synthesis
- Key decisions: Visualization approaches, analytical methods, presentation format

**Phase 4 (Weeks 10-12): Rotating/Shared Leadership**
- Focus: Final integration, documentation, presentation preparation
- Key decisions: Final deliverable format, presentation strategy, quality checks

### Leadership Transition Protocol
- **Handoff Meeting:** 1-hour transition meeting at phase boundaries
- **Status Report:** Outgoing leader provides written status summary
- **Priority Setting:** Incoming leader sets priorities for their phase
- **Continuity:** Previous leader remains available for consultation

---

## 3. Task Tracking & Project Management

### Primary Tracking Tools

**1. GitHub Project Board**
- **URL:** [To be created at repository setup]
- **Board Structure:**
  - **Backlog:** All planned tasks
  - **To Do:** Tasks for current sprint/phase
  - **In Progress:** Currently active tasks
  - **Review:** Tasks awaiting peer review
  - **Done:** Completed tasks
- **Task Granularity:** Each task should be completable within 2-4 hours
- **Update Frequency:** Daily updates by task owners

**2. Weekly Sync Meetings**
- **Schedule:** Every Monday, 2:00 PM, 30 minutes
- **Agenda:**
  - Progress updates from each team member (5 min each)
  - Blocker identification and resolution (10 min)
  - Task assignment for upcoming week (10 min)
- **Documentation:** Meeting notes in GitHub wiki

**3. Asynchronous Communication**
- **Platform:** Slack/Discord channel (or email thread)
- **Response Time:** Within 24 hours for non-urgent, 4 hours for urgent
- **Daily Standups:** Optional async updates in shared channel

---

## 4. GitHub Repository Plan

### Repository Structure

```
air-quality-analysis/
├── README.md
├── LICENSE
├── .gitignore
├── requirements.txt
├── data/
│   ├── raw/                 # Original datasets
│   ├── processed/           # Cleaned datasets
│   └── external/            # Third-party data
├── notebooks/
│   ├── 01_data_collection.ipynb
│   ├── 02_data_cleaning.ipynb
│   ├── 03_exploratory_analysis.ipynb
│   └── 04_visualization.ipynb
├── src/
│   ├── data/
│   │   ├── collect.py
│   │   └── preprocess.py
│   ├── analysis/
│   │   └── analyze.py
│   └── visualization/
│       └── visualize.py
├── docs/
│   ├── literature_review.md
│   ├── methodology.md
│   └── meeting_notes/
├── tests/
│   └── test_data_processing.py
└── results/
    ├── figures/
    └── reports/
```

### Branching Strategy
- **main:** Production-ready code, protected branch
- **develop:** Integration branch for features
- **feature/[name]:** Individual feature branches (e.g., feature/data-cleaning)
- **hotfix/[name]:** Urgent fixes to main branch

### Commit Guidelines
- **Format:** `[TYPE] Brief description`
  - **FEAT:** New feature
  - **FIX:** Bug fix
  - **DOCS:** Documentation changes
  - **REFACTOR:** Code refactoring
  - **TEST:** Test additions
- **Example:** `[FEAT] Add WHO data collection script`
- **Frequency:** Commit at logical checkpoints, push daily

### Contribution Tracking Methods

**1. GitHub Insights**
- Use built-in GitHub contributor statistics
- Track commits, additions, deletions per member
- Monitor pull request activity

**2. Contribution Log**

| Date | Member | Contribution | Hours | Evidence (Commit/PR) |
|------|--------|--------------|-------|---------------------|
| 7/11/2025 | Deepanshu | Add initial project files including .gitignore, README, documentation, notebooks, and source scripts | 2 | [Link](https://github.com/Yash121l/SASB/commit/b327ee29488af8f1519f6189e44bbf57208871b0) |
| 7/11/2025 | Yash | Adding README | 1.5 | [Link](https://github.com/Yash121l/SASB/commit/b327ee29488af8f1519f6189e44bbf57208871b0) |

**3. Pull Request Reviews**
- All code changes require at least one peer review
- Reviewer provides constructive feedback
- Author addresses comments before merge
- Tracks engagement and code quality

**4. Weekly Progress Reports**
- Each member submits brief weekly report
- **Template:**
  - Tasks completed this week
  - Challenges encountered
  - Plans for next week
  - Hours invested
- Stored in `docs/progress_reports/`

---

## 5. Collaboration & Communication Norms

### Decision-Making Process
- **Minor decisions:** Individual team members can decide within their role
- **Major decisions:** Require team discussion and consensus (e.g., changing project scope)
- **Deadlock resolution:** Current phase leader has tie-breaking authority

### Conflict Resolution
- **Step 1:** Direct communication between involved parties
- **Step 2:** Mediation by current phase leader
- **Step 3:** Escalation to instructor/advisor if unresolved

### Quality Standards
- **Code:** PEP 8 compliance for Python, documented functions
- **Documentation:** Clear, concise, audience-appropriate
- **Data:** Validated, version-controlled, well-documented
- **Visualizations:** Accessible, properly labeled, publication-quality

---

## 6. Risk Management

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Team member unavailability | Medium | High | Cross-training, documentation, backup assignments |
| Data access issues | Low | High | Multiple data sources, early data collection |
| Technical challenges | Medium | Medium | Buffer time in schedule, peer support, instructor consultation |
| Scope creep | Medium | Medium | Clear project boundaries, regular scope reviews |
| Communication breakdown | Low | High | Regular meetings, multiple communication channels |

---

## 7. Success Metrics

### Team Collaboration
- All members contribute ≥20% of total commits
- 100% attendance at weekly sync meetings (or async updates)
- All pull requests reviewed within 48 hours

### Project Management
- GitHub Project Board updated daily
- All milestones met within ±3 days of target
- Zero critical blockers unresolved for >1 week

### Documentation
- README complete and up-to-date
- All code functions documented
- Meeting notes for all sync meetings
