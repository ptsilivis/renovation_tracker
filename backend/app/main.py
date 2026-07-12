"""RenovationHub API entrypoint."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import auth, collections, files, meta, projects

app = FastAPI(title="RenovationHub API")

# Same-origin in production (frontend served by this app). CORS is only needed
# for local dev when the frontend is served from a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
# Explicit routes (projects, meta, files) must be registered before the generic
# /api/{collection} CRUD catch-all so paths like /api/projects and /api/files win.
app.include_router(projects.router)
app.include_router(meta.router)
app.include_router(files.router)
app.include_router(collections.router)


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve uploaded files and the static frontend. Mounted last so /api/* wins.
app.mount("/files", StaticFiles(directory=str(settings.upload_path)), name="files")

_frontend = Path(__file__).resolve().parent.parent.parent / "frontend"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
