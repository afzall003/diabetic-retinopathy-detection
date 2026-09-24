"""
Transfer-learning model for DR severity classification.
Pass 1 uses EfficientNetB0 as the backbone -- strong accuracy without
needing millions of images, and light enough to fine-tune on a single
8GB-VRAM GPU.
"""

import tensorflow as tf
from tensorflow.keras import layers, models


def build_model(num_classes: int = 5, input_shape=(224, 224, 3),
                 freeze_base: bool = True, dropout: float = 0.3) -> tf.keras.Model:
    base = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=input_shape,
    )
    base.trainable = not freeze_base

    inputs = layers.Input(shape=input_shape)
    x = base(inputs, training=False if freeze_base else None)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(dropout)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(dropout)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name="dr_efficientnet_b0")
    return model, base


def unfreeze_top_layers(base: tf.keras.Model, n_layers: int = 30):
    """Call after initial head-only training converges, then recompile
    with a lower learning rate for fine-tuning."""
    base.trainable = True
    for layer in base.layers[:-n_layers]:
        layer.trainable = False
    return base
