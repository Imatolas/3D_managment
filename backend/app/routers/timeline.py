from datetime import datetime
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Printer, Job
from ..dependencies import get_current_user

router = APIRouter(tags=["timeline"])


def _build_timeline(db: Session):
    printers = db.query(Printer).order_by(Printer.id).all()
    jobs = db.query(Job).order_by(Job.start_time.desc().nullslast()).all()
    timeline = []
    for printer in printers:
        printer_jobs = [job for job in jobs if job.printer_id == printer.id]
        timeline.append(
            {
                "id": printer.id,
                "name": printer.name,
                "status": (printer.status or "offline").lower(),
                "moonraker_url": printer.moonraker_url,
                "jobs": [
                    {
                        "id": job.id,
                        "filename": job.filename,
                        "status": job.status,
                        "start_time": job.start_time.isoformat() if job.start_time else None,
                        "end_time": job.end_time.isoformat() if job.end_time else None,
                    }
                    for job in printer_jobs
                ],
            }
        )
    return timeline


@router.get("/timeline", dependencies=[Depends(get_current_user)])
def get_timeline(db: Session = Depends(get_db)):
    return {"items": _build_timeline(db)}


@router.websocket("/ws/timeline")
async def timeline_socket(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        await websocket.send_json({"items": _build_timeline(db)})
        while True:
            await websocket.receive_text()
            await websocket.send_json({"items": _build_timeline(db), "ts": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        return
