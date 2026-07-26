from __future__ import annotations

import re
from typing import Any

PLATFORM_TO_CONTENT_TYPE = {
    "linkedin": "linkedin_post",
    "instagram": "instagram_caption",
    "x": "x_thread",
    "youtube": "youtube_script",
    "tiktok": "tiktok_script",
    "newsletter": "newsletter",
    "blog": "blog_outline",
}


def _to_reference(section: dict[str, Any]) -> dict[str, Any]:
    return {
        "sectionId": section["id"],
        "sectionTitle": section["section_title"],
        "sectionNumber": section["section_number"],
        "pageStart": section.get("page_start"),
        "pageEnd": section.get("page_end"),
    }


def _first_sentence(text: str, fallback: str) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return fallback
    match = re.match(r"^(.{20,220}?[.!?])\s", cleaned)
    if match:
        return match.group(1)
    return cleaned[:220]


def _chunk_sections(
    sections: list[dict[str, Any]],
    module_count: int,
) -> list[list[dict[str, Any]]]:
    count = max(1, min(module_count, len(sections)))
    groups: list[list[dict[str, Any]]] = [[] for _ in range(count)]
    for index, section in enumerate(sections):
        groups[index % count].append(section)
    return [group for group in groups if group]


def generate_course_outline(
    *,
    target_audience: str,
    course_objective: str,
    duration_label: str,
    module_count: int,
    difficulty_level: str,
    sections: list[dict[str, Any]],
) -> dict[str, Any]:
    if not sections:
        raise ValueError("Select at least one source section before generating.")

    groups = _chunk_sections(sections, module_count)
    all_refs = [_to_reference(section) for section in sections]
    primary = sections[0]

    modules = []
    for module_index, group in enumerate(groups):
        module_refs = [_to_reference(section) for section in group]
        lead = group[0]
        support = group[1:]
        lessons = [
            {
                "title": f"Understand: {lead['section_title']}",
                "summary": _first_sentence(
                    lead.get("extracted_text") or "",
                    f"Review the source material in {lead['section_title']}.",
                ),
                "learningObjectives": [
                    f"Explain the key idea from {lead['section_title']}.",
                    f"Identify how this idea serves {target_audience}.",
                ],
                "sourceReferences": [_to_reference(lead)],
            }
        ]
        for section in support[:2]:
            lessons.append(
                {
                    "title": f"Apply: {section['section_title']}",
                    "summary": _first_sentence(
                        section.get("extracted_text") or "",
                        f"Apply teaching points from {section['section_title']}.",
                    ),
                    "learningObjectives": [
                        f"Apply one practical takeaway from {section['section_title']}.",
                    ],
                    "sourceReferences": [_to_reference(section)],
                }
            )
        modules.append(
            {
                "title": f"Module {module_index + 1}: {lead['section_title']}",
                "description": _first_sentence(
                    lead.get("extracted_text") or "",
                    f"This module is grounded in {lead['section_title']}.",
                ),
                "lessons": lessons,
                "sourceReferences": module_refs,
            }
        )

    learning_outcomes = [
        f"Describe the core message drawn from {primary['section_title']}.",
        f"Apply the teaching points for {target_audience}.",
        "Connect selected source sections into a coherent learning path.",
    ]
    if difficulty_level == "advanced":
        learning_outcomes.append(
            "Critique and adapt the source ideas for advanced learners.",
        )

    quiz_suggestions = []
    for section in sections[:5]:
        snippet = _first_sentence(
            section.get("extracted_text") or "",
            section["section_title"],
        )
        quiz_suggestions.append(
            f"Based on {section['section_title']}: what is the main idea "
            f"behind “{snippet[:80]}”?"
        )

    return {
        "title": f"{primary['section_title']} Course",
        "description": " ".join(
            [
                f"A {difficulty_level} course for {target_audience}.",
                f"Objective: {course_objective}.",
                f"Duration focus: {duration_label}.",
                f"Content is structured only from the {len(sections)} "
                "selected source section(s).",
            ]
        ),
        "targetAudience": target_audience,
        "learningOutcomes": learning_outcomes,
        "modules": modules,
        "quizSuggestions": quiz_suggestions,
        "sourceReferences": all_refs,
        "groundingNotes": [
            "Generated by the mock AI provider using only selected source sections.",
            "No external facts were added beyond the creator inputs and source text.",
        ],
    }


def _label_platform(platform: str) -> str:
    return {
        "linkedin": "LinkedIn post",
        "instagram": "Instagram caption",
        "x": "X thread",
        "youtube": "YouTube script",
        "tiktok": "TikTok / Reel script",
        "newsletter": "Newsletter",
        "blog": "Blog outline",
    }.get(platform, "Content")


def _length_budget(length: str) -> int:
    if length == "short":
        return 280
    if length == "long":
        return 1200
    return 600


def _build_social_body(
    *,
    platform: str,
    tone: str,
    length: str,
    target_audience: str,
    call_to_action: str,
    section_title: str,
    idea: str,
    variant: int,
) -> str:
    budget = _length_budget(length)
    opener = idea

    if platform == "x":
        tweets = [
            f"1/{min(3, variant + 2)} For {target_audience}: {opener}",
            f"2/ Grounded in “{section_title}”. Tone: {tone}.",
            f"3/ {call_to_action}",
        ]
        return "\n\n".join(tweets)[: budget + 120]

    if platform in {"youtube", "tiktok"}:
        return "\n\n".join(
            [
                f"HOOK: {opener}",
                f"CONTEXT: This script is grounded in “{section_title}”.",
                (
                    f"BODY: Speak to {target_audience} in a {tone} voice. "
                    "Stay faithful to the source idea above — do not invent "
                    "extra claims."
                ),
                f"CTA: {call_to_action}",
            ]
        )[: budget + 200]

    if platform == "blog":
        return "\n".join(
            [
                f"Outline (variant {variant})",
                f"1. Introduction — {opener}",
                f"2. Core teaching from “{section_title}”",
                f"3. Practical application for {target_audience}",
                f"4. Closing CTA — {call_to_action}",
                "",
                "Notes: Keep every claim traceable to the selected source section.",
            ]
        )

    if platform == "newsletter":
        return "\n".join(
            [
                f"Subject angle: {section_title}",
                "",
                f"Hello {target_audience},",
                "",
                opener,
                "",
                f'This edition stays close to the source material in “{section_title}”.',
                "",
                call_to_action,
            ]
        )[: budget + 200]

    return "\n".join(
        [
            opener,
            "",
            f"Drawn from “{section_title}” for {target_audience}.",
            f"Voice: {tone}.",
            "",
            call_to_action,
        ]
    )[: budget + 80]


def generate_social_content(
    *,
    platform: str,
    tone: str,
    length: str,
    target_audience: str,
    call_to_action: str,
    output_count: int,
    sections: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not sections:
        raise ValueError("Select at least one source section before generating.")

    count = max(1, min(int(output_count), 5))
    outputs: list[dict[str, Any]] = []
    content_type = PLATFORM_TO_CONTENT_TYPE.get(platform, "linkedin_post")

    for index in range(count):
        section = sections[index % len(sections)]
        idea = _first_sentence(
            section.get("extracted_text") or "",
            f"Key idea from {section['section_title']}",
        )
        body = _build_social_body(
            platform=platform,
            tone=tone,
            length=length,
            target_audience=target_audience,
            call_to_action=call_to_action,
            section_title=section["section_title"],
            idea=idea,
            variant=index + 1,
        )
        outputs.append(
            {
                "contentType": content_type,
                "platform": platform,
                "title": (
                    f"{_label_platform(platform)} from "
                    f"{section['section_title']} (#{index + 1})"
                ),
                "body": body,
                "sourceReferences": [_to_reference(section)],
            }
        )
    return outputs
