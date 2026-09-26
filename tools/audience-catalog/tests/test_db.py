import sqlite3

import pytest

from audience_catalog.db import SCHEMA_VERSION, Catalog, ValidationError


def test_name_required(cat):
    with pytest.raises(ValidationError):
        cat.save("personas", {"name": "   "})


def test_lists_are_cleaned_and_round_trip(cat):
    pid = cat.save("personas", {"name": "A", "motivations": [" Rest ", "rest", "", "Calm"]})
    assert cat.get("personas", pid)["motivations"] == ["Rest", "Calm"]


def test_missing_optional_fields_default_not_null(cat):
    pid = cat.save("personas", {"name": "A"})
    rec = cat.get("personas", pid)
    assert rec["description"] == "" and rec["tags"] == []


def test_links_round_trip_and_cascade(cat):
    p1 = cat.save("personas", {"name": "P1"})
    p2 = cat.save("personas", {"name": "P2"})
    c = cat.save("interest_clusters", {"name": "C", "related_personas": [p2, p1, p1]})
    assert cat.get("interest_clusters", c)["related_personas"] == [p1, p2]
    cat.delete("personas", p1)
    assert cat.get("interest_clusters", c)["related_personas"] == [p2]


def test_link_to_missing_record_rejected_and_nothing_written(cat):
    with pytest.raises(ValidationError):
        cat.save("interest_clusters", {"name": "C", "related_personas": [999]})
    assert cat.counts()["interest_clusters"] == 0


def test_ref_cascade_deletes_engagement_pattern(cat):
    p = cat.save("personas", {"name": "P"})
    cat.save("engagement_patterns", {"name": "E", "persona_id": p})
    cat.delete("personas", p)
    assert cat.counts()["engagement_patterns"] == 0


def test_ref_to_missing_persona_rejected(cat):
    with pytest.raises(ValidationError):
        cat.save("engagement_patterns", {"name": "E", "persona_id": 42})


def test_date_validation_and_default(cat):
    with pytest.raises(ValidationError):
        cat.save("insights", {"name": "I", "insight_date": "09/12/2026"})
    iid = cat.save("insights", {"name": "I", "insight_date": ""})
    assert len(cat.get("insights", iid)["insight_date"]) == 10


def test_update_changes_updated_at_and_keeps_created(cat):
    pid = cat.save("personas", {"name": "A"})
    before = cat.get("personas", pid)
    cat.conn.execute("UPDATE personas SET updated_at = '2000-01-01T00:00:00Z' WHERE id = ?", (pid,))
    cat.save("personas", {**before, "name": "B"})
    after = cat.get("personas", pid)
    assert after["name"] == "B"
    assert after["created_at"] == before["created_at"]
    assert after["updated_at"] != "2000-01-01T00:00:00Z"


def test_update_of_deleted_record_rejected(cat):
    pid = cat.save("personas", {"name": "A"})
    cat.delete("personas", pid)
    with pytest.raises(ValidationError):
        cat.save("personas", {"id": pid, "name": "A"})


def test_search_is_case_insensitive_and_escapes_wildcards(cat):
    cat.save("personas", {"name": "Evening Reader", "pain_points": ["100% booked"]})
    cat.save("personas", {"name": "Other"})
    assert [r["name"] for r in cat.list("personas", "evening")] == ["Evening Reader"]
    assert [r["name"] for r in cat.list("personas", "100%")] == ["Evening Reader"]
    assert [r["name"] for r in cat.list("personas", "%")] == ["Evening Reader"]  # literal only
    assert cat.list("personas", "_") == []


def test_tag_filter(cat):
    cat.save("personas", {"name": "A", "tags": ["Core"]})
    cat.save("personas", {"name": "B", "tags": ["growth"]})
    assert [r["name"] for r in cat.list("personas", tag="core")] == ["A"]
    assert cat.all_tags() == ["Core", "growth"]


def test_duplicate_copies_links(cat):
    p = cat.save("personas", {"name": "P"})
    c = cat.save("interest_clusters", {"name": "C", "related_personas": [p], "subtopics": ["x"]})
    d = cat.duplicate("interest_clusters", c)
    rec = cat.get("interest_clusters", d)
    assert rec["name"] == "C (copy)" and rec["related_personas"] == [p] and rec["subtopics"] == ["x"]


def test_backlinks(cat):
    p = cat.save("personas", {"name": "P"})
    cat.save("interest_clusters", {"name": "C", "related_personas": [p]})
    cat.save("engagement_patterns", {"name": "E", "persona_id": p})
    assert {(k, n) for k, _i, n in cat.backlinks("personas", p)} == {
        ("interest_clusters", "C"), ("engagement_patterns", "E")}


def test_coverage_gaps_and_actions(cat):
    p = cat.save("personas", {"name": "P"})
    gaps = {title: rows for title, _k, rows in cat.coverage_gaps()}
    assert gaps["Personas with no interest cluster"] == [(p, "P")]
    cat.save("insights", {"name": "I", "insight_date": "2026-01-02", "action_items": ["one", "two"]})
    assert [a[3] for a in cat.open_actions()] == ["one", "two"]


def test_schema_version_and_newer_file_refused(tmp_path):
    path = tmp_path / "v.sqlite"
    Catalog(path).close()
    conn = sqlite3.connect(path)
    assert conn.execute("PRAGMA user_version").fetchone()[0] == SCHEMA_VERSION
    conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION + 1}")
    conn.close()
    with pytest.raises(RuntimeError):
        Catalog(path)


def test_backup(cat, tmp_path):
    cat.save("personas", {"name": "P"})
    dest = tmp_path / "backup.sqlite"
    cat.backup_to(dest)
    copy = Catalog(dest)
    assert copy.counts()["personas"] == 1
    copy.close()


def test_sql_check_constraints_hold_without_app_validation(cat):
    with pytest.raises(sqlite3.IntegrityError):
        cat.conn.execute("INSERT INTO personas (name, tags) VALUES ('x', 'not json')")
    with pytest.raises(sqlite3.IntegrityError):
        cat.conn.execute("INSERT INTO insights (name, insight_date) VALUES ('x', 'Sept 1')")
