"""
Evaluation on the held-out test split.

Accuracy alone is misleading on imbalanced medical data, so this
reports: per-class precision/recall/F1, confusion matrix, and
quadratic weighted kappa -- the metric actually used in the APTOS
Kaggle competition, and a good one to quote when discussing this
project's results.

Usage:
    python -m src.evaluation.evaluate --data_dir /path/to/aptos --output_dir ./outputs
"""

import argparse
import os
import sys

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, cohen_kappa_score
import matplotlib.pyplot as plt

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.data.dataset import make_dataset

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]


def main(args):
    import pandas as pd
    test_df = pd.read_csv(os.path.join(args.output_dir, "test_split.csv"))
    image_dir = os.path.join(args.data_dir, "train_images")
    test_ds = make_dataset(test_df, image_dir, batch_size=32, training=False)

    model = tf.keras.models.load_model(os.path.join(args.output_dir, "checkpoint.keras"))

    y_true, y_pred = [], []
    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(preds, axis=1))

    print("\n=== Classification Report ===")
    print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))

    kappa = cohen_kappa_score(y_true, y_pred, weights="quadratic")
    print(f"Quadratic Weighted Kappa: {kappa:.4f}  (this is the headline metric to quote)")

    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(CLASS_NAMES))); ax.set_xticklabels(CLASS_NAMES, rotation=45, ha="right")
    ax.set_yticks(range(len(CLASS_NAMES))); ax.set_yticklabels(CLASS_NAMES)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True"); ax.set_title("Confusion Matrix")
    for i in range(len(CLASS_NAMES)):
        for j in range(len(CLASS_NAMES)):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                     color="white" if cm[i, j] > cm.max() / 2 else "black")
    fig.colorbar(im)
    fig.tight_layout()
    out_path = os.path.join(args.output_dir, "confusion_matrix.png")
    fig.savefig(out_path, dpi=150)
    print(f"Confusion matrix saved to: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True)
    parser.add_argument("--output_dir", default="./outputs")
    args = parser.parse_args()
    main(args)
