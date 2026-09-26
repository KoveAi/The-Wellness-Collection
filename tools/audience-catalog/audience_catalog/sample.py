"""Fictional sample catalog for demos and screenshots. Every persona is an
invented composite; no real people, handles, or metrics appear here."""
from __future__ import annotations

from .db import Catalog


def load_sample(cat: Catalog) -> None:
    p_rebuild = cat.save("personas", {
        "name": "The Quiet Rebuilder",
        "description": "Rebuilding a sense of self after a major life change. Private, reflective, "
                       "reads everything and comments rarely.",
        "age_range": "38 to 52", "location": "Suburban, US",
        "motivations": ["Feel like themselves again", "Gentle structure", "Permission to rest"],
        "pain_points": ["Advice that feels loud", "No time for long routines"],
        "aesthetic_preferences": ["Warm neutrals", "Serif type", "Natural light"],
        "content_habits": "Saves posts to revisit at night. Prefers long captions and newsletters.",
        "follow_triggers": ["Feels seen by a caption", "Calm, unhurried voice"],
        "unfollow_triggers": ["Hard selling", "Toxic positivity"],
        "tags": ["core", "priority"],
    })
    p_seeker = cat.save("personas", {
        "name": "The Curious Seeker",
        "description": "Early in a wellness practice and exploring many approaches at once.",
        "age_range": "26 to 36", "location": "Urban, US",
        "motivations": ["Learn the why", "Community"],
        "pain_points": ["Overwhelm", "Conflicting advice"],
        "aesthetic_preferences": ["Clean layouts", "Soft color"],
        "content_habits": "Short video during commutes; follows threads into long reads.",
        "follow_triggers": ["Clear explainers"],
        "unfollow_triggers": ["Jargon"],
        "tags": ["growth"],
    })
    c_rest = cat.save("interest_clusters", {
        "name": "Rest and Recovery",
        "description": "Sleep, nervous system care, and slowing down without guilt.",
        "subtopics": ["Evening rituals", "Boundaries", "Breathwork"],
        "related_personas": [p_rebuild],
        "example_content_ideas": ["A five minute evening reset", "What rest is not"],
        "tags": ["core"],
    })
    c_self = cat.save("interest_clusters", {
        "name": "Identity and Self-Worth",
        "description": "Redefining who you are on your own terms.",
        "subtopics": ["Journaling prompts", "Values work"],
        "related_personas": [p_rebuild, p_seeker],
        "example_content_ideas": ["Three prompts for a new season"],
    })
    t_seen = cat.save("content_triggers", {
        "name": "Being named",
        "description": "Content that names a feeling the reader had not put into words.",
        "examples": ["You are allowed to outgrow who you were"],
        "best_formats": ["Carousel", "Newsletter"],
        "linked_clusters": [c_self],
        "tags": ["priority"],
    })
    cat.save("community_maps", {
        "name": "Slow living circles", "platform": "Instagram",
        "hashtags": ["#slowliving", "#gentlewellness"],
        "community_groups": ["Evening journaling challenge"],
        "personas": [p_rebuild],
        "audience_overlap": "Heavy overlap with home and interiors audiences.",
    })
    cat.save("growth_pathways", {
        "name": "Save to share",
        "description": "Saved carousels resurface when readers send them to a friend.",
        "mechanism": "Private sharing via DMs brings in lookalike followers.",
        "entry_points": ["Carousel", "Story reshare"],
        "linked_personas": [p_rebuild],
        "linked_triggers": [t_seen],
    })
    cat.save("engagement_patterns", {
        "name": "Rebuilder on Instagram", "persona_id": p_rebuild, "platform": "Instagram",
        "active_times": ["Weeknights 8 to 10pm"],
        "preferred_formats": ["Carousel", "Long caption"],
        "high_topics": ["Rest", "Boundaries"], "low_topics": ["Productivity"],
    })
    cat.save("insights", {
        "name": "Evening content outperforms", "insight_date": "2026-09-12",
        "source": "Sample: post analytics review",
        "summary": "Evening-themed posts drew more saves than morning routines.",
        "linked_personas": [p_rebuild], "linked_clusters": [c_rest],
        "action_items": ["Draft an evening reset series", "Test a Sunday newsletter"],
    })
