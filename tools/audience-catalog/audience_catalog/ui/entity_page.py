"""One page per entity: filterable list on the left, editor on the right.
Built from entity metadata, so all seven sections share one code path."""
from __future__ import annotations

from datetime import date

from PySide6.QtCore import QDate, Qt, QTimer, Signal
from PySide6.QtGui import QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QComboBox, QDateEdit, QHBoxLayout, QLabel, QLineEdit, QListWidget,
    QListWidgetItem, QMessageBox, QPlainTextEdit, QPushButton, QScrollArea,
    QSplitter, QVBoxLayout, QWidget,
)

from .. import theme
from ..db import Catalog, ValidationError
from ..entities import CHOICE, DATE, ENTITIES, LINE, LINK, LIST, REF, TEXT, Entity
from .widgets import LinkPicker, RefPicker, TagInput, card, rule


class RecordEditor(QWidget):
    saved = Signal(int)
    deleted = Signal()
    navigate = Signal(str, int)  # entity key, record id

    def __init__(self, cat: Catalog, ent: Entity, parent=None):
        super().__init__(parent)
        self.cat, self.ent = cat, ent
        self.rec_id: int | None = None
        self.dirty = False
        self._loading = False
        self.inputs: dict[str, QWidget] = {}

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        body = QWidget()
        self.form = QVBoxLayout(body)
        self.form.setContentsMargins(40, 32, 40, 32)
        self.form.setSpacing(20)
        scroll.setWidget(body)

        self.kicker = theme.eyebrow(ent.singular)
        self.title = theme.heading("", 34)
        self.title.setWordWrap(True)
        self.meta = QLabel()
        self.meta.setObjectName("italic")
        self.meta.setFont(theme.font(14, italic=True))
        self.form.addWidget(self.kicker)
        self.form.addWidget(self.title)
        self.form.addWidget(self.meta)
        self.form.addWidget(rule())

        for f in ent.fields:
            self.form.addLayout(self._build_field(f))

        self.backlinks_box = QVBoxLayout()
        self.backlinks_box.setSpacing(4)
        self.form.addSpacing(8)
        self.form.addLayout(self.backlinks_box)
        self.form.addStretch(1)
        outer.addWidget(scroll, 1)

        # Action bar
        bar = QWidget()
        bar.setObjectName("sidebar")  # same cream strip as the nav
        bl = QHBoxLayout(bar)
        bl.setContentsMargins(40, 14, 40, 14)
        self.status = QLabel()
        self.status.setFont(theme.font(14, italic=True))
        self.btn_delete = QPushButton("Delete")
        theme.style_button(self.btn_delete, "danger")
        self.btn_dup = QPushButton("Duplicate")
        theme.style_button(self.btn_dup, "outline")
        self.btn_save = QPushButton("Save")
        theme.style_button(self.btn_save, "dark")
        self.btn_delete.clicked.connect(self.delete)
        self.btn_dup.clicked.connect(self.duplicate)
        self.btn_save.clicked.connect(self.save)
        bl.addWidget(self.status, 1)
        bl.addWidget(self.btn_delete)
        bl.addWidget(self.btn_dup)
        bl.addWidget(self.btn_save)
        outer.addWidget(bar)

        QShortcut(QKeySequence.StandardKey.Save, self, activated=self.save)
        self.load(None)

    # ── construction ──────────────────────────────────────────
    def _build_field(self, f) -> QVBoxLayout:
        box = QVBoxLayout()
        box.setSpacing(6)
        box.addWidget(theme.field_label(f.label + (" *" if f.key == "name" else "")))
        if f.kind == LINE:
            w = QLineEdit()
            w.textEdited.connect(self._mark_dirty)
            if f.key == "name":
                w.textEdited.connect(lambda t: self.title.setText(t or f"New {self.ent.singular}"))
        elif f.kind == TEXT:
            w = QPlainTextEdit()
            w.setMinimumHeight(88)
            w.setMaximumHeight(160)
            w.setTabChangesFocus(True)
            w.textChanged.connect(self._mark_dirty)
        elif f.kind == LIST:
            w = TagInput()
            w.changed.connect(self._mark_dirty)
        elif f.kind == CHOICE:
            w = QComboBox()
            w.setEditable(True)
            w.addItems(["", *f.choices])
            w.currentTextChanged.connect(self._mark_dirty)
        elif f.kind == DATE:
            w = QDateEdit()
            w.setCalendarPopup(True)
            w.setDisplayFormat("MMMM d, yyyy")
            w.dateChanged.connect(self._mark_dirty)
        elif f.kind == REF:
            w = RefPicker()
            w.currentIndexChanged.connect(self._mark_dirty)
        elif f.kind == LINK:
            w = LinkPicker()
            w.changed.connect(self._mark_dirty)
        else:  # pragma: no cover - guarded by test_schema_sync
            raise ValueError(f.kind)
        if f.hint:
            if hasattr(w, "setPlaceholderText"):
                w.setPlaceholderText(f.hint)
            elif isinstance(w, TagInput):
                w.edit.setPlaceholderText(f.hint + "  ·  Enter to add")
        elif isinstance(w, TagInput):
            w.edit.setPlaceholderText("Type and press Enter")
        self.inputs[f.key] = w
        box.addWidget(w)
        return box

    # ── state ─────────────────────────────────────────────────
    def _mark_dirty(self, *_):
        if self._loading or self.dirty:
            return
        self.dirty = True
        self._set_status("Unsaved changes", "muted")

    def _set_status(self, text: str, kind: str = "saved") -> None:
        self.status.setObjectName(kind)
        self.status.style().unpolish(self.status)
        self.status.style().polish(self.status)
        self.status.setText(text)
        if kind == "saved":
            QTimer.singleShot(2500, lambda: self.status.text() == text and self.status.setText(""))

    def load(self, rec_id: int | None) -> None:
        rec = self.cat.get(self.ent.key, rec_id) if rec_id else None
        self.rec_id = rec["id"] if rec else None
        self._loading = True
        for f in self.ent.fields:
            w = self.inputs[f.key]
            value = rec.get(f.key) if rec else None
            if f.kind == LINE:
                w.setText(value or "")
            elif f.kind == TEXT:
                w.setPlainText(value or "")
            elif f.kind == LIST:
                w.set_value(value or [])
            elif f.kind == CHOICE:
                w.setCurrentText(value or "")
            elif f.kind == DATE:
                d = date.fromisoformat(value) if value else date.today()
                w.setDate(QDate(d.year, d.month, d.day))
            elif f.kind == REF:
                w.set_options(self.cat.titles(f.target), value)
            elif f.kind == LINK:
                w.set_options(self.cat.titles(f.target), value or [])
        self._loading = False
        self.dirty = False
        self.title.setText(rec["name"] if rec else f"New {self.ent.singular}")
        self.meta.setText(
            f"Created {_friendly(rec['created_at'])}  ·  Updated {_friendly(rec['updated_at'])}"
            if rec else "Not saved yet"
        )
        self.btn_delete.setEnabled(rec is not None)
        self.btn_dup.setEnabled(rec is not None)
        self.status.setText("")
        self._render_backlinks()

    def _render_backlinks(self) -> None:
        while self.backlinks_box.count():
            item = self.backlinks_box.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        if not self.rec_id:
            return
        links = self.cat.backlinks(self.ent.key, self.rec_id)
        if not links:
            return
        self.backlinks_box.addWidget(theme.field_label("Referenced by"))
        for key, rid, name in links:
            b = QPushButton(f"{ENTITIES[key].singular}  ·  {name}")
            b.setProperty("variant", "link")
            b.setFont(theme.font(15))
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            b.clicked.connect(lambda _=False, k=key, i=rid: self.navigate.emit(k, i))
            self.backlinks_box.addWidget(b)

    def collect(self) -> dict:
        rec: dict = {"id": self.rec_id}
        for f in self.ent.fields:
            w = self.inputs[f.key]
            if f.kind == LINE:
                rec[f.key] = w.text()
            elif f.kind == TEXT:
                rec[f.key] = w.toPlainText()
            elif f.kind in (LIST, LINK, REF):
                rec[f.key] = w.value()
            elif f.kind == CHOICE:
                rec[f.key] = w.currentText()
            elif f.kind == DATE:
                rec[f.key] = w.date().toString("yyyy-MM-dd")
        return rec

    # ── actions ───────────────────────────────────────────────
    def save(self) -> bool:
        try:
            new_id = self.cat.save(self.ent.key, self.collect())
        except ValidationError as exc:
            self._set_status(str(exc), "error")
            if "Name" in str(exc):
                self.inputs["name"].setFocus()
            return False
        self.load(new_id)
        self._set_status("Saved")
        self.saved.emit(new_id)
        return True

    def duplicate(self) -> None:
        if not self.rec_id or not self.confirm_leave():
            return
        new_id = self.cat.duplicate(self.ent.key, self.rec_id)
        self.load(new_id)
        self._set_status("Duplicated. You are editing the copy.")
        self.saved.emit(new_id)

    def delete(self) -> None:
        if not self.rec_id:
            return
        name = self.inputs["name"].text() or self.ent.singular
        refs = self.cat.backlinks(self.ent.key, self.rec_id)
        detail = ""
        if refs:
            detail = f"\n\nIt is linked from {len(refs)} other record(s). Those links will be removed."
            cascades = [r for r in refs if r[0] == "engagement_patterns"]
            if cascades:
                detail += f" {len(cascades)} engagement pattern(s) belong to this persona and will be deleted too."
        answer = QMessageBox.question(
            self, "Delete", f"Delete “{name}”? This cannot be undone.{detail}",
            QMessageBox.StandardButton.Cancel | QMessageBox.StandardButton.Yes,
            QMessageBox.StandardButton.Cancel,
        )
        if answer != QMessageBox.StandardButton.Yes:
            return
        self.cat.delete(self.ent.key, self.rec_id)
        self.load(None)
        self.deleted.emit()

    def confirm_leave(self) -> bool:
        """True when it is safe to discard the current form."""
        if not self.dirty:
            return True
        box = QMessageBox(self)
        box.setWindowTitle("Unsaved changes")
        box.setText(f"Save changes to “{self.inputs['name'].text() or 'this ' + self.ent.singular.lower()}”?")
        box.setStandardButtons(QMessageBox.StandardButton.Save | QMessageBox.StandardButton.Discard
                               | QMessageBox.StandardButton.Cancel)
        box.setDefaultButton(QMessageBox.StandardButton.Save)
        choice = box.exec()
        if choice == QMessageBox.StandardButton.Save:
            return self.save()
        return choice == QMessageBox.StandardButton.Discard


class EntityPage(QWidget):
    navigate = Signal(str, int)
    data_changed = Signal()

    def __init__(self, cat: Catalog, ent: Entity, parent=None):
        super().__init__(parent)
        self.cat, self.ent = cat, ent
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        split = QSplitter(Qt.Orientation.Horizontal)
        split.setChildrenCollapsible(False)
        lay.addWidget(split)

        # ── list column
        left = QWidget()
        ll = QVBoxLayout(left)
        ll.setContentsMargins(36, 32, 16, 24)
        ll.setSpacing(12)
        ll.addWidget(theme.eyebrow(ent.eyebrow))
        head = QHBoxLayout()
        head.addWidget(theme.heading(ent.label, 36), 1)
        ll.addLayout(head)
        self.count = QLabel()
        self.count.setObjectName("italic")
        self.count.setFont(theme.font(14, italic=True))
        ll.addWidget(self.count)

        self.search = QLineEdit()
        self.search.setObjectName("search")
        self.search.setPlaceholderText(f"Search {ent.label.lower()}")
        self.search.setClearButtonEnabled(True)
        self.search.textChanged.connect(self.refresh)
        self.tag = QComboBox()
        self.tag.currentIndexChanged.connect(self.refresh)
        ll.addWidget(self.search)
        ll.addWidget(self.tag)

        self.list = QListWidget()
        self.list.setObjectName("records")
        self.list.setFont(theme.font(17))
        self.list.currentItemChanged.connect(self._on_select)
        ll.addWidget(self.list, 1)

        self.btn_new = QPushButton(f"New {ent.singular}")
        theme.style_button(self.btn_new, "primary")
        self.btn_new.clicked.connect(self.new)
        ll.addWidget(self.btn_new)
        left.setMinimumWidth(300)
        left.setMaximumWidth(420)

        # ── editor column
        right = card()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        self.editor = RecordEditor(cat, ent)
        self.editor.saved.connect(self._after_save)
        self.editor.deleted.connect(self._after_delete)
        self.editor.navigate.connect(self.navigate)
        rl.addWidget(self.editor)
        wrap = QWidget()
        wl = QVBoxLayout(wrap)
        wl.setContentsMargins(8, 24, 28, 24)
        wl.addWidget(right)

        split.addWidget(left)
        split.addWidget(wrap)
        split.setStretchFactor(1, 1)
        split.setSizes([340, 900])
        self._suppress = False
        self.refresh()

    def reload_options(self) -> None:
        """Other pages may have added targets for our pickers."""
        if not self.editor.dirty:
            self.editor.load(self.editor.rec_id)

    def refresh(self, *_):
        current_tag = self.tag.currentData() or ""
        self.tag.blockSignals(True)
        self.tag.clear()
        self.tag.addItem("All tags", "")
        for t in self.cat.all_tags(self.ent.key):
            self.tag.addItem(f"Tag: {t}", t)
        idx = self.tag.findData(current_tag)
        self.tag.setCurrentIndex(max(idx, 0))
        self.tag.setVisible(self.tag.count() > 1)
        self.tag.blockSignals(False)

        records = self.cat.list(self.ent.key, self.search.text(), self.tag.currentData() or "")
        total = self.cat.counts()[self.ent.key]
        self._suppress = True
        self.list.clear()
        for rec in records:
            item = QListWidgetItem(rec["name"])
            item.setData(Qt.ItemDataRole.UserRole, rec["id"])
            self.list.addItem(item)
            if rec["id"] == self.editor.rec_id:
                self.list.setCurrentItem(item)
        self._suppress = False
        filtered = len(records) != total
        self.count.setText(
            f"{len(records)} of {total} shown" if filtered
            else ("Nothing here yet" if total == 0 else f"{total} {'entry' if total == 1 else 'entries'}")
        )

    def _on_select(self, item, previous):
        if self._suppress or item is None:
            return
        rec_id = item.data(Qt.ItemDataRole.UserRole)
        if rec_id == self.editor.rec_id:
            return
        if not self.editor.confirm_leave():
            self._suppress = True
            self.list.setCurrentItem(previous)
            self._suppress = False
            return
        self.editor.load(rec_id)

    def open_record(self, rec_id: int) -> None:
        if self.editor.confirm_leave():
            self.editor.load(rec_id)
            self.refresh()

    def new(self):
        if self.editor.confirm_leave():
            self.editor.load(None)
            self._suppress = True
            self.list.clearSelection()
            self.list.setCurrentItem(None)
            self._suppress = False
            self.editor.inputs["name"].setFocus()

    def _after_save(self, _rec_id):
        self.refresh()
        self.data_changed.emit()

    def _after_delete(self):
        self.refresh()
        self.data_changed.emit()


def _friendly(ts: str | None) -> str:
    if not ts:
        return ""
    try:
        d = date.fromisoformat(ts[:10])
    except ValueError:
        return ts
    return d.strftime("%B %d, %Y").replace(" 0", " ")
