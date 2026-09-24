"""
Side-by-side comparison of the custom CNN (from scratch) vs
EfficientNetB0 (transfer learning). Runs the same evaluation each model
already got individually and prints a direct comparison table.

Usage:
    python -m src.evaluation.compare_models \
        --data_dir /path/to/aptos \
        --efficientnet_dir ./outputs \
        --cnn_dir ./outputs_cnn
"""

import argparse
import os
import sys

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import classification_report, cohen_kappa_score, f1_score, recall_score

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.data.dataset import make_dataset

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]


def evaluate_model(output_dir: str, data_dir: str) -> dict:
    test_df = pd.read_csv(os.path.join(output_dir, "test_split.csv"))
    image_dir = os.path.join(data_dir, "train_images")
    test_ds = make_dataset(test_df, image_dir, batch_size=32, training=False)

    model = tf.keras.models.load_model(os.path.join(output_dir, "checkpoint.keras"))

    y_true, y_pred = [], []
    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(preds, axis=1))

    report = classification_report(y_true, y_pred, target_names=CLASS_NAMES, output_dict=True)

    return {
        "accuracy": float(np.mean(np.array(y_true) == np.array(y_pred))),
        "qwk": cohen_kappa_score(y_true, y_pred, weights="quadratic"),
        "macro_f1": f1_score(y_true, y_pred, average="macro"),
        "severe_recall": recall_score(y_true, y_pred, labels=[3], average="macro"),
        "report": report,
        "num_params": model.count_params(),
    }


def main(args):
    print("Evaluating EfficientNetB0 (transfer learning)...")
    eff = evaluate_model(args.efficientnet_dir, args.data_dir)

    print("Evaluating custom CNN (from scratch)...")
    cnn = evaluate_model(args.cnn_dir, args.data_dir)

    print("\n" + "=" * 70)
    print(f"{'Metric':<30}{'EfficientNetB0':<20}{'Custom CNN':<20}")
    print("=" * 70)
    print(f"{'Parameters':<30}{eff['num_params']:<20,}{cnn['num_params']:<20,}")
    print(f"{'Accuracy':<30}{eff['accuracy']:<20.4f}{cnn['accuracy']:<20.4f}")
    print(f"{'Quadratic Weighted Kappa':<30}{eff['qwk']:<20.4f}{cnn['qwk']:<20.4f}")
    print(f"{'Macro F1':<30}{eff['macro_f1']:<20.4f}{cnn['macro_f1']:<20.4f}")
    print(f"{'Severe recall':<30}{eff['severe_recall']:<20.4f}{cnn['severe_recall']:<20.4f}")
    print("=" * 70)

    print("\nPer-class recall:")
    print(f"{'Class':<20}{'EfficientNetB0':<20}{'Custom CNN':<20}")
    for cls in CLASS_NAMES:
        print(f"{cls:<20}{eff['report'][cls]['recall']:<20.4f}{cnn['report'][cls]['recall']:<20.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True)
    parser.add_argument("--efficientnet_dir", default="./outputs")
    parser.add_argument("--cnn_dir", default="./outputs_cnn")
    args = parser.parse_args()
    main(args)
