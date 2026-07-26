from app.services.ai.mock import generate_course_outline, generate_social_content
from app.services.mocks.captions import build_caption_cues_from_segments
from app.services.mocks.clips import build_mock_clip_candidates
from app.services.mocks.transcript import build_mock_transcript_segments


def test_mock_transcript_is_deterministic() -> None:
    a = build_mock_transcript_segments(duration_seconds=60, title="Talk.mp4")
    b = build_mock_transcript_segments(duration_seconds=60, title="Talk.mp4")
    assert a == b
    assert len(a) >= 1
    assert a[0]["start_time"] == 0


def test_mock_clips_prefer_segments() -> None:
    segments = [
        {"start_time": 0, "end_time": 10, "text": "Opening idea about teaching"},
        {"start_time": 10, "end_time": 20, "text": "Second beat"},
    ]
    clips = build_mock_clip_candidates(
        duration_seconds=60,
        title="Lesson",
        segments=segments,
        max_candidates=2,
    )
    assert 1 <= len(clips) <= 2
    assert clips[0]["rank"] == 1
    assert "teaching" in clips[0]["title"].lower() or "Opening" in clips[0]["title"]


def test_caption_cues_wrap_long_text() -> None:
    cues = build_caption_cues_from_segments(
        [
            {
                "start_time": 0,
                "end_time": 10,
                "text": " ".join(["word"] * 40),
            }
        ],
        max_chars_per_cue=20,
    )
    assert len(cues) > 1
    assert all(cue["text"] for cue in cues)


def test_mock_course_outline_grounds_in_sections() -> None:
    outline = generate_course_outline(
        target_audience="coaches",
        course_objective="Teach the core idea",
        duration_label="2 weeks",
        module_count=2,
        difficulty_level="beginner",
        sections=[
            {
                "id": "s1",
                "section_title": "Foundations",
                "section_number": 1,
                "page_start": 1,
                "page_end": 2,
                "extracted_text": "Foundations matter for every learner. Keep it clear.",
            },
            {
                "id": "s2",
                "section_title": "Practice",
                "section_number": 2,
                "page_start": 3,
                "page_end": 4,
                "extracted_text": "Practice turns insight into habit for coaches.",
            },
        ],
    )
    assert "Foundations" in outline["title"]
    assert len(outline["modules"]) == 2
    assert outline["sourceReferences"][0]["sectionId"] == "s1"


def test_mock_social_content_count() -> None:
    outputs = generate_social_content(
        platform="linkedin",
        tone="warm",
        length="short",
        target_audience="founders",
        call_to_action="Share your takeaway",
        output_count=2,
        sections=[
            {
                "id": "s1",
                "section_title": "Momentum",
                "section_number": 1,
                "page_start": 1,
                "page_end": 1,
                "extracted_text": "Momentum compounds when you ship weekly.",
            }
        ],
    )
    assert len(outputs) == 2
    assert outputs[0]["contentType"] == "linkedin_post"
