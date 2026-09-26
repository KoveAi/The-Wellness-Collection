# Review of the original "Real Audience Catalog" spec

The source was an AI-generated blueprint addressed to "Christopher". It described a
Python desktop app for social-media audience research. It reads as complete, but most
of it is a list of nouns; the parts that decide whether the app works were left open.

## Leaks and gaps, and what this build does instead

### Data integrity
| # | Leak in the spec | Consequence | Fix here |
|---|------------------|-------------|----------|
| 1 | Relationships stored as `TEXT` (`related_personas`, `linked_clusters`, ...) | Rename or delete a persona and links silently point at nothing; no reverse lookup | 7 join tables with foreign keys and `ON DELETE CASCADE` |
| 2 | `engagement_patterns.persona_id` has no `REFERENCES` | Orphan rows | Real FK; `PRAGMA foreign_keys = ON` on every connection (SQLite leaves it off by default) |
| 3 | No `NOT NULL`, `CHECK`, or defaults | Blank names, NULL vs empty string mixed | `name` required and non-blank; everything else `NOT NULL DEFAULT` |
| 4 | List fields (`subtopics`, `hashtags`) as free `TEXT` | Tagging and search cannot work reliably | JSON arrays guarded by `CHECK(json_valid(...))` |
| 5 | `date TEXT` with no format | Unsortable dates | `insight_date` must be `YYYY-MM-DD` (enforced in SQL and in code) |
| 6 | Column names `groups` and `date` | SQL keyword and function name | Renamed `community_groups`, `insight_date` |
| 7 | No `created_at` / `updated_at` | No history, no "recent" view | Both on every table |
| 8 | Three tables have no name column | List views have nothing to show | `name` on every entity |

### Privacy and data handling
| # | Leak | Fix |
|---|------|-----|
| 9 | `database/db.sqlite` sits inside the project tree | Research notes end up in git. Database now lives in the per-user data folder; `*.sqlite` is gitignored |
| 10 | "Real Audience" plus `accounts`, `location`, `age_range` with no guidance | Invites storing real people. Field hints and the Settings page say personas are composites; public handles only |
| 11 | "AI-assisted content idea generator" with no data boundary | Not built. It would send catalog contents to a third party and needs a decision first |
| 12 | Preamble names the recipient and says "the version a real developer would use" | The doc is chat output, not a spec. Remove the preamble before sharing it further |

### Undecided choices presented as a plan
| # | Leak | Decision |
|---|------|----------|
| 13 | "PyQt6 or Tkinter", "Kivy, or Electron" | PySide6: styles well enough to match the brand, and LGPL. PyQt6 is GPL or paid commercial, which matters if this is ever distributed |
| 14 | "JSON or SQLite" storage | SQLite for storage; JSON only for export/import |
| 15 | "MVC or MVVM", optional SQLAlchemy | Metadata-driven: `entities.py` plus one data module. No ORM needed at this size |
| 16 | JSON export is camelCase, schema is snake_case, no mapping | One naming scheme (snake_case) everywhere |
| 17 | Export has no version or format marker | `format` + `version` fields; wrong or future files are refused, not half-imported |

### Missing behavior
| # | Leak | Fix |
|---|------|-----|
| 18 | Only 1 of 7 models written; the model is a bare class, not "JSON-friendly" | Declarative `Entity`/`Field` definitions cover all seven |
| 19 | Seven near-identical editor files | One generic editor built from metadata |
| 20 | "Tagging system" never specified | `tags` list on every record, filter per page |
| 21 | Dashboard and Settings listed with no content | Dashboard: counts, coverage gaps, action items. Settings: data path, backup, export, import |
| 22 | Duplicate/Delete semantics undefined | Duplicate copies fields and links; Delete confirms and names what cascades |
| 23 | No unsaved-change handling | Prompt on record switch, page switch, and quit |
| 24 | No import, no backup, no migrations | All three; schema version in `PRAGMA user_version`; newer files refused |
| 25 | `validators.py` / `helpers.py` named, never defined | Validation lives in `db.py` and is tested |
| 26 | No tests, no run instructions, no dependency file | 30 pytest tests, README, `requirements.txt` |
| 27 | Search: LIKE on user text | Wildcards `%` and `_` are escaped so they match literally |

## Not built (from "Optional Advanced Features")

- AI idea generator: needs a decision on what data may leave the machine (item 11).
- Persona similarity scoring and cluster heatmaps: possible now that links are real
  (for example, overlap of linked clusters), but no one has said what question they
  should answer. Worth defining before building.
