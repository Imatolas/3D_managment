from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/filaments", tags=["filaments"], dependencies=[Depends(get_current_user)])


@router.get("/", response_model=list[schemas.FilamentOut])
def list_filaments(db: Session = Depends(get_db)):
    return db.query(models.Filament).order_by(models.Filament.id).all()


@router.post("/", response_model=schemas.FilamentOut, status_code=status.HTTP_201_CREATED)
def create_filament(payload: schemas.FilamentCreate, db: Session = Depends(get_db)):
    filament = models.Filament(**payload.model_dump())
    db.add(filament)
    db.commit()
    db.refresh(filament)
    return filament


@router.put("/{filament_id}", response_model=schemas.FilamentOut)
def update_filament(filament_id: int, payload: schemas.FilamentUpdate, db: Session = Depends(get_db)):
    filament = db.query(models.Filament).filter(models.Filament.id == filament_id).first()
    if not filament:
        raise HTTPException(status_code=404, detail="Filamento não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(filament, field, value)
    db.commit()
    db.refresh(filament)
    return filament


@router.delete("/{filament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_filament(filament_id: int, db: Session = Depends(get_db)):
    filament = db.query(models.Filament).filter(models.Filament.id == filament_id).first()
    if not filament:
        raise HTTPException(status_code=404, detail="Filamento não encontrado")
    db.delete(filament)
    db.commit()
    return None
