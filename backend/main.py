
from io import BytesIO
import base64

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

app = FastAPI(
    title="DebriScan Detection API",
    description="Image analysis API for water-body debris monitoring.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# General-purpose pretrained model.
# This is a baseline, not a debris-specific trained model.
model = YOLO("yolo11n.pt")

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


@app.get("/")
def home():
    return {
        "project": "DebriScan",
        "status": "online",
        "model": "YOLO11n pretrained baseline",
        "purpose": "Water-body image analysis",
    }


@app.get("/api/health")
def health():
    return {
        "api": "online",
        "model_loaded": model is not None,
        "mode": "baseline",
    }


@app.post("/api/detect")
async def detect_debris(file: UploadFile = File(...)):
    if file.content_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPG, PNG, or WEBP image.",
        )

    image_bytes = await file.read(MAX_IMAGE_BYTES + 1)

    if not image_bytes:
        raise HTTPException(status_code=400, detail="The image is empty.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller.",
        )

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()

        if image.format not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=415,
                detail="Unsupported image format.",
            )

        image = image.convert("RGB")

    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    try:
        results = model.predict(
            source=image,
            conf=0.10,
            imgsz=640,
            verbose=False,
        )

        result = results[0]
        detections = []

        if result.boxes is not None:
            for box in result.boxes:
                class_id = int(box.cls.item())
                confidence = float(box.conf.item())
                x1, y1, x2, y2 = [
                    round(float(value), 2)
                    for value in box.xyxy[0].tolist()
                ]

                detections.append({
                    "label": model.names[class_id],
                    "confidence": round(confidence, 4),
                    "box": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                })

        # Annotated preview with model-generated bounding boxes.
        annotated = result.plot()
        annotated_image = Image.fromarray(
            annotated[:, :, ::-1]
        )

        buffer = BytesIO()
        annotated_image.save(buffer, format="JPEG", quality=85)

        preview = base64.b64encode(
            buffer.getvalue()
        ).decode("utf-8")

        return {
            "filename": file.filename,
            "image_width": image.width,
            "image_height": image.height,
            "detection_count": len(detections),
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{preview}",
            "model": "YOLO11n pretrained baseline",
            "mode": "general_object_detection",
            "warning": (
                "This general-purpose model is not specifically trained "
                "to detect all water debris. Results require validation."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Detection error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Image analysis failed. Check the backend terminal.",
        )
