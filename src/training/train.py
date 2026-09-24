"""
Training script wrapped in tf.distribute.MirroredStrategy.

On your RTX 4060 (single GPU) this runs as a single replica -- the code
is correct and would scale automatically if run on a multi-GPU machine
or cloud instance, but no scaling benefit is claimed here since only
one device is available. If you later rent a 2-GPU cloud instance,
this exact script needs zero changes to actually train across both.

Supports two model types for comparison. They no longer share an
identical recipe end to end -- EfficientNet keeps its original two-stage
(frozen head, then fine-tune) approach; the custom CNN gets a longer
single-stage run with stronger augmentation and a cosine-decay learning
rate schedule, since a from-scratch model benefits differently than a
transfer-learning one. Both still go through the same underlying data
pipeline, oversampling, and export logic.

Usage:
    python -m src.training.train --data_dir /path/to/aptos --epochs 15 --output_dir ./outputs
    python -m src.training.train --data_dir /path/to/aptos --model_type cnn --output_dir ./outputs_cnn --epochs 25 --fine_tune_epochs 15
"""

import argparse
import math
import os
import sys

import tensorflow as tf

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.data.dataset import (
    load_labels_df, split_dataframe, compute_class_weights, make_dataset,
    make_balanced_dataset, IMG_SIZE
)
from src.models.model_factory import build_model, unfreeze_top_layers
from src.models.cnn import build_custom_cnn


def main(args):
    strategy = tf.distribute.MirroredStrategy()
    print(f"Number of devices in strategy: {strategy.num_replicas_in_sync}")
    print(f"Model type: {args.model_type}")

    global_batch_size = args.batch_size_per_replica * strategy.num_replicas_in_sync

    df = load_labels_df(os.path.join(args.data_dir, "train.csv"))
    train_df, val_df, test_df = split_dataframe(df, patient_col=args.patient_col)

    print("Class distribution in training data:", train_df["diagnosis"].value_counts().sort_index().to_dict())

    image_dir = os.path.join(args.data_dir, "train_images")
    val_ds = make_dataset(val_df, image_dir, global_batch_size, training=False)

    os.makedirs(args.output_dir, exist_ok=True)
    ckpt_path = os.path.join(args.output_dir, "checkpoint.keras")

    if args.model_type == "cnn":
        # Single stage: no pretrained backbone to freeze/unfreeze. Trains
        # for epochs + fine_tune_epochs combined, so you can give it a
        # larger total budget than EfficientNet needs (pass bigger
        # --epochs/--fine_tune_epochs values than the EfficientNet run).
        total_epochs = args.epochs + args.fine_tune_epochs
        steps_per_epoch = math.ceil(len(train_df) / global_batch_size)
        train_ds = make_balanced_dataset(
            train_df, image_dir, global_batch_size, strong_augment=True,
            # Tilt sampling toward Severe (class 3) and Proliferative
            # (class 4) -- both regressed in the previous run, likely
            # because uniform sampling + aggressive augmentation hit
            # their small real image counts (~135 and ~207) hardest.
            # This changes exposure frequency, not loss weighting, so it
            # doesn't stack with oversampling the way class_weight would.
            class_sample_weights={0: 1.0, 1: 1.0, 2: 1.0, 3: 1.4, 4: 1.3},
        )

        callbacks = [
            tf.keras.callbacks.ModelCheckpoint(ckpt_path, save_best_only=True, monitor="val_loss"),
            # More patience than EfficientNet's -- the cosine schedule
            # below is designed to anneal over the FULL total_epochs, so
            # stopping too early cuts that schedule short.
            tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True, monitor="val_loss"),
            tf.keras.callbacks.TensorBoard(log_dir=os.path.join(args.output_dir, "tb_logs")),
        ]

        # Cosine decay instead of ReduceLROnPlateau: anneals smoothly
        # across the whole run rather than reacting after loss plateaus,
        # which tends to work better for a from-scratch model trained
        # over many epochs. alpha=0.01 means it decays down to 1% of the
        # initial LR by the end, not all the way to zero.
        lr_schedule = tf.keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=1e-3,
            decay_steps=steps_per_epoch * total_epochs,
            alpha=0.01,
        )

        with strategy.scope():
            model = build_custom_cnn()
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=lr_schedule),
                loss="categorical_crossentropy",
                metrics=["accuracy", tf.keras.metrics.AUC(name="auc", multi_label=True)],
            )

        print(f"\n--- Training custom CNN from scratch ({total_epochs} epochs, cosine LR decay) ---")
        model.fit(
            train_ds, validation_data=val_ds, epochs=total_epochs,
            callbacks=callbacks,
        )

    else:
        train_ds = make_balanced_dataset(train_df, image_dir, global_batch_size)

        callbacks = [
            tf.keras.callbacks.ModelCheckpoint(ckpt_path, save_best_only=True, monitor="val_loss"),
            tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_loss"),
            tf.keras.callbacks.TensorBoard(log_dir=os.path.join(args.output_dir, "tb_logs")),
            tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3),
        ]

        with strategy.scope():
            model, base = build_model(freeze_base=True)
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
                loss="categorical_crossentropy",
                metrics=["accuracy", tf.keras.metrics.AUC(name="auc", multi_label=True)],
            )

        print("\n--- Stage 1: training classification head (base frozen) ---")
        model.fit(
            train_ds, validation_data=val_ds, epochs=args.epochs,
            callbacks=callbacks,
        )

        print("\n--- Stage 2: fine-tuning top backbone layers ---")
        with strategy.scope():
            unfreeze_top_layers(base, n_layers=30)
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
                loss="categorical_crossentropy",
                metrics=["accuracy", tf.keras.metrics.AUC(name="auc", multi_label=True)],
            )

        model.fit(
            train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs,
            callbacks=callbacks,
        )

    saved_model_dir = os.path.join(args.output_dir, "saved_model", "1")
    # Reload the single best checkpoint before exporting -- ModelCheckpoint
    # tracks the best val_loss across the whole run, but the in-memory
    # `model` object after the last fit() call may not be that best point.
    best_model = tf.keras.models.load_model(ckpt_path)
    best_model.export(saved_model_dir)
    print(f"\nSavedModel exported from best checkpoint ({ckpt_path}) to: {saved_model_dir}")

    test_df.to_csv(os.path.join(args.output_dir, "test_split.csv"), index=False)
    print(f"Held-out test split saved to: {args.output_dir}/test_split.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Dir containing train.csv and train_images/")
    parser.add_argument("--output_dir", default="./outputs")
    parser.add_argument("--model_type", choices=["efficientnet", "cnn"], default="efficientnet")
    parser.add_argument("--patient_col", default=None, help="Column name for patient/eye id, if present")
    parser.add_argument("--batch_size_per_replica", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--fine_tune_epochs", type=int, default=8)
    args = parser.parse_args()
    main(args)
