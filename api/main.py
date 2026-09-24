"""
FastAPI backend for the DR detection system.

Bridges the Streamlit frontend to TensorFlow Serving for predictions, and
generates Grad-CAM overlays in-process (TF Serving only returns
predictions, not gradients, so explainability requires a locally loaded
copy of the model -- reuses src/explainability/gradcam.py).

Run:
    uvicorn api.main:app --reload --port 8000

Requires TF Serving running separately (see README.md) -- the /predict
endpoint calls out to it, same as src/serving/client.py does.
"""

import base64
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np
import requests
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.explainability.gradcam import (
    CLASS_NAMES, IMG_SIZE, build_gradcam_model, make_gradcam_heatmap, overlay_heatmap,
)
from api import db

TF_SERVING_ENDPOINT = os.environ.get(
    "TF_SERVING_ENDPOINT", "http://localhost:8501/v1/models/dr_model:predict"
)
CHECKPOINT_PATH = os.environ.get("CHECKPOINT_PATH", "./outputs/checkpoint.keras")
DB_PATH = os.environ.get("DB_PATH", "./data/history.db")
MODEL_VERSION = "EfficientNetB0-v1"

db.init_db(DB_PATH)

app = FastAPI(title="Diabetic Retinopathy Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local/demo use; restrict this in a real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

_grad_model = None  # loaded lazily on first request that needs Grad-CAM


def get_grad_model():
    global _grad_model
    if _grad_model is None:
        model = tf.keras.models.load_model(CHECKPOINT_PATH)
        _grad_model = build_gradcam_model(model)
    return _grad_model


class PredictionResponse(BaseModel):
    analysis_id: str
    created_at: str
    prediction: str
    confidence: float
    distribution: dict
    gradcam_image_base64: Optional[str] = None


def preprocess_bytes(image_bytes: bytes) -> np.ndarray:
    # Same tf.image ops as dataset.py / client.py / gradcam.py -- keeping
    # this identical everywhere is what fixed the earlier confidence
    # mismatch between entry points.
    img_tensor = tf.image.decode_image(image_bytes, channels=3, expand_animations=False)
    img_tensor = tf.image.resize(img_tensor, [IMG_SIZE, IMG_SIZE])
    img_tensor = tf.cast(img_tensor, tf.float32)
    return img_tensor.numpy()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...), include_gradcam: bool = True):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    img_array = preprocess_bytes(image_bytes)

    payload = {"instances": [img_array.tolist()]}
    try:
        resp = requests.post(TF_SERVING_ENDPOINT, data=json.dumps(payload), timeout=30)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"TF Serving unavailable: {e}")

    probs = resp.json()["predictions"][0]
    pred_index = int(np.argmax(probs))
    prediction_label = CLASS_NAMES[pred_index]
    confidence = float(probs[pred_index])
    distribution = {CLASS_NAMES[i]: round(float(p), 4) for i, p in enumerate(probs)}

    gradcam_b64 = None
    if include_gradcam:
        grad_model = get_grad_model()
        heatmap, _, _ = make_gradcam_heatmap(
            np.expand_dims(img_array, axis=0), grad_model, pred_index=pred_index
        )
        nparr = np.frombuffer(image_bytes, np.uint8)
        original_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        original_rgb = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2RGB)
        display_img = cv2.resize(original_rgb, (IMG_SIZE, IMG_SIZE))
        overlay = overlay_heatmap(display_img, heatmap)
        overlay_bgr = cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)
        success, buffer = cv2.imencode(".png", overlay_bgr)
        if success:
            gradcam_b64 = base64.b64encode(buffer).decode("utf-8")

    analysis_id = f"DR-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    db.insert_analysis(
        analysis_id=analysis_id,
        created_at=created_at,
        class_id=pred_index,
        prediction=prediction_label,
        confidence=confidence,
        distribution=distribution,
        model_version=MODEL_VERSION,
    )

    return PredictionResponse(
        analysis_id=analysis_id,
        created_at=created_at,
        prediction=prediction_label,
        confidence=confidence,
        distribution=distribution,
        gradcam_image_base64=gradcam_b64,
    )


@app.get("/analyses")
def list_analyses(limit: int = 100, offset: int = 0):
    rows = db.list_analyses(limit=limit, offset=offset)
    return [
        {
            "analysis_id": r["analysis_id"],
            "created_at": r["created_at"],
            "class_id": r["class_id"],
            "prediction": r["prediction"],
            "confidence": r["confidence"],
            "model_version": r["model_version"],
            "status": r["status"],
        }
        for r in rows
    ]


@app.get("/analyses/stats")
def analyses_stats():
    return db.get_stats()


@app.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str):
    row = db.get_analysis(analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "analysis_id": row["analysis_id"],
        "created_at": row["created_at"],
        "class_id": row["class_id"],
        "prediction": row["prediction"],
        "confidence": row["confidence"],
        "distribution": json.loads(row["distribution"]),
        "model_version": row["model_version"],
        "status": row["status"],
    }
