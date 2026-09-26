"""Reusable form widgets: chips input, relationship picker, flow layout."""
from __future__ import annotations

from PySide6.QtCore import QPoint, QRect, QSize, Qt, Signal
from PySide6.QtWidgets import (
    QComboBox, QFrame, QHBoxLayout, QLabel, QLayout, QLineEdit, QListWidget,
    QListWidgetItem, QSizePolicy, QToolButton, QVBoxLayout, QWidget,
)

from .. import theme


class FlowLayout(QLayout):
    """Wraps children onto new lines like inline text."""

    def __init__(self, parent=None, spacing: int = 6):
        super().__init__(parent)
        self._items = []
        self._spacing = spacing
        self.setContentsMargins(0, 0, 0, 0)

    def addItem(self, item):
        self._items.append(item)

    def count(self):
        return len(self._items)

    def itemAt(self, i):
        return self._items[i] if 0 <= i < len(self._items) else None

    def takeAt(self, i):
        return self._items.pop(i) if 0 <= i < len(self._items) else None

    def hasHeightForWidth(self):
        return True

    def heightForWidth(self, width):
        return self._do_layout(QRect(0, 0, width, 0), apply=False)

    def setGeometry(self, rect):
        super().setGeometry(rect)
        self._do_layout(rect, apply=True)

    def sizeHint(self):
        return self.minimumSize()

    def minimumSize(self):
        size = QSize()
        for item in self._items:
            size = size.expandedTo(item.minimumSize())
        return size

    def _do_layout(self, rect, apply):
        x, y, line_h = rect.x(), rect.y(), 0
        for item in self._items:
            hint = item.sizeHint()
            if x + hint.width() > rect.right() and line_h > 0:
                x, y, line_h = rect.x(), y + line_h + self._spacing, 0
            if apply:
                item.setGeometry(QRect(QPoint(x, y), hint))
            x += hint.width() + self._spacing
            line_h = max(line_h, hint.height())
        return y + line_h - rect.y()


class Chip(QFrame):
    removed = Signal(str)

    def __init__(self, text: str, parent=None):
        super().__init__(parent)
        self.setObjectName("chip")
        self.text = text
        lay = QHBoxLayout(self)
        lay.setContentsMargins(12, 3, 6, 3)
        lay.setSpacing(4)
        lbl = QLabel(text)
        lbl.setFont(theme.font(14))
        x = QToolButton()
        x.setObjectName("chipX")
        x.setText("×")
        x.setCursor(Qt.CursorShape.PointingHandCursor)
        x.setToolTip(f"Remove {text}")
        x.clicked.connect(lambda: self.removed.emit(self.text))
        lay.addWidget(lbl)
        lay.addWidget(x)


class TagInput(QWidget):
    """List of short strings shown as chips. Enter or comma adds; paste of
    a comma- or line-separated list adds each item."""
    changed = Signal()

    def __init__(self, placeholder: str = "Type and press Enter", parent=None):
        super().__init__(parent)
        self._values: list[str] = []
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(6)
        self._chips_host = QWidget()
        self._flow = FlowLayout(self._chips_host)
        self._chips_host.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Minimum)
        self.edit = QLineEdit()
        self.edit.setPlaceholderText(placeholder)
        self.edit.returnPressed.connect(self._commit)
        self.edit.textEdited.connect(self._maybe_split)
        outer.addWidget(self._chips_host)
        outer.addWidget(self.edit)
        self._render()

    def value(self) -> list[str]:
        self._commit()  # a half-typed item should not be silently lost on save
        return list(self._values)

    def set_value(self, values: list[str] | None) -> None:
        self._values = list(values or [])
        self.edit.clear()
        self._render()

    def _maybe_split(self, text: str) -> None:
        if "," in text or "\n" in text:
            self._commit()

    def _commit(self) -> None:
        parts = [p.strip() for p in self.edit.text().replace("\n", ",").split(",")]
        added = False
        lower = {v.casefold() for v in self._values}
        for p in parts:
            if p and p.casefold() not in lower:
                self._values.append(p)
                lower.add(p.casefold())
                added = True
        if self.edit.text():
            self.edit.clear()
        if added:
            self._render()
            self.changed.emit()

    def _remove(self, text: str) -> None:
        self._values = [v for v in self._values if v != text]
        self._render()
        self.changed.emit()

    def _render(self) -> None:
        while self._flow.count():
            item = self._flow.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        for v in self._values:
            chip = Chip(v)
            chip.removed.connect(self._remove)
            self._flow.addWidget(chip)
        self._chips_host.setVisible(bool(self._values))
        self._chips_host.updateGeometry()


class LinkPicker(QWidget):
    """Many-to-many picker: filterable checklist of (id, name)."""
    changed = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(6)
        self.filter = QLineEdit()
        self.filter.setPlaceholderText("Filter")
        self.filter.textChanged.connect(self._apply_filter)
        self.list = QListWidget()
        self.list.setObjectName("picker")
        self.list.itemChanged.connect(lambda _item: self._on_changed())
        self.summary = QLabel()
        self.summary.setObjectName("muted")
        self.summary.setFont(theme.font(13, italic=True))
        lay.addWidget(self.filter)
        lay.addWidget(self.list)
        lay.addWidget(self.summary)
        self._loading = False

    def set_options(self, options: list[tuple[int, str]], selected: list[int]) -> None:
        self._loading = True
        chosen = set(selected or [])
        self.list.clear()
        for rec_id, name in options:
            item = QListWidgetItem(name)
            item.setData(Qt.ItemDataRole.UserRole, rec_id)
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Checked if rec_id in chosen else Qt.CheckState.Unchecked)
            self.list.addItem(item)
        empty = not options
        row = self.list.sizeHintForRow(0) if options else 0
        self.list.setFixedHeight(min(150, row * len(options) + 14) if options else 0)
        self.filter.setVisible(len(options) > 6)
        self.list.setVisible(not empty)
        self._loading = False
        self._update_summary(empty)
        self._apply_filter(self.filter.text())

    def value(self) -> list[int]:
        return [self.list.item(i).data(Qt.ItemDataRole.UserRole)
                for i in range(self.list.count())
                if self.list.item(i).checkState() == Qt.CheckState.Checked]

    def _apply_filter(self, text: str) -> None:
        t = text.strip().casefold()
        for i in range(self.list.count()):
            item = self.list.item(i)
            item.setHidden(bool(t) and t not in item.text().casefold())

    def _on_changed(self) -> None:
        if self._loading:
            return
        self._update_summary(False)
        self.changed.emit()

    def _update_summary(self, empty: bool) -> None:
        if empty:
            self.summary.setText("Nothing to link yet. Add some first.")
        else:
            n = len(self.value())
            self.summary.setText("None linked" if n == 0 else f"{n} linked")


class RefPicker(QComboBox):
    """Single foreign key with an explicit 'None' choice."""

    def set_options(self, options: list[tuple[int, str]], selected: int | None) -> None:
        self.blockSignals(True)
        self.clear()
        self.addItem("None", None)
        for rec_id, name in options:
            self.addItem(name, rec_id)
        idx = self.findData(selected) if selected else 0
        self.setCurrentIndex(max(idx, 0))
        self.blockSignals(False)

    def value(self) -> int | None:
        return self.currentData()


def card(parent=None) -> QFrame:
    f = QFrame(parent)
    f.setObjectName("card")
    return f


def rule(parent=None) -> QFrame:
    f = QFrame(parent)
    f.setObjectName("rule")
    return f
