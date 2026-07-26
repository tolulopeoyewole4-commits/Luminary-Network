from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.health import router as health_router
from app.api.videos import router as videos_router
from app.core.config import settings

app = FastAPI(
    title="Luminary AI API",
    description="Processing and generation API for Luminary AI",
    version="0.12.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(documents_router)
app.include_router(videos_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "luminary-ai-api",
        "status": "ok",
        "docs": "/docs",
    }
