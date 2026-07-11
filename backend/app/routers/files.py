"""File uploads (moodboard photos, floor-plan underlays, GLB models, receipts).

Files are stored on the Pi filesystem under UPLOAD_DIR and served statically at
/files/<name> (mounted in main.py). This router handles the upload side.
"""
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..config import settings
from ..deps import get_current_user

router = APIRouter(prefix="/api", tags=["files"], dependencies=[Depends(get_current_user)])

_ALLOWED_EXT = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",  # images
    ".glb", ".gltf",                                    # 3d models
    ".pdf",                                             # receipts
}


@router.post("/files")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"file type '{ext}' not allowed")

    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"file exceeds {settings.max_upload_mb} MB",
        )

    name = f"{secrets.token_hex(8)}{ext}"
    dest = settings.upload_path / name
    dest.write_bytes(data)
    return {"name": name, "url": f"/files/{name}"}
