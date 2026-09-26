import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from audience_catalog.db import Catalog  # noqa: E402


@pytest.fixture
def cat(tmp_path):
    c = Catalog(tmp_path / "test.sqlite")
    yield c
    c.close()
