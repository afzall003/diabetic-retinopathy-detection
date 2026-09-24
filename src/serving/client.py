"""
Thin client: sends a retinal image to the TF Serving REST endpoint and
prints the predicted DR severity class.

Prerequisite: TF Serving container running (see README.md), e.g.:

    docker run -p 8501:8501 \
        --mount type=bind,source=$(pwd)/outputs/saved_model,target=/models/dr_model \
        -e MODEL_NAME=dr_model -t tensorflow/serving

Usage:
    python src/serving/client.py --image path/to/fundus.png
"""

import argparse
import json

import numpy as np
import requests
import tensorflow as tf

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
IMG_SIZE = 224
ENDPOINT = "http://localhost:8501/v1/models/dr_model:predict"


def preprocess(image_path: str) -> np.ndarray:
    # Uses the exact same tf.image ops as src/data/dataset.py's
    # _decode_and_resize (bilinear resize via tf.image.resize, no /255 --
    # EfficientNetB0 rescales internally). Previously this used PIL, whose
    # default resize is bicubic, not bilinear -- close enough to usually
    # agree on the top class, but different enough to shift confidence
    # noticeably on borderline images. Matching the exact ops removes
    # that inconsistency rather than just reducing it.
    img = tf.io.read_file(image_path)
    img = tf.image.decode_image(img, channels=3, expand_animations=False)
    img = tf.image.resize(img, [IMG_SIZE, IMG_SIZE])
    img = tf.cast(img, tf.float32)
    return img.numpy()


def main(args):
    img_arr = preprocess(args.image)
    payload = {"instances": [img_arr.tolist()]}

    resp = requests.post(ENDPOINT, data=json.dumps(payload))
    resp.raise_for_status()
    predictions = resp.json()["predictions"][0]

    pred_class = int(np.argmax(predictions))
    confidence = float(predictions[pred_class])

    print(f"Prediction: {CLASS_NAMES[pred_class]}")
    print(f"Confidence: {confidence:.2%}")
    print(f"Full distribution: {dict(zip(CLASS_NAMES, [round(p, 4) for p in predictions]))}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to a fundus image")
    args = parser.parse_args()
    main(args)
