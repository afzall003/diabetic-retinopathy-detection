"""
Streamlit frontend for the DR detection system.

Run:
    streamlit run frontend/app.py

Requires the FastAPI backend running separately (see api/main.py), which
in turn requires TF Serving running (see README.md). Three processes
total: TF Serving -> FastAPI -> Streamlit.
"""

import base64
import io
import os

import requests
import streamlit as st
from PIL import Image

API_ENDPOINT = os.environ.get("API_ENDPOINT", "http://localhost:8001/predict")

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
CLASS_COLORS = {
    "No DR": "#3E7C8C",
    "Mild": "#D9A441",
    "Moderate": "#E8A544",
    "Severe": "#C1502E",
    "Proliferative": "#8C2F1E",
}

st.set_page_config(page_title="Retina | DR Detection", page_icon=":drop_of_blood:", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

    html, body, [data-testid="stAppViewContainer"], .stMarkdown, p, span, div {
        font-family: 'Space Grotesk', sans-serif;
    }

    [data-testid="stAppViewContainer"] {
        background: radial-gradient(ellipse 900px 500px at 50% -10%, #1A2A33 0%, #0B0D10 55%);
        color: #F2EFE9;
    }

    #MainMenu, footer, [data-testid="stHeader"] {
        visibility: hidden;
        height: 0;
    }

    .block-container {
        padding-top: 2.5rem;
        max-width: 1100px;
    }

    @keyframes heroFadeUp {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .hero {
        animation: heroFadeUp 0.7s ease-out;
        margin-bottom: 2.2rem;
    }

    .hero h1 {
        font-size: 2.6rem;
        font-weight: 700;
        color: #F2EFE9;
        margin-bottom: 0.4rem;
        letter-spacing: -0.01em;
    }

    .hero p {
        color: #A9AFB8;
        font-size: 1.05rem;
        max-width: 640px;
        line-height: 1.5;
        margin-bottom: 1.4rem;
    }

    .stat-strip {
        display: flex;
        gap: 2.2rem;
        flex-wrap: wrap;
        border-top: 1px solid #232830;
        border-bottom: 1px solid #232830;
        padding: 0.9rem 0;
    }

    .stat-item .stat-value {
        font-size: 1.25rem;
        font-weight: 600;
        color: #E8A544;
    }

    .stat-item .stat-label {
        font-size: 0.82rem;
        color: #7C838F;
    }

    .panel {
        background: #14181D;
        border: 1px solid #232830;
        border-radius: 10px;
        padding: 1.4rem;
    }

    .panel-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #C7CBD1;
        margin-bottom: 0.9rem;
    }

    .severity-badge {
        display: inline-block;
        padding: 0.35rem 0.9rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 1.4rem;
        margin-bottom: 0.3rem;
    }

    .confidence-line {
        color: #7C838F;
        font-size: 0.9rem;
        margin-bottom: 1.3rem;
    }

    .dist-section-title {
        font-size: 0.82rem;
        font-weight: 600;
        color: #7C838F;
        margin-bottom: 0.7rem;
        margin-top: 0.4rem;
    }

    .dist-row {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        margin-bottom: 0.55rem;
    }

    .dist-label {
        width: 100px;
        font-size: 0.85rem;
        color: #C7CBD1;
        flex-shrink: 0;
    }

    .dist-track {
        flex-grow: 1;
        height: 9px;
        background: #1E232B;
        border-radius: 5px;
        overflow: hidden;
    }

    .dist-fill {
        height: 100%;
        border-radius: 5px;
    }

    .dist-value {
        width: 42px;
        font-size: 0.82rem;
        color: #7C838F;
        text-align: right;
        flex-shrink: 0;
    }

    .disclaimer {
        background: #1A1510;
        border: 1px solid #3A2C1A;
        border-left: 3px solid #E8A544;
        border-radius: 6px;
        padding: 0.9rem 1.1rem;
        color: #C7B899;
        font-size: 0.88rem;
        margin: 1.6rem 0 2rem 0;
        line-height: 1.5;
    }

    [data-testid="stFileUploaderDropzone"] {
        background: #14181D;
        border: 1px dashed #3E7C8C;
        border-radius: 10px;
    }

    img {
        border-radius: 8px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero">
        <h1>See what the model sees</h1>
        <p>Upload a retinal fundus photo for a five-stage diabetic retinopathy
        severity read, with a Grad-CAM overlay showing exactly which regions
        drove the prediction.</p>
        <div class="stat-strip">
            <div class="stat-item"><div class="stat-value">0.83</div><div class="stat-label">Quadratic weighted kappa</div></div>
            <div class="stat-item"><div class="stat-value">5</div><div class="stat-label">Severity classes</div></div>
            <div class="stat-item"><div class="stat-value">EfficientNetB0</div><div class="stat-label">Backbone</div></div>
            <div class="stat-item"><div class="stat-value">APTOS 2019</div><div class="stat-label">Trained on</div></div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="disclaimer">
    This is an ML research and screening prototype, not a medical diagnosis
    tool. Predictions should not be used for clinical decision-making.
    </div>
    """,
    unsafe_allow_html=True,
)

uploaded_file = st.file_uploader("Upload a fundus photo", type=["png", "jpg", "jpeg"])

if uploaded_file is not None:
    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="panel"><div class="panel-title">Original</div>', unsafe_allow_html=True)
        st.image(uploaded_file, width="stretch")
        st.markdown('</div>', unsafe_allow_html=True)

    with st.spinner("Analyzing..."):
        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
        try:
            resp = requests.post(
                API_ENDPOINT, files=files, params={"include_gradcam": True}, timeout=60
            )
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.RequestException as e:
            st.error(f"Request failed: {e}")
            st.stop()

    with col2:
        if result.get("gradcam_image_base64"):
            st.markdown('<div class="panel"><div class="panel-title">Grad-CAM</div>', unsafe_allow_html=True)
            gradcam_bytes = base64.b64decode(result["gradcam_image_base64"])
            st.image(Image.open(io.BytesIO(gradcam_bytes)), width="stretch")
            st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("<div style='height: 1.6rem'></div>", unsafe_allow_html=True)

    pred_class = result["prediction"]
    confidence = result["confidence"]
    badge_color = CLASS_COLORS.get(pred_class, "#3E7C8C")

    dist_rows = ""
    for cls in CLASS_NAMES:
        val = result["distribution"].get(cls, 0.0)
        pct = round(val * 100, 1)
        dist_rows += f"""
        <div class="dist-row">
            <div class="dist-label">{cls}</div>
            <div class="dist-track"><div class="dist-fill" style="width:{pct}%; background:{CLASS_COLORS.get(cls, '#3E7C8C')}"></div></div>
            <div class="dist-value">{val:.2f}</div>
        </div>
        """

    st.markdown(
        f"""
        <div class="panel">
            <div class="panel-title">Prediction</div>
            <div class="severity-badge" style="background:{badge_color}22; color:{badge_color};">{pred_class}</div>
            <div class="confidence-line">{confidence:.1%} confidence</div>
            <div class="dist-section-title">Full distribution</div>
            {dist_rows}
        </div>
        """,
        unsafe_allow_html=True,
    )
