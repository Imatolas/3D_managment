from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/moonraker", tags=["moonraker"], dependencies=[Depends(get_current_user)])


async def _fetch_json(url: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


@router.get("/sync/{printer_id}")
async def sync_printer(printer_id: int, db: Session = Depends(get_db)):
    printer = db.get(models.Printer, printer_id)
    if not printer or not printer.moonraker_url:
        raise HTTPException(status_code=404, detail="Impressora não configurada para sincronização")

    base = printer.moonraker_url.rstrip("/")
    try:
        status = await _fetch_json(f"{base}/printer/objects/query?print_stats&display_status")
    except Exception as exc:  # pragma: no cover - external call
        raise HTTPException(status_code=502, detail=f"Erro ao consultar Moonraker: {exc}")

    printer.status = status.get("result", {}).get("status", {}).get("print_stats", {}).get("state", "offline")
    db.commit()

    payload = status.get("result", {}).get("status", {})
    display_status = payload.get("display_status", {})
    print_stats = payload.get("print_stats", {})

    return {
        "printer": printer.name,
        "state": printer.status,
        "filename": print_stats.get("filename"),
        "progress": display_status.get("progress"),
        "current_layer": display_status.get("current_layer"),
        "total_layer": display_status.get("total_layer"),
        "print_duration": print_stats.get("print_duration"),
        "timestamp": datetime.utcnow().isoformat(),
    }
