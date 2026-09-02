"""
Minimal SQLite user store. No ORM — a single table is simple enough that
SQLAlchemy would be more ceremony than value here, and a plain .db file
deploys anywhere without extra infrastructure.
"""

import os
import sqlite3

# Override with LEGALAI_DB_PATH in .env if you want the db file somewhere else
# (e.g. a persistent volume path on your hosting provider).
DB_PATH = os.getenv("LEGALAI_DB_PATH", "legalai.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()