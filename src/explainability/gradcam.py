"""
Grad-CAM for the DR severity model.

Shows which regions of a retinal image the model actually focused on
when making its prediction -- important for a medical-imaging model,
where "high accuracy" alone doesn't tell you whether the model is
looking at clinically relevant features or spurious artifacts.

TECHNICAL NOTE: the trained model wraps EfficientNetB0 as a nested
sub-model (built via `base(inputs, ...)` inside a custom outer model in
model_factory.py). Naively trying to build a Grad-CAM model that reaches
into an internal layer of that nested sub-model raises a "graph
disconnected" error, because the nested model's internal tensors belong
to its own original graph, not the outer model's graph. The fix here
re-applies the same trained layers (base model, then the head layers)
in a fresh, explicitly connected graph -- same weights, restructured
just enough to expose the last conv feature map for Grad-CAM.

Usage:
    python -m src.explainability.gradcam \
        --image path/to/fundus.png \
        --checkpoint outputs/checkpoint.keras \
        --output outputs/gradcam_result.png
"""

import argparse

import cv2
import numpy as np
import tensorflow as tf

CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
IMG_SIZE = 224


def find_base_model(model: tf.keras.Model) -> tf.keras.Model:
    """Locate the nested EfficientNetB0 sub-model inside the full model."""
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            return layer
    raise ValueError(
        "Could not find a nested backbone model inside the loaded model. "
        "This script assumes the architecture from src/models/model_factory.py."
    )


def build_gradcam_model(model: tf.keras.Model) -> tf.keras.Model:
    """
    Rebuilds a Grad-CAM-ready model: input -> conv feature map -> final
    prediction, both as outputs, in a single connected graph.
    """
    base_model = find_base_model(model)
    new_input = tf.keras.Input(shape=base_model.input_shape[1:])
    conv_output = base_model(new_input, training=False)

    x = conv_output
    reached_base = False
    for layer in model.layers:
        if layer is base_model:
            reached_base = True
            continue
        if reached_base:
            x = layer(x)
    final_output = x

    return tf.keras.Model(new_input, [conv_output, final_output])


def make_gradcam_heatmap(img_array: np.ndarray, grad_model: tf.keras.Model,
                          pred_index: int = None):
    """
    img_array: preprocessed image batch, shape (1, 224, 224, 3), raw
    [0, 255] float values (same preprocessing as training/serving --
    EfficientNet rescales internally, do NOT divide by 255 here).
    """
    with tf.GradientTape() as tape:
        conv_output, predictions = grad_model(img_array)
        if pred_index is None:
            pred_index = int(tf.argmax(predictions[0]))
        class_channel = predictions[:, pred_index]

    grads = tape.gradient(class_channel, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_output = conv_output[0]
    heatmap = conv_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)

    return heatmap.numpy(), pred_index, predictions.numpy()[0]


def overlay_heatmap(original_img: np.ndarray, heatmap: np.ndarray, alpha: float = 0.4) -> np.ndarray:
    """original_img: uint8 RGB image, any size. Returns an RGB overlay at the same size."""
    h, w = original_img.shape[:2]
    heatmap_resized = cv2.resize(heatmap, (w, h))

    # Mask out the black background surrounding the circular fundus image.
    # CNNs (EfficientNet included) commonly show spuriously high activation
    # right at the feature map's border/corners -- a known padding-related
    # artifact, not genuine signal. Since fundus photos have black
    # background in the corners (outside the circular retina), this can
    # show up as bright, meaningless patches sitting on background. Zeroing
    # the heatmap wherever the original image is near-black keeps the
    # overlay honest about what's actually retinal tissue.
    gray = cv2.cvtColor(original_img, cv2.COLOR_RGB2GRAY) if original_img.ndim == 3 else original_img
    retina_mask = (gray > 15).astype(np.float32)
    heatmap_resized = heatmap_resized * retina_mask

    heatmap_uint8 = np.uint8(255 * heatmap_resized)

    # applyColorMap expects/returns BGR; convert to RGB to match original_img
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    colored_heatmap = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    overlay = (colored_heatmap * alpha + original_img * (1 - alpha)).astype(np.uint8)
    return overlay


def main(args):
    model = tf.keras.models.load_model(args.checkpoint)
    grad_model = build_gradcam_model(model)

    # Load for display/overlay purposes (cv2 is fine here -- this is just
    # for drawing the heatmap on top, not fed to the model)
    original = cv2.imread(args.image)
    original = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    resized_for_display = cv2.resize(original, (IMG_SIZE, IMG_SIZE))

    # Model input: exact same tf.image ops as src/data/dataset.py and
    # src/serving/client.py, so predictions/confidence are consistent
    # across every entry point into this model.
    img_raw = tf.io.read_file(args.image)
    img_tensor = tf.image.decode_image(img_raw, channels=3, expand_animations=False)
    img_tensor = tf.image.resize(img_tensor, [IMG_SIZE, IMG_SIZE])
    img_tensor = tf.cast(img_tensor, tf.float32)
    img_array = np.expand_dims(img_tensor.numpy(), axis=0)

    heatmap, pred_index, probs = make_gradcam_heatmap(img_array, grad_model)

    overlay = overlay_heatmap(resized_for_display, heatmap)
    overlay_bgr = cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)
    cv2.imwrite(args.output, overlay_bgr)

    print(f"Prediction: {CLASS_NAMES[pred_index]}")
    print(f"Confidence: {probs[pred_index]:.2%}")
    print(f"Full distribution: {dict(zip(CLASS_NAMES, [round(float(p), 4) for p in probs]))}")
    print(f"Grad-CAM overlay saved to: {args.output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to a fundus image")
    parser.add_argument("--checkpoint", default="./outputs/checkpoint.keras")
    parser.add_argument("--output", default="./outputs/gradcam_result.png")
    args = parser.parse_args()
    main(args)
