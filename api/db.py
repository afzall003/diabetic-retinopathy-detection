"""
SQLite persistence for analysis history. Stores prediction results (not
images -- those stay ephemeral, only the record of what was predicted).

Uses Python's built-in sqlite3, no extra dependency. The DB file path is
configurable via DB_PATH so it can be mounted as a Docker volume and
survive container restarts.
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = None  # set by init_db()


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str):
    global DB_PATH
    DB_PATH = db_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                analysis_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                class_id INTEGER NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                distribution TEXT NOT NULL,
                model_version TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed'
            )
            """
        )


def insert_analysis(analysis_id: str, created_at: str, class_id: int, prediction: str,
                     confidence: float, distribution: dict, model_version: str,
                     status: str = "completed"):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO analyses (analysis_id, created_at, class_id, prediction, confidence, distribution, model_version, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (analysis_id, created_at, class_id, prediction, confidence, json.dumps(distribution), model_version, status),
        )


def list_analyses(limit: int = 100, offset: int = 0) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM analyses ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [dict(row) for row in rows]


def get_analysis(analysis_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM analyses WHERE analysis_id = ?", (analysis_id,)
        ).fetchone()
        return dict(row) if row else None


def get_stats() -> dict:
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM analyses").fetchone()["c"]
        normal = conn.execute("SELECT COUNT(*) AS c FROM analyses WHERE class_id = 0").fetchone()["c"]
        referable = conn.execute("SELECT COUNT(*) AS c FROM analyses WHERE class_id >= 2").fetchone()["c"]
        avg_confidence_row = conn.execute("SELECT AVG(confidence) AS a FROM analyses").fetchone()
        avg_confidence = avg_confidence_row["a"] or 0.0
        return {
            "total_analyses": total,
            "normal_cases": normal,
            "referable_cases": referable,
            "average_confidence": avg_confidence,
        }
