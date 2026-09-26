"""Brand theme: tokens mirrored from app/globals.css (:root legacy vars)
so the desktop app reads as the same house as the website."""
from __future__ import annotations

from pathlib import Path

from PySide6.QtGui import QFont, QFontDatabase
from PySide6.QtWidgets import QApplication, QLabel, QWidget

ASSETS = Path(__file__).with_name("assets")

# ── Tokens (source: app/globals.css :root) ─────────────────────
BG = "#F4EFEA"          # --bg
CREAM = "#F7F4F2"       # --cream / --header
BLUSH = "#EDE0DC"       # --blush
CARD = "#FFFFFF"        # --card
TEXT = "#1a1a1a"        # --text
MUTED = "#7a7065"       # --text-muted
BORDER = "#E0D8D0"      # --border
BORDER_LIGHT = "#F0EBE6"  # --border-light
MID = "#D1C8BF"         # --mid
GOLD = "#c8922a"        # --gold
SUCCESS = "#4a7a5a"     # --success
SUCCESS_BG = "#e8f0eb"  # .badge-success background
PENDING_TEXT = "#8a6a5a"  # .badge-pending text
ERROR = "#c25a4a"       # design-tokens semantic.error

FAMILY = "Cormorant Garamond"
FALLBACK = "Georgia"


def load_fonts() -> str:
    """Register bundled Cormorant Garamond; fall back to Georgia/serif."""
    loaded = False
    for ttf in sorted((ASSETS / "fonts").glob("*.ttf")):
        if QFontDatabase.addApplicationFont(str(ttf)) != -1:
            loaded = True
    return FAMILY if loaded else FALLBACK


def font(size: int = 16, weight: QFont.Weight = QFont.Weight.Normal,
         italic: bool = False, spacing: float = 100.0) -> QFont:
    """spacing is a percentage (100 = normal); QSS has no letter-spacing."""
    f = QFont(QApplication.font().family(), -1)
    f.setPixelSize(size)
    f.setWeight(weight)
    f.setItalic(italic)
    f.setLetterSpacing(QFont.SpacingType.PercentageSpacing, spacing)
    return f


def numerals(f: QFont) -> QFont:
    """Lining figures for counts: Cormorant's default old-style 1 reads as I."""
    if hasattr(f, "setFeature"):  # Qt 6.7+
        f.setFeature(QFont.Tag("lnum"), 1)
    return f


def eyebrow(text: str, parent: QWidget | None = None) -> QLabel:
    """Small, widely spaced uppercase label (site .lp-eyebrow)."""
    lbl = QLabel(text.upper(), parent)
    lbl.setObjectName("eyebrow")
    lbl.setFont(font(11, QFont.Weight.Medium, spacing=132))
    return lbl


def heading(text: str, size: int = 40, parent: QWidget | None = None) -> QLabel:
    """Display heading: light weight, generous size (site .lp-h1)."""
    lbl = QLabel(text, parent)
    lbl.setObjectName("heading")
    lbl.setFont(font(size, QFont.Weight.Light, spacing=99))
    return lbl


def field_label(text: str, parent: QWidget | None = None) -> QLabel:
    """Form label (site `label`): 11px, medium, uppercase, muted."""
    lbl = QLabel(text.upper(), parent)
    lbl.setObjectName("fieldLabel")
    lbl.setFont(font(11, QFont.Weight.Medium, spacing=110))
    return lbl


def style_button(btn: QWidget, variant: str = "primary") -> None:
    """Variants mirror .btn-primary / .btn-outline / .btn-dark."""
    btn.setProperty("variant", variant)
    btn.setFont(font(12, QFont.Weight.Medium, spacing=110))
    text = btn.text() if hasattr(btn, "text") else ""
    if text:
        btn.setText(text.upper())


STYLESHEET = f"""
* {{ color: {TEXT}; }}
QMainWindow, QWidget#root {{ background: {BG}; }}
QToolTip {{ background: {TEXT}; color: {CARD}; border: none; padding: 6px 10px; }}

/* Sidebar: the site header strip */
QWidget#sidebar {{ background: {CREAM}; border-right: 1px solid {BORDER}; }}
QLabel#brand {{ color: {TEXT}; }}
QLabel#brandSub {{ color: {MUTED}; }}
QPushButton#nav {{
    text-align: left; padding: 10px 22px; border: none; border-radius: 0;
    background: transparent; color: {MUTED};
    border-left: 2px solid transparent;
}}
QPushButton#nav:hover {{ color: {TEXT}; background: {BLUSH}; }}
QPushButton#nav:checked {{ color: {TEXT}; background: {BLUSH}; border-left: 2px solid {TEXT}; }}

QLabel#eyebrow, QLabel#fieldLabel, QLabel#muted {{ color: {MUTED}; }}
QLabel#heading {{ color: {TEXT}; }}
QLabel#italic {{ color: {MUTED}; }}

/* Cards (.card) */
QFrame#card {{ background: {CARD}; border: 1px solid {BORDER_LIGHT}; border-radius: 8px; }}
QFrame#rule {{ background: {BORDER}; max-height: 1px; min-height: 1px; border: none; }}

/* Buttons (.btn-*) */
QPushButton {{
    padding: 10px 22px; border-radius: 4px; border: 1px solid {MID};
    background: {BLUSH}; color: {TEXT};
}}
QPushButton:hover {{ background: {MID}; }}
QPushButton:disabled {{ color: {MID}; background: {CREAM}; border-color: {BORDER}; }}
QPushButton[variant="outline"] {{ background: transparent; }}
QPushButton[variant="outline"]:hover {{ background: {BLUSH}; }}
QPushButton[variant="dark"] {{ background: {TEXT}; color: {CARD}; border-color: {TEXT}; }}
QPushButton[variant="dark"]:hover {{ background: #333333; }}
QPushButton[variant="dark"]:disabled {{ background: {MID}; border-color: {MID}; color: {CREAM}; }}
QPushButton[variant="danger"] {{ background: transparent; color: {ERROR}; border-color: {BORDER}; }}
QPushButton[variant="danger"]:hover {{ background: #f6e6e3; }}
QPushButton[variant="outline"]:disabled, QPushButton[variant="danger"]:disabled {{
    color: {MID}; background: transparent; border-color: {BORDER_LIGHT};
}}
QPushButton[variant="link"] {{
    background: transparent; border: none; padding: 2px 0; color: {TEXT};
    text-align: left; text-decoration: underline;
}}

/* Forms */
QLineEdit, QPlainTextEdit, QComboBox, QDateEdit {{
    background: {CARD}; border: 1px solid {BORDER}; border-radius: 4px;
    padding: 9px 12px; selection-background-color: {BLUSH}; selection-color: {TEXT};
}}
QLineEdit:focus, QPlainTextEdit:focus, QComboBox:focus, QDateEdit:focus {{ border-color: {TEXT}; }}
QLineEdit#search {{ background: {CARD}; }}
QComboBox::drop-down, QDateEdit::drop-down {{ border: none; width: 24px; }}
QComboBox QAbstractItemView {{
    background: {CARD}; border: 1px solid {BORDER}; selection-background-color: {BLUSH};
    selection-color: {TEXT}; outline: none;
}}

/* Record list */
QListWidget#records {{
    background: {CARD}; border: 1px solid {BORDER_LIGHT}; border-radius: 8px;
    outline: none; padding: 6px 0;
}}
QListWidget#records::item {{ padding: 10px 16px; border-bottom: 1px solid {BORDER_LIGHT}; color: {TEXT}; }}
QListWidget#records::item:selected {{ background: {BLUSH}; color: {TEXT}; }}
QListWidget#records::item:hover:!selected {{ background: {CREAM}; }}

QListWidget#picker {{
    background: {CARD}; border: 1px solid {BORDER}; border-radius: 4px; outline: none;
}}
QListWidget#picker::item {{ padding: 5px 8px; }}
QListWidget#picker::item:selected {{ background: {BLUSH}; color: {TEXT}; }}

/* Chips (.badge) */
QFrame#chip {{ background: {BLUSH}; border-radius: 12px; }}
QFrame#chip QLabel {{ color: {TEXT}; }}
QToolButton#chipX {{ border: none; background: transparent; color: {MUTED}; padding: 0 2px; }}
QToolButton#chipX:hover {{ color: {TEXT}; }}
QLabel#badge {{ background: {BLUSH}; color: {PENDING_TEXT}; border-radius: 10px; padding: 2px 10px; }}
QLabel#badgeOk {{ background: {SUCCESS_BG}; color: {SUCCESS}; border-radius: 10px; padding: 2px 10px; }}
QLabel#error {{ color: {ERROR}; }}
QLabel#saved {{ color: {SUCCESS}; }}

QScrollArea {{ background: transparent; border: none; }}
QScrollArea > QWidget > QWidget {{ background: transparent; }}
QScrollBar:vertical {{ background: transparent; width: 10px; margin: 2px; }}
QScrollBar::handle:vertical {{ background: {MID}; border-radius: 4px; min-height: 30px; }}
QScrollBar::add-line, QScrollBar::sub-line {{ height: 0; }}
QScrollBar::add-page, QScrollBar::sub-page {{ background: transparent; }}
QSplitter::handle {{ background: transparent; }}
QMessageBox, QDialog {{ background: {CREAM}; }}
QMenu {{ background: {CARD}; border: 1px solid {BORDER}; }}
QMenu::item {{ padding: 6px 20px; }}
QMenu::item:selected {{ background: {BLUSH}; }}
"""


def apply(app: QApplication) -> None:
    family = load_fonts()
    base = QFont(family)
    base.setPixelSize(16)
    app.setFont(base)
    app.setStyle("Fusion")
    app.setStyleSheet(STYLESHEET)
