# DR Vision — Web Frontend

A production-shaped React + TypeScript + Vite + MUI frontend for the diabetic
retinopathy screening system. Runs entirely on mock data out of the box, and
switches to the real FastAPI backend (`../api`) with a one-line config change.

This lives alongside the original Streamlit frontend (`../frontend`) — both
are independent and either can be used; nothing here modifies or depends on
the Streamlit app.

## 1. Technologies used

React 18, TypeScript (strict), Vite, MUI (Material UI) v6, React Router v6,
Axios, Recharts, Lucide icons.

## 2. Project structure

```
web/
├── src/
│   ├── api/              # Axios client + one module per resource (analysis, dashboard, history, model)
│   ├── components/       # layout, dashboard, analysis, history, common
│   ├── pages/             # Home, Dashboard, Analyze, Results, History, Model, About
│   ├── types/             # analysis.ts, api.ts
│   ├── hooks/              # useAnalysis, useHistory
│   ├── theme/              # MUI theme + severity color tokens
│   ├── utils/               # validation.ts, formatting.ts
│   ├── App.tsx, main.tsx
├── .env.example
├── package.json
```

## 3. Install

```
cd web
npm install
```

## 4. Run (development)

```
npm run dev
```

Opens at `http://localhost:5173` by default.

## 5. Build

```
npm run build
```

## 6. Environment variables

Copy `.env.example` to `.env` and adjust:

```
VITE_API_BASE_URL=http://localhost:8001
VITE_USE_MOCK_API=true
```

- `VITE_USE_MOCK_API=true` (default): the app runs entirely on realistic
  generated data — no backend needed. Upload works, a simulated ~1.4s
  inference delay occurs, and a plausible random prediction + probability
  distribution comes back every time.
- `VITE_USE_MOCK_API=false`: the app calls the real FastAPI backend at
  `VITE_API_BASE_URL`. Make sure TF Serving + the API are running first
  (see the main project README).

## 7. Mock API behavior

All mock logic lives in `src/api/mockData.ts`, isolated from the rest of the
app. Every `src/api/*.ts` module checks `USE_MOCK_API` and either returns
mock data or calls the real backend — no component ever has mock-vs-real
branching logic in it.

The Model page's evaluation metrics (accuracy, QWK, macro F1, parameter
count) are **not fabricated** — they're the actual numbers from this
project's held-out test evaluation (see `../src/evaluation/compare_models.py`
output). Update `modelInformation` in `mockData.ts` if you retrain.

## 8. FastAPI integration (going from mock to real)

1. Start TF Serving + the FastAPI backend (see the main project README —
   `docker compose up tf-serving api`, or the manual three-terminal setup).
2. Set `VITE_USE_MOCK_API=false` in `.env`.
3. Set `VITE_API_BASE_URL` to wherever the API is reachable (default
   `http://localhost:8001`).
4. Restart `npm run dev`.

The transformation from the backend's actual response shape to this app's
internal types happens in one place: `transformBackendResponse()` inside
`src/api/analysisApi.ts`. If the backend response ever changes shape, that's
the only function that needs updating.

## 9. Main API contract (current backend)

The real backend (`../api/main.py`) exposes:

```
POST /predict?include_gradcam=true
Content-Type: multipart/form-data
Field: file

Response:
{
  "prediction": "Moderate",
  "confidence": 0.91,
  "distribution": { "No DR": 0.02, "Mild": 0.04, "Moderate": 0.91, "Severe": 0.02, "Proliferative": 0.01 },
  "gradcam_image_base64": "..."
}
```

This differs slightly from the originally-specified contract (flat fields
rather than a nested `prediction` object, `image_url` vs. base64 embedding,
no `analysis_id`/`created_at` from the backend) — the transformation layer in
`analysisApi.ts` reconciles this, so the rest of the app is unaffected either
way.

There is currently no backend endpoint for history or dashboard statistics
(the `/predict` endpoint is stateless) — `historyApi.ts` and
`dashboardApi.ts` fall back to mock data even in real mode until such
endpoints exist. Swapping them to real calls later only requires editing
those two files.

## 10. User workflow

Home → Dashboard → Analyze Image → upload → preview → validate → Analyze →
processing state → Results (prediction, Grad-CAM if available, probability
chart, disclaimer) → optionally view History → click any past analysis to
revisit its Results page.

## 11. Assumptions made

- No authentication: not required by the brief; the architecture doesn't
  preclude adding it later (an auth check could wrap `AppShell`).
- History and dashboard stats are mock-only for now, since the backend has
  no persistence layer yet (predictions aren't stored anywhere server-side).
- "Proliferative" (backend label) is displayed as "Proliferative DR" in the
  UI, matching the 5-class naming convention specified in the brief.
