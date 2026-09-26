-- ============================================================
-- Audience Catalog schema (SQLite)
-- Purpose : Local store for audience research behind The Wellness
--           Collection's content and community growth.
-- Version : tracked in PRAGMA user_version (see db.py SCHEMA_VERSION)
--
-- Conventions
--   * Every entity has id, created_at, updated_at, tags.
--   * List-shaped values (subtopics, hashtags, ...) are JSON arrays
--     stored in TEXT and guarded by CHECK(json_valid(...)).
--   * Relationships live in join tables with real foreign keys and
--     ON DELETE CASCADE, never in comma-separated text.
--   * Foreign keys are only enforced when the connection runs
--     PRAGMA foreign_keys = ON (db.py does this on every connect).
-- ============================================================

CREATE TABLE IF NOT EXISTS personas (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    description           TEXT    NOT NULL DEFAULT '',
    age_range             TEXT    NOT NULL DEFAULT '',
    location              TEXT    NOT NULL DEFAULT '',
    motivations           TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(motivations)),
    pain_points           TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(pain_points)),
    aesthetic_preferences TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(aesthetic_preferences)),
    content_habits        TEXT    NOT NULL DEFAULT '',
    follow_triggers       TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(follow_triggers)),
    unfollow_triggers     TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(unfollow_triggers)),
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS interest_clusters (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    description           TEXT    NOT NULL DEFAULT '',
    subtopics             TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(subtopics)),
    example_content_ideas TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(example_content_ideas)),
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- "groups" in the original spec is an SQL keyword (window frames);
-- renamed to community_groups to avoid quoting everywhere.
CREATE TABLE IF NOT EXISTS community_maps (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    platform              TEXT    NOT NULL DEFAULT '',
    hashtags              TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(hashtags)),
    accounts              TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(accounts)),
    community_groups      TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(community_groups)),
    audience_overlap      TEXT    NOT NULL DEFAULT '',
    notes                 TEXT    NOT NULL DEFAULT '',
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS content_triggers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    description           TEXT    NOT NULL DEFAULT '',
    examples              TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(examples)),
    best_formats          TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(best_formats)),
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS growth_pathways (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    description           TEXT    NOT NULL DEFAULT '',
    mechanism             TEXT    NOT NULL DEFAULT '',
    entry_points          TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(entry_points)),
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- persona_id is a real FK. Deleting a persona deletes its patterns,
-- because a pattern without a persona has no meaning.
CREATE TABLE IF NOT EXISTS engagement_patterns (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    persona_id            INTEGER REFERENCES personas(id) ON DELETE CASCADE,
    platform              TEXT    NOT NULL DEFAULT '',
    active_times          TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(active_times)),
    preferred_formats     TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(preferred_formats)),
    high_topics           TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(high_topics)),
    low_topics            TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(low_topics)),
    notes                 TEXT    NOT NULL DEFAULT '',
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS ix_engagement_patterns_persona ON engagement_patterns (persona_id);

-- insight_date is ISO-8601 (YYYY-MM-DD). The original column "date"
-- shadows the SQLite date() function, so it is renamed.
CREATE TABLE IF NOT EXISTS insights (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    insight_date          TEXT    NOT NULL DEFAULT (date('now'))
                                  CHECK (insight_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    source                TEXT    NOT NULL DEFAULT '',
    summary               TEXT    NOT NULL DEFAULT '',
    action_items          TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(action_items)),
    tags                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Relationship tables ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cluster_personas (
    cluster_id INTEGER NOT NULL REFERENCES interest_clusters(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES personas(id)          ON DELETE CASCADE,
    PRIMARY KEY (cluster_id, persona_id)
);
CREATE TABLE IF NOT EXISTS community_personas (
    community_id INTEGER NOT NULL REFERENCES community_maps(id) ON DELETE CASCADE,
    persona_id   INTEGER NOT NULL REFERENCES personas(id)       ON DELETE CASCADE,
    PRIMARY KEY (community_id, persona_id)
);
CREATE TABLE IF NOT EXISTS trigger_clusters (
    trigger_id INTEGER NOT NULL REFERENCES content_triggers(id)  ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES interest_clusters(id) ON DELETE CASCADE,
    PRIMARY KEY (trigger_id, cluster_id)
);
CREATE TABLE IF NOT EXISTS pathway_personas (
    pathway_id INTEGER NOT NULL REFERENCES growth_pathways(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES personas(id)        ON DELETE CASCADE,
    PRIMARY KEY (pathway_id, persona_id)
);
CREATE TABLE IF NOT EXISTS pathway_triggers (
    pathway_id INTEGER NOT NULL REFERENCES growth_pathways(id)  ON DELETE CASCADE,
    trigger_id INTEGER NOT NULL REFERENCES content_triggers(id) ON DELETE CASCADE,
    PRIMARY KEY (pathway_id, trigger_id)
);
CREATE TABLE IF NOT EXISTS insight_personas (
    insight_id INTEGER NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, persona_id)
);
CREATE TABLE IF NOT EXISTS insight_clusters (
    insight_id INTEGER NOT NULL REFERENCES insights(id)          ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES interest_clusters(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, cluster_id)
);

-- Reverse-direction indexes so "what links to this persona?" is not a scan.
CREATE INDEX IF NOT EXISTS ix_cluster_personas_persona   ON cluster_personas (persona_id);
CREATE INDEX IF NOT EXISTS ix_community_personas_persona ON community_personas (persona_id);
CREATE INDEX IF NOT EXISTS ix_trigger_clusters_cluster   ON trigger_clusters (cluster_id);
CREATE INDEX IF NOT EXISTS ix_pathway_personas_persona   ON pathway_personas (persona_id);
CREATE INDEX IF NOT EXISTS ix_pathway_triggers_trigger   ON pathway_triggers (trigger_id);
CREATE INDEX IF NOT EXISTS ix_insight_personas_persona   ON insight_personas (persona_id);
CREATE INDEX IF NOT EXISTS ix_insight_clusters_cluster   ON insight_clusters (cluster_id);
