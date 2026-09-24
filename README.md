# Diabetic Retinopathy Detection

An end-to-end deep learning system for 5-class diabetic retinopathy (DR)
severity screening from retinal fundus photographs — trained, explained,
served, and wrapped in a full web application.

**This is a research/screening prototype, not a medical diagnosis tool.**
Predictions are not a substitute for professional medical evaluation.

## What's actually here

- A transfer-learning model (EfficientNetB0) trained on the APTOS 2019
  dataset, reaching **0.83 Quadratic Weighted Kappa** on a held-out test set
- A **custom CNN trained from scratch**, built specifically to test whether
  transfer learning was worth it rather than assuming so — see
  [Model comparison](#model-comparison) below for what that comparison
  actually found
- **Grad-CAM explainability**, including a real bug found and fixed along
  the way (CNN border artifacts were leaking into the heatmap; fixed by
  masking to the visible retina)
- Deployment via **TensorFlow Serving + FastAPI + SQLite**, all wired
  together with Docker Compose, with real persistence verified to survive a
  full container restart
- Two working frontends: a polished **React/TypeScript app** (primary) and
  a simpler **Streamlit app** (kept as a lighter alternative)

## Project structure

```
├── src/
│   ├── data/            # dataset loading, splitting, augmentation, oversampling
│   ├── models/           # EfficientNetB0 (model_factory.py) and the custom CNN (cnn.py)
│   ├── training/          # train.py -- trains either model, shared pipeline
│   ├── evaluation/         # evaluate.py (single model), compare_models.py (both)
│   ├── explainability/      # Grad-CAM
│   └── serving/              # REST client for querying TF Serving directly
├── api/                # FastAPI backend: bridges frontend <-> TF Serving, persists to SQLite
├── web/                 # React/TypeScript frontend (primary)
├── frontend/             # Streamlit frontend (lighter alternative)
├── docker-compose.yml    # tf-serving + api + frontend + web, one command
├── Dockerfile.api / .frontend / .web
└── requirements*.txt
```

## 1. Get the data

Download the [APTOS 2019 Blindness Detection](https://www.kaggle.com/c/aptos2019-blindness-detection)
dataset from Kaggle. Unzip so you have:
```
aptos/
├── train.csv          # columns: id_code, diagnosis
└── train_images/      # <id_code>.png files
```

## 2. Set up the Python environment

```bash
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Verify TensorFlow sees a GPU (optional — everything here also runs on CPU,
just slower):
```bash
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

## 3. Train

**EfficientNetB0** (transfer learning, two-stage: frozen head then fine-tune):
```bash
python -m src.training.train \
  --data_dir /path/to/aptos --output_dir ./outputs \
  --epochs 10 --fine_tune_epochs 8
```

**Custom CNN** (from scratch, residual architecture, single stage with cosine LR decay):
```bash
python -m src.training.train \
  --data_dir /path/to/aptos --output_dir ./outputs_cnn \
  --model_type cnn --epochs 25 --fine_tune_epochs 15
```

Both write `checkpoint.keras`, a `saved_model/`, TensorBoard logs, and the
held-out `test_split.csv` to their output directory.

## 4. Evaluate

```bash
python -m src.evaluation.evaluate --data_dir /path/to/aptos --output_dir ./outputs
```

Prints per-class precision/recall/F1, Quadratic Weighted Kappa, and saves a
confusion matrix.

## Model comparison

```bash
python -m src.evaluation.compare_models \
  --data_dir /path/to/aptos --efficientnet_dir ./outputs --cnn_dir ./outputs_cnn
```

The honest result, after iterating on the custom CNN (deeper residual
architecture, stronger augmentation, tilted oversampling toward rare
classes) to fix a real regression found along the way:

| Metric | EfficientNetB0 | Custom CNN |
|---|---|---|
| Parameters | 4.2M | 11.3M |
| Accuracy | 0.722 | 0.673 |
| Quadratic Weighted Kappa | **0.831** | 0.711 |
| Macro F1 | 0.558 | 0.505 |
| **Severe recall** | 0.483 | **0.621** |

EfficientNet wins on overall agreement despite having *fewer* parameters —
real evidence that pretrained features matter more than raw capacity on a
dataset this size. But the custom CNN, after targeted retuning, actually
achieves **higher recall on the clinically critical Severe class** — a real
trade-off between aggregate accuracy and worst-case sensitivity, not a
clean win for either model. See `src/models/cnn.py` and the training
script's comments for the specific changes that drove this.

## 5. Explainability (Grad-CAM)

```bash
python -m src.explainability.gradcam \
  --image path/to/fundus.png --checkpoint ./outputs/checkpoint.keras \
  --output ./outputs/gradcam_result.png
```

Overlays a heatmap showing which regions of the image drove the
prediction. Masked to the visible retina (see comments in
`src/explainability/gradcam.py`) after an earlier version showed spurious
high-activation artifacts at the image corners — a known CNN
border/padding effect, not genuine signal.

## 6. Run the full stack

Requires Docker.

```bash
docker compose up tf-serving api          # model serving + backend + database
docker compose up tf-serving api web      # + the React frontend, production build
```

- **TF Serving** loads the exported EfficientNetB0 model, REST API at `:8501`
- **FastAPI** (`:8001`) bridges the frontend to TF Serving, generates Grad-CAM
  on demand, and persists every prediction to a SQLite database (`db_data/`,
  survives restarts)
- **React app** (`:80` via the `web` service, or `npm run dev` for local
  development — see `web/README.md`) is the primary frontend: upload, view
  predictions + Grad-CAM, browse history, see the model comparison above
  rendered as a live chart
- **Streamlit app** (`frontend` service, `:8502`) is a simpler alternative
  frontend, if you'd rather not run Node

## Honest limitations

- Trained on a single public dataset (APTOS 2019); real-world generalization
  to different cameras/populations is untested
- Severe/Proliferative classes have limited training examples (a few hundred
  images each), which is the main driver of the recall numbers above
- Not clinically validated — a screening research prototype, not a
  diagnostic device
