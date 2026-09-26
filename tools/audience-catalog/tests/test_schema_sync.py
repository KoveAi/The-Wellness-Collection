"""entities.py and schema.sql must describe the same columns and joins."""
from audience_catalog.entities import ENTITIES, LINK


def _columns(cat, table):
    return {r[1] for r in cat.conn.execute(f"PRAGMA table_info({table})")}


def test_every_column_field_exists_in_schema(cat):
    for key, ent in ENTITIES.items():
        cols = _columns(cat, key)
        expected = {f.key for f in ent.columns} | {"id", "created_at", "updated_at"}
        assert cols == expected, f"{key}: schema {sorted(cols ^ expected)} out of sync"


def test_every_link_has_join_table_with_foreign_keys(cat):
    for ent in ENTITIES.values():
        for f in ent.links:
            assert f.kind == LINK
            assert _columns(cat, f.join_table) == {f.self_col, f.other_col}
            fks = {(r[3], r[2]) for r in cat.conn.execute(f"PRAGMA foreign_key_list({f.join_table})")}
            assert (f.self_col, ent.key) in fks
            assert (f.other_col, f.target) in fks


def test_foreign_keys_enforced(cat):
    assert cat.conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1
