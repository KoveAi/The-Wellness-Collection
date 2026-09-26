"""JSON import/export and Markdown export.

JSON is versioned and self-describing so a file written today can be
refused cleanly (not half-imported) by a future, incompatible build.
Relationships are exported as lists of ids local to the file; import
remaps them to fresh ids, so files from another machine never collide.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .db import Catalog, ValidationError
from .entities import ENTITIES, LINK, LIST, REF

FORMAT_NAME = "twc-audience-catalog"
FORMAT_VERSION = 1


def export_data(cat: Catalog) -> dict[str, Any]:
    data: dict[str, Any] = {
        "format": FORMAT_NAME,
        "version": FORMAT_VERSION,
        "exported_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    for key in ENTITIES:
        data[key] = cat.list(key)
    return data


def export_json(cat: Catalog, path: str | Path) -> None:
    Path(path).write_text(
        json.dumps(export_data(cat), indent=2, ensure_ascii=False), encoding="utf-8"
    )


def import_data(cat: Catalog, data: dict[str, Any], replace: bool = False) -> dict[str, int]:
    """Load an export. All or nothing: any bad record rolls back the whole
    import. Returns rows imported per entity."""
    if not isinstance(data, dict) or data.get("format") != FORMAT_NAME:
        raise ValidationError("This file is not an Audience Catalog export.")
    if data.get("version") != FORMAT_VERSION:
        raise ValidationError(
            f"Export version {data.get('version')!r} is not supported (expected {FORMAT_VERSION})."
        )

    counts: dict[str, int] = {}
    id_maps: dict[str, dict[int, int]] = {k: {} for k in ENTITIES}
    with cat.conn:
        if replace:
            # Children first is not required (CASCADE), but reverse order keeps it obvious.
            for key in reversed(list(ENTITIES)):
                cat.conn.execute(f"DELETE FROM {key}")
        # ENTITIES is declared in dependency order, so every REF/LINK target
        # has already been imported by the time it is referenced.
        for key, ent in ENTITIES.items():
            rows = data.get(key, [])
            if not isinstance(rows, list):
                raise ValidationError(f"{ent.label}: expected a list")
            for n, raw in enumerate(rows, start=1):
                if not isinstance(raw, dict):
                    raise ValidationError(f"{ent.label} #{n}: expected an object")
                rec: dict[str, Any] = {"id": None}
                for f in ent.fields:
                    value = raw.get(f.key)
                    if f.kind == REF:
                        value = id_maps[f.target].get(_as_int(value)) if value else None
                    elif f.kind == LINK:
                        value = [id_maps[f.target][i] for i in map(_as_int, value or [])
                                 if i in id_maps[f.target]]
                    elif f.kind == LIST and value is not None and not isinstance(value, list):
                        raise ValidationError(f"{ent.label} #{n} {f.label}: expected a list")
                    rec[f.key] = value
                try:
                    new_id = cat._write(key, rec)
                except ValidationError as exc:
                    raise ValidationError(f"{ent.label} #{n}: {exc}") from None
                old_id = _as_int(raw.get("id"))
                if old_id is not None:
                    id_maps[key][old_id] = new_id
            counts[key] = len(rows)
    return counts


def import_json(cat: Catalog, path: str | Path, replace: bool = False) -> dict[str, int]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Not valid JSON (line {exc.lineno}): {exc.msg}") from None
    return import_data(cat, data, replace=replace)


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def export_markdown(cat: Catalog, path: str | Path) -> None:
    Path(path).write_text(to_markdown(cat), encoding="utf-8")


def to_markdown(cat: Catalog) -> str:
    names = {k: dict(cat.titles(k)) for k in ENTITIES}
    out = ["# Audience Catalog", "",
           "_The Wellness Collection · Gracefully Redefined_", "",
           f"Exported {datetime.now().strftime('%B %d, %Y').replace(' 0', ' ')}", ""]
    for key, ent in ENTITIES.items():
        records = cat.list(key)
        out += [f"## {ent.label}", ""]
        if not records:
            out += ["_None yet._", ""]
            continue
        for rec in records:
            out += [f"### {_md(rec['name'])}", ""]
            for f in ent.fields:
                if f.key == "name":
                    continue
                value = rec.get(f.key)
                if f.kind == REF:
                    value = names[f.target].get(value) if value else None
                elif f.kind == LINK:
                    value = [names[f.target][i] for i in value if i in names[f.target]]
                if not value:
                    continue
                if isinstance(value, list):
                    out.append(f"**{f.label}**")
                    out += [f"- {_md(v)}" for v in value]
                    out.append("")
                else:
                    out += [f"**{f.label}**  ", _md(str(value)), ""]
    return "\n".join(out).rstrip() + "\n"


def _md(text: str) -> str:
    """Neutralize characters that would turn user text into Markdown structure."""
    return text.replace("\\", "\\\\").replace("#", "\\#").replace("*", "\\*").replace("_", "\\_")
