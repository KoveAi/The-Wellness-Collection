"""SQLite data layer. All SQL lives here; the UI only sees dicts.

Record shape (what get/list/save exchange):
    {"id": int | None, <column>: str | list[str] | int | None, ...,
     <link field>: list[int]}
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .entities import DATE, ENTITIES, LINK, LIST, REF, Entity

SCHEMA_VERSION = 1
SCHEMA_PATH = Path(__file__).with_name("schema.sql")


class ValidationError(ValueError):
    """Raised when a record cannot be saved as given."""


def default_db_path() -> Path:
    """Per-user data directory, never the source tree, so real research
    notes cannot be committed by accident. AUDIENCE_CATALOG_DB overrides."""
    override = os.environ.get("AUDIENCE_CATALOG_DB")
    if override:
        return Path(override).expanduser()
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "TheWellnessCollection" / "audience_catalog.sqlite"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _clean_list(value: Any) -> list[str]:
    """Normalize list input: strip, drop blanks, de-duplicate case-insensitively
    while keeping first-seen order and casing."""
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        raise ValidationError(f"expected a list, got {type(value).__name__}")
    seen: set[str] = set()
    out: list[str] = []
    for item in value:
        text = str(item).strip()
        if text and text.casefold() not in seen:
            seen.add(text.casefold())
            out.append(text)
    return out


class Catalog:
    def __init__(self, path: str | Path | None = None):
        self.path = Path(path) if path is not None else default_db_path()
        if str(self.path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        if str(self.path) != ":memory:":
            self.conn.execute("PRAGMA journal_mode = WAL")
        self._migrate()

    # ── lifecycle ──────────────────────────────────────────────
    def _migrate(self) -> None:
        version = self.conn.execute("PRAGMA user_version").fetchone()[0]
        if version > SCHEMA_VERSION:
            raise RuntimeError(
                f"Database schema v{version} is newer than this app (v{SCHEMA_VERSION}). "
                "Update the app before opening this file."
            )
        if version < 1:
            with self.conn:
                self.conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
                self.conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        # Future: `if version < 2: ...` blocks go here, one per release.

    def close(self) -> None:
        self.conn.close()

    def backup_to(self, dest: str | Path) -> None:
        """Consistent copy even while the app has the file open."""
        target = sqlite3.connect(str(dest))
        try:
            self.conn.backup(target)
        finally:
            target.close()

    # ── helpers ────────────────────────────────────────────────
    @staticmethod
    def entity(key: str) -> Entity:
        try:
            return ENTITIES[key]
        except KeyError:
            raise KeyError(f"unknown entity {key!r}") from None

    def _row_to_record(self, ent: Entity, row: sqlite3.Row) -> dict[str, Any]:
        rec: dict[str, Any] = {"id": row["id"], "created_at": row["created_at"],
                               "updated_at": row["updated_at"]}
        for f in ent.columns:
            value = row[f.key]
            rec[f.key] = json.loads(value) if f.kind == LIST else value
        for f in ent.links:
            rec[f.key] = self.linked_ids(ent.key, f.key, row["id"])
        return rec

    def _validate(self, ent: Entity, rec: dict[str, Any]) -> dict[str, Any]:
        """Return column values ready to bind, or raise ValidationError."""
        values: dict[str, Any] = {}
        for f in ent.columns:
            raw = rec.get(f.key)
            if f.kind == LIST:
                values[f.key] = json.dumps(_clean_list(raw), ensure_ascii=False)
            elif f.kind == REF:
                if raw in (None, "", 0):
                    values[f.key] = None
                else:
                    try:
                        ref_id = int(raw)
                    except (TypeError, ValueError):
                        raise ValidationError(f"{f.label}: not a valid id") from None
                    if not self.exists(f.target, ref_id):
                        raise ValidationError(f"{f.label}: record {ref_id} no longer exists")
                    values[f.key] = ref_id
            elif f.kind == DATE:
                text = (raw or "").strip() if isinstance(raw, str) else raw
                if not text:
                    values[f.key] = date.today().isoformat()
                else:
                    try:
                        values[f.key] = date.fromisoformat(str(text)).isoformat()
                    except ValueError:
                        raise ValidationError(f"{f.label}: use YYYY-MM-DD") from None
            else:
                values[f.key] = "" if raw is None else str(raw).strip()
        if not values.get("name"):
            raise ValidationError("Name is required")
        return values

    def exists(self, key: str, rec_id: int) -> bool:
        ent = self.entity(key)
        return self.conn.execute(
            f"SELECT 1 FROM {ent.key} WHERE id = ?", (rec_id,)
        ).fetchone() is not None

    # ── reads ──────────────────────────────────────────────────
    def get(self, key: str, rec_id: int) -> dict[str, Any] | None:
        ent = self.entity(key)
        row = self.conn.execute(f"SELECT * FROM {ent.key} WHERE id = ?", (rec_id,)).fetchone()
        return self._row_to_record(ent, row) if row else None

    def list(self, key: str, search: str = "", tag: str = "") -> list[dict[str, Any]]:
        """Records ordered by name. `search` matches any text/list column
        (case-insensitive); `tag` must match one tag exactly (case-insensitive)."""
        ent = self.entity(key)
        clauses, params = [], []
        if search.strip():
            text_cols = [f.key for f in ent.columns if f.kind not in (REF,)]
            # Escape LIKE wildcards so "50%" or "self_care" match literally.
            term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            like = f"%{term}%"
            clauses.append("(" + " OR ".join(f"{c} LIKE ? ESCAPE '\\'" for c in text_cols) + ")")
            params.extend([like] * len(text_cols))
        if tag.strip():
            clauses.append(
                f"EXISTS (SELECT 1 FROM json_each({ent.key}.tags) t "
                "WHERE lower(t.value) = lower(?))"
            )
            params.append(tag.strip())
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = self.conn.execute(
            f"SELECT * FROM {ent.key} {where} ORDER BY name COLLATE NOCASE, id", params
        ).fetchall()
        return [self._row_to_record(ent, r) for r in rows]

    def titles(self, key: str) -> list[tuple[int, str]]:
        """(id, name) pairs for pickers."""
        ent = self.entity(key)
        return [(r[0], r[1]) for r in self.conn.execute(
            f"SELECT id, name FROM {ent.key} ORDER BY name COLLATE NOCASE, id")]

    def linked_ids(self, key: str, link_key: str, rec_id: int) -> list[int]:
        f = self.entity(key).field(link_key)
        return [r[0] for r in self.conn.execute(
            f"SELECT {f.other_col} FROM {f.join_table} WHERE {f.self_col} = ? "
            f"ORDER BY {f.other_col}", (rec_id,))]

    def all_tags(self, key: str | None = None) -> list[str]:
        keys = [key] if key else list(ENTITIES)
        seen: dict[str, str] = {}
        for k in keys:
            for (value,) in self.conn.execute(
                f"SELECT DISTINCT t.value FROM {self.entity(k).key}, json_each(tags) t"
            ):
                seen.setdefault(str(value).casefold(), str(value))
        return sorted(seen.values(), key=str.casefold)

    def backlinks(self, key: str, rec_id: int) -> list[tuple[str, int, str]]:
        """Everything that points at this record: (entity_key, id, name)."""
        out: list[tuple[str, int, str]] = []
        for other in ENTITIES.values():
            for f in other.fields:
                if f.target != key:
                    continue
                if f.kind == LINK:
                    sql = (f"SELECT o.id, o.name FROM {f.join_table} j "
                           f"JOIN {other.key} o ON o.id = j.{f.self_col} "
                           f"WHERE j.{f.other_col} = ?")
                else:
                    sql = f"SELECT id, name FROM {other.key} WHERE {f.key} = ?"
                out.extend((other.key, r[0], r[1]) for r in self.conn.execute(sql, (rec_id,)))
        return sorted(set(out), key=lambda t: (t[0], t[2].casefold()))

    # ── writes ─────────────────────────────────────────────────
    def save(self, key: str, rec: dict[str, Any]) -> int:
        """Insert when rec has no id, update otherwise. Returns the id.
        Column values and links are written in one transaction."""
        with self.conn:
            return self._write(key, rec)

    def _write(self, key: str, rec: dict[str, Any]) -> int:
        """save() without its own transaction, for callers batching writes."""
        ent = self.entity(key)
        values = self._validate(ent, rec)
        link_values = {f.key: self._clean_ids(f, rec.get(f.key)) for f in ent.links}
        rec_id = rec.get("id")
        if rec_id:
            if not self.exists(key, rec_id):
                raise ValidationError(f"{ent.singular} {rec_id} no longer exists")
            sets = ", ".join(f"{c} = ?" for c in values)
            self.conn.execute(
                f"UPDATE {ent.key} SET {sets}, updated_at = ? WHERE id = ?",
                [*values.values(), _now(), rec_id],
            )
        else:
            cols = ", ".join(values)
            marks = ", ".join("?" for _ in values)
            cur = self.conn.execute(
                f"INSERT INTO {ent.key} ({cols}) VALUES ({marks})", list(values.values())
            )
            rec_id = cur.lastrowid
        for f in ent.links:
            self.conn.execute(f"DELETE FROM {f.join_table} WHERE {f.self_col} = ?", (rec_id,))
            self.conn.executemany(
                f"INSERT INTO {f.join_table} ({f.self_col}, {f.other_col}) VALUES (?, ?)",
                [(rec_id, other) for other in link_values[f.key]],
            )
        return int(rec_id)

    def _clean_ids(self, f, raw: Iterable[Any] | None) -> list[int]:
        ids: list[int] = []
        for item in raw or []:
            try:
                ids.append(int(item))
            except (TypeError, ValueError):
                raise ValidationError(f"{f.label}: not a valid id") from None
        ids = sorted(set(ids))
        missing = [i for i in ids if not self.exists(f.target, i)]
        if missing:
            raise ValidationError(f"{f.label}: records {missing} no longer exist")
        return ids

    def delete(self, key: str, rec_id: int) -> None:
        ent = self.entity(key)
        with self.conn:
            self.conn.execute(f"DELETE FROM {ent.key} WHERE id = ?", (rec_id,))

    def duplicate(self, key: str, rec_id: int) -> int:
        rec = self.get(key, rec_id)
        if rec is None:
            raise ValidationError("Record no longer exists")
        rec["id"] = None
        rec["name"] = f"{rec['name']} (copy)"
        return self.save(key, rec)

    # ── dashboard ──────────────────────────────────────────────
    def counts(self) -> dict[str, int]:
        return {k: self.conn.execute(f"SELECT COUNT(*) FROM {k}").fetchone()[0] for k in ENTITIES}

    def coverage_gaps(self) -> list[tuple[str, str, list[tuple[int, str]]]]:
        """Places where the research is thin: (title, entity_key, [(id, name)])."""
        checks = [
            ("Personas with no interest cluster", "personas",
             "SELECT id, name FROM personas p WHERE NOT EXISTS "
             "(SELECT 1 FROM cluster_personas c WHERE c.persona_id = p.id)"),
            ("Personas with no engagement pattern", "personas",
             "SELECT id, name FROM personas p WHERE NOT EXISTS "
             "(SELECT 1 FROM engagement_patterns e WHERE e.persona_id = p.id)"),
            ("Clusters no content trigger speaks to", "interest_clusters",
             "SELECT id, name FROM interest_clusters c WHERE NOT EXISTS "
             "(SELECT 1 FROM trigger_clusters t WHERE t.cluster_id = c.id)"),
            ("Personas with no growth pathway", "personas",
             "SELECT id, name FROM personas p WHERE NOT EXISTS "
             "(SELECT 1 FROM pathway_personas g WHERE g.persona_id = p.id)"),
        ]
        out = []
        for title, key, sql in checks:
            rows = [(r[0], r[1]) for r in self.conn.execute(sql + " ORDER BY name COLLATE NOCASE")]
            out.append((title, key, rows))
        return out

    def open_actions(self, limit: int = 8) -> list[tuple[int, str, str, str]]:
        """Most recent insight action items: (insight_id, insight_date, insight_name, item)."""
        rows = self.conn.execute(
            "SELECT i.id, i.insight_date, i.name, a.value FROM insights i, json_each(i.action_items) a "
            "ORDER BY i.insight_date DESC, i.id DESC, a.key LIMIT ?", (limit,))
        return [(r[0], r[1], r[2], r[3]) for r in rows]
