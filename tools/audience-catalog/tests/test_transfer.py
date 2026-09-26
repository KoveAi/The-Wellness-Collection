import json

import pytest

from audience_catalog import transfer
from audience_catalog.db import Catalog, ValidationError
from audience_catalog.sample import load_sample


def test_round_trip_preserves_links_with_new_ids(cat, tmp_path):
    load_sample(cat)
    path = tmp_path / "export.json"
    transfer.export_json(cat, path)

    other = Catalog(tmp_path / "other.sqlite")
    other.save("personas", {"name": "Already here"})  # forces id offset
    counts = transfer.import_json(other, path)
    assert counts["personas"] == 2
    cluster = next(r for r in other.list("interest_clusters") if r["name"] == "Identity and Self-Worth")
    names = {n for i, n in other.titles("personas") if i in cluster["related_personas"]}
    assert names == {"The Quiet Rebuilder", "The Curious Seeker"}
    pattern = other.list("engagement_patterns")[0]
    assert dict(other.titles("personas"))[pattern["persona_id"]] == "The Quiet Rebuilder"
    other.close()


def test_replace_import(cat, tmp_path):
    load_sample(cat)
    path = tmp_path / "e.json"
    transfer.export_json(cat, path)
    transfer.import_json(cat, path, replace=True)
    assert cat.counts()["personas"] == 2


def test_bad_record_rolls_back_everything(cat):
    cat.save("personas", {"name": "Keep me"})
    data = transfer.export_data(cat)
    data["personas"].append({"id": 99, "name": ""})
    with pytest.raises(ValidationError, match="Personas #2"):
        transfer.import_data(cat, data, replace=True)
    assert [r["name"] for r in cat.list("personas")] == ["Keep me"]


@pytest.mark.parametrize("payload", [
    {"personas": []},
    {"format": "twc-audience-catalog", "version": 99},
    [],
])
def test_wrong_format_refused(cat, payload):
    with pytest.raises(ValidationError):
        transfer.import_data(cat, payload)


def test_invalid_json_file(cat, tmp_path):
    p = tmp_path / "bad.json"
    p.write_text("{nope", encoding="utf-8")
    with pytest.raises(ValidationError, match="Not valid JSON"):
        transfer.import_json(cat, p)


def test_empty_catalog_exports_and_imports(cat, tmp_path):
    p = tmp_path / "empty.json"
    transfer.export_json(cat, p)
    assert json.loads(p.read_text())["personas"] == []
    assert sum(transfer.import_json(cat, p).values()) == 0


def test_markdown_escapes_and_resolves_names(cat):
    load_sample(cat)
    cat.save("personas", {"name": "# not a heading *bold*"})
    md = transfer.to_markdown(cat)
    assert "### \\# not a heading \\*bold\\*" in md
    assert "- The Quiet Rebuilder" in md  # link ids rendered as names
