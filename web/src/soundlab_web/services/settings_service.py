import os
import sqlite3
from pathlib import Path


class SettingsService:
    """SQLiteベースのkey-value設定ストア"""

    def __init__(self, db_path: Path):
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self._db_path))

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS settings "
                "(key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )

    def get(self, key: str, default: str = "") -> str:
        """設定値を取得。DB → 環境変数 → デフォルトの優先順で返す"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT value FROM settings WHERE key = ?", (key,)
            ).fetchone()
        if row is not None:
            return row[0]
        env_val = os.environ.get(key)
        if env_val is not None:
            return env_val
        return default

    def set(self, key: str, value: str) -> None:
        """設定値を保存"""
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )

    def delete(self, key: str) -> None:
        """設定値を削除"""
        with self._connect() as conn:
            conn.execute("DELETE FROM settings WHERE key = ?", (key,))

    def get_all(self) -> dict[str, str]:
        """全設定を辞書で取得"""
        with self._connect() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return dict(rows)
