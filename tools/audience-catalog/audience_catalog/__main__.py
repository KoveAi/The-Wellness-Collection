"""Entry point: python -m audience_catalog [--db PATH] [--demo]"""
from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="audience_catalog",
                                     description="The Wellness Collection Audience Catalog")
    parser.add_argument("--db", help="SQLite file to open (default: per-user data folder)")
    parser.add_argument("--demo", action="store_true",
                        help="Load the fictional sample catalog into an EMPTY database")
    args = parser.parse_args(argv)

    from PySide6.QtWidgets import QApplication, QMessageBox

    from . import theme
    from .db import Catalog
    from .ui.main_window import MainWindow

    app = QApplication(sys.argv[:1])
    app.setApplicationName("Audience Catalog")
    app.setOrganizationName("The Wellness Collection")
    theme.apply(app)

    try:
        cat = Catalog(args.db)
    except Exception as exc:  # surface schema/version/permission problems, don't crash silently
        QMessageBox.critical(None, "Audience Catalog", f"Could not open the catalog.\n\n{exc}")
        return 1

    if args.demo:
        from .sample import load_sample
        if any(cat.counts().values()):
            print("--demo skipped: the database already has records.", file=sys.stderr)
        else:
            load_sample(cat)

    win = MainWindow(cat)
    win.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
