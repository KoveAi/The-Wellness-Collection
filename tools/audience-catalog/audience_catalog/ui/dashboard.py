"""Dashboard (overview) and Settings (data) pages."""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from PySide6.QtCore import Qt, QUrl, Signal
from PySide6.QtGui import QDesktopServices, QFont
from PySide6.QtWidgets import (
    QFileDialog, QGridLayout, QHBoxLayout, QLabel, QMessageBox, QPushButton,
    QScrollArea, QVBoxLayout, QWidget,
)

from .. import theme, transfer
from ..db import Catalog, ValidationError
from ..entities import ENTITIES
from .widgets import card, rule


def _page(parent=None) -> tuple[QScrollArea, QVBoxLayout]:
    scroll = QScrollArea(parent)
    scroll.setWidgetResizable(True)
    body = QWidget()
    lay = QVBoxLayout(body)
    lay.setContentsMargins(48, 40, 48, 40)
    lay.setSpacing(18)
    scroll.setWidget(body)
    return scroll, lay


class Dashboard(QWidget):
    navigate = Signal(str, int)   # entity key, record id (0 = just open the page)

    def __init__(self, cat: Catalog, parent=None):
        super().__init__(parent)
        self.cat = cat
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        self.scroll, _ = _page()
        outer.addWidget(self.scroll)
        self.refresh()

    def refresh(self) -> None:
        # Swap in a fresh body; setWidget() deletes the old one immediately,
        # so no stale widgets linger until the event loop runs deleteLater().
        body = QWidget()
        lay = QVBoxLayout(body)
        lay.setContentsMargins(48, 40, 48, 40)
        lay.setSpacing(18)
        self.scroll.setWidget(body)
        lay.addWidget(theme.eyebrow("The Wellness Collection  ·  Audience Catalog"))
        lay.addWidget(theme.heading("Know who you are here for.", 46))
        sub = QLabel("Personas, the interests they carry, where they gather, and what we are learning.")
        sub.setObjectName("italic")
        sub.setFont(theme.font(18, italic=True))
        sub.setWordWrap(True)
        lay.addWidget(sub)
        lay.addSpacing(12)

        # Stat cards
        grid = QGridLayout()
        grid.setSpacing(16)
        counts = self.cat.counts()
        for n, (key, ent) in enumerate(ENTITIES.items()):
            c = card()
            c.setCursor(Qt.CursorShape.PointingHandCursor)
            cl = QVBoxLayout(c)
            cl.setContentsMargins(22, 18, 22, 18)
            cl.setSpacing(2)
            cl.addWidget(theme.eyebrow(ent.label))
            num = QLabel(str(counts[key]))
            num.setFont(theme.numerals(theme.font(40, QFont.Weight.Light)))
            cl.addWidget(num)
            hint = QLabel(ent.eyebrow)
            hint.setObjectName("italic")
            hint.setFont(theme.font(14, italic=True))
            cl.addWidget(hint)
            c.mousePressEvent = lambda _e, k=key: self.navigate.emit(k, 0)
            grid.addWidget(c, n // 4, n % 4)
        lay.addLayout(grid)
        lay.addSpacing(8)

        # Two-column: gaps + actions
        row = QHBoxLayout()
        row.setSpacing(16)
        row.addWidget(self._gaps_card(), 1)
        row.addWidget(self._actions_card(), 1)
        lay.addLayout(row)
        lay.addStretch(1)

    def _gaps_card(self) -> QWidget:
        c = card()
        cl = QVBoxLayout(c)
        cl.setContentsMargins(26, 22, 26, 22)
        cl.setSpacing(10)
        cl.addWidget(theme.eyebrow("Where the research is thin"))
        title = QLabel("Coverage gaps")
        title.setFont(theme.font(26, QFont.Weight.Light))
        cl.addWidget(title)
        cl.addWidget(rule())
        any_gap = False
        for label, key, rows in self.cat.coverage_gaps():
            if not rows:
                continue
            any_gap = True
            head = QHBoxLayout()
            lbl = QLabel(label)
            lbl.setFont(theme.font(16, QFont.Weight.Medium))
            badge = QLabel(str(len(rows)))
            badge.setObjectName("badge")
            badge.setFont(theme.numerals(theme.font(14, QFont.Weight.Medium)))
            badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
            badge.setMinimumWidth(30)
            head.addWidget(lbl, 1)
            head.addWidget(badge)
            cl.addLayout(head)
            for rid, name in rows[:4]:
                b = QPushButton(name)
                b.setProperty("variant", "link")
                b.setFont(theme.font(15))
                b.setCursor(Qt.CursorShape.PointingHandCursor)
                b.clicked.connect(lambda _=False, k=key, i=rid: self.navigate.emit(k, i))
                cl.addWidget(b)
            if len(rows) > 4:
                more = QLabel(f"and {len(rows) - 4} more")
                more.setObjectName("italic")
                more.setFont(theme.font(14, italic=True))
                cl.addWidget(more)
        if not any_gap:
            ok = QLabel("Every persona is mapped to an interest, a pattern, and a pathway."
                        if self.cat.counts()["personas"] else "Add your first persona to begin.")
            ok.setObjectName("italic")
            ok.setFont(theme.font(16, italic=True))
            ok.setWordWrap(True)
            cl.addWidget(ok)
        cl.addStretch(1)
        return c

    def _actions_card(self) -> QWidget:
        c = card()
        cl = QVBoxLayout(c)
        cl.setContentsMargins(26, 22, 26, 22)
        cl.setSpacing(10)
        cl.addWidget(theme.eyebrow("From recent insights"))
        title = QLabel("Action items")
        title.setFont(theme.font(26, QFont.Weight.Light))
        cl.addWidget(title)
        cl.addWidget(rule())
        actions = self.cat.open_actions()
        if not actions:
            none = QLabel("Log an insight with action items and they will gather here.")
            none.setObjectName("italic")
            none.setFont(theme.font(16, italic=True))
            none.setWordWrap(True)
            cl.addWidget(none)
        for iid, day, name, item in actions:
            b = QPushButton(item)
            b.setProperty("variant", "link")
            b.setFont(theme.font(16))
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            b.clicked.connect(lambda _=False, i=iid: self.navigate.emit("insights", i))
            cl.addWidget(b)
            src = QLabel(f"{_short(day)}  ·  {name}")
            src.setObjectName("italic")
            src.setFont(theme.font(13, italic=True))
            cl.addWidget(src)
        cl.addStretch(1)
        return c


class SettingsPage(QWidget):
    data_changed = Signal()

    def __init__(self, cat: Catalog, parent=None):
        super().__init__(parent)
        self.cat = cat
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        scroll, lay = _page()
        outer.addWidget(scroll)

        lay.addWidget(theme.eyebrow("Settings"))
        lay.addWidget(theme.heading("Your data", 40))
        note = QLabel("Everything stays on this computer. Nothing is sent anywhere.")
        note.setObjectName("italic")
        note.setFont(theme.font(18, italic=True))
        lay.addWidget(note)
        lay.addSpacing(8)

        lay.addWidget(self._section(
            "Data file", f"{cat.path}",
            [("Show in folder", "outline", self._reveal), ("Back up now", "primary", self._backup)]))
        lay.addWidget(self._section(
            "Export", "JSON keeps every field and link and can be imported back. "
                      "Markdown is for reading and sharing.",
            [("Export JSON", "primary", self._export_json),
             ("Export Markdown", "outline", self._export_md)]))
        lay.addWidget(self._section(
            "Import", "Add records from a JSON export. Merge keeps what you have; "
                      "Replace clears the catalog first. Either way, a bad file changes nothing.",
            [("Import and merge", "primary", lambda: self._import(False)),
             ("Import and replace", "danger", lambda: self._import(True))]))
        lay.addWidget(self._section(
            "Privacy", "Personas are composites, not people. Keep real names, private handles, "
                       "emails, and screenshots of private messages out of this catalog.", []))
        lay.addStretch(1)

    def _section(self, title, body, buttons) -> QWidget:
        c = card()
        cl = QVBoxLayout(c)
        cl.setContentsMargins(26, 22, 26, 22)
        cl.setSpacing(10)
        t = QLabel(title)
        t.setFont(theme.font(24, QFont.Weight.Light))
        cl.addWidget(t)
        b = QLabel(body)
        b.setObjectName("muted")
        b.setFont(theme.font(16))
        b.setWordWrap(True)
        b.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        cl.addWidget(b)
        if buttons:
            row = QHBoxLayout()
            for label, variant, fn in buttons:
                btn = QPushButton(label)
                theme.style_button(btn, variant)
                btn.clicked.connect(fn)
                row.addWidget(btn)
            row.addStretch(1)
            cl.addLayout(row)
        return c

    def _reveal(self):
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self.cat.path.parent)))

    def _backup(self):
        default = str(Path.home() / f"audience-catalog-backup-{date.today().isoformat()}.sqlite")
        path, _ = QFileDialog.getSaveFileName(self, "Back up catalog", default, "SQLite (*.sqlite)")
        if not path:
            return
        if os.path.abspath(path) == os.path.abspath(self.cat.path):
            QMessageBox.warning(self, "Back up", "Choose a different file than the live catalog.")
            return
        self.cat.backup_to(path)
        QMessageBox.information(self, "Back up", f"Backup saved to\n{path}")

    def _export_json(self):
        default = str(Path.home() / f"audience-catalog-{date.today().isoformat()}.json")
        path, _ = QFileDialog.getSaveFileName(self, "Export JSON", default, "JSON (*.json)")
        if path:
            transfer.export_json(self.cat, path)
            QMessageBox.information(self, "Export", f"Exported to\n{path}")

    def _export_md(self):
        default = str(Path.home() / f"audience-catalog-{date.today().isoformat()}.md")
        path, _ = QFileDialog.getSaveFileName(self, "Export Markdown", default, "Markdown (*.md)")
        if path:
            transfer.export_markdown(self.cat, path)
            QMessageBox.information(self, "Export", f"Exported to\n{path}")

    def _import(self, replace: bool):
        path, _ = QFileDialog.getOpenFileName(self, "Import JSON", str(Path.home()), "JSON (*.json)")
        if not path:
            return
        if replace:
            sure = QMessageBox.question(
                self, "Replace catalog",
                "Replace everything in the catalog with this file? Consider backing up first.",
                QMessageBox.StandardButton.Cancel | QMessageBox.StandardButton.Yes,
                QMessageBox.StandardButton.Cancel)
            if sure != QMessageBox.StandardButton.Yes:
                return
        try:
            counts = transfer.import_json(self.cat, path, replace=replace)
        except (ValidationError, OSError) as exc:
            QMessageBox.warning(self, "Import", f"Nothing was imported.\n\n{exc}")
            return
        summary = "\n".join(f"{ENTITIES[k].label}: {n}" for k, n in counts.items() if n)
        QMessageBox.information(self, "Import", f"Imported\n\n{summary or 'No records in file.'}")
        self.data_changed.emit()


def _short(day: str) -> str:
    try:
        return date.fromisoformat(day).strftime("%b %d").replace(" 0", " ")
    except (TypeError, ValueError):
        return day or ""
