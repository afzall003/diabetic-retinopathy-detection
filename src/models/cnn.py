"""
Custom CNN built from scratch (no transfer learning, no pretrained
weights) -- for comparison against the EfficientNetB0 transfer-learning
model. Deeper than the original plain conv stack, with residual (skip)
connections: standard technique for helping gradients flow through a
deeper from-scratch network, since there's no pretrained backbone to
lean on for good starting features.

This is still a comparison baseline, not an attempt to match
EfficientNet -- adding pretraining would defeat the point of the
comparison. The goal here is a fairer fight: the best a from-scratch
CNN can reasonably do on this dataset, not the best CNN in the abstract.
"""

import tensorflow as tf
from tensorflow.keras import layers, models


def _residual_block(x, filters: int, stride: int = 1):
    shortcut = x

    y = layers.Conv2D(filters, 3, strides=stride, padding="same", use_bias=False)(x)
    y = layers.BatchNormalization()(y)
    y = layers.Activation("relu")(y)
    y = layers.Conv2D(filters, 3, strides=1, padding="same", use_bias=False)(y)
    y = layers.BatchNormalization()(y)

    # Project the shortcut when shape changes (downsampling or channel
    # count change) so the addition below is valid.
    if stride != 1 or shortcut.shape[-1] != filters:
        shortcut = layers.Conv2D(filters, 1, strides=stride, padding="same", use_bias=False)(shortcut)
        shortcut = layers.BatchNormalization()(shortcut)

    out = layers.Add()([y, shortcut])
    out = layers.Activation("relu")(out)
    return out


def build_custom_cnn(num_classes: int = 5, input_shape=(224, 224, 3),
                      dropout: float = 0.4) -> tf.keras.Model:
    inputs = layers.Input(shape=input_shape)

    # EfficientNetB0 rescales internally (that's the whole reason for the
    # earlier double-normalization bug); this model has no such built-in
    # step, so normalize explicitly here -- keeps this model consistent
    # with the rest of the pipeline's raw [0, 255] inputs.
    x = layers.Rescaling(1.0 / 255)(inputs)

    # Stem: standard ResNet-style entry -- one strided conv + pool to
    # quickly cut spatial size before the more expensive residual stages.
    x = layers.Conv2D(32, 7, strides=2, padding="same", use_bias=False)(x)  # 224 -> 112
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling2D(3, strides=2, padding="same")(x)  # 112 -> 56

    # Residual stages, each downsampling once then refining once.
    for filters in [64, 128, 256, 512]:
        x = _residual_block(x, filters, stride=2)
        x = _residual_block(x, filters, stride=1)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(dropout)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(dropout)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    return models.Model(inputs, outputs, name="dr_custom_cnn_resnet")
