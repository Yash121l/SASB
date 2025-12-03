# Deployment Guide – Air Quality Intelligence Initiative

This guide captures the minimum steps required to recreate the analytics pipeline, boot the FastAPI
backend, and publish the interactive web experience.

## 1. Prerequisites

- Python 3.10+ with `pip`
- Git + make sure this repository is cloned locally
- OpenAQ snapshot checked out under `data/external/openaq-kaggle/OpenAQ.csv`
- (Optional) Node-free static hosting target (Netlify, GitHub Pages, Vercel, S3)
- (Optional) Container runtime for production deployments (Docker/Podman)

Install Python dependencies once:

```bash
python3 -m pip install --user -r requirements.txt
```

## 2. Rebuild the analytics pipeline

Use the automation script to fetch World Bank indicators, preprocess the datasets, regenerate the
analysis artefacts, and run tests.

```bash
chmod +x run_pipeline.sh
./run_pipeline.sh
```

Environment switches:

| Variable | Default | Purpose |
|----------|---------|---------|
| `START_YEAR` / `END_YEAR` | 2004 / 2023 | Override the temporal window passed to `src.data.collect`. |
| `INDICATORS` | *(empty)* | Optional comma-separated list of World Bank indicator codes to limit downloads. |
| `SKIP_COLLECTION`, `SKIP_PREPROCESS`, `SKIP_ANALYSIS`, `SKIP_TESTS` | `0` | Set to `1` to skip individual stages. |

## 3. Run the FastAPI backend locally (app/backend)

1. Ensure the pipeline has produced the processed datasets inside `data/processed/`.
2. Start the server with:

   ```bash
   uvicorn app.backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. Verify health: `curl http://localhost:8000/health`.

### Containerised backend (optional)

Create a lightweight image:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build & run:

```bash
docker build -t air-quality-backend .
docker run -p 8000:8000 -e START_YEAR=2004 air-quality-backend
```

## 4. Serve the React dashboard (app/frontend)

The new frontend lives under `app/frontend/` (Vite + React + Plotly). For local preview:

```bash
cd app/frontend
npm install
npm run dev  # defaults to http://localhost:4173
```

Expose the backend origin via `VITE_API_BASE_URL` (e.g., `VITE_API_BASE_URL=https://api.example.com npm run build`).

### Recommended hosting split

1. **Backend:** Deploy to Render, Railway, Fly.io, Azure App Service, etc. Command remains
   `uvicorn app.backend.main:app --port $PORT`. Make sure `data/processed` ships with the image or is
   mounted as a volume.
2. **Frontend:** Deploy the Vite build artefacts (`npm run build` outputs to `dist/`) to Netlify,
   Vercel, GitHub Pages, or S3/CloudFront. Configure `VITE_API_BASE_URL` (or the platform’s runtime
   env var) to point at the backend URL so the policy simulator and dashboards can reach the API.

## 5. Post-deployment smoke checks

- Hit `/health` and `/api/meta` – verify HTTP 200 and sensible counts.
- Load the dashboard – confirm charts render and the choropleth slider updates with the selected year.
- Validate cached files refresh: redeploy after re-running `run_pipeline.sh` to include updated data.

## 6. Operational notes

- The backend keeps all datasets in memory for sub-second responses; redeploy after refreshing
  `data/processed` to invalidate the cache.
- For scheduled refreshes, wire `run_pipeline.sh` to a cron (or GitHub Action) that commits the new
  processed artefacts before triggering a deployment.
- Monitor API logs for `Missing processed artifacts` errors – they indicate the pipeline must run
  before the backend can serve traffic.
