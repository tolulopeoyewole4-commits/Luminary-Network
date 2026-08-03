from typing import Literal

from pydantic import BaseModel, Field


class VideoMetadataResponse(BaseModel):
    duration_seconds: float = Field(ge=0)
    width: int | None = None
    height: int | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    format_name: str | None = None
    size_bytes: int | None = Field(default=None, ge=0)


class VideoClipExportRequest(BaseModel):
    start_time: float = Field(ge=0)
    end_time: float = Field(gt=0)


class VideoSceneInput(BaseModel):
    caption: str = Field(min_length=1, max_length=400)
    duration_seconds: float = Field(default=3.0, ge=0.5, le=30.0)


class VideoGenerateRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    mode: Literal["TEXT_TO_VIDEO", "SCRIPT_TO_FILM"] = "TEXT_TO_VIDEO"
    # Provide either a pre-built storyboard (scenes) or raw source_text.
    source_text: str | None = Field(default=None, max_length=20000)
    scenes: list[VideoSceneInput] | None = None
