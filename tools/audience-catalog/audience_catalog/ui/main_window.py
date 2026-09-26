"""Main window: cream sidebar with the oval mark, stacked pages."""
from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QIcon, QPixmap
from PySide6.QtWidgets import (
    QButtonGroup, QHBoxLayout, QLabel, QMainWindow, QPushButton, QStackedWidget,
    QVBoxLayout, QWidget,
)

from .. import theme
from ..db import Catalog
from ..entities import ENTITIES
from .dashboard import Dashboard, SettingsPage
from .entity_page import EntityPage


class MainWindow(QMainWindow):
    def __init__(self, cat: Catalog):
        super().__init__()
        self.cat = cat
        self.setWindowTitle("Audience Catalog  ·  The Wellness Collection")
        self.setWindowIcon(QIcon(str(theme.ASSETS / "icon.png")))
        self.resize(1360, 880)
        self.setMinimumSize(1080, 680)

        root = QWidget()
        root.setObjectName("root")
        lay = QHBoxLayout(root)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(0)
        self.setCentralWidget(root)

        self.stack = QStackedWidget()
        self.dashboard = Dashboard(cat)
        self.dashboard.navigate.connect(self.go)
        self.pages: dict[str, EntityPage] = {}
        self.stack.addWidget(self.dashboard)
        for key, ent in ENTITIES.items():
            page = EntityPage(cat, ent)
            page.navigate.connect(self.go)
            page.data_changed.connect(self._on_data_changed)
            self.pages[key] = page
            self.stack.addWidget(page)
        self.settings = SettingsPage(cat)
        self.settings.data_changed.connect(self._on_import)
        self.stack.addWidget(self.settings)

        lay.addWidget(self._sidebar())
        lay.addWidget(self.stack, 1)
        self.go("dashboard", 0)

    def _sidebar(self) -> QWidget:
        side = QWidget()
        side.setObjectName("sidebar")
        side.setFixedWidth(248)
        sl = QVBoxLayout(side)
        sl.setContentsMargins(0, 28, 0, 20)
        sl.setSpacing(0)

        logo = QLabel()
        pix = QPixmap(str(theme.ASSETS / "logo.png"))
        if not pix.isNull():
            dpr = self.devicePixelRatioF() or 1.0
            pix = pix.scaled(int(132 * dpr), int(132 * dpr), Qt.AspectRatioMode.KeepAspectRatio,
                             Qt.TransformationMode.SmoothTransformation)
            pix.setDevicePixelRatio(dpr)
            logo.setPixmap(pix)
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sl.addWidget(logo)
        sl.addSpacing(10)
        brand = QLabel("Audience Catalog")
        brand.setObjectName("brand")
        brand.setFont(theme.font(22, QFont.Weight.Light))
        brand.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sl.addWidget(brand)
        sub = QLabel("GRACEFULLY REDEFINED")
        sub.setObjectName("brandSub")
        sub.setFont(theme.font(10, QFont.Weight.Medium, spacing=140))
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sl.addWidget(sub)
        sl.addSpacing(26)

        self.nav = QButtonGroup(self)
        self.nav.setExclusive(True)
        self.nav_buttons: dict[str, QPushButton] = {}
        items = [("dashboard", "Dashboard")] + [(k, e.label) for k, e in ENTITIES.items()]
        for key, label in items:
            sl.addWidget(self._nav_button(key, label))
        sl.addStretch(1)
        sl.addWidget(self._nav_button("settings", "Settings"))
        return side

    def _nav_button(self, key: str, label: str) -> QPushButton:
        b = QPushButton(label)
        b.setObjectName("nav")
        b.setCheckable(True)
        b.setFont(theme.font(17))
        b.setCursor(Qt.CursorShape.PointingHandCursor)
        b.clicked.connect(lambda _=False, k=key: self.go(k, 0))
        self.nav.addButton(b)
        self.nav_buttons[key] = b
        return b

    def _current_editor_ok(self) -> bool:
        page = self.stack.currentWidget()
        return page.editor.confirm_leave() if isinstance(page, EntityPage) else True

    def go(self, key: str, rec_id: int) -> None:
        target = (self.dashboard if key == "dashboard" else
                  self.settings if key == "settings" else self.pages[key])
        if target is not self.stack.currentWidget() and not self._current_editor_ok():
            self._sync_nav()
            return
        if target is self.dashboard:
            self.dashboard.refresh()
        elif isinstance(target, EntityPage):
            target.reload_options()
            target.refresh()
            if rec_id:
                target.open_record(rec_id)
        self.stack.setCurrentWidget(target)
        self._sync_nav()

    def _sync_nav(self) -> None:
        current = self.stack.currentWidget()
        for key, b in self.nav_buttons.items():
            page = (self.dashboard if key == "dashboard" else
                    self.settings if key == "settings" else self.pages[key])
            b.setChecked(page is current)

    def _on_data_changed(self) -> None:
        # Pickers on other pages list titles; keep them current.
        for page in self.pages.values():
            if page is not self.stack.currentWidget():
                page.reload_options()
                page.refresh()

    def _on_import(self) -> None:
        for page in self.pages.values():
            page.editor.load(None)
            page.refresh()

    def closeEvent(self, event) -> None:
        if self._current_editor_ok():
            self.cat.close()
            event.accept()
        else:
            event.ignore()
