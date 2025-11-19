from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(get_current_user)])


@router.get("/", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.scalars(select(models.Job).order_by(models.Job.start_time.desc().nullslast())).all()


@router.get("/current", response_model=list[schemas.JobOut])
def current_jobs(db: Session = Depends(get_db)):
    active_status = {"printing", "queued"}
    return db.query(models.Job).filter(models.Job.status.in_(active_status)).all()


@router.get("/history", response_model=list[schemas.JobOut])
def job_history(db: Session = Depends(get_db)):
    return db.query(models.Job).filter(models.Job.status.not_in(("printing", "queued"))).all()


@router.post("/", response_model=schemas.JobOut, status_code=status.HTTP_201_CREATED)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    printer = db.get(models.Printer, payload.printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")
    job = models.Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=schemas.JobOut)
def update_job(job_id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    update_data = payload.model_dump(exclude_unset=True)
    if "printer_id" in update_data and update_data["printer_id"]:
        printer = db.get(models.Printer, update_data["printer_id"])
        if not printer:
            raise HTTPException(status_code=404, detail="Impressora não encontrada")
    for field, value in update_data.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    db.delete(job)
    db.commit()
    return None
