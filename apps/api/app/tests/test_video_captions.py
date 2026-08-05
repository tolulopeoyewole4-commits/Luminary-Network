from app.services.video.captions import (
    build_webvtt,
    format_vtt_timestamp,
    slice_caption_cues_for_clip,
)


def test_format_vtt_timestamp() -> None:
    assert format_vtt_timestamp(0) == "00:00:00.000"
    assert format_vtt_timestamp(65.5) == "00:01:05.500"


def test_slice_caption_cues_for_clip() -> None:
    cues = [
        {"start_time": 8, "end_time": 12, "text": "Before"},
        {"start_time": 14, "end_time": 18, "text": "Hook"},
        {"start_time": 30, "end_time": 34, "text": "After"},
    ]
    sliced = slice_caption_cues_for_clip(cues, start_time=10, end_time=20)
    assert sliced == [
        {"start_time": 0.0, "end_time": 2.0, "text": "Before"},
        {"start_time": 4.0, "end_time": 8.0, "text": "Hook"},
    ]


def test_build_webvtt() -> None:
    vtt = build_webvtt(
        [{"start_time": 0, "end_time": 1.5, "text": "Hello"}],
    )
    assert vtt.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:01.500" in vtt
    assert "Hello" in vtt
