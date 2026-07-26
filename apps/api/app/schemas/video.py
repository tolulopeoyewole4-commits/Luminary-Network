from pydantic import BaseModel, Field


class VideoMetadataResponse(BaseModel):
    duration_seconds: float = Field(ge=0)
    width: int | None = None
    height: int | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    format_name: str | None = None
    size_bytes: int | None = Field(default=None, ge=0)
