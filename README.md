# Diabetic Retinopathy Detection — Pass 1 (MVP)

Transfer-learning CNN (EfficientNetB0) for 5-class DR severity grading,
trained with `tf.distribute.MirroredStrategy`, exported as a TensorFlow
SavedModel, and served via TensorFlow Serving.

This is Pass 1 only: baseline model → proper evaluation → export →
serve → client. Grad-CAM, the custom-CNN comparison, FastAPI/Streamlit
UI, and Docker Compose are deliberately deferred to Pass 2 so you have
a working end-to-end system before layering on more.

## 1. Get the data

Download the APTOS 2019 Blindness Detection dataset from Kaggle:
https://www.kaggle.com/c/aptos2019-blindness-detection

Unzip so you have:
```
aptos/
├── train.csv          # columns: id_code, diagnosis
└── train_images/      # <id_code>.png files
```

> If your copy of the dataset has a patient/eye identifier column,
> pass its name via `--patient_col` when training, to split at the
> patient level and avoid leakage.

## 2. Set up environment

```bash
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Verify TensorFlow sees your GPU:
```bash
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```
You should see your RTX 4060 listed. If not, check your CUDA/cuDNN
install matches your TensorFlow version's requirements.

## 3. Train

```bash
python -m src.training.train --data_dir /path/to/aptos --output_dir ./outputs --epochs 10 --fine_tune_epochs 8
```

This runs two stages: head-only training with the EfficientNet base
frozen, then fine-tuning the top 30 layers at a lower learning rate.
On a single RTX 4060 this should comfortably fit in memory at
batch size 32, image size 224x224.

Note on distributed training: the script wraps model creation in
`tf.distribute.MirroredStrategy().scope()`. With one GPU, this runs as
a single replica — correct code, no scaling claim. The same script
would automatically use multiple GPUs without modification if run on
multi-GPU hardware.

Outputs land in `./outputs/`:
- `checkpoint.keras` — best model by validation loss
- `saved_model/1/` — TensorFlow SavedModel, ready for serving
- `tb_logs/` — TensorBoard logs (`tensorboard --logdir outputs/tb_logs`)
- `test_split.csv` — held-out test set, used by the evaluation script

## 4. Evaluate

```bash
python -m src.evaluation.evaluate --data_dir /path/to/aptos --output_dir ./outputs
```

Prints per-class precision/recall/F1, quadratic weighted kappa (the
APTOS competition's own metric — good to quote), and saves a confusion
matrix image. Look at recall on classes 3–4 (Severe, Proliferative)
specifically — those are the costly misses in a screening context.

## 5. Serve with TensorFlow Serving

Requires Docker.

```bash
docker run -p 8501:8501 \
  --mount type=bind,source="$(pwd)/outputs/saved_model",target=/models/dr_model \
  -e MODEL_NAME=dr_model -t tensorflow/serving
```

This exposes a REST endpoint at `http://localhost:8501/v1/models/dr_model:predict`.

## 6. Query the model

```bash
python src/serving/client.py --image /path/to/some_fundus_image.png
```

Prints the predicted class, confidence, and full probability
distribution across the 5 severity grades.

## Pass 2 (later)

- Grad-CAM explainability overlay
- Custom-CNN-from-scratch baseline for comparison against EfficientNet
- FastAPI backend + Streamlit upload UI
- Docker Compose to run serving + API + UI together
- Optional: rent a 2-GPU cloud instance for one run to genuinely
  demonstrate multi-device scaling, using this same training script
  unmodified
