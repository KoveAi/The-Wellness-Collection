"""Entity metadata: one declaration drives the database layer, the
editors, search, and export. Adding a field means adding it here and
in schema.sql (tests/test_schema_sync.py fails if the two drift).
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Field kinds
LINE = "line"      # single-line text
TEXT = "text"      # multi-line text
LIST = "list"      # JSON array of short strings, edited as chips
CHOICE = "choice"  # single-line text with suggested values
DATE = "date"      # ISO date, YYYY-MM-DD
REF = "ref"        # single foreign key to another entity
LINK = "link"      # many-to-many via a join table

PLATFORMS = [
    "Instagram", "TikTok", "YouTube", "Pinterest", "Facebook",
    "Threads", "Substack", "Podcast", "Email", "Other",
]


@dataclass(frozen=True)
class Field:
    key: str
    label: str
    kind: str = LINE
    hint: str = ""
    choices: tuple[str, ...] = ()
    # REF / LINK only
    target: str = ""        # entity key of the other side
    join_table: str = ""    # LINK only
    self_col: str = ""      # LINK only: column holding this entity's id
    other_col: str = ""     # LINK only: column holding the target id

    @property
    def is_column(self) -> bool:
        """True when the value is stored on the entity's own row."""
        return self.kind != LINK


@dataclass(frozen=True)
class Entity:
    key: str            # table name
    label: str          # plural, for navigation
    singular: str
    eyebrow: str        # short brand-voice line shown above the page title
    fields: tuple[Field, ...] = field(default_factory=tuple)

    @property
    def columns(self) -> list[Field]:
        return [f for f in self.fields if f.is_column]

    @property
    def links(self) -> list[Field]:
        return [f for f in self.fields if f.kind == LINK]

    def field(self, key: str) -> Field:
        for f in self.fields:
            if f.key == key:
                return f
        raise KeyError(f"{self.key} has no field {key!r}")


NAME = Field("name", "Name", LINE)
TAGS = Field("tags", "Tags", LIST, "Free labels for filtering, e.g. priority, q3, launch")


def _link(key, label, target, join_table, self_col, other_col, hint=""):
    return Field(key, label, LINK, hint, target=target, join_table=join_table,
                 self_col=self_col, other_col=other_col)


ENTITIES: dict[str, Entity] = {e.key: e for e in [
    Entity("personas", "Personas", "Persona", "Who we serve", (
        NAME,
        Field("description", "Description", TEXT, "Who this person is, in two or three sentences"),
        Field("age_range", "Age range", LINE, "e.g. 35 to 50"),
        Field("location", "Location", LINE, "Region or setting, never a real address"),
        Field("motivations", "Motivations", LIST),
        Field("pain_points", "Pain points", LIST),
        Field("aesthetic_preferences", "Aesthetic preferences", LIST),
        Field("content_habits", "Content habits", TEXT),
        Field("follow_triggers", "Why they follow", LIST),
        Field("unfollow_triggers", "Why they leave", LIST),
        TAGS,
    )),
    Entity("interest_clusters", "Interest Clusters", "Interest Cluster", "What they care about", (
        NAME,
        Field("description", "Description", TEXT),
        Field("subtopics", "Subtopics", LIST),
        _link("related_personas", "Related personas", "personas",
              "cluster_personas", "cluster_id", "persona_id"),
        Field("example_content_ideas", "Example content ideas", LIST),
        TAGS,
    )),
    Entity("community_maps", "Community Maps", "Community Map", "Where they gather", (
        NAME,
        Field("platform", "Platform", CHOICE, choices=tuple(PLATFORMS)),
        Field("hashtags", "Hashtags", LIST),
        Field("accounts", "Accounts", LIST, "Public creator or brand handles only"),
        Field("community_groups", "Groups", LIST),
        _link("personas", "Personas found here", "personas",
              "community_personas", "community_id", "persona_id"),
        Field("audience_overlap", "Audience overlap", TEXT),
        Field("notes", "Notes", TEXT),
        TAGS,
    )),
    Entity("content_triggers", "Content Triggers", "Content Trigger", "What moves them", (
        NAME,
        Field("description", "Description", TEXT),
        Field("examples", "Examples", LIST),
        Field("best_formats", "Best formats", LIST, "e.g. carousel, reel, long read"),
        _link("linked_clusters", "Linked clusters", "interest_clusters",
              "trigger_clusters", "trigger_id", "cluster_id"),
        TAGS,
    )),
    Entity("growth_pathways", "Growth Pathways", "Growth Pathway", "How they find us", (
        NAME,
        Field("description", "Description", TEXT),
        Field("mechanism", "Mechanism", TEXT, "Why this pathway works"),
        Field("entry_points", "Entry points", LIST),
        _link("linked_personas", "Linked personas", "personas",
              "pathway_personas", "pathway_id", "persona_id"),
        _link("linked_triggers", "Linked triggers", "content_triggers",
              "pathway_triggers", "pathway_id", "trigger_id"),
        TAGS,
    )),
    Entity("engagement_patterns", "Engagement Patterns", "Engagement Pattern", "When they listen", (
        NAME,
        Field("persona_id", "Persona", REF, target="personas"),
        Field("platform", "Platform", CHOICE, choices=tuple(PLATFORMS)),
        Field("active_times", "Active times", LIST, "e.g. weekday 6 to 7am"),
        Field("preferred_formats", "Preferred formats", LIST),
        Field("high_topics", "Topics that land", LIST),
        Field("low_topics", "Topics that fall flat", LIST),
        Field("notes", "Notes", TEXT),
        TAGS,
    )),
    Entity("insights", "Insights", "Insight", "What we are learning", (
        NAME,
        Field("insight_date", "Date", DATE),
        Field("source", "Source", LINE, "e.g. survey, DM themes, post analytics"),
        Field("summary", "Summary", TEXT),
        _link("linked_personas", "Linked personas", "personas",
              "insight_personas", "insight_id", "persona_id"),
        _link("linked_clusters", "Linked clusters", "interest_clusters",
              "insight_clusters", "insight_id", "cluster_id"),
        Field("action_items", "Action items", LIST),
        TAGS,
    )),
]}
