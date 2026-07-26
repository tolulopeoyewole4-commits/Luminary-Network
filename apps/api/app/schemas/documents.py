from pydantic import BaseModel, Field


class DocumentSectionSchema(BaseModel):
    section_title: str = Field(min_length=1, max_length=300)
    section_number: int = Field(ge=1)
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    extracted_text: str
    token_count: int = Field(ge=0)


class DocumentExtractResponse(BaseModel):
    file_type: str
    page_count: int | None = None
    section_count: int
    sections: list[DocumentSectionSchema]
    warnings: list[str] = Field(default_factory=list)
