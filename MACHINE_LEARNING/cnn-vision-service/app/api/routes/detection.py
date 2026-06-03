from fastapi import APIRouter, UploadFile
from app.services.yolo_service import detect_smoke
import os

router = APIRouter()

@router.post("/detect")
async def detect(file: UploadFile):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return detect_smoke(file_path)